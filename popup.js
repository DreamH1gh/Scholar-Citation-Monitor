// popup.js - 无需打开标签页的版本
class ScholarMonitor {
constructor() {
    // Google Scholar 多域名列表
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
        // 显示加载状态
        const addBtn = document.getElementById('addBtn');
        const originalText = addBtn.textContent;
        addBtn.textContent = '添加中...';
        addBtn.disabled = true;

        const authorInfo = await this.fetchAuthorInfoWithFallback(url);
        await this.saveAuthor(authorInfo);
        document.getElementById('authorUrl').value = '';
        await this.loadAuthors();

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
        url.includes(domain) && url.includes('/citations?user=')
    );
}

// 使用fetch API直接获取页面数据，无需打开标签页
async fetchAuthorInfoWithFallback(originalUrl) {
    const userParam = originalUrl.split('/citations?')[1];
    
    // 尝试不同的域名
    for (const domain of this.scholarDomains) {
        const testUrl = `https://${domain}/citations?${userParam}`;
        
        try {
            console.log(`尝试域名: ${domain}`);
            const result = await this.fetchAuthorInfo(testUrl);
            
            // 成功获取到数据，保存这个可用的URL
            result.url = testUrl;
            result.workingDomain = domain;
            
            console.log(`成功使用域名: ${domain}`);
            return result;
        } catch (error) {
            console.log(`域名 ${domain} 失败:`, error.message);
            continue;
        }
    }
    
    throw new Error('所有Google Scholar域名都无法访问，请检查网络连接或稍后重试');
}

// 新的fetch方法，直接请求页面而不打开标签页
async fetchAuthorInfo(url) {
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate, br',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const html = await response.text();
        return this.parseScholarPage(html, url);
    } catch (error) {
        throw new Error(`网络请求失败: ${error.message}`);
    }
}

// 解析Google Scholar页面HTML
parseScholarPage(html, url) {
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // 提取作者姓名
        const nameElement = doc.querySelector('#gsc_prf_in');
        if (!nameElement) {
            throw new Error('无法找到作者姓名，可能页面结构已变化或需要登录');
        }
        const name = nameElement.textContent.trim();

        // 提取总引用数 - 修改选择器，只选择每行的第一列数据
        const citationRows = doc.querySelectorAll('#gsc_rsb_st tbody tr');
        if (citationRows.length < 3) {
            throw new Error('无法找到引用数据，可能页面结构已变化');
        }

        // 每行的第一个 .gsc_rsb_std 元素就是"全部"列的数据
        const totalCitations = parseInt(citationRows[0].querySelector('.gsc_rsb_std')?.textContent.replace(/,/g, '')) || 0;
        const hIndex = parseInt(citationRows[1].querySelector('.gsc_rsb_std')?.textContent.replace(/,/g, '')) || 0;
        const i10Index = parseInt(citationRows[2].querySelector('.gsc_rsb_std')?.textContent.replace(/,/g, '')) || 0;


        // 提取机构信息
        const affiliationElement = doc.querySelector('#gsc_prf_i .gsc_prf_il');
        const affiliation = affiliationElement ? affiliationElement.textContent.trim() : '未知机构';

        // 提取研究领域
        const interestsElements = doc.querySelectorAll('#gsc_prf_int a.gs_ibl');
        const interests = Array.from(interestsElements).map(el => el.textContent.trim()).join(', ') || '未知领域';


        return {
            name,
            affiliation,
            interests,
            totalCitations,
            hIndex,
            i10Index,
            url,
            lastUpdated: new Date().toISOString(),
            userId: this.extractUserId(url)
        };
    } catch (error) {
        throw new Error(`解析页面失败: ${error.message}`);
    }
}

extractUserId(url) {
    const match = url.match(/user=([^&]+)/);
    return match ? match[1] : '';
}

async refreshAll() {
    const authors = await this.getStoredAuthors();
    if (authors.length === 0) {
        alert('没有要刷新的作者');
        return;
    }

    const refreshBtn = document.getElementById('refreshBtn');
    const originalText = refreshBtn.textContent;
    refreshBtn.textContent = '刷新中...';
    refreshBtn.disabled = true;

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < authors.length; i++) {
        try {
            await new Promise(resolve => setTimeout(resolve, 1000)); // 延迟1秒避免请求过快
            
            const updatedInfo = await this.fetchAuthorInfoWithFallback(authors[i].url);
            
            // 检查引用数是否有变化
            if (updatedInfo.totalCitations !== authors[i].totalCitations) {
                updatedInfo.hasNewCitations = true;
                updatedInfo.previousCitations = authors[i].totalCitations;
            }
            
            authors[i] = {...authors[i], ...updatedInfo};
            successCount++;
            
            // 实时更新显示
            await this.saveAuthors(authors);
            await this.loadAuthors();
            
        } catch (error) {
            console.error(`刷新作者 ${authors[i].name} 失败:`, error);
            errorCount++;
        }
    }

    refreshBtn.textContent = originalText;
    refreshBtn.disabled = false;

    const message = `刷新完成！成功: ${successCount}, 失败: ${errorCount}`;
    alert(message);
    this.updateLastUpdateTime();
}

async saveAuthor(authorInfo) {
    const authors = await this.getStoredAuthors();
    
    // 检查是否已存在
    const existingIndex = authors.findIndex(a => a.userId === authorInfo.userId);
    
    if (existingIndex >= 0) {
        // 检查引用数变化
        if (authorInfo.totalCitations !== authors[existingIndex].totalCitations) {
            authorInfo.hasNewCitations = true;
            authorInfo.previousCitations = authors[existingIndex].totalCitations;
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

async loadAuthors() {
    const authors = await this.getStoredAuthors();
    const container = document.getElementById('authorsList');
    
    if (authors.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: #666; padding: 20px;">暂无作者数据</div>';
        return;
    }

    container.innerHTML = authors.map(author => `
        <div class="author-item ${author.hasNewCitations ? 'has-new' : ''}">
            <div class="author-header">
                <div class="author-name">${author.name}</div>
                <button class="delete-btn" data-user-id="${author.userId}">×</button>
            </div>
            <div class="author-info">
                <div><strong>机构:</strong> ${author.affiliation}</div>
                <div><strong>研究领域:</strong> ${author.interests}</div>
            </div>
            <div class="citation-info">
                <div class="citation-item">
                    <span class="citation-label">总引用:</span>
                    <span class="citation-value">${parseInt(author.totalCitations || 0).toLocaleString()}</span>
                    ${author.hasNewCitations ? 
                        `<span class="citation-change">+${(parseInt(author.totalCitations || 0) - parseInt(author.previousCitations || 0)).toLocaleString()}</span>` : 
                        ''}
                </div>
                <div class="citation-item">
                    <span class="citation-label">h指数:</span>
                    <span class="citation-value">${parseInt(author.hIndex || 0)}</span>
                </div>
                <div class="citation-item">
                    <span class="citation-label">i10指数:</span>
                    <span class="citation-value">${parseInt(author.i10Index || 0)}</span>
                </div>
            </div>
            <div class="last-updated">
                最后更新: ${new Date(author.lastUpdated).toLocaleString('zh-CN')}
            </div>
        </div>
    `).join('');


    // 绑定删除按钮事件
    container.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const userId = e.target.dataset.userId;
            this.deleteAuthor(userId);
        });
    });
}

async deleteAuthor(userId) {
    if (!confirm('确定要删除这个作者吗？')) return;
    
    const authors = await this.getStoredAuthors();
    const filteredAuthors = authors.filter(a => a.userId !== userId);
    await this.saveAuthors(filteredAuthors);
    await this.loadAuthors();
}

updateLastUpdateTime() {
    const now = new Date().toLocaleString('zh-CN');
    document.getElementById('lastUpdate').textContent = `最后更新: ${now}`;
}
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
new ScholarMonitor();
});