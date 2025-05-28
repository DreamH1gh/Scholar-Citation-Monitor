// background.js - 可选的增强功能
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
                  
                  if (updatedInfo.totalCitations > author.totalCitations) {
                      hasUpdates = true;
                      const increase = updatedInfo.totalCitations - author.totalCitations;
                      
                      // 发送通知
                      chrome.notifications.create({
                          type: 'basic',
                          iconUrl: 'icon.png',
                          title: '引用数更新',
                          message: `${author.name} 的引用数增加了 ${increase} 次`
                      });

                      // 更新徽章
                      chrome.action.setBadgeText({text: '!'});
                      chrome.action.setBadgeBackgroundColor({color: '#ff0000'});
                  }

                  // 更新数据
                  Object.assign(author, updatedInfo);
                  
              } catch (error) {
                  console.error(`自动刷新 ${author.name} 失败:`, error);
              }

              // 避免请求过快
              await new Promise(resolve => setTimeout(resolve, 2000));
          }

          if (hasUpdates) {
              await chrome.storage.local.set({authors});
          }

      } catch (error) {
          console.error('自动刷新失败:', error);
      }
  }

  async fetchAuthorInfo(url, domains) {
      const userParam = url.split('/citations?')[1];
      
      for (const domain of domains) {
          const testUrl = `https://${domain}/citations?${userParam}`;
          
          try {
              const response = await fetch(testUrl, {
                  headers: {
                      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                  }
              });

              if (!response.ok) continue;

              const html = await response.text();
              return this.parseScholarPage(html, testUrl);
          } catch (error) {
              continue;
          }
      }
      
      throw new Error('所有域名都无法访问');
  }

  parseScholarPage(html, url) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      const nameElement = doc.querySelector('#gsc_prf_in');
      const name = nameElement ? nameElement.textContent.trim() : '';

      const citationElements = doc.querySelectorAll('#gsc_rsb_st .gsc_rsb_std');
      const totalCitations = citationElements.length > 0 ? 
          parseInt(citationElements[0].textContent.replace(/,/g, '')) || 0 : 0;

      return {
          name,
          totalCitations,
          lastUpdated: new Date().toISOString(),
          url
      };
  }
}

// 初始化
new BackgroundMonitor();