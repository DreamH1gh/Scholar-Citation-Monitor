// popup.js - 修复版本，确保论文变化检测正常工作
class ScholarMonitor {
constructor() {
    this.scholarDomains = [
        'scholar.google.com',
        'scholar.google.com.hk',
        'scholar.google.com.sg', 
        'scholar.google.co.jp',
        'scholar.google.co.uk',
        'scholar.google.com.tw',
        'scholar.google.de',
        'scholar.google.fr',
        'scholar.google.ca',
        'scholar.google.cn'
    ];
    // 公告版本号：有新内容时 bump，所有用户会再看一次
    this.UPDATE_ANNOUNCEMENT_VERSION = 2;
    this.init();
}

async applyLanguage() {
    I18n.currentLang = await I18n.getLanguage();
    const langSelect = document.getElementById('langSelect');
    if (langSelect) langSelect.value = I18n.currentLang;

    document.getElementById('authorUrl').placeholder = t('input_placeholder');
    document.getElementById('addBtn').textContent = t('btn_add');
    document.getElementById('refreshBtn').textContent = t('btn_refresh');

    const labelLanguageText = document.getElementById('labelLanguageText');
    if (labelLanguageText) labelLanguageText.textContent = t('label_language');
    const labelShowHistoryText = document.getElementById('labelShowHistoryText');
    if (labelShowHistoryText) labelShowHistoryText.textContent = t('label_show_history');
    const labelCitationDetailsText = document.getElementById('labelCitationDetailsText');
    if (labelCitationDetailsText) labelCitationDetailsText.textContent = t('label_citation_details');
    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) settingsBtn.title = t('label_settings');
    const showHistoryToggle = document.getElementById('showHistoryToggle');
    if (showHistoryToggle) showHistoryToggle.checked = this.showHistory;
    const citationDetailsToggle = document.getElementById('citationDetailsToggle');
    if (citationDetailsToggle) citationDetailsToggle.checked = this.enableCitationDetails;

    await this.loadAuthors();
    this.updateLastUpdateTime();
    this.updateStatsSummary();
    // banner 文案也需要随语言刷新（init 时已加载，这里覆盖切语言的场景）
    await this.loadAntiCrawlBanner();
}

async init() {
    this.showHistory = await this.getShowHistory();
    this.enableCitationDetails = await this.getEnableCitationDetails();
    await this.applyLanguage();
    this.bindEvents();
    this.startStorageListener();
    await this.loadAntiCrawlBanner();

    // 更新公告：版本号不匹配时弹一次（覆盖引用历史 + 新增引用追踪两项更新）
    // 用公告替代 warmup init 检查，避免升级用户连弹两个模态
    const lastAnnouncement = await this.getLastUpdateAnnouncementVersion();
    if (lastAnnouncement !== this.UPDATE_ANNOUNCEMENT_VERSION) {
        this.showUpdateAnnouncement();
        await this.setLastUpdateAnnouncementVersion(this.UPDATE_ANNOUNCEMENT_VERSION);
        // 公告已包含 warmup 说明，标记 warmup 已提示，避免用户在公告还开着时
        // 去开 toggle 又叠一个 warmup 模态
        await this.setWarmupNoticeShown(true);
    }
}

// 反爬告警：检测到 Scholar 反爬后，background 把被拦的引用列表页 URL 存入 storage
// popup 打开时读出，24h 内有效，提示用户在浏览器里手动通过机器人验证
// （Scholar 验证是 cookie 级别，验证后扩展后续 fetch 会带上同 cookie 的验证态）
async loadAntiCrawlBanner() {
    const alert = await this.getAntiCrawlAlert();
    const banner = document.getElementById('antiCrawlBanner');
    if (!banner) return;

    if (!alert) {
        banner.style.display = 'none';
        banner.innerHTML = '';
        return;
    }

    // 24h 过期：避免用户长期不开 popup 时看到陈旧告警
    const ageMs = Date.now() - (alert.timestamp || 0);
    if (ageMs > 24 * 60 * 60 * 1000) {
        await this.clearAntiCrawlAlert();
        banner.style.display = 'none';
        banner.innerHTML = '';
        return;
    }

    const paperSnippet = alert.paperTitle
        ? alert.paperTitle.length > 80 ? alert.paperTitle.substring(0, 80) + '...' : alert.paperTitle
        : '';
    const authorName = alert.authorName || '';

    banner.innerHTML = `
        <button class="anticrawl-dismiss-btn" title="${t('anticrawl_dismiss')}">×</button>
        <div class="anticrawl-title">${t('anticrawl_title')}</div>
        <div class="anticrawl-body">${t('anticrawl_body')}</div>
        ${paperSnippet ? `
            <div class="anticrawl-paper">
                ${authorName ? `<strong>${authorName}</strong> · ` : ''}${paperSnippet}
            </div>
        ` : ''}
        <div class="anticrawl-actions">
            <button class="anticrawl-open-btn">📖 ${t('anticrawl_open')}</button>
            <button class="anticrawl-verified-btn">✓ ${t('anticrawl_verified')}</button>
        </div>
    `;
    banner.style.display = 'block';

    banner.querySelector('.anticrawl-dismiss-btn').addEventListener('click', async () => {
        await this.clearAntiCrawlAlert();
        banner.style.display = 'none';
        banner.innerHTML = '';
    });
    banner.querySelector('.anticrawl-open-btn').addEventListener('click', async () => {
        if (alert.citingUrl) {
            chrome.tabs.create({ url: alert.citingUrl });
        }
        // 不清告警、不隐藏 banner：用户在新 tab 完成验证后，
        // 回来点"已验证"按钮触发刷新补基线
    });
    banner.querySelector('.anticrawl-verified-btn').addEventListener('click', async () => {
        // 先清 alert + 隐藏 banner，给即时反馈
        // 若 refresh 仍被反爬，background 会重新 setAntiCrawlAlert，
        // storage onChanged 监听器会再次显示 banner
        await this.clearAntiCrawlAlert();
        banner.style.display = 'none';
        banner.innerHTML = '';
        // 立即触发刷新：executeAutoRefresh 会跑 initializeBaseline，
        // 趁 Scholar 验证态还没过期把失败的基线补上（不 await，让 background 慢慢跑）
        this.refreshAll();
    });
}

async getAntiCrawlAlert() {
    return new Promise((resolve) => {
        chrome.storage.local.get('antiCrawlAlert', (result) => {
            resolve(result.antiCrawlAlert || null);
        });
    });
}

async clearAntiCrawlAlert() {
    return new Promise((resolve) => {
        chrome.storage.local.remove('antiCrawlAlert', resolve);
    });
}

startStorageListener() {
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local' && changes.authors) {
            console.log('检测到后台数据更新，刷新界面...');
            this.loadAuthors();
            this.updateStatsSummary();
        }

        if (namespace === 'local' && changes.lastUpdateTime) {
            this.updateLastUpdateTime();
        }

        // 反爬告警变化：手动刷新触发反爬时，banner 立即显示
        if (namespace === 'local' && 'antiCrawlAlert' in changes) {
            this.loadAntiCrawlBanner();
        }
    });
    
    setInterval(() => {
        this.updateLastUpdateTime();
    }, 60000);
}

bindEvents() {
    document.getElementById('addBtn').addEventListener('click', () => this.addAuthor());
    document.getElementById('refreshBtn').addEventListener('click', () => this.refreshAll());
    document.getElementById('authorUrl').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.addAuthor();
    });
    document.getElementById('langSelect').addEventListener('change', async (e) => {
        await I18n.setLanguage(e.target.value);
        await this.applyLanguage();
    });

    const settingsBtn = document.getElementById('settingsBtn');
    const settingsPanel = document.getElementById('settingsPanel');
    settingsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = settingsPanel.classList.toggle('open');
        settingsBtn.classList.toggle('active', isOpen);
    });
    document.getElementById('showHistoryToggle').addEventListener('change', async (e) => {
        this.showHistory = e.target.checked;
        await this.setShowHistory(this.showHistory);
        await this.loadAuthors();
    });
    const citationDetailsToggle = document.getElementById('citationDetailsToggle');
    if (citationDetailsToggle) {
        citationDetailsToggle.addEventListener('change', async (e) => {
            this.enableCitationDetails = e.target.checked;
            await this.setEnableCitationDetails(this.enableCitationDetails);
            // 首次开启时提示一次：第一次刷新用于建立基线，明细从第二次起展示
            if (e.target.checked) {
                const shown = await this.getWarmupNoticeShown();
                if (!shown) {
                    this.showWarmupNotice();
                    await this.setWarmupNoticeShown(true);
                }
            }
            await this.loadAuthors();
        });
    }
    document.addEventListener('click', (e) => {
        if (settingsPanel.classList.contains('open') &&
            !settingsPanel.contains(e.target) &&
            e.target !== settingsBtn) {
            settingsPanel.classList.remove('open');
            settingsBtn.classList.remove('active');
        }
    });
}

async addAuthor() {
    const url = document.getElementById('authorUrl').value.trim();
    if (!url) return;

    if (!this.isValidScholarUrl(url)) {
        alert(t('alert_invalid_url'));
        return;
    }

    try {
        const addBtn = document.getElementById('addBtn');
        const originalText = addBtn.textContent;
        addBtn.textContent = t('btn_adding');
        addBtn.disabled = true;

        // 获取完整的作者信息，包括所有论文
        const authorInfo = await this.fetchCompleteAuthorInfo(url);
        await this.saveAuthor(authorInfo);
        
        await this.setLastUpdateTime();
        
        document.getElementById('authorUrl').value = '';
        await this.loadAuthors();
        this.updateStatsSummary();
        this.updateLastUpdateTime();

        addBtn.textContent = originalText;
        addBtn.disabled = false;
    } catch (error) {
        alert(t('alert_fetch_failed', {error: error.message}));
        document.getElementById('addBtn').textContent = t('btn_add');
        document.getElementById('addBtn').disabled = false;
    }
}

isValidScholarUrl(url) {
    return this.scholarDomains.some(domain => 
        url.includes(domain) && url.includes('user=')
    );
}

// 获取完整作者信息（真正获取所有论文）
async fetchCompleteAuthorInfo(originalUrl) {
    const userMatch = originalUrl.match(/user=([^&]+)/);
    if (!userMatch) {
        throw new Error('URL中未找到user参数');
    }
    const userId = userMatch[1];
    
    for (const domain of this.scholarDomains) {
        const baseUrl = `https://${domain}/citations?user=${userId}`;
        
        try {
            console.log(`尝试域名: ${domain}`);
            
            // 第一步：获取基本信息
            const basicInfo = await this.fetchBasicAuthorInfo(baseUrl);
            
            // 第二步：获取所有论文
            console.log(`开始获取 ${basicInfo.name} 的完整论文列表...`);
            const allPapers = await this.fetchAllPapersRecursively(baseUrl, userId, domain);
            
            const result = {
                ...basicInfo,
                papers: allPapers,
                totalPapers: allPapers.length,
                url: baseUrl,
                workingDomain: domain,
                lastUpdated: new Date().toISOString(),
                userId: userId
            };
            
            console.log(`✅ 成功获取 ${basicInfo.name} 的完整信息: ${allPapers.length} 篇论文`);
            return result;
            
        } catch (error) {
            console.log(`域名 ${domain} 失败:`, error.message);
            continue;
        }
    }
    
    throw new Error('所有Google Scholar域名都无法访问，请检查网络连接或稍后重试');
}

// 获取基本作者信息（姓名、机构、引用数等）
async fetchBasicAuthorInfo(url) {
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
            'Cache-Control': 'no-cache'
        }
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    return this.parseBasicInfo(html);
}

// 解析基本信息
parseBasicInfo(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // 提取作者姓名
    const nameElement = doc.querySelector('#gsc_prf_in');
    if (!nameElement) {
        throw new Error('无法找到作者姓名');
    }
    const name = nameElement.textContent.trim();

    // 提取机构信息
    const affiliationElement = doc.querySelector('#gsc_prf_i .gsc_prf_il');
    const affiliation = affiliationElement ? affiliationElement.textContent.trim() : t('unknown_institution');

    // 提取研究兴趣
    const interestsElements = doc.querySelectorAll('#gsc_prf_int a.gs_ibl');
    const interests = Array.from(interestsElements).map(el => el.textContent.trim()).join(', ') || t('unknown_fields');

    // 尝试提取引用数据 - 增强版，支持零引用情况
    let totalCitations = 0;
    let hIndex = 0;
    let i10Index = 0;

    try {
        // 方法1：标准表格解析
        const citationTable = doc.querySelector('#gsc_rsb_st');
        if (citationTable) {
            const citationRows = citationTable.querySelectorAll('tbody tr');
            
            if (citationRows.length >= 3) {
                // 安全地解析每一行的数据
                totalCitations = this.parseTableCellValue(citationRows[0]);
                hIndex = this.parseTableCellValue(citationRows[1]);
                i10Index = this.parseTableCellValue(citationRows[2]);
                
                console.log(`标准表格解析成功: 总引用=${totalCitations}, H指数=${hIndex}, i10指数=${i10Index}`);
            } else {
                console.log(`表格行数不足: ${citationRows.length}, 尝试备用方法`);
                throw new Error('表格行数不足');
            }
        } else {
            console.log('未找到引用统计表格，尝试备用方法');
            throw new Error('未找到引用统计表格');
        }
    } catch (error) {
        console.log('标准解析失败，使用备用方法:', error.message);
        
        // 方法2：备用解析 - 查找所有可能的引用数据
        const citationData = this.parseAlternativeCitationData(doc, html);
        totalCitations = citationData.totalCitations;
        hIndex = citationData.hIndex;
        i10Index = citationData.i10Index;
    }

    return {
        name,
        affiliation,
        interests,
        totalCitations,
        hIndex,
        i10Index
    };
}

// 新增：安全地解析表格单元格的值
parseTableCellValue(row) {
    try {
        const cell = row.querySelector('.gsc_rsb_std');
        if (!cell) {
            console.log('未找到 .gsc_rsb_std 单元格');
            return 0;
        }
        
        const textContent = cell.textContent || cell.innerText || '';
        const cleanText = textContent.trim();
        
        // 处理各种空值情况
        if (!cleanText || 
            cleanText === '' || 
            cleanText === '&nbsp;' || 
            cleanText === '-' || 
            cleanText === '—' ||
            cleanText === 'N/A') {
            return 0;
        }
        
        // 移除逗号并解析数字
        const numericValue = cleanText.replace(/[,\s]/g, '');
        const parsed = parseInt(numericValue);
        
        // 如果解析失败或为负数，返回0
        return (isNaN(parsed) || parsed < 0) ? 0 : parsed;
        
    } catch (error) {
        console.log('解析表格单元格失败:', error);
        return 0;
    }
}

// 新增：备用引用数据解析方法
parseAlternativeCitationData(doc, html) {
    console.log('使用备用方法解析引用数据...');
    
    try {
        // 方法2a：查找所有包含数字的统计相关元素
        const allStatElements = doc.querySelectorAll('.gsc_rsb_std, .gs_ibl, [class*="stat"], [class*="citation"]');
        const foundNumbers = [];
        
        allStatElements.forEach(element => {
            const text = element.textContent.trim();
            const number = parseInt(text.replace(/[,\s]/g, ''));
            if (!isNaN(number) && number >= 0) {
                foundNumbers.push(number);
            }
        });
        
        if (foundNumbers.length >= 3) {
            console.log('通过备用方法找到数字:', foundNumbers);
            return {
                totalCitations: foundNumbers[0] || 0,
                hIndex: foundNumbers[1] || 0,
                i10Index: foundNumbers[2] || 0
            };
        }
        
        // // 方法2b：正则表达式搜索
        // const citationMatches = html.match(/Citations[^0-9]*(\d+)/i);
        // const hIndexMatches = html.match(/h-index[^0-9]*(\d+)/i);
        // const i10IndexMatches = html.match(/i10-index[^0-9]*(\d+)/i);
        
        // if (citationMatches || hIndexMatches || i10IndexMatches) {
        //     const totalCitations = citationMatches ? parseInt(citationMatches[1]) : 0;
        //     const hIndex = hIndexMatches ? parseInt(hIndexMatches[1]) : 0;
        //     const i10Index = i10IndexMatches ? parseInt(i10IndexMatches[1]) : 0;
            
        //     console.log('通过正则表达式解析成功:', {totalCitations, hIndex, i10Index});
        //     return { totalCitations, hIndex, i10Index };
        // }
        
        // 方法2c：检查是否是完全没有引用的新用户
        if (html.includes('gsc_prf_in') && 
            (html.includes('Citations') || html.includes('引用'))) {
            console.log('检测到零引用的新用户');
            return {
                totalCitations: 0,
                hIndex: 0,
                i10Index: 0
            };
        }
        
        throw new Error('所有备用解析方法都失败');
        
    } catch (error) {
        console.log('备用解析方法失败:', error.message);
        
        // 最终兜底：返回零值
        console.log('使用最终兜底方案：返回零值');
        return {
            totalCitations: 0,
            hIndex: 0,
            i10Index: 0
        };
    }
}


// 递归获取所有论文（真正的完整获取）
async fetchAllPapersRecursively(baseUrl, userId, domain, startIndex = 0, pageSize = 100) {
    const allPapers = [];
    let currentIndex = startIndex;
    let hasMore = true;
    let consecutiveEmptyPages = 0;
    const maxEmptyPages = 1; // 连续1页为空就停止

    console.log(`📚 开始递归获取论文，起始索引: ${currentIndex}`);
    
    while (hasMore && consecutiveEmptyPages < maxEmptyPages) {
        try {
            // 构建分页URL
            const pageUrl = `https://${domain}/citations?user=${userId}&cstart=${currentIndex}&pagesize=${pageSize}&sortby=pubdate`;
            console.log(`📄 正在获取第 ${Math.floor(currentIndex/pageSize) + 1} 页 (索引 ${currentIndex}-${currentIndex + pageSize - 1})`);
            
            const response = await fetch(pageUrl, {
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
                    'Cache-Control': 'no-cache',
                    'Referer': baseUrl
                }
            });

            if (!response.ok) {
                console.log(`❌ 第 ${Math.floor(currentIndex/pageSize) + 1} 页请求失败: ${response.status}`);
                break;
            }

            const html = await response.text();
            const pagePapers = this.extractPapersFromHtml(html, currentIndex);
            
            if (pagePapers.length === 0) {
                consecutiveEmptyPages++;
                console.log(`⚠️ 第 ${Math.floor(currentIndex/pageSize) + 1} 页无论文数据 (连续空页: ${consecutiveEmptyPages})`);
                
                if (consecutiveEmptyPages >= maxEmptyPages) {
                    console.log(`🛑 连续 ${maxEmptyPages} 页无数据，停止获取`);
                    break;
                }
            } else {
                consecutiveEmptyPages = 0; // 重置空页计数器
                allPapers.push(...pagePapers);
                console.log(`✅ 第 ${Math.floor(currentIndex/pageSize) + 1} 页获取成功: ${pagePapers.length} 篇论文`);
            }
            
            // 检查是否还有更多页面
            const hasMorePages = this.checkHasMorePages(html);
            if (!hasMorePages && pagePapers.length < pageSize) {
                console.log(`📋 已到达最后一页，总共获取 ${allPapers.length} 篇论文`);
                hasMore = false;
            } else {
                currentIndex += pageSize;
                // 添加延迟避免请求过于频繁
                await new Promise(resolve => setTimeout(resolve, 1500));
            }
            
        } catch (error) {
            console.error(`❌ 获取第 ${Math.floor(currentIndex/pageSize) + 1} 页失败:`, error);
            consecutiveEmptyPages++;
            
            if (consecutiveEmptyPages >= maxEmptyPages) {
                break;
            }
            
            currentIndex += pageSize;
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
    
    console.log(`🎉 论文获取完成！总计: ${allPapers.length} 篇`);
    return allPapers;
}

// 从HTML中提取论文信息
extractPapersFromHtml(html, startIndex = 0) {
    const papers = [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    const paperElements = doc.querySelectorAll('#gsc_a_b .gsc_a_tr');
    
    paperElements.forEach((element, index) => {
        try {
            const titleElement = element.querySelector('.gsc_a_at');
            const citationElement = element.querySelector('.gsc_a_ac');
            const yearElement = element.querySelector('.gsc_a_h');
            
            if (titleElement) {
                const title = titleElement.textContent.trim();
                const citations = citationElement ? parseInt(citationElement.textContent.trim()) || 0 : 0;
                const year = yearElement ? yearElement.textContent.trim() : '';
                const link = titleElement.getAttribute('href');
                
                papers.push({
                    title,
                    citations,
                    year,
                    link: link ? `https://scholar.google.com${link}` : '',
                    index: startIndex + index
                });
            }
        } catch (error) {
            console.log(`解析第${startIndex + index}篇论文失败:`, error);
        }
    });
    
    return papers;
}

// 检查是否还有更多页面
checkHasMorePages(html) {
    // 方法1: 检查"Show more"按钮
    if (html.includes('gsc_bpf_more') || html.includes('Show more')) {
        return true;
    }
    
    // 方法2: 检查分页导航
    if (html.includes('Next') || html.includes('下一页')) {
        return true;
    }
    
    // 方法3: 检查是否有论文表格但没有结束标志
    const hasTable = html.includes('gsc_a_b');
    const hasEndMarker = html.includes('No more articles') || html.includes('没有更多文章');
    
    return hasTable && !hasEndMarker;
}

// 手动刷新：委托给 background 走完整 autoRefresh 流程（含 enrichCitationDetails）
async refreshAll() {
    const authors = await this.getStoredAuthors();
    if (authors.length === 0) {
        alert(t('alert_no_authors'));
        return;
    }

    // 在刷新前先清理过期的变化数据
    let hasExpiredChanges = false;
    authors.forEach(author => {
        if (author.changeTimestamp && !this.isChangeRecent(author.changeTimestamp)) {
            console.log(`刷新前清除 ${author.name} 的过期变化数据`);
            author.hasNewCitations = false;
            delete author.previousCitations;
            delete author.changeTimestamp;
            delete author.paperChanges;
            hasExpiredChanges = true;
        }
    });

    if (hasExpiredChanges) {
        await this.saveAuthors(authors);
    }

    const refreshBtn = document.getElementById('refreshBtn');
    const originalText = refreshBtn.textContent;
    refreshBtn.textContent = t('btn_refreshing');
    refreshBtn.disabled = true;

    let successCount = 0;
    let errorCount = 0;
    let failedAuthors = [];

    try {
        const response = await chrome.runtime.sendMessage({action: 'manualRefresh'});
        if (response && response.success && response.result) {
            successCount = response.result.successCount || 0;
            errorCount = response.result.errorCount || 0;
            failedAuthors = response.result.errors || [];
        } else {
            // background 抛错被 handleMessage 外层 catch 捕获，或返回 success:false
            const errMsg = (response && response.error) || 'background 处理失败';
            console.error('手动刷新失败:', errMsg);
            errorCount = authors.length;
            failedAuthors = authors.map(a => ({name: a.name, error: errMsg}));
        }
    } catch (e) {
        console.error('手动刷新异常:', e);
        errorCount = authors.length;
        failedAuthors = authors.map(a => ({name: a.name, error: e.message}));
    }

    refreshBtn.textContent = originalText;
    refreshBtn.disabled = false;

    await this.setLastUpdateTime();

    if (errorCount > 0) {
        let message = t('refresh_result', {success: successCount, fail: errorCount});

        if (errorCount <= 3) {
            const failedNames = failedAuthors.map(f => f.name).join(', ');
            message += '\n\n' + t('refresh_failed_authors', {names: failedNames});
        }

        alert(message);
    }

    this.updateLastUpdateTime();
    this.updateStatsSummary();
}

// 比较论文变化
comparePapers(oldPapers, newPapers) {
    const changes = [];
    
    // 创建旧论文的映射表
    const oldPaperMap = new Map();
    oldPapers.forEach(paper => {
        // 使用标题作为唯一标识
        oldPaperMap.set(paper.title, paper);
    });
    
    // 检查每篇新论文的引用变化
    newPapers.forEach(newPaper => {
        const oldPaper = oldPaperMap.get(newPaper.title);
        if (oldPaper && newPaper.citations !== oldPaper.citations) {
            const change = newPaper.citations - oldPaper.citations;
            changes.push({
                title: newPaper.title,
                oldCitations: oldPaper.citations,
                newCitations: newPaper.citations,
                change: change,
                year: newPaper.year,
                link: newPaper.link
            });
        }
    });
    
    // 按变化量排序（从大到小）
    changes.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
    
    return changes;
}

// 从 paper.link 提取 Scholar 稳定论文 ID，作为 mergePaperMetadata 主键
// title 字符串匹配不可靠（HTML 实体、空白、Scholar 改标题都会让 title 变）
extractPaperId(link) {
    if (!link) return null;
    const m = link.match(/citation_for_view=([^&]+)/);
    return m ? m[1] : null;
}

async showPaperChanges(userId) {
    const authors = await this.getStoredAuthors();
    const author = authors.find(a => a.userId === userId);

    if (!author || !author.paperChanges || author.paperChanges.length === 0) {
        alert(t('alert_no_paper_changes'));
        return;
    }

    // 用 title → paper 映射查 warmedUp 状态，判断无数据时属于哪种情况
    const paperMap = new Map();
    (author.papers || []).forEach(p => paperMap.set(p.title, p));

    const modal = document.createElement('div');
    modal.className = 'paper-changes-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>${t('paper_changes_title', {name: author.name, count: author.paperChanges.length})}</h3>
                <button class="close-btn">×</button>
            </div>
            <div class="modal-body">
                ${author.paperChanges.map(change => {
                    const newCiters = change.newCiters || [];
                    const hasData = newCiters.length > 0;
                    return `
                        <div class="paper-change-item">
                            <div class="paper-title${change.link ? ' is-link' : ''}" ${change.link ? `data-link="${change.link}" title="${t('view_details')}"` : ''}>${change.title}</div>
                            <div class="paper-info">
                                <span class="paper-year">${change.year}</span>
                                <span class="citation-change ${change.change > 0 ? 'positive' : 'negative'}">
                                    ${change.oldCitations} → ${change.newCitations} (${change.change > 0 ? '+' : ''}${change.change})
                                </span>
                            </div>
                            ${hasData ? `
                                <div class="new-citers-block">
                                    <div class="new-citers-header">
                                        <span>${t('new_citers_toggle', {count: newCiters.length})}</span>
                                        <span class="arrow">▶</span>
                                    </div>
                                    <div class="new-citers-list" style="display:none;">
                                        ${newCiters.map(c => `
                                            <div class="citer-item">
                                                ${c.link ? `<a href="${c.link}" class="citer-title" data-link="${c.link}">${c.title}</a>` : `<span class="citer-title">${c.title}</span>`}
                                                <div class="citer-meta">${[c.authors, c.year].filter(Boolean).join(' · ')}</div>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            ` : `
                                <div class="new-citers-empty">${this.renderNoCitersReason(change, paperMap, author)}</div>
                            `}
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
    
    const closeBtn = modal.querySelector('.close-btn');
    closeBtn.addEventListener('click', () => {
        modal.remove();
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });

    modal.querySelectorAll('.new-citers-header').forEach(header => {
        header.addEventListener('click', () => {
            const list = header.nextElementSibling;
            if (!list) return;
            const expanded = list.style.display !== 'none';
            list.style.display = expanded ? 'none' : 'block';
            header.classList.toggle('expanded', !expanded);
        });
    });

    // popup 中 <a target="_blank"> 行为不稳定（popup 易失焦关闭导致打不开），
    // 改用 chrome.tabs.create 主动开新 tab；被引用论文标题同理
    modal.querySelectorAll('[data-link]').forEach(el => {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            const url = el.getAttribute('data-link');
            if (url) chrome.tabs.create({ url });
        });
    });

    document.body.appendChild(modal);
}

// 无新增引用明细时，根据状态给出具体原因
// （追踪关闭 / 作者级关闭 / 超阈值 / 抓取失败 / 预热中 / 真无新增）
renderNoCitersReason(change, paperMap, author) {
    let reason;
    if (!this.enableCitationDetails) {
        reason = t('reason_tracking_off');
    } else if (!author.citationDetailsEnabled) {
        reason = t('reason_author_off');
    } else if (change.newCitations > 100) {
        reason = t('reason_over_threshold');
    } else if (change.fetchFailed) {
        // 抓取失败（详情页解析失败/网络错/反爬未触发告警）：排在预热之前，
        // 因为预热失败时 warmedUp 也是 false，但失败信号更具体
        reason = t('reason_fetch_failed');
    } else {
        const paper = paperMap.get(change.title);
        if (!paper || !paper.warmedUp) {
            reason = t('reason_warmup');
        } else {
            reason = t('reason_no_new');
        }
    }
    return t('no_citers_status', {reason});
}

isChangeRecent(changeTimestamp) {
    if (!changeTimestamp) return false;
    const changeTime = new Date(changeTimestamp);
    const now = new Date();
    const hoursDiff = (now - changeTime) / (1000 * 60 * 60);
    return hoursDiff < 24 * 7;
}

async markAsRead(userId) {
    const authors = await this.getStoredAuthors();
    const author = authors.find(a => a.userId === userId);
    if (author) {
        author.hasNewCitations = false;
        delete author.previousCitations;
        delete author.changeTimestamp;
        delete author.paperChanges;
        await this.saveAuthors(authors);
        await this.loadAuthors();
        this.updateStatsSummary();
    }
}

openAuthorPage(url) {
    chrome.tabs.create({ url: url });
}

async saveAuthor(authorInfo) {
    const authors = await this.getStoredAuthors();

    const existingIndex = authors.findIndex(a => a.userId === authorInfo.userId);

    if (existingIndex >= 0) {
        // 保留旧的 history / 展开状态 / 区间选择，避免被整体覆盖
        authorInfo.history = authors[existingIndex].history || [];
        authorInfo.historyExpanded = authors[existingIndex].historyExpanded;
        authorInfo.historyRange = authors[existingIndex].historyRange;

        // 把旧 paper 的 seenCiterIds / warmedUp 迁到新 paper
        // 否则 re-add 时新 paper 列表会覆盖掉已有基线
        // 主键优先级：citation_for_view ID（稳定）→ title 字符串（fallback），
        // 避免 title 微小差异导致迁移失败、已预热论文反复重新初始化
        if (authors[existingIndex].papers && authorInfo.papers) {
            const oldByTitle = new Map();
            const oldById = new Map();
            authors[existingIndex].papers.forEach(p => {
                oldByTitle.set(p.title, p);
                const pid = this.extractPaperId(p.link);
                if (pid) oldById.set(pid, p);
            });
            authorInfo.papers.forEach(np => {
                const npId = this.extractPaperId(np.link);
                let op = npId ? oldById.get(npId) : null;
                if (!op) op = oldByTitle.get(np.title);
                if (!op) return;
                if (op.seenCiterIds) np.seenCiterIds = op.seenCiterIds;
                if (op.warmedUp) np.warmedUp = op.warmedUp;
            });
        }

        // 如果作者已存在，检查引用变化
        if (authorInfo.totalCitations !== authors[existingIndex].totalCitations) {
            authorInfo.hasNewCitations = true;
            authorInfo.previousCitations = authors[existingIndex].totalCitations;
            authorInfo.changeTimestamp = new Date().toISOString();

            // 比较论文变化
            if (authors[existingIndex].papers && authors[existingIndex].papers.length > 0) {
                authorInfo.paperChanges = this.comparePapers(authors[existingIndex].papers, authorInfo.papers);
            }
        }
        this.appendHistorySnapshot(authorInfo, authorInfo.totalCitations, authorInfo.hIndex, authorInfo.i10Index);
        authors[existingIndex] = authorInfo;
    } else {
        this.appendHistorySnapshot(authorInfo, authorInfo.totalCitations, authorInfo.hIndex, authorInfo.i10Index);
        authors.push(authorInfo);
    }

    await this.saveAuthors(authors);
}

// === Citation history ===
appendHistorySnapshot(author, citations, hIndex, i10Index) {
    if (!author.history) author.history = [];
    const now = new Date();
    const last = author.history[author.history.length - 1];
    const lastDate = last ? new Date(last.timestamp) : null;

    const isSameDay = lastDate &&
        lastDate.getFullYear() === now.getFullYear() &&
        lastDate.getMonth() === now.getMonth() &&
        lastDate.getDate() === now.getDate();

    // 同一天：覆盖该条记录，保证 sparkline 每天最多一个点
    if (isSameDay) {
        last.citations = citations;
        last.hIndex = hIndex;
        last.i10Index = i10Index;
        last.timestamp = now.toISOString();
        return;
    }
    author.history.push({
        timestamp: now.toISOString(),
        citations, hIndex, i10Index
    });
}

renderSparkline(history, range = 30) {
    if (!history || history.length === 0) {
        return `<div class="history-empty">${t('history_empty')}</div>`;
    }
    const points = range === 'all' ? history.slice() : history.slice(-range);
    if (points.length === 1) {
        return `<div class="history-single">📊 ${points[0].citations}</div>`;
    }
    const cs = points.map(p => p.citations);
    const minC = Math.min(...cs);
    const maxC = Math.max(...cs);
    const cRange = maxC - minC || 1;

    // 时间等比 X 轴：按 timestamp 真实间距映射
    const times = points.map(p => new Date(p.timestamp).getTime());
    const minT = Math.min(...times);
    const maxT = Math.max(...times);
    const tRange = maxT - minT || 1;

    const W = 320, H = 50;
    const LEFT = 4, RIGHT = 4, TOP = 6, BOTTOM = 6;
    const plotW = W - LEFT - RIGHT;
    const plotH = H - TOP - BOTTOM;

    const xy = points.map(p => {
        const ts = new Date(p.timestamp).getTime();
        const x = LEFT + ((ts - minT) / tRange) * plotW;
        const y = TOP + plotH - ((p.citations - minC) / cRange) * plotH;
        return { x, y, citations: p.citations, timestamp: p.timestamp };
    });

    const smoothPath = this.generateSmoothPath(xy);
    const fmtAxis = v => v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v;

    const dots = xy.map(p => `
        <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="2.2" fill="#1a73e8" pointer-events="none"/>
        <circle class="sparkline-hover-target"
                cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="10"
                fill="transparent"
                data-citations="${p.citations}"
                data-timestamp="${p.timestamp}"/>
    `).join('');

    return `
        <div class="sparkline-wrap">
            <span class="sparkline-axis-max">${fmtAxis(maxC)}</span>
            <span class="sparkline-axis-min">${fmtAxis(minC)}</span>
            <svg class="sparkline" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
                <path d="${smoothPath}" fill="none" stroke="#1a73e8" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
                ${dots}
            </svg>
        </div>`;
}

// Catmull-Rom 样条 → cubic Bezier 路径，生成平滑曲线
generateSmoothPath(pts) {
    if (pts.length < 2) return '';
    if (pts.length === 2) {
        return `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)} L ${pts[1].x.toFixed(1)} ${pts[1].y.toFixed(1)}`;
    }
    let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i - 1] || pts[i];
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const p3 = pts[i + 2] || p2;
        const cp1x = p1.x + (p2.x - p0.x) / 6;
        const cp1y = p1.y + (p2.y - p0.y) / 6;
        const cp2x = p2.x - (p3.x - p1.x) / 6;
        const cp2y = p2.y - (p3.y - p1.y) / 6;
        d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    return d;
}

async toggleHistory(userId) {
    const authors = await this.getStoredAuthors();
    const author = authors.find(a => a.userId === userId);
    if (!author) return;
    author.historyExpanded = !author.historyExpanded;
    await this.saveAuthors(authors);
    await this.loadAuthors();
}

async setHistoryRange(userId, range) {
    const authors = await this.getStoredAuthors();
    const author = authors.find(a => a.userId === userId);
    if (!author) return;
    author.historyRange = range;
    await this.saveAuthors(authors);
    await this.loadAuthors();
}

async saveAuthors(authors) {
    return new Promise((resolve) => {
        chrome.storage.local.set({authors}, () => {
            if (chrome.runtime.lastError) {
                console.warn('Storage quota exceeded, trimming history:', chrome.runtime.lastError.message);
                authors.forEach(a => {
                    if (a.history && a.history.length > 365) {
                        a.history = a.history.slice(-365);
                    }
                });
                chrome.storage.local.set({authors}, resolve);
            } else {
                resolve();
            }
        });
    });
}

async getStoredAuthors() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['authors'], (result) => {
            resolve(result.authors || []);
        });
    });
}

async getShowHistory() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['showHistory'], (result) => {
            resolve(result.showHistory !== false);
        });
    });
}

async setShowHistory(value) {
    return new Promise((resolve) => {
        chrome.storage.local.set({showHistory: value}, resolve);
    });
}

async getEnableCitationDetails() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['enableCitationDetails'], (result) => {
            resolve(result.enableCitationDetails === true);
        });
    });
}

async setEnableCitationDetails(value) {
    return new Promise((resolve) => {
        chrome.storage.local.set({enableCitationDetails: !!value}, resolve);
    });
}

async getWarmupNoticeShown() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['warmupNoticeShown'], (result) => {
            resolve(result.warmupNoticeShown === true);
        });
    });
}

async setWarmupNoticeShown(value) {
    return new Promise((resolve) => {
        chrome.storage.local.set({warmupNoticeShown: !!value}, resolve);
    });
}

async getLastUpdateAnnouncementVersion() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['lastUpdateAnnouncementVersion'], (result) => {
            resolve(result.lastUpdateAnnouncementVersion);
        });
    });
}

async setLastUpdateAnnouncementVersion(version) {
    return new Promise((resolve) => {
        chrome.storage.local.set({lastUpdateAnnouncementVersion: version}, resolve);
    });
}

showUpdateAnnouncement() {
    if (document.querySelector('.update-announcement-modal')) return;

    const modal = document.createElement('div');
    modal.className = 'paper-changes-modal update-announcement-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>${t('update_announcement_title')}</h3>
                <button class="close-btn">×</button>
            </div>
            <div class="modal-body">
                <p style="font-size: 13px; line-height: 1.6; color: #333; margin: 0;">
                    ${t('update_announcement_body')}
                </p>
            </div>
            <div style="padding: 12px 20px; border-top: 1px solid #e0e0e0; text-align: right; background: #f8f9fa; flex-shrink: 0;">
                <button class="announcement-ok-btn" style="background: #4285f4; color: white; padding: 6px 16px; border: none; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: 500;">${t('update_announcement_ok')}</button>
            </div>
        </div>
    `;

    const dismiss = () => modal.remove();
    modal.querySelector('.close-btn').addEventListener('click', dismiss);
    modal.querySelector('.announcement-ok-btn').addEventListener('click', dismiss);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) dismiss();
    });

    document.body.appendChild(modal);
}

showWarmupNotice() {
    // 同一 popup 会话内避免重复弹
    if (document.querySelector('.warmup-notice-modal')) return;

    const modal = document.createElement('div');
    modal.className = 'paper-changes-modal warmup-notice-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>${t('warmup_notice_title')}</h3>
                <button class="close-btn">×</button>
            </div>
            <div class="modal-body">
                <p style="font-size: 13px; line-height: 1.6; color: #333; margin: 0;">
                    ${t('warmup_notice_body')}
                </p>
            </div>
            <div style="padding: 12px 20px; border-top: 1px solid #e0e0e0; text-align: right; background: #f8f9fa; flex-shrink: 0;">
                <button class="warmup-ok-btn" style="background: #4285f4; color: white; padding: 6px 16px; border: none; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: 500;">${t('warmup_notice_ok')}</button>
            </div>
        </div>
    `;

    const dismiss = () => modal.remove();
    modal.querySelector('.close-btn').addEventListener('click', dismiss);
    modal.querySelector('.warmup-ok-btn').addEventListener('click', dismiss);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) dismiss();
    });

    document.body.appendChild(modal);
}

async setLastUpdateTime() {
    const now = new Date().toISOString();
    return new Promise((resolve) => {
        chrome.storage.local.set({lastUpdateTime: now}, resolve);
    });
}

async getLastUpdateTime() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['lastUpdateTime'], (result) => {
            resolve(result.lastUpdateTime);
        });
    });
}

async deleteAuthor(userId) {
    if (!confirm(t('confirm_delete'))) return;

    const authors = await this.getStoredAuthors();
    const filteredAuthors = authors.filter(a => a.userId !== userId);
    await this.saveAuthors(filteredAuthors);
    await this.loadAuthors();
    this.updateStatsSummary();

    // 故意不清 antiCrawlAlert：alert 里的 citingUrl 是 Scholar 公开链接，
    // 用户点开仍能完成验证（验证是 cookie 级，与作者存在与否无关）。
    // 下次 refresh 若仍反爬会自然刷新 alert；若已解除则用户已点开自行清除。
}

async loadAuthors() {
    const authors = await this.getStoredAuthors();
    const container = document.getElementById('authorsList');
    
    if (authors.length === 0) {
        container.innerHTML = `<div class="empty-state">${t('empty_state')}</div>`;
        return;
    }

    // 检查并清除过期的变化数据
    let hasExpiredChanges = false;
    authors.forEach(author => {
        // 如果有变化时间戳但已过期，清除所有变化相关数据
        if (author.changeTimestamp && !this.isChangeRecent(author.changeTimestamp)) {
            console.log(`清除 ${author.name} 的过期变化数据`);
            author.hasNewCitations = false;
            delete author.previousCitations;
            delete author.changeTimestamp;
            delete author.paperChanges; // 关键：删除论文变化数据
            hasExpiredChanges = true;
        }
        // 如果没有变化时间戳但有论文变化数据，也清除（兼容旧数据）
        else if (!author.changeTimestamp && author.paperChanges) {
            console.log(`清除 ${author.name} 的无时间戳论文变化数据`);
            delete author.paperChanges;
            hasExpiredChanges = true;
        }
    });
    
    // 如果有过期数据被清除，保存更新后的数据
    if (hasExpiredChanges) {
        console.log('保存清理后的作者数据');
        await this.saveAuthors(authors);
    }

    container.innerHTML = authors.map(author => {
        const showAsNew = author.hasNewCitations && this.isChangeRecent(author.changeTimestamp);
        const citationChange = author.previousCitations !== undefined ? 
            author.totalCitations - author.previousCitations : 0;
        
        // 安全地处理可能为undefined的数值
        const totalCitations = author.totalCitations || 0;
        const hIndex = author.hIndex || 0;
        const i10Index = author.i10Index || 0;
        const totalPapers = author.totalPapers || author.papers?.length || 0;
        
        // 检查是否应该显示论文变化按钮（只在变化是最近的时候显示）
        const shouldShowPaperChanges = author.paperChanges && 
                                     author.paperChanges.length > 0 && 
                                     this.isChangeRecent(author.changeTimestamp);
        
        return `
            <div class="author-item ${showAsNew ? 'has-new' : ''}">
                ${showAsNew ? '<div class="new-badge">NEW</div>' : ''}
                <div class="author-header">
                    <div class="author-name-link" data-url="${author.url}" title="点击访问 Google Scholar 主页">${author.name}</div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        ${shouldShowPaperChanges ?
                            `<button class="paper-changes-btn" data-user-id="${author.userId}">${t('paper_changes_btn', {count: author.paperChanges.length})}</button>` : ''}
                        ${showAsNew ? `<button class="mark-read-btn" data-user-id="${author.userId}">${t('mark_read')}</button>` : ''}
                        <button class="delete-btn" data-user-id="${author.userId}">×</button>
                    </div>
                </div>
                <div class="author-info">
                    <div><strong>${t('label_institution')}</strong> ${author.affiliation || t('unknown_institution')}</div>
                    <div><strong>${t('label_fields')}</strong> ${author.interests || t('unknown_fields')}</div>
                    <div><strong>${t('label_total_papers')}</strong> <span style="color: #1a73e8; font-weight: bold;">${totalPapers}</span> ${t('paper_counter')}</div>
                    ${author.workingDomain ? `<div class="working-domain">${t('access_via', {domain: author.workingDomain})}</div>` : ''}
                    ${this.enableCitationDetails ? `
                    <div class="citation-details-row">
                        <span class="cd-label">${t('label_citation_details')}</span>
                        <label class="toggle toggle-mini">
                            <input type="checkbox" class="cd-toggle" data-user-id="${author.userId}" ${author.citationDetailsEnabled ? 'checked' : ''}>
                            <span class="toggle-slider"></span>
                        </label>
                    </div>` : ''}
                </div>
                <div class="citation-info">
                    <div class="citation-item">
                        <div class="citation-label">${t('label_total_citations')}</div>
                        <div class="citation-value">${totalCitations.toLocaleString()}</div>
                        ${citationChange > 0 ? `<div class="citation-change">+${citationChange}</div>` : ''}
                        ${totalCitations === 0 ? `<div class="zero-citation-note">${t('new_scholar')}</div>` : ''}
                    </div>
                    <div class="citation-item">
                        <div class="citation-label">${t('label_h_index')}</div>
                        <div class="citation-value">${hIndex}</div>
                    </div>
                    <div class="citation-item">
                        <div class="citation-label">${t('label_i10_index')}</div>
                        <div class="citation-value">${i10Index}</div>
                    </div>
                </div>
                ${this.showHistory ? `
                <div class="history-section">
                    <div class="history-header" data-user-id="${author.userId}">
                        <span>${t('history_title')}</span>
                        <span class="history-arrow">${author.historyExpanded ? '▼' : '▶'}</span>
                    </div>
                    ${author.historyExpanded ? `
                        <div class="history-content">
                            <div class="history-range">
                                ${[7, 30, 90, 365, 'all'].map(r => `
                                    <button class="range-btn ${(author.historyRange || 30) === r ? 'active' : ''}"
                                            data-user-id="${author.userId}" data-range="${r}">
                                        ${r === 365 ? '1Y' : r === 'all' ? 'All' : r + 'D'}
                                    </button>
                                `).join('')}
                            </div>
                            ${this.renderSparkline(author.history, author.historyRange || 30)}
                        </div>
                    ` : ''}
                </div>
                ` : ''}
                <div class="last-updated">
                    ${t('last_updated')}${new Date(author.lastUpdated).toLocaleString(I18n.getLocale())}
                </div>
            </div>
        `;
    }).join('');

    container.querySelectorAll('.author-name-link').forEach(link => {
        link.addEventListener('click', (e) => {
            const url = e.target.getAttribute('data-url');
            this.openAuthorPage(url);
        });
    });

    container.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const userId = e.target.getAttribute('data-user-id');
            this.deleteAuthor(userId);
        });
    });

    container.querySelectorAll('.mark-read-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const userId = e.target.getAttribute('data-user-id');
            this.markAsRead(userId);
        });
    });

    container.querySelectorAll('.history-header').forEach(header => {
        header.addEventListener('click', (e) => {
            const userId = e.currentTarget.getAttribute('data-user-id');
            this.toggleHistory(userId);
        });
    });

    container.querySelectorAll('.range-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const userId = e.currentTarget.getAttribute('data-user-id');
            const raw = e.currentTarget.getAttribute('data-range');
            const range = raw === 'all' ? 'all' : parseInt(raw);
            this.setHistoryRange(userId, range);
        });
    });

    container.querySelectorAll('.paper-changes-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const userId = e.target.getAttribute('data-user-id');
            this.showPaperChanges(userId);
        });
    });

    container.querySelectorAll('.cd-toggle').forEach(cb => {
        cb.addEventListener('change', async (e) => {
            const userId = e.target.getAttribute('data-user-id');
            const authors = await this.getStoredAuthors();
            const a = authors.find(x => x.userId === userId);
            if (a) {
                a.citationDetailsEnabled = e.target.checked;
                await this.saveAuthors(authors);
            }
        });
    });

    const tooltip = document.getElementById('sparklineTooltip');
    container.querySelectorAll('.sparkline-hover-target').forEach(circle => {
        circle.addEventListener('mouseenter', (e) => {
            const target = e.currentTarget;
            const citations = target.getAttribute('data-citations');
            const timestamp = target.getAttribute('data-timestamp');
            const dateStr = new Date(timestamp).toLocaleDateString(I18n.getLocale(), {
                year: 'numeric', month: 'short', day: 'numeric'
            });
            tooltip.innerHTML = `<div><strong>${parseInt(citations).toLocaleString()}</strong></div><div>${dateStr}</div>`;
            tooltip.style.display = 'block';
            const rect = target.getBoundingClientRect();
            const tipRect = tooltip.getBoundingClientRect();
            const margin = 4;
            let leftPos = rect.left + rect.width / 2 - tipRect.width / 2;
            leftPos = Math.max(margin, Math.min(leftPos, window.innerWidth - tipRect.width - margin));
            tooltip.style.left = leftPos + 'px';
            tooltip.style.top = (rect.top - tipRect.height - 6) + 'px';
        });
        circle.addEventListener('mouseleave', () => {
            tooltip.style.display = 'none';
        });
    });
}

async updateLastUpdateTime() {
    const lastUpdateTime = await this.getLastUpdateTime();
    const timeElement = document.getElementById('lastUpdate');
    
    if (lastUpdateTime) {
        const timeString = new Date(lastUpdateTime).toLocaleString(I18n.getLocale());
        timeElement.textContent = `${t('last_updated')}${timeString}`;
    } else {
        timeElement.textContent = t('last_update_never_short');
    }
}

async updateStatsSummary() {
    const authors = await this.getStoredAuthors();
    
    if (authors.length === 0) {
        document.getElementById('statsSummary').textContent = '';
        return;
    }
    
    const totalAuthors = authors.length;
    const totalCitations = authors.reduce((sum, author) => sum + author.totalCitations, 0);
    const totalPapers = authors.reduce((sum, author) => sum + (author.totalPapers || author.papers?.length || 0), 0);
    const newChangesCount = authors.filter(author => 
        author.hasNewCitations && this.isChangeRecent(author.changeTimestamp)
    ).length;
    
    const summaryText = t('stats_summary', {
        totalAuthors,
        totalPapers: totalPapers.toLocaleString(),
        totalCitations: totalCitations.toLocaleString()
    }) + (newChangesCount > 0 ? ' ' + t('stats_new_changes', {count: newChangesCount}) : '');
    
    document.getElementById('statsSummary').textContent = summaryText;
}
}

// 启动应用
new ScholarMonitor();