// background.js - 优化版本，机构和研究领域保持不变，添加引用变化通知
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
  // 请求通知权限
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icon48.png',
    title: 'Scholar Monitor',
    message: '扩展已安装，将自动监控学者引用变化'
  });
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
  const citationChanges = [];

  for (let i = 0; i < authors.length; i++) {
    const author = authors[i];
    console.log(`正在刷新作者: ${author.name}`);
    
    try {
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      // 只刷新引用数据，保持机构和研究领域不变
      const updatedCitationInfo = await this.fetchAuthorCitationInfoWithRetry(author.url, author.workingDomain);
      
      // 检查引用是否有变化
      if (updatedCitationInfo.totalCitations !== author.totalCitations) {
        const change = {
          name: author.name,
          oldCitations: author.totalCitations,
          newCitations: updatedCitationInfo.totalCitations,
          increase: updatedCitationInfo.totalCitations - author.totalCitations
        };
        citationChanges.push(change);
        
        // 更新变化标记
        updatedCitationInfo.hasNewCitations = true;
        updatedCitationInfo.previousCitations = author.totalCitations;
        updatedCitationInfo.changeTimestamp = new Date().toISOString();
        
        console.log(`${author.name} 有新引用: ${author.totalCitations} -> ${updatedCitationInfo.totalCitations} (+${change.increase})`);
      } else {
        // 保持原有的变化状态
        updatedCitationInfo.hasNewCitations = author.hasNewCitations;
        updatedCitationInfo.previousCitations = author.previousCitations;
        updatedCitationInfo.changeTimestamp = author.changeTimestamp;
        
        // 如果变化时间超过24小时，清除变化标记
        if (!this.isChangeRecent(updatedCitationInfo.changeTimestamp)) {
          updatedCitationInfo.hasNewCitations = false;
          delete updatedCitationInfo.previousCitations;
          delete updatedCitationInfo.changeTimestamp;
        }
      }
      
      // 合并数据：保持机构和研究领域不变，只更新引用数据
      authors[i] = {
        ...author, // 保持原有的所有信息（包括机构和研究领域）
        ...updatedCitationInfo, // 只覆盖引用相关的数据
        lastUpdated: new Date().toISOString()
      };
      
      successCount++;
      console.log(`${author.name} 刷新成功`);
      
    } catch (error) {
      console.error(`自动刷新 ${author.name} 失败:`, error.message);
      errorCount++;
      errors.push({
        name: author.name,
        error: error.message
      });
      
      // 只更新最后更新时间，保持其他信息不变
      authors[i].lastUpdated = new Date().toISOString();
    }
  }

  await this.saveAuthors(authors);
  await this.setLastUpdateTime();
  
  console.log(`自动刷新完成: 成功 ${successCount}, 失败 ${errorCount}`);
  
  // 显示引用变化通知
  if (citationChanges.length > 0) {
    await this.showCitationChangeNotifications(citationChanges);
  }
  
  if (errors.length > 0) {
    console.log('失败详情:', errors);
  }
  
} catch (error) {
  console.error('自动刷新过程出错:', error);
}
}

// 显示引用变化通知
async showCitationChangeNotifications(changes) {
if (changes.length === 1) {
  // 单个作者变化
  const change = changes[0];
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icon48.png',
    title: '🎉 引用数量更新',
    message: `${change.name} 的引用从 ${change.oldCitations} 增加到 ${change.newCitations} (+${change.increase})`
  });
} else {
  // 多个作者变化
  const totalIncrease = changes.reduce((sum, change) => sum + change.increase, 0);
  const authorNames = changes.map(c => c.name).join(', ');
  
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icon48.png',
    title: `🎉 ${changes.length} 位学者引用更新`,
    message: `${authorNames} 等学者引用总计增加 ${totalIncrease} 次`
  });
}
}

// 只获取引用数据的方法
async fetchAuthorCitationInfoWithRetry(url, preferredDomain = null, maxRetries = 2) {
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
      const result = await this.fetchAuthorCitationInfo(testUrl);
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
      const result = await this.fetchAuthorCitationInfo(testUrl);
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

// 只获取引用信息的方法
async fetchAuthorCitationInfo(url) {
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
  
  return this.parseScholarCitationData(html, url);
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

// 只解析引用数据的方法
parseScholarCitationData(html, url) {
try {
  // 只提取引用数据，不提取机构和研究领域
  const tableMatch = html.match(/<table[^>]*id="gsc_rsb_st"[^>]*>[\s\S]*?<\/table>/);
  if (!tableMatch) {
    throw new Error('无法找到引用统计表格');
  }
  
  const tableHtml = tableMatch[0];
  
  // 提取所有 gsc_rsb_std 类的数值
  const citationMatches = tableHtml.match(/<td\s+class="gsc_rsb_std">([^<]+)<\/td>/g);
  if (!citationMatches || citationMatches.length < 6) {
    throw new Error('无法找到完整的引用数据');
  }
  
  // 解析6个数字：总引用、近5年引用、H指数、近5年H指数、i10指数、近5年i10指数
  const numbers = citationMatches.map(match => {
    const numberText = match.replace(/<[^>]*>/g, '').replace(/,/g, '');
    return parseInt(numberText) || 0;
  });
  
  // 我们需要第1、3、5个数字（索引0、2、4）
  const totalCitations = numbers[0];
  const hIndex = numbers[2];
  const i10Index = numbers[4];

  console.log(`引用数据解析成功: 引用: ${totalCitations}, H指数: ${hIndex}, i10指数: ${i10Index}`);

  return {
    totalCitations,
    hIndex,
    i10Index,
    url,
    userId: this.extractUserId(url)
  };
} catch (error) {
  throw new Error(`解析引用数据失败: ${error.message}`);
}
}

// 完整解析方法（用于首次添加作者）
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

// 完整解析方法（用于首次添加作者）
parseScholarPageWithRegex(html, url) {
try {
  // 1. 提取作者姓名 - 从title标签中提取
  const titleMatch = html.match(/<title[^>]*>‪([^‬]+)‬/);
  if (!titleMatch) {
    // 备用方案：从gsc_prf_in提取
    const nameMatch = html.match(/<div[^>]*id="gsc_prf_in"[^>]*>([^<]+)<\/div>/);
    if (!nameMatch) {
      if (html.includes('Sign in') || html.includes('登录')) {
        throw new Error('需要登录才能访问');
      }
      throw new Error('无法找到作者姓名，可能页面结构已变化');
    }
    var name = nameMatch[1].trim();
  } else {
    var name = titleMatch[1].trim();
  }

  // 2. 提取机构信息 - 修复正则表达式
  const metaDescMatch = html.match(/<meta\s+name="description"\s+content="‪([^‬]+)‬\s*-\s*‪‪[^‬]*‬‬\s*-\s*‪[^‬]*‬">/);
  let affiliation = '未知机构';
  if (metaDescMatch) {
    affiliation = metaDescMatch[1].trim();
  } else {
    // 备用方案：更宽松的匹配
    const backupMatch = html.match(/<meta\s+name="description"\s+content="‪([^‬]+)‬/);
    if (backupMatch) {
      affiliation = backupMatch[1].trim();
    }
  }

  // 3. 提取研究领域 - 从meta description的最后部分提取
  const interestsMatch = html.match(/<meta\s+name="description"\s+content="[^"]*-\s*‪([^‬]+)‬">/);
  let interests = '未知领域';
  if (interestsMatch) {
    interests = interestsMatch[1].trim();
  } else {
    // 备用方案：从其他位置查找研究领域
    const backupInterestsMatch = html.match(/- ‪([^‬]+)‬"><meta\s+property=/);
    if (backupInterestsMatch) {
      interests = backupInterestsMatch[1].trim();
    }
  }

  // 4. 提取引用数据
  const citationData = this.parseScholarCitationData(html, url);

  console.log(`完整解析成功: ${name}, 引用: ${citationData.totalCitations}, H指数: ${citationData.hIndex}, i10指数: ${citationData.i10Index}`);
  console.log(`机构: ${affiliation}, 研究领域: ${interests}`);

  return {
    name,
    affiliation,
    interests,
    totalCitations: citationData.totalCitations,
    hIndex: citationData.hIndex,
    i10Index: citationData.i10Index,
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