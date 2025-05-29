// background.js - 修复版本
class BackgroundMonitor {
constructor() {
    this.init();
}

init() {
    // 设置定时刷新（每小时检查一次）
    chrome.alarms.create('autoRefresh', {periodInMinutes: 60});
    chrome.alarms.onAlarm.addListener((alarm) => {
        if (alarm.name === 'autoRefresh') {
            this.autoRefreshAuthors();
        }
    });

    // 监听安装事件
    chrome.runtime.onInstalled.addListener(() => {
        console.log('Scholar Citation Monitor 已安装');
    });
}

async autoRefreshAuthors() {
    try {
        const result = await chrome.storage.local.get(['authors']);
        const authors = result.authors || [];
        
        if (authors.length === 0) return;

        let hasUpdates = false;
        const scholarDomains = [
            'scholar.google.com',
            'scholar.google.com.hk',
            'scholar.google.com.sg'
        ];

        for (const author of authors) {
            try {
                const updatedInfo = await this.fetchAuthorInfo(author.url, scholarDomains);
                
                // 检查是否有引用数变化
                if (updatedInfo.totalCitations > author.totalCitations) {
                    hasUpdates = true;
                    const increase = updatedInfo.totalCitations - author.totalCitations;
                    
                    // 标记为有新引用
                    updatedInfo.hasNewCitations = true;
                    updatedInfo.previousCitations = author.totalCitations;
                    updatedInfo.changeTimestamp = new Date().toISOString();
                    
                    // 发送通知
                    chrome.notifications.create({
                        type: 'basic',
                        iconUrl: 'icon48.png',
                        title: '引用数更新',
                        message: `${author.name} 的引用数增加了 ${increase} 次`
                    });

                    // 更新徽章
                    chrome.action.setBadgeText({text: '!'});
                    chrome.action.setBadgeBackgroundColor({color: '#ff0000'});
                } else {
                    // 保持现有的新引用状态（如果有的话）
                    updatedInfo.hasNewCitations = author.hasNewCitations;
                    updatedInfo.previousCitations = author.previousCitations;
                    updatedInfo.changeTimestamp = author.changeTimestamp;
                }

                // 保持其他原有信息
                updatedInfo.affiliation = author.affiliation;
                updatedInfo.interests = author.interests;
                updatedInfo.userId = author.userId;
                updatedInfo.workingDomain = author.workingDomain;

                // 更新数据
                Object.assign(author, updatedInfo);
                
            } catch (error) {
                console.error(`自动刷新 ${author.name} 失败:`, error);
            }

            // 避免请求过快
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        if (hasUpdates || authors.length > 0) {
            // 保存更新的作者数据
            await chrome.storage.local.set({authors});
            
            // 重要：更新最后更新时间
            await chrome.storage.local.set({
                lastUpdateTime: new Date().toISOString()
            });
            
            console.log('后台自动更新完成，时间戳已更新');
        }

    } catch (error) {
        console.error('自动刷新失败:', error);
    }
}

async fetchAuthorInfo(url, domains) {
    const userMatch = url.match(/user=([^&]+)/);
    if (!userMatch) {
        throw new Error('URL中未找到user参数');
    }
    const userId = userMatch[1];
    
    for (const domain of domains) {
        const testUrl = `https://${domain}/citations?user=${userId}`;
        
        try {
            const response = await fetch(testUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Cache-Control': 'no-cache'
                }
            });

            if (!response.ok) continue;

            const html = await response.text();
            const result = this.parseScholarPage(html, testUrl);
            result.workingDomain = domain;
            return result;
        } catch (error) {
            continue;
        }
    }
    
    throw new Error('所有域名都无法访问');
}

parseScholarPage(html, url) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // 获取作者姓名
    const nameElement = doc.querySelector('#gsc_prf_in');
    const name = nameElement ? nameElement.textContent.trim() : '';

    // 获取引用统计数据
    const citationRows = doc.querySelectorAll('#gsc_rsb_st tbody tr');
    
    let totalCitations = 0;
    let hIndex = 0;
    let i10Index = 0;
    
    if (citationRows.length >= 3) {
        const totalElement = citationRows[0].querySelector('.gsc_rsb_std');
        const hElement = citationRows[1].querySelector('.gsc_rsb_std');
        const i10Element = citationRows[2].querySelector('.gsc_rsb_std');
        
        totalCitations = totalElement ? parseInt(totalElement.textContent.replace(/,/g, '')) || 0 : 0;
        hIndex = hElement ? parseInt(hElement.textContent.replace(/,/g, '')) || 0 : 0;
        i10Index = i10Element ? parseInt(i10Element.textContent.replace(/,/g, '')) || 0 : 0;
    }

    return {
        name,
        totalCitations,
        hIndex,
        i10Index,
        lastUpdated: new Date().toISOString(),
        url
    };
}
}

// 初始化
new BackgroundMonitor();