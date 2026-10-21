// chrome-stub.js - Dev-only stubs so popup.html renders outside the extension runtime.
// Loaded by dev-popup-test.html (generated from popup.html) before i18n.js / popup.js.
(function () {
    const now = new Date().toISOString();
    const day = 24 * 60 * 60 * 1000;
    const history = Array.from({ length: 30 }, (_, i) => ({
        timestamp: new Date(Date.now() - (29 - i) * day).toISOString(),
        citations: 1200 + i * 3,
        hIndex: 24
    }));

    const store = {
        language: 'zh',
        showHistory: true,
        lastUpdateTime: now,
        authors: [{
            userId: 'XXXXXXXX',
            name: '张三（示例 Scholar 作者）',
            affiliation: '清华大学',
            interests: '机器学习, 强化学习',
            totalCitations: 1257,
            hIndex: 25,
            i10Index: 45,
            totalPapers: 42,
            papers: [{ title: 'Example Paper', citations: 12, year: '2023', link: '' }],
            url: 'https://scholar.google.com/citations?user=XXXXXXXX',
            workingDomain: 'scholar.google.com',
            lastUpdated: now,
            history,
            historyExpanded: false,
            hasNewCitations: true,
            previousCitations: 1253,
            changeTimestamp: now,
            paperChanges: [{
                title: 'Example Paper: A Study of Citation Monitoring',
                oldCitations: 10,
                newCitations: 12,
                change: 2,
                year: '2023',
                link: 'https://scholar.google.com/citations?view_op=view_citation&user=XXXXXXXX',
                fetchFailed: false,
                newCiters: [{
                    title: 'Citing Paper One: Monitoring Citations at Scale',
                    authors: 'A. Author, B. Author, C. Author, et al.',
                    year: '2024',
                    clusterId: 'c1',
                    link: 'https://arxiv.org/abs/2401.00001'
                }]
            }]
        }],
        s2Authors: [{
            authorId: '145183709',
            name: 'Jason Weston',
            affiliation: 'Meta AI (FAIR)',
            url: 'https://www.semanticscholar.org/author/145183709',
            totalCitations: 104725,
            hIndex: 107,
            paperCount: 246,
            papers: [],
            seenCiters: {},
            lastUpdated: now,
            history: history.map(h => ({ timestamp: h.timestamp, citations: 104700 + (h.citations - 1200), hIndex: 107 })),
            historyExpanded: false,
            hasNewCitations: true,
            previousCitations: 104724,
            changeTimestamp: now,
            paperChanges: [{
                paperId: 'p1',
                title: 'Learning to Reason and Memorize with Self-Notes',
                year: 2023,
                venue: 'Neural Information Processing Systems',
                link: 'https://doi.org/10.48550/arXiv.2305.00833',
                oldCitations: 44,
                newCitations: 45,
                change: 1,
                fetchFailed: false,
                newCiters: [{
                    paperId: 'c1',
                    title: 'Teaching Language Models to Self-Improve through Interactive Feedback',
                    authors: 'Z. Wang, L. Chen, et al.',
                    year: '2024',
                    venue: 'arXiv.org',
                    link: 'https://arxiv.org/abs/2401.00001',
                    firstSeenAt: now
                }]
            }, {
                paperId: 'p2',
                title: 'A Very Highly Cited Survey Paper',
                year: 2020,
                venue: 'ACM Computing Surveys',
                link: '',
                oldCitations: 3200,
                newCitations: 3210,
                change: 10,
                fetchFailed: false,
                detailSkipped: 'too_many',
                newCiters: []
            }]
        }]
    };

    const listeners = [];
    window.chrome = {
        storage: {
            local: {
                get(keys, cb) {
                    const out = {};
                    (Array.isArray(keys) ? keys : [keys]).forEach(k => {
                        if (k in store) out[k] = JSON.parse(JSON.stringify(store[k]));
                    });
                    setTimeout(() => cb(out), 0);
                },
                set(obj, cb) {
                    Object.entries(obj).forEach(([k, v]) => { store[k] = JSON.parse(JSON.stringify(v)); });
                    listeners.forEach(fn => fn(obj, 'local'));
                    if (cb) setTimeout(cb, 0);
                },
                remove(keys, cb) {
                    (Array.isArray(keys) ? keys : [keys]).forEach(k => delete store[k]);
                    if (cb) setTimeout(cb, 0);
                },
                onChangedSinceDev: true
            },
            onChanged: { addListener(fn) { listeners.push(fn); } }
        },
        runtime: {
            async sendMessage(msg) {
                if (msg.action === 's2SearchAuthors') {
                    return {
                        success: true,
                        results: [
                            { authorId: '145183709', name: 'Jason Weston', affiliations: ['Meta AI (FAIR)'], paperCount: 246, citationCount: 104725, hIndex: 107 },
                            { authorId: '2267341626', name: 'Jason E. Weston', affiliations: [], paperCount: 42, citationCount: 3747, hIndex: 27 },
                            { authorId: '2475682', name: 'Jason D. Weston', affiliations: ['University of Colorado'], paperCount: 16, citationCount: 18, hIndex: 3 }
                        ]
                    };
                }
                if (msg.action === 's2AddAuthor') {
                    return { success: true, author: { authorId: msg.authorId, name: 'Jason Weston (stub)' } };
                }
                if (msg.action === 'manualRefresh') {
                    return { success: true, result: { successCount: 2, errorCount: 0, errors: [] } };
                }
                return { success: false, error: 'stub: unknown action ' + msg.action };
            }
        },
        tabs: { create: ({ url }) => window.open(url, '_blank') },
        alarms: { create() {}, get(n, cb) { cb && cb(null); }, onAlarm: { addListener() {} } },
        notifications: { create() {} }
    };
    window.confirm = () => true;
    window.alert = (msg) => console.log('[alert]', msg);
})();
