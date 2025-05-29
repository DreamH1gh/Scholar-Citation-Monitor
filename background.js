// background.js - 修复版本，不使用 DOMParser
class ScholarBackgroundService {
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

init() {
  this.setupAutoRefresh();
  
  chrome.runtime.onInstalled.addListener(() => {
    console.log('Scholar Monitor 扩展已安装');
  });
}

setupAutoRefresh() {
  setInterval(async () => {
    console.log('开始自动刷新...');
    await this.autoRefreshAll();
  }, 30 * 60 * 1000);
  
  setTimeout(async () => {
    console.log('启动后首次自动刷新...');
    await this.autoRefreshAll();
  }, 5000);
}

async autoRefreshAll() {
  try {
    const authors = await this.getStoredAuthors();
    if (authors.length === 0) {
      console.log('没有需要刷新的作者');
      return;
    }

    console.log(`开始刷新 ${authors.length} 位作者...`);
    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (let i = 0; i < authors.length; i++) {
      const author = authors[i];
      console.log(`正在刷新作者: ${author.name}`);
      
      try {
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        const updatedInfo = await this.fetchAuthorInfoWithRetry(author.url, author.workingDomain);
        
        if (updatedInfo.totalCitations !== author.totalCitations) {
          updatedInfo.hasNewCitations = true;
          updatedInfo.previousCitations = author.totalCitations;
          updatedInfo.changeTimestamp = new Date().toISOString();
          console.log(`${author.name} 有新引用: ${author.totalCitations} -> ${updatedInfo.totalCitations}`);
        } else {
          updatedInfo.hasNewCitations = author.hasNewCitations;
          updatedInfo.previousCitations = author.previousCitations;
          updatedInfo.changeTimestamp = author.changeTimestamp;
          
          if (!this.isChangeRecent(updatedInfo.changeTimestamp)) {
            updatedInfo.hasNewCitations = false;
            delete updatedInfo.previousCitations;
            delete updatedInfo.changeTimestamp;
          }
        }
        
        authors[i] = {...author, ...updatedInfo};
        successCount++;
        console.log(`${author.name} 刷新成功`);
        
      } catch (error) {
        console.error(`自动刷新 ${author.name} 失败:`, error.message);
        errorCount++;
        errors.push({
          name: author.name,
          error: error.message
        });
        
        author.lastUpdated = new Date().toISOString();
      }
    }

    await this.saveAuthors(authors);
    await this.setLastUpdateTime();
    
    console.log(`自动刷新完成: 成功 ${successCount}, 失败 ${errorCount}`);
    
    if (errors.length > 0) {
      console.log('失败详情:', errors);
    }
    
  } catch (error) {
    console.error('自动刷新过程出错:', error);
  }
}

async fetchAuthorInfoWithRetry(url, preferredDomain = null, maxRetries = 2) {
  const userMatch = url.match(/user=([^&]+)/);
  if (!userMatch) {
    throw new Error('URL中未找到user参数');
  }
  const userId = userMatch[1];
  
  if (preferredDomain) {
    for (let retry = 0; retry < maxRetries; retry++) {
      try {
        console.log(`尝试首选域名 ${preferredDomain} (第${retry + 1}次)`);
        const testUrl = `https://${preferredDomain}/citations?user=${userId}`;
        const result = await this.fetchAuthorInfo(testUrl);
        result.url = testUrl;
        result.workingDomain = preferredDomain;
        console.log(`首选域名 ${preferredDomain} 成功`);
        return result;
      } catch (error) {
        console.log(`首选域名 ${preferredDomain} 第${retry + 1}次失败:`, error.message);
        if (retry < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
  }
  
  const errors = [];
  for (const domain of this.scholarDomains) {
    if (domain === preferredDomain) continue;
    
    for (let retry = 0; retry < maxRetries; retry++) {
      try {
        console.log(`尝试域名 ${domain} (第${retry + 1}次)`);
        const testUrl = `https://${domain}/citations?user=${userId}`;
        const result = await this.fetchAuthorInfo(testUrl);
        result.url = testUrl;
        result.workingDomain = domain;
        console.log(`域名 ${domain} 成功`);
        return result;
      } catch (error) {
        const errorMsg = `域名 ${domain} 第${retry + 1}次失败: ${error.message}`;
        console.log(errorMsg);
        errors.push(errorMsg);
        
        if (retry < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.error('所有域名都无法访问，详细错误:', errors);
  throw new Error(`所有域名都无法访问。尝试了 ${this.scholarDomains.length} 个域名，每个重试 ${maxRetries} 次。最后几个错误: ${errors.slice(-3).join('; ')}`);
}

async fetchAuthorInfo(url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  
  try {
    console.log(`正在请求: ${url}`);
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    console.log(`响应状态: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('请求过于频繁，被限制访问');
      } else if (response.status === 403) {
        throw new Error('访问被拒绝，可能需要验证码');
      } else if (response.status === 404) {
        throw new Error('作者页面不存在');
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    }

    const html = await response.text();
    
    if (html.includes('captcha') || html.includes('unusual traffic')) {
      throw new Error('需要验证码验证，请稍后重试');
    }
    
    return this.parseScholarPageWithRegex(html, url);
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      throw new Error('请求超时');
    } else if (error.message.includes('Failed to fetch')) {
      throw new Error('网络连接失败');
    } else {
      throw error;
    }
  }
}

// 使用正则表达式解析页面，不依赖 DOMParser
parseScholarPageWithRegex(html, url) {
  try {
    // 提取作者姓名
    const nameMatch = html.match(/<div[^>]*id="gsc_prf_in"[^>]*>([^<]+)<\/div>/);
    if (!nameMatch) {
      if (html.includes('Sign in') || html.includes('登录')) {
        throw new Error('需要登录才能访问');
      }
      throw new Error('无法找到作者姓名，可能页面结构已变化');
    }
    const name = nameMatch[1].trim();

    // 提取引用数据 - 查找统计表格
    const tableMatch = html.match(/<table[^>]*id="gsc_rsb_st"[^>]*>[\s\S]*?<\/table>/);
    if (!tableMatch) {
      throw new Error('无法找到引用统计表格');
    }
    
    const tableHtml = tableMatch[0];
    
    // 提取总引用数、H指数、i10指数
    const citationMatches = tableHtml.match(/<td class="gsc_rsb_std">([^<]+)<\/td>/g);
    if (!citationMatches || citationMatches.length < 6) {
      throw new Error('无法找到完整的引用数据');
    }
    
    // 前三个是总数，后三个是近5年数据
    const totalCitations = parseInt(citationMatches[0].replace(/<[^>]*>/g, '').replace(/,/g, '')) || 0;
    const hIndex = parseInt(citationMatches[1].replace(/<[^>]*>/g, '').replace(/,/g, '')) || 0;
    const i10Index = parseInt(citationMatches[2].replace(/<[^>]*>/g, '').replace(/,/g, '')) || 0;

    // 提取机构信息
    const affiliationMatch = html.match(/<div[^>]*class="gsc_prf_il"[^>]*>([^<]+)<\/div>/);
    const affiliation = affiliationMatch ? affiliationMatch[1].trim() : '未知机构';

    // 提取研究兴趣
    const interestsMatches = html.match(/<a[^>]*class="gs_ibl"[^>]*>([^<]+)<\/a>/g);
    let interests = '未知领域';
    if (interestsMatches) {
      interests = interestsMatches.map(match => 
        match.replace(/<[^>]*>/g, '').trim()
      ).join(', ');
    }

    console.log(`解析成功: ${name}, 引用: ${totalCitations}, H指数: ${hIndex}`);

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

isChangeRecent(changeTimestamp) {
  if (!changeTimestamp) return false;
  const changeTime = new Date(changeTimestamp);
  const now = new Date();
  const hoursDiff = (now - changeTime) / (1000 * 60 * 60);
  return hoursDiff < 24;
}

async getStoredAuthors() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['authors'], (result) => {
      resolve(result.authors || []);
    });
  });
}

async saveAuthors(authors) {
  return new Promise((resolve) => {
    chrome.storage.local.set({authors}, resolve);
  });
}

async setLastUpdateTime() {
  const now = new Date().toISOString();
  return new Promise((resolve) => {
    chrome.storage.local.set({lastUpdateTime: now}, resolve);
  });
}
}

// 启动后台服务
new ScholarBackgroundService();