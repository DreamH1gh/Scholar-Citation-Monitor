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
    this.init();
}

async applyLanguage() {
    I18n.currentLang = await I18n.getLanguage();
    const langSelect = document.getElementById('langSelect');
    if (langSelect) langSelect.value = I18n.currentLang;

    document.getElementById('authorUrl').placeholder = t('input_placeholder');
    document.getElementById('addBtn').textContent = t('btn_add');
    document.getElementById('refreshBtn').textContent = t('btn_refresh');

    await this.loadAuthors();
    this.updateLastUpdateTime();
    this.updateStatsSummary();
}

async init() {
    await this.applyLanguage();
    this.bindEvents();
    this.startStorageListener();
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

// 手动刷新所有作者（获取完整论文列表）
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
    const failedAuthors = [];

    for (let i = 0; i < authors.length; i++) {
        try {
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // 获取完整的更新信息，包括所有论文
            const updatedInfo = await this.fetchCompleteAuthorInfo(authors[i].url);
            
            // 检查引用变化
            if (updatedInfo.totalCitations !== authors[i].totalCitations) {
                updatedInfo.hasNewCitations = true;
                updatedInfo.previousCitations = authors[i].totalCitations;
                updatedInfo.changeTimestamp = new Date().toISOString();
                
                // 比较论文变化（如果有旧论文数据）
                if (authors[i].papers && authors[i].papers.length > 0) {
                    updatedInfo.paperChanges = this.comparePapers(authors[i].papers, updatedInfo.papers);
                    console.log(`${updatedInfo.name} 检测到 ${updatedInfo.paperChanges.length} 篇论文引用变化`);
                }
            } else {
                updatedInfo.hasNewCitations = authors[i].hasNewCitations;
                updatedInfo.previousCitations = authors[i].previousCitations;
                updatedInfo.changeTimestamp = authors[i].changeTimestamp;
                updatedInfo.paperChanges = authors[i].paperChanges;
                
                if (!this.isChangeRecent(updatedInfo.changeTimestamp)) {
                    updatedInfo.hasNewCitations = false;
                    delete updatedInfo.previousCitations;
                    delete updatedInfo.changeTimestamp;
                    delete updatedInfo.paperChanges;
                }
            }
            
            authors[i] = {...authors[i], ...updatedInfo};
            successCount++;
            
            await this.saveAuthors(authors);
            await this.loadAuthors();
            
        } catch (error) {
            console.error(`刷新作者 ${authors[i].name} 失败:`, error);
            errorCount++;
            failedAuthors.push({
                name: authors[i].name,
                error: error.message
            });
        }
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

async showPaperChanges(userId) {
    const authors = await this.getStoredAuthors();
    const author = authors.find(a => a.userId === userId);
    
    if (!author || !author.paperChanges || author.paperChanges.length === 0) {
        alert(t('alert_no_paper_changes'));
        return;
    }
    
    const modal = document.createElement('div');
    modal.className = 'paper-changes-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>${t('paper_changes_title', {name: author.name, count: author.paperChanges.length})}</h3>
                <button class="close-btn">×</button>
            </div>
            <div class="modal-body">
                ${author.paperChanges.map(change => `
                    <div class="paper-change-item">
                        <div class="paper-title">${change.title}</div>
                        <div class="paper-info">
                            <span class="paper-year">${change.year}</span>
                            <span class="citation-change ${change.change > 0 ? 'positive' : 'negative'}">
                                ${change.oldCitations} → ${change.newCitations} (${change.change > 0 ? '+' : ''}${change.change})
                            </span>
                        </div>
                        ${change.link ? `<a href="${change.link}" target="_blank" class="paper-link">${t('view_details')}</a>` : ''}
                    </div>
                `).join('')}
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
    
    document.body.appendChild(modal);
}

isChangeRecent(changeTimestamp) {
    if (!changeTimestamp) return false;
    const changeTime = new Date(changeTimestamp);
    const now = new Date();
    const hoursDiff = (now - changeTime) / (1000 * 60 * 60);
    return hoursDiff < 24;
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
        authors[existingIndex] = authorInfo;
    } else {
        authors.push(authorInfo);
    }
    
    await this.saveAuthors(authors);
}

async saveAuthors(authors) {
    return new Promise((resolve) => {
        chrome.storage.local.set({authors}, resolve);
    });
}

async getStoredAuthors() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['authors'], (result) => {
            resolve(result.authors || []);
        });
    });
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

    container.querySelectorAll('.paper-changes-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const userId = e.target.getAttribute('data-user-id');
            this.showPaperChanges(userId);
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