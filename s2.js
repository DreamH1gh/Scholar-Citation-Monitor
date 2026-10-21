// s2.js - Semantic Scholar citation tracking module
// Uses the official Semantic Scholar Graph API (no page scraping, no anti-crawl):
//   GET /graph/v1/author/{id}                  -> totals (citationCount / hIndex / paperCount)
//   GET /graph/v1/author/{id}/papers           -> per-paper citationCount (paginated)
//   GET /graph/v1/paper/{id}/citations         -> actual citing papers (paginated)
// Free tier is heavily rate-limited (shared pool); a free API key (x-api-key) gets
// a dedicated pool. All requests go through s2Fetch with 429 backoff retries.
class S2BackgroundService {
    constructor() {
        this.API_BASE = 'https://api.semanticscholar.org/graph/v1';
        this.ALARM_NAME = 's2AutoRefresh';
        // 与 Google Scholar 模块保持一致：默认一天刷新两次（12 小时）。
        // S2 走官方 API 不受反爬影响，但统一节奏可减少整体请求量。
        this.REFRESH_INTERVAL_MINUTES = 720;

        // Papers with more citations than this are count-only (baseline would cost
        // too many requests; 3 pages x 1000 covers virtually all personal profiles)
        this.MAX_BASELINE_CITATIONS = 3000;
        this.MAX_BASELINE_PAGES = 3;
        this.CITATIONS_PAGE_SIZE = 1000;
        this.AUTHOR_PAPERS_PAGE_SIZE = 1000;
        this.MAX_AUTHOR_PAPERS_PAGES = 5;

        // Baseline warmup budget per refresh cycle (spread over alarm cycles)
        this.WARMUP_PER_REFRESH = 10;

        this.MAX_NEW_CITERS_PER_EVENT = 50;
        this.SEEN_CITERS_CAP = 2000;
        this.BACKOFF_MS = [2000, 5000, 12000, 25000];

        this.notificationCooldown = 5 * 60 * 1000;
    }

    init() {
        this.setupAlarm();
        chrome.alarms.onAlarm.addListener((alarm) => {
            if (alarm.name !== this.ALARM_NAME) return;
            console.log('🔔 [S2] 定时刷新触发');
            this.refreshAllAuthors(true).catch(err => {
                console.error('❌ [S2] 定时刷新失败:', err.message);
            });
        });
        chrome.runtime.onStartup.addListener(() => this.setupAlarm());
        // Catch-up refresh only when a whole interval was missed (SW wakes on every
        // popup open; a short threshold would defeat the 12h schedule). Same rule as
        // the GS module's performStartupCheck.
        setTimeout(async () => {
            try {
                const authors = await this.getAuthors();
                if (authors.length === 0) return;
                const last = Math.max(...authors.map(a => new Date(a.lastUpdated || 0).getTime()));
                if (Date.now() - last > this.REFRESH_INTERVAL_MINUTES * 60 * 1000) {
                    await this.refreshAllAuthors(false);
                }
            } catch (e) { /* ignore */ }
        }, 8000);
    }

    setupAlarm() {
        chrome.alarms.get(this.ALARM_NAME, (existing) => {
            // 周期与当前配置不一致时重建，否则改了默认间隔后老用户仍被旧周期钉住
            const periodMismatch = !!(existing &&
                existing.periodInMinutes !== this.REFRESH_INTERVAL_MINUTES);
            if (existing && !periodMismatch) return;
            chrome.alarms.create(this.ALARM_NAME, {
                // 仅因周期变化重建时等满一个周期，避免刚改完就立刻请求
                delayInMinutes: periodMismatch ? this.REFRESH_INTERVAL_MINUTES : 0.5,
                periodInMinutes: this.REFRESH_INTERVAL_MINUTES
            });
            console.log(`⏰ [S2] 定时任务已${periodMismatch ? '按新周期重建' : '创建'}（每 ${this.REFRESH_INTERVAL_MINUTES} 分钟）`);
        });
    }

    // === Storage ===
    getAuthors() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['s2Authors'], (result) => resolve(result.s2Authors || []));
        });
    }

    saveAuthors(authors) {
        return new Promise((resolve) => {
            chrome.storage.local.set({ s2Authors: authors }, () => {
                if (chrome.runtime.lastError) {
                    console.warn('[S2] Storage quota exceeded, trimming:', chrome.runtime.lastError.message);
                    authors.forEach(a => {
                        if (a.history && a.history.length > 365) a.history = a.history.slice(-365);
                        if (a.seenCiters) {
                            for (const pid of Object.keys(a.seenCiters)) {
                                if (a.seenCiters[pid].length > this.SEEN_CITERS_CAP) {
                                    a.seenCiters[pid] = a.seenCiters[pid].slice(-this.SEEN_CITERS_CAP);
                                }
                            }
                        }
                    });
                    chrome.storage.local.set({ s2Authors: authors }, resolve);
                } else {
                    resolve();
                }
            });
        });
    }

    getApiKey() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['s2ApiKey'], (result) => resolve(result.s2ApiKey || ''));
        });
    }

    // === HTTP ===
    async s2Fetch(path) {
        const apiKey = await this.getApiKey();
        const url = path.startsWith('http') ? path : `${this.API_BASE}${path}`;
        let lastError = null;

        for (let attempt = 0; attempt < this.BACKOFF_MS.length; attempt++) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 20000);
            try {
                const headers = {};
                if (apiKey) headers['x-api-key'] = apiKey;
                const response = await fetch(url, { method: 'GET', headers, signal: controller.signal });
                clearTimeout(timeoutId);

                if (response.status === 429) {
                    const wait = this.BACKOFF_MS[attempt];
                    console.warn(`⚠️ [S2] 429 限流，${wait / 1000}s 后重试 (${attempt + 1}/${this.BACKOFF_MS.length}): ${path}`);
                    await this.delay(wait);
                    continue;
                }
                if (response.status === 404) {
                    throw new Error('S2_NOT_FOUND');
                }
                if (!response.ok) {
                    throw new Error(`S2 HTTP ${response.status}`);
                }
                return await response.json();
            } catch (err) {
                clearTimeout(timeoutId);
                if (err.message === 'S2_NOT_FOUND') throw err;
                lastError = (err.name === 'AbortError') ? new Error('请求超时') : err;
                if (attempt < this.BACKOFF_MS.length - 1) {
                    await this.delay(1500);
                }
            }
        }
        throw lastError || new Error('S2 请求失败');
    }

    delay(ms) {
        return new Promise(r => setTimeout(r, ms));
    }

    // === Public API used by background.js message handlers ===
    async searchAuthors(query) {
        const data = await this.s2Fetch(
            `/author/search?query=${encodeURIComponent(query)}` +
            `&fields=name,affiliations,paperCount,citationCount,hIndex&limit=15`
        );
        return (data.data || []).filter(a => (a.citationCount || 0) > 0 || (a.paperCount || 0) > 0);
    }

    async addAuthor(authorId) {
        const authors = await this.getAuthors();
        if (authors.some(a => a.authorId === authorId)) {
            throw new Error('S2_ALREADY_EXISTS');
        }
        // Fresh add: first refresh is silent baseline, no change badge
        const info = await this.refreshAuthor({
            authorId,
            papers: [],
            seenCiters: {},
            history: []
        }, { silentBaseline: true });

        delete info.hasNewCitations;
        delete info.previousCitations;
        delete info.changeTimestamp;
        delete info.paperChanges;

        authors.push(info);
        await this.saveAuthors(authors);
        return info;
    }

    // === Refresh ===
    async refreshAllAuthors(enableNotifications = true) {
        const authors = await this.getAuthors();
        if (authors.length === 0) return null;

        console.log(`🔄 [S2] 开始刷新 ${authors.length} 位作者...`);
        const allChanges = [];
        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < authors.length; i++) {
            const author = authors[i];
            try {
                const updated = await this.refreshAuthor(author);
                const freshChanges = this.diffAuthorState(author, updated);

                authors[i] = updated;
                authors[i].lastUpdated = new Date().toISOString();
                authors[i].lastError = undefined;

                if (freshChanges.length > 0) {
                    allChanges.push({
                        name: updated.name,
                        authorId: updated.authorId,
                        oldCitations: author.totalCitations,
                        newCitations: updated.totalCitations,
                        paperChanges: updated.paperChanges || []
                    });
                }

                this.appendHistorySnapshot(updated, updated.totalCitations, updated.hIndex);
                successCount++;
                await this.saveAuthors(authors);
            } catch (err) {
                errorCount++;
                console.error(`❌ [S2] 刷新 ${author.name || author.authorId} 失败:`, err.message);
                authors[i] = { ...author, lastError: err.message };
                await this.saveAuthors(authors);
            }

            if (i < authors.length - 1) await this.delay(2000);
        }

        console.log(`📊 [S2] 刷新完成: 成功 ${successCount}, 失败 ${errorCount}`);

        if (enableNotifications && allChanges.length > 0) {
            await this.notifyChanges(allChanges);
        }

        return { successCount, errorCount, changes: allChanges };
    }

    // Positive per-paper deltas between the stored author state and a fresh fetch
    diffAuthorState(oldAuthor, newAuthor) {
        const changes = [];
        const oldPapers = new Map((oldAuthor.papers || []).map(p => [p.paperId, p]));

        for (const np of (newAuthor.papers || [])) {
            const op = oldPapers.get(np.paperId);
            if (op && np.citationCount !== op.citationCount) {
                changes.push({
                    paperId: np.paperId,
                    title: np.title,
                    year: np.year,
                    venue: np.venue,
                    link: np.link,
                    oldCitations: op.citationCount,
                    newCitations: np.citationCount,
                    change: np.citationCount - op.citationCount
                });
            }
        }
        return changes;
    }

    async refreshAuthor(author, { silentBaseline = false } = {}) {
        // 1. Author totals
        const info = await this.s2Fetch(
            `/author/${author.authorId}?fields=name,affiliations,citationCount,hIndex,paperCount`
        );

        // 2. All papers (paginated)
        const papers = [];
        let offset = 0;
        for (let page = 0; page < this.MAX_AUTHOR_PAPERS_PAGES; page++) {
            const data = await this.s2Fetch(
                `/author/${author.authorId}/papers?fields=title,year,venue,citationCount,externalIds` +
                `&limit=${this.AUTHOR_PAPERS_PAGE_SIZE}&offset=${offset}`
            );
            for (const p of (data.data || [])) {
                papers.push({
                    paperId: p.paperId,
                    title: p.title || '(untitled)',
                    year: p.year || '',
                    venue: p.venue || '',
                    citationCount: p.citationCount || 0,
                    link: this.paperLink(p)
                });
            }
            if (data.next === undefined || data.next === null || (data.data || []).length === 0) break;
            offset = data.next;
            await this.delay(400);
        }

        await this.delay(600);

        // 引用总量口径：S2 的 author.citationCount 是预计算的作者级聚合值，更新会滞后于
        // 逐篇 citationCount；而站点（/me/research 与作者页）展示的是按论文实时聚合的结果，
        // 两者可能相差数条（实测某作者：作者级 120 vs 逐篇求和 126）。
        // 插件本来就要拉全部论文用于追踪逐篇变化，因此这里优先用逐篇求和，使显示数字与站点一致。
        // 仅当论文列表被分页上限截断（papers.length < paperCount）时，才退回作者级聚合值以免少算。
        const papersCitationsSum = papers.reduce((sum, p) => sum + (p.citationCount || 0), 0);
        const paperListComplete = papers.length >= (info.paperCount || 0);
        const totalCitations = paperListComplete
            ? Math.max(papersCitationsSum, info.citationCount || 0)
            : (info.citationCount || 0);
        console.log(
            `📈 [S2] ${info.name || author.authorId} 引用总量：逐篇求和=${papersCitationsSum}，` +
            `作者级=${info.citationCount || 0} → 采用 ${totalCitations}` +
            `${paperListComplete ? '' : '（论文列表不完整，退回作者级）'}`
        );

        // 3. Carry over display state and per-paper baselines (stable paperId keys)
        const updated = {
            ...author,
            authorId: author.authorId,
            name: info.name || author.name,
            affiliation: (info.affiliations || []).join(', ') || author.affiliation,
            url: `https://www.semanticscholar.org/author/${author.authorId}`,
            totalCitations,
            hIndex: info.hIndex || 0,
            paperCount: info.paperCount || papers.length,
            papers,
            seenCiters: author.seenCiters || {},
            history: author.history || []
        };

        // Expire unread change data after 7 days (same window as GS module)
        if (author.changeTimestamp && !this.isChangeRecent(author.changeTimestamp)) {
            updated.hasNewCitations = false;
            updated.previousCitations = undefined;
            updated.changeTimestamp = undefined;
            updated.paperChanges = [];
        }

        // 4. Detect fresh deltas, merge into accumulated (unread) change list
        const freshChanges = this.diffAuthorState(author, updated);
        if (freshChanges.length > 0) {
            updated.paperChanges = this.mergePaperChanges(author.paperChanges, freshChanges);
            updated.hasNewCitations = true;
            updated.previousCitations = author.totalCitations;
            updated.changeTimestamp = new Date().toISOString();
        }

        // 5. Citation details for freshly changed papers + baseline warmup.
        // On fresh add (silentBaseline) skip details: the first fetch is the baseline,
        // so nothing is misreported as "new" the moment tracking starts.
        if (!silentBaseline) {
            await this.enrichFreshChanges(updated, freshChanges);
        }
        await this.warmupBaselines(updated);

        return updated;
    }

    // For each freshly changed paper: diff its citing list against the stored baseline
    async enrichFreshChanges(updated, freshChanges) {
        if (freshChanges.length === 0) return;

        for (const fresh of freshChanges) {
            const change = (updated.paperChanges || []).find(c => c.paperId === fresh.paperId);
            const paper = updated.papers.find(p => p.paperId === fresh.paperId);
            if (!change || !paper) continue;

            if (change.newCitations > this.MAX_BASELINE_CITATIONS) {
                change.detailSkipped = 'too_many';
                change.newCiters = change.newCiters || [];
                continue;
            }

            const hasBaseline = Array.isArray(updated.seenCiters[change.paperId]);

            try {
                const citers = await this.fetchCitingPapers(paper);
                const currentIds = citers.map(c => c.paperId);

                if (!hasBaseline && change.oldCitations === 0) {
                    // 0 -> N: every current citer is genuinely new
                    change.newCiters = this.mergeNewCiters(change.newCiters || [], citers);
                } else if (!hasBaseline) {
                    // No baseline yet: this fetch silently becomes the baseline
                    change.newCiters = change.newCiters || [];
                    console.log(`🔥 [S2] 建立基线: ${change.title.substring(0, 40)} (${currentIds.length} 篇)`);
                } else {
                    const prevSet = new Set(updated.seenCiters[change.paperId]);
                    const freshCiters = citers.filter(c => !prevSet.has(c.paperId));
                    change.newCiters = this.mergeNewCiters(change.newCiters || [], freshCiters);
                    console.log(`✅ [S2] ${change.title.substring(0, 40)} 新增引用者 ${freshCiters.length} 篇`);
                }

                updated.seenCiters[change.paperId] = currentIds.length > this.SEEN_CITERS_CAP
                    ? currentIds.slice(-this.SEEN_CITERS_CAP)
                    : currentIds;
                change.fetchFailed = false;
                change.detailSkipped = undefined;
            } catch (err) {
                console.warn(`⚠️ [S2] 获取引用明细失败 (${change.title.substring(0, 30)}):`, err.message);
                change.fetchFailed = true;
                change.newCiters = change.newCiters || [];
                if (err.message === 'S2_NOT_FOUND') {
                    change.detailSkipped = 'not_found';
                }
            }

            await this.delay(600);
        }
    }

    // Silently build baselines for eligible papers that don't have one yet
    // (spread over refresh cycles, same strategy as the GS module's initializeBaseline)
    async warmupBaselines(updated) {
        const eligible = (updated.papers || []).filter(p =>
            p.citationCount > 0 &&
            p.citationCount <= this.MAX_BASELINE_CITATIONS &&
            !Array.isArray(updated.seenCiters[p.paperId])
        );
        if (eligible.length === 0) return;

        const toInit = eligible.slice(0, this.WARMUP_PER_REFRESH);
        console.log(`📊 [S2] 基线预热 ${toInit.length}/${eligible.length} 篇`);

        for (const paper of toInit) {
            try {
                const citers = await this.fetchCitingPapers(paper);
                const ids = citers.map(c => c.paperId);
                updated.seenCiters[paper.paperId] = ids.length > this.SEEN_CITERS_CAP
                    ? ids.slice(-this.SEEN_CITERS_CAP)
                    : ids;
            } catch (err) {
                console.warn(`⚠️ [S2] 预热失败 (${paper.title.substring(0, 30)}):`, err.message);
                // Rate-limited: stop this cycle, continue next refresh
                if (String(err.message).includes('429')) break;
            }
            await this.delay(600);
        }
    }

    // Fetch the citing-paper list of one paper (up to maxPages x 1000)
    async fetchCitingPapers(paper, maxPages = this.MAX_BASELINE_PAGES) {
        const citers = [];
        let offset = 0;
        for (let page = 0; page < maxPages; page++) {
            const data = await this.s2Fetch(
                `/paper/${paper.paperId}/citations?fields=title,year,authors,externalIds,venue` +
                `&limit=${this.CITATIONS_PAGE_SIZE}&offset=${offset}`
            );
            for (const row of (data.data || [])) {
                const cp = row.citingPaper;
                if (!cp || !cp.paperId) continue;
                citers.push({
                    paperId: cp.paperId,
                    title: cp.title || '(untitled)',
                    year: cp.year || '',
                    authors: this.formatAuthors(cp.authors),
                    venue: cp.venue || '',
                    link: this.citerLink(cp)
                });
            }
            if (data.next === undefined || data.next === null || (data.data || []).length === 0) break;
            offset = data.next;
            await this.delay(400);
        }
        return citers;
    }

    mergeNewCiters(existing, freshCiters) {
        const seen = new Set(existing.map(c => c.paperId));
        const merged = [...existing];
        for (const c of freshCiters) {
            if (seen.has(c.paperId)) continue;
            merged.push({ ...c, firstSeenAt: new Date().toISOString() });
            seen.add(c.paperId);
            if (merged.length >= this.MAX_NEW_CITERS_PER_EVENT) break;
        }
        return merged;
    }

    // Accumulate: keep the first oldCitations and previously collected newCiters,
    // update to the latest newCitations (same pattern as GS mergePaperChanges)
    mergePaperChanges(existing, newChanges) {
        const map = new Map();
        (existing || []).forEach(c => map.set(c.paperId, { ...c }));
        newChanges.forEach(nc => {
            const ec = map.get(nc.paperId);
            if (ec) {
                map.set(nc.paperId, {
                    ...nc,
                    oldCitations: ec.oldCitations,
                    change: nc.newCitations - ec.oldCitations,
                    newCiters: ec.newCiters || [],
                    fetchFailed: ec.fetchFailed,
                    detailSkipped: ec.detailSkipped,
                    firstSeenAt: ec.firstSeenAt
                });
            } else {
                map.set(nc.paperId, { ...nc, firstSeenAt: new Date().toISOString() });
            }
        });
        return Array.from(map.values());
    }

    // === Helpers ===
    paperLink(p) {
        const ext = p.externalIds || {};
        if (ext.DOI) return `https://doi.org/${ext.DOI}`;
        if (ext.ArXiv) return `https://arxiv.org/abs/${ext.ArXiv}`;
        return p.paperId ? `https://www.semanticscholar.org/paper/${p.paperId}` : '';
    }

    citerLink(cp) {
        const ext = cp.externalIds || {};
        if (ext.DOI) return `https://doi.org/${ext.DOI}`;
        if (ext.ArXiv) return `https://arxiv.org/abs/${ext.ArXiv}`;
        return `https://www.semanticscholar.org/paper/${cp.paperId}`;
    }

    formatAuthors(authors) {
        if (!Array.isArray(authors) || authors.length === 0) return '';
        const names = authors.map(a => a.name).filter(Boolean);
        if (names.length <= 3) return names.join(', ');
        return names.slice(0, 3).join(', ') + ', et al.';
    }

    isChangeRecent(changeTimestamp) {
        if (!changeTimestamp) return false;
        const hoursDiff = (Date.now() - new Date(changeTimestamp).getTime()) / (1000 * 60 * 60);
        return hoursDiff < 24 * 7;
    }

    appendHistorySnapshot(author, citations, hIndex) {
        if (!author.history) author.history = [];
        const now = new Date();
        const last = author.history[author.history.length - 1];
        const lastDate = last ? new Date(last.timestamp) : null;
        const isSameDay = lastDate &&
            lastDate.getFullYear() === now.getFullYear() &&
            lastDate.getMonth() === now.getMonth() &&
            lastDate.getDate() === now.getDate();

        if (isSameDay) {
            last.citations = citations;
            last.hIndex = hIndex;
            last.timestamp = now.toISOString();
            return;
        }
        author.history.push({ timestamp: now.toISOString(), citations, hIndex });
    }

    // === Notification (dedupe by content hash + cooldown, same pattern as GS) ===
    async notifyChanges(allChanges) {
        const prev = await new Promise(resolve => {
            chrome.storage.local.get(['s2NotificationHash', 's2NotificationTime'], r => resolve({
                hash: r.s2NotificationHash || null,
                time: r.s2NotificationTime || 0
            }));
        });
        if (Date.now() - prev.time < this.notificationCooldown) return;

        const hash = JSON.stringify(allChanges.map(c => ({
            n: c.name, o: c.oldCitations, w: c.newCitations,
            p: (c.paperChanges || []).map(p => `${p.paperId}:${p.oldCitations}->${p.newCitations}`).sort()
        })));
        if (hash === prev.hash) return;

        let message;
        if (allChanges.length === 1) {
            const first = allChanges[0];
            const totalPapers = (first.paperChanges || []).filter(p => p.change > 0).length;
            const totalNewCiters = (first.paperChanges || []).reduce((s, p) => s + (p.newCiters || []).length, 0);
            message = t('s2_notify_single', {
                name: first.name, old: first.oldCitations, new: first.newCitations,
                increase: Math.max(0, first.newCitations - first.oldCitations)
            });
            if (totalPapers > 0) {
                message += '\n' + t('s2_notify_papers', { count: totalPapers, citerCount: totalNewCiters });
            }
        } else {
            message = t('s2_notify_multi', { count: allChanges.length });
        }

        try {
            await chrome.notifications.create('s2-citation-update', {
                type: 'basic',
                iconUrl: 'icon48.png',
                title: t('s2_notify_title'),
                message
            });
            await new Promise(resolve => chrome.storage.local.set({
                s2NotificationHash: hash,
                s2NotificationTime: Date.now()
            }, resolve));
            console.log('🔔 [S2] 变化通知已发送');
        } catch (err) {
            console.warn('[S2] 通知发送失败:', err.message);
        }
    }
}

// Expose for the service worker (importScripts) and the Node dry-run harness
if (typeof self !== 'undefined') {
    self.S2BackgroundService = S2BackgroundService;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = S2BackgroundService;
}
