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

async init() {
    await this.loadAuthors();
    this.bindEvents();
    this.updateLastUpdateTime();
    this.updateStatsSummary();
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
}

async addAuthor() {
    const url = document.getElementById('authorUrl').value.trim();
    if (!url) return;

    if (!this.isValidScholarUrl(url)) {
        alert('请输入有效的Google Scholar作者页面URL');
        return;
    }

    try {
        const addBtn = document.getElementById('addBtn');
        const originalText = addBtn.textContent;
        addBtn.textContent = '添加中...(获取完整论文列表)';
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
        alert('获取作者信息失败: ' + error.message);
        document.getElementById('addBtn').textContent = '添加';
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

    const nameElement = doc.querySelector('#gsc_prf_in');
    if (!nameElement) {
        throw new Error('无法找到作者姓名');
    }
    const name = nameElement.textContent.trim();

    const citationRows = doc.querySelectorAll('#gsc_rsb_st tbody tr');
    if (citationRows.length < 3) {
        throw new Error('无法找到引用数据');
    }

    const totalCitations = parseInt(citationRows[0].querySelector('.gsc_rsb_std')?.textContent.replace(/,/g, '')) || 0;
    const hIndex = parseInt(citationRows[1].querySelector('.gsc_rsb_std')?.textContent.replace(/,/g, '')) || 0;
    const i10Index = parseInt(citationRows[2].querySelector('.gsc_rsb_std')?.textContent.replace(/,/g, '')) || 0;

    const affiliationElement = doc.querySelector('#gsc_prf_i .gsc_prf_il');
    const affiliation = affiliationElement ? affiliationElement.textContent.trim() : '未知机构';

    const interestsElements = doc.querySelectorAll('#gsc_prf_int a.gs_ibl');
    const interests = Array.from(interestsElements).map(el => el.textContent.trim()).join(', ') || '未知领域';

    return {
        name,
        affiliation,
        interests,
        totalCitations,
        hIndex,
        i10Index
    };
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
        alert('没有要刷新的作者');
        return;
    }

    const refreshBtn = document.getElementById('refreshBtn');
    const originalText = refreshBtn.textContent;
    refreshBtn.textContent = '刷新中...(更新完整论文列表)';
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
        let message = `刷新完成！成功: ${successCount}, 失败: ${errorCount}`;
        
        if (errorCount <= 3) {
            const failedNames = failedAuthors.map(f => f.name).join(', ');
            message += `\n\n失败的作者: ${failedNames}`;
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
        alert('该作者暂无论文引用变化记录');
        return;
    }
    
    const modal = document.createElement('div');
    modal.className = 'paper-changes-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>${author.name} - 论文引用变化 (${author.paperChanges.length} 篇)</h3>
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
                        ${change.link ? `<a href="${change.link}" target="_blank" class="paper-link">查看详情</a>` : ''}
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
    if (!confirm('确定要删除这个作者吗？')) return;
    
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
        container.innerHTML = '<div class="empty-state">暂无作者数据<br><small>请在上方输入Google Scholar作者页面URL</small></div>';
        return;
    }

    container.innerHTML = authors.map(author => {
        const showAsNew = author.hasNewCitations && this.isChangeRecent(author.changeTimestamp);
        const citationChange = author.previousCitations ? 
            author.totalCitations - author.previousCitations : 0;
        const hasPaperChanges = author.paperChanges && author.paperChanges.length > 0;
        
        return `
            <div class="author-item ${showAsNew ? 'has-new' : ''}">
                ${showAsNew ? '<div class="new-badge">NEW</div>' : ''}
                <div class="author-header">
                    <div class="author-name-link" data-url="${author.url}" title="点击访问 Google Scholar 主页">${author.name}</div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        ${hasPaperChanges ? `<button class="paper-changes-btn" data-user-id="${author.userId}">论文变化 (${author.paperChanges.length})</button>` : ''}
                        ${showAsNew ? `<button class="mark-read-btn" data-user-id="${author.userId}">已读</button>` : ''}
                        <button class="delete-btn" data-user-id="${author.userId}">×</button>
                    </div>
                </div>
                <div class="author-info">
                    <div><strong>机构:</strong> ${author.affiliation}</div>
                    <div><strong>研究领域:</strong> ${author.interests}</div>
                    <div><strong>总论文数:</strong> <span style="color: #1a73e8; font-weight: bold;">${author.totalPapers || author.papers?.length || 0}</span> 篇</div>
                    ${author.workingDomain ? `<div class="working-domain">通过 ${author.workingDomain} 访问</div>` : ''}
                </div>
                <div class="citation-info">
                    <div class="citation-item">
                        <div class="citation-label">总引用</div>
                        <div class="citation-value">${author.totalCitations.toLocaleString()}</div>
                        ${citationChange > 0 ? `<div class="citation-change">+${citationChange}</div>` : ''}
                    </div>
                    <div class="citation-item">
                        <div class="citation-label">H指数</div>
                        <div class="citation-value">${author.hIndex}</div>
                    </div>
                    <div class="citation-item">
                        <div class="citation-label">i10指数</div>
                        <div class="citation-value">${author.i10Index}</div>
                    </div>
                </div>
                <div class="last-updated">
                    最后更新: ${new Date(author.lastUpdated).toLocaleString('zh-CN')}
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
        const timeString = new Date(lastUpdateTime).toLocaleString('zh-CN');
        timeElement.textContent = `最后更新: ${timeString}`;
    } else {
        timeElement.textContent = '最后更新: 从未';
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
    
    const summaryText = `监控 ${totalAuthors} 位学者，共 ${totalPapers.toLocaleString()} 篇论文，总引用 ${totalCitations.toLocaleString()} 次` + 
        (newChangesCount > 0 ? ` (${newChangesCount} 位有新变化)` : '');
    
    document.getElementById('statsSummary').textContent = summaryText;
}
}

// 启动应用
new ScholarMonitor();