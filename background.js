// background.js - 生产版本（移除调试信息）
class BackgroundMonitor {
  constructor() {
      this.isRefreshing = false;
      this.init();
  }

  init() {
      // 设置定时刷新（每30分钟检查一次）
      chrome.alarms.create('autoRefresh', {
          delayInMinutes: 1,
          periodInMinutes: 30
      });

      // 监听定时器
      chrome.alarms.onAlarm.addListener((alarm) => {
          if (alarm.name === 'autoRefresh') {
              this.autoRefreshAuthors();
          }
      });

      // 监听安装事件
      chrome.runtime.onInstalled.addListener(() => {
          // 可以保留这个日志，用于确认安装
          console.log('Scholar Citation Monitor 已安装');
      });

      // 监听扩展启动
      chrome.runtime.onStartup.addListener(() => {
          this.resetAlarms();
      });

      // 移除调试消息监听，只保留必要的功能
      // 如果你不需要手动触发功能，可以完全删除这个监听器
      /*
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
          // 调试功能已移除
          return false;
      });
      */
  }

  async resetAlarms() {
      try {
          await chrome.alarms.clearAll();
          chrome.alarms.create('autoRefresh', {
              delayInMinutes: 1,
              periodInMinutes: 30
          });
      } catch (error) {
          // 保留错误日志
          console.error('重置定时器失败:', error);
      }
  }

  async autoRefreshAuthors() {
      if (this.isRefreshing) {
          return;
      }

      this.isRefreshing = true;
      
      try {
          const refreshStartTime = new Date().toISOString();
          const result = await chrome.storage.local.get(['authors', 'autoRefreshCount']);
          const authors = result.authors || [];
          const refreshCount = (result.autoRefreshCount || 0) + 1;
          
          if (authors.length === 0) {
              await chrome.storage.local.set({
                  lastAutoRefresh: refreshStartTime,
                  autoRefreshCount: refreshCount
              });
              return;
          }

          let hasUpdates = false;
          let successCount = 0;
          let errorCount = 0;

          const scholarDomains = [
              'scholar.google.com',
              'scholar.google.com.hk',
              'scholar.google.com.sg',
              'scholar.google.co.jp'
          ];

          for (let i = 0; i < authors.length; i++) {
              const author = authors[i];
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
                      try {
                          await chrome.notifications.create({
                              type: 'basic',
                              iconUrl: 'icon48.png',
                              title: '引用数更新',
                              message: `${author.name} 的引用数增加了 ${increase} 次`
                          });
                      } catch (notifError) {
                          // 静默处理通知错误
                      }

                      // 更新徽章
                      try {
                          await chrome.action.setBadgeText({text: '!'});
                          await chrome.action.setBadgeBackgroundColor({color: '#ff0000'});
                      } catch (badgeError) {
                          // 静默处理徽章错误
                      }
                  } else {
                      // 保持现有的新引用状态
                      updatedInfo.hasNewCitations = author.hasNewCitations;
                      updatedInfo.previousCitations = author.previousCitations;
                      updatedInfo.changeTimestamp = author.changeTimestamp;
                  }

                  // 保持其他原有信息
                  updatedInfo.affiliation = author.affiliation;
                  updatedInfo.interests = author.interests;
                  updatedInfo.userId = author.userId;
                  updatedInfo.workingDomain = author.workingDomain || updatedInfo.workingDomain;

                  // 更新数据
                  Object.assign(author, updatedInfo);
                  successCount++;
                  
              } catch (error) {
                  // 只在开发时保留错误日志，生产环境可以移除
                  // console.error(`自动刷新 ${author.name} 失败:`, error);
                  errorCount++;
              }

              // 避免请求过快
              if (i < authors.length - 1) {
                  await new Promise(resolve => setTimeout(resolve, 2000));
              }
          }

          // 保存更新的作者数据
          await chrome.storage.local.set({authors});
          
          // 更新最后更新时间和刷新记录
          await chrome.storage.local.set({
              lastUpdateTime: new Date().toISOString(),
              lastAutoRefresh: refreshStartTime,
              autoRefreshCount: refreshCount
          });

      } catch (error) {
          // 保留关键错误日志
          console.error('自动刷新失败:', error);
      } finally {
          this.isRefreshing = false;
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

              if (!response.ok) {
                  throw new Error(`HTTP ${response.status}`);
              }

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

      const nameElement = doc.querySelector('#gsc_prf_in');
      const name = nameElement ? nameElement.textContent.trim() : '';

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