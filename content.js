// content.js - 最终修复版本
class ScholarPageParser {
constructor() {
    this.init();
}

init() {
    // 监听来自popup的消息
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'getAuthorInfo') {
            this.parseAuthorInfo(sendResponse);
            return true; // 保持消息通道开放
        }
    });
}

parseAuthorInfo(sendResponse) {
    try {
        // 等待页面加载完成
        if (document.readyState !== 'complete') {
            window.addEventListener('load', () => {
                setTimeout(() => this.extractInfo(sendResponse), 2000);
            });
        } else {
            setTimeout(() => this.extractInfo(sendResponse), 1000);
        }
    } catch (error) {
        sendResponse({
            success: false,
            error: error.message
        });
    }
}

extractInfo(sendResponse) {
    try {
        // 检查是否是Google Scholar页面
        if (!window.location.hostname.includes('scholar.google')) {
            throw new Error('不是有效的Google Scholar页面');
        }

        // 提取作者姓名
        const nameElement = document.querySelector('#gsc_prf_in');
        if (!nameElement) {
            throw new Error('无法找到作者姓名，可能页面结构已变化或页面未完全加载');
        }
        const name = nameElement.textContent.trim();

        // 提取引用统计 - 更精确的选择器
        const citationTable = document.querySelector('#gsc_rsb_st');
        if (!citationTable) {
            throw new Error('无法找到引用统计表格');
        }

        const statRows = citationTable.querySelectorAll('tr');
        if (statRows.length < 3) {
            throw new Error('引用统计数据不完整');
        }

        // 第一行是标题，第二行是"全部"，第三行是"自2019年"
        const allTimeRow = statRows[1];
        const recentRow = statRows[2];

        const allTimeStats = allTimeRow.querySelectorAll('.gsc_rsb_std');
        const recentStats = recentRow.querySelectorAll('.gsc_rsb_std');

        if (allTimeStats.length < 3 || recentStats.length < 3) {
            throw new Error('无法获取完整的统计数据');
        }

        const totalCitations = this.parseNumber(allTimeStats[0].textContent);
        const hIndex = this.parseNumber(allTimeStats[1].textContent);
        const i10Index = this.parseNumber(allTimeStats[2].textContent);

        const recentCitations = this.parseNumber(recentStats[0].textContent);
        const recentHIndex = this.parseNumber(recentStats[1].textContent);
        const recentI10Index = this.parseNumber(recentStats[2].textContent);

        // 获取机构信息（可选）
        const affiliationElement = document.querySelector('.gsc_prf_ila');
        const affiliation = affiliationElement ? affiliationElement.textContent.trim() : '';

        // 获取研究领域（可选）
        const interestsElements = document.querySelectorAll('.gsc_prf_inta');
        const interests = Array.from(interestsElements).map(el => el.textContent.trim());

        const result = {
            name,
            affiliation,
            interests,
            totalCitations,
            hIndex,
            i10Index,
            recentCitations,
            recentHIndex,
            recentI10Index,
            lastUpdated: new Date().toISOString(),
            url: window.location.href
        };

        console.log('提取的作者信息:', result);

        sendResponse({
            success: true,
            data: result
        });

    } catch (error) {
        console.error('提取作者信息失败:', error);
        sendResponse({
            success: false,
            error: error.message
        });
    }
}

// 辅助方法：解析数字
parseNumber(text) {
    if (!text) return 0;
    const cleanText = text.replace(/[^\d]/g, '');
    const num = parseInt(cleanText);
    return isNaN(num) ? 0 : num;
}
}

// 初始化解析器
new ScholarPageParser();