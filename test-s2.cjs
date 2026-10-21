// test-s2.cjs - Node dry-run harness for S2BackgroundService
// Stubs chrome.* APIs, then exercises the real module against the real Semantic Scholar API.
const fs = require('fs');
const path = require('path');

// --- chrome stubs (callback style, Map-backed storage) ---
const store = new Map();
global.chrome = {
    storage: {
        local: {
            get(keys, cb) {
                const out = {};
                (Array.isArray(keys) ? keys : [keys]).forEach(k => { if (store.has(k)) out[k] = store.get(k); });
                setTimeout(() => cb(out), 0);
            },
            set(obj, cb) {
                Object.entries(obj).forEach(([k, v]) => store.set(k, JSON.parse(JSON.stringify(v))));
                if (cb) setTimeout(cb, 0);
            },
            remove(keys, cb) {
                (Array.isArray(keys) ? keys : [keys]).forEach(k => store.delete(k));
                if (cb) setTimeout(cb, 0);
            }
        }
    },
    alarms: {
        get: (n, cb) => cb(null),
        create: () => {},
        clear: () => {},
        onAlarm: { addListener() {} }
    },
    runtime: { onStartup: { addListener() {} } },
    notifications: { create: async () => {} }
};

// --- load i18n.js to provide t() ---
new Function(
    fs.readFileSync(path.join(__dirname, 'i18n.js'), 'utf8') +
    '\n;global.I18n = I18n; global.t = I18n.t.bind(I18n);'
)();

const S2BackgroundService = require('./s2.js');

const assert = (cond, label) => {
    if (!cond) { console.error('❌ FAIL:', label); process.exitCode = 1; }
    else console.log('✅ PASS:', label);
};

async function pickSmallAuthor() {
    const svc = new S2BackgroundService();
    for (const q of ['Wei Chen', 'Eric Li', 'Jing Tang']) {
        try {
            const results = await svc.searchAuthors(q);
            const cand = results.find(a =>
                a.paperCount >= 5 && a.paperCount <= 40 &&
                (a.citationCount || 0) >= 30 && (a.hIndex || 0) >= 2
            );
            if (cand) { console.log(`picked author from "${q}":`, cand.authorId, cand.name, `papers=${cand.paperCount} citations=${cand.citationCount}`); return cand; }
        } catch (e) { console.warn(`search "${q}" failed:`, e.message); }
    }
    throw new Error('no suitable small author found');
}

async function main() {
    const svc = new S2BackgroundService();
    svc.WARMUP_PER_REFRESH = 8; // keep API budget small in the harness

    // ---------- 1. Real-API flow ----------
    const cand = await pickSmallAuthor();
    console.log('\n--- addAuthor (silent baseline) ---');
    const added = await svc.addAuthor(cand.authorId);
    assert(added.name && added.totalCitations >= 0, 'addAuthor returns author info');
    assert(Array.isArray(added.papers) && added.papers.length > 0, `papers fetched (${added.papers.length})`);
    const baselinedCount = Object.keys(added.seenCiters || {}).length;
    console.log(`   baselines built: ${baselinedCount} (papers: ${added.papers.length})`);
    assert(baselinedCount > 0, 'at least one citation baseline built');
    assert(!added.hasNewCitations, 'fresh add does not trigger change badge');

    // ---------- 2. Simulate a new citation on a baselined paper ----------
    const authors = await svc.getAuthors();
    const author = authors.find(a => a.authorId === cand.authorId);
    const target = author.papers.find(p =>
        p.citationCount >= 1 &&
        p.citationCount <= svc.MAX_BASELINE_CITATIONS &&
        Array.isArray(author.seenCiters[p.paperId]) &&
        author.seenCiters[p.paperId].length > 0
    );
    if (!target) throw new Error('no baselined paper with >=1 citation to simulate on');

    const currentCount = target.citationCount;
    const fullList = author.seenCiters[target.paperId];
    const removedId = fullList[fullList.length - 1];
    target.citationCount = currentCount - 1;           // pretend the count is one behind reality
    author.seenCiters[target.paperId] = fullList.slice(0, -1); // ...and the baseline misses one citer
    await svc.saveAuthors([author]);
    console.log(`\n--- simulate new citation on "${target.title.substring(0, 50)}" (${currentCount - 1} -> ${currentCount}) ---`);

    const r = await svc.refreshAllAuthors(false);
    assert(r && r.successCount === 1, 'refreshAllAuthors succeeds');

    const after = (await svc.getAuthors()).find(a => a.authorId === cand.authorId);
    assert(after.totalCitations === added.totalCitations, `author total unchanged (${after.totalCitations})`);
    const change = (after.paperChanges || []).find(c => c.paperId === target.paperId);
    assert(change, 'paper change detected');
    assert(change.oldCitations === currentCount - 1 && change.newCitations === currentCount,
        `counts ${change.oldCitations} -> ${change.newCitations}`);
    assert(change.change === 1, 'change = +1');
    assert(Array.isArray(change.newCiters) && change.newCiters.some(c => c.paperId === removedId),
        'newCiters contains exactly the simulated citer');
    assert(change.newCiters.every(c => c.title && c.link), 'newCiters entries have title + link');
    assert(Array.isArray(after.seenCiters[target.paperId]) &&
        after.seenCiters[target.paperId].includes(removedId), 'baseline updated to full list');
    assert(after.hasNewCitations === true, 'author flagged as hasNewCitations');
    assert(Array.isArray(after.history) && after.history.length >= 1, 'history snapshot appended');

    // ---------- 3. Second refresh: no false positives ----------
    console.log('\n--- idempotent second refresh ---');
    const r2 = await svc.refreshAllAuthors(false);
    const after2 = (await svc.getAuthors()).find(a => a.authorId === cand.authorId);
    assert(r2.successCount === 1, 'second refresh succeeds');
    const fresh2 = svc.diffAuthorState(after, after2);
    assert(fresh2.length === 0, 'no changes on stable second refresh');
    assert((after2.paperChanges || []).find(c => c.paperId === target.paperId).newCiters.length === 1,
        'accumulated newCiters not duplicated');

    // ---------- 4. Pure unit tests ----------
    console.log('\n--- unit: mergePaperChanges accumulation ---');
    const merged = svc.mergePaperChanges(
        [{ paperId: 'p1', title: 'A', oldCitations: 10, newCitations: 11, change: 1,
           newCiters: [{ paperId: 'c1' }], firstSeenAt: '2026-01-01T00:00:00Z' }],
        [{ paperId: 'p1', title: 'A', oldCitations: 11, newCitations: 13, change: 2 }]
    );
    assert(merged.length === 1 && merged[0].oldCitations === 10 && merged[0].newCitations === 13 &&
        merged[0].change === 3 && merged[0].newCiters.length === 1,
        'accumulates old baseline, latest count, keeps citers');

    console.log('--- unit: mergeNewCiters dedup + cap ---');
    const capped = svc.mergeNewCiters(
        [{ paperId: 'c1', title: 'x' }],
        [{ paperId: 'c1', title: 'dup' }, { paperId: 'c2', title: 'new' }]
    );
    assert(capped.length === 2 && capped[1].paperId === 'c2' && capped[1].firstSeenAt,
        'dedups by paperId, stamps firstSeenAt');

    console.log('--- unit: diffAuthorState ignores brand-new papers ---');
    const d = svc.diffAuthorState(
        { papers: [{ paperId: 'p1', citationCount: 5 }] },
        { papers: [{ paperId: 'p1', citationCount: 7 }, { paperId: 'p2', citationCount: 1 }] }
    );
    assert(d.length === 1 && d[0].paperId === 'p1' && d[0].change === 2,
        'new papers do not count as citation changes');

    console.log('--- unit: history same-day dedupe ---');
    const a2 = { history: [] };
    svc.appendHistorySnapshot(a2, 10, 1);
    svc.appendHistorySnapshot(a2, 12, 1);
    assert(a2.history.length === 1 && a2.history[0].citations === 12, 'same-day snapshots collapse');

    console.log('\nDry-run complete.');
}

main().catch(e => { console.error('❌ Harness error:', e); process.exit(1); });
