// background.js - 使用正则表达式版本，支持完整论文变化检测
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
          const paperChanges = [];

          for (let i = 0; i < authors.length; i++) {
              const author = authors[i];
              console.log(`正在刷新作者: ${author.name}`);
              
              try {
                  if (i > 0) {
                      await new Promise(resolve => setTimeout(resolve, 2000));
                  }
                  
                  // 获取完整的作者信息，包括所有论文
                  const updatedInfo = await this.fetchCompleteAuthorInfoWithRetry(author.url, author.workingDomain);
                  
                  // 检查总引用变化
                  if (updatedInfo.totalCitations !== author.totalCitations) {
                      const change = {
                          name: author.name,
                          oldCitations: author.totalCitations,
                          newCitations: updatedInfo.totalCitations,
                          increase: updatedInfo.totalCitations - author.totalCitations
                      };
                      citationChanges.push(change);
                      
                      // 更新变化标记
                      updatedInfo.hasNewCitations = true;
                      updatedInfo.previousCitations = author.totalCitations;
                      updatedInfo.changeTimestamp = new Date().toISOString();
                      
                      console.log(`${author.name} 总引用有变化: ${author.totalCitations} -> ${updatedInfo.totalCitations} (+${change.increase})`);
                  } else {
                      // 保持原有的变化状态
                      updatedInfo.hasNewCitations = author.hasNewCitations;
                      updatedInfo.previousCitations = author.previousCitations;
                      updatedInfo.changeTimestamp = author.changeTimestamp;
                      
                      // 如果变化时间超过24小时，清除变化标记
                      if (!this.isChangeRecent(updatedInfo.changeTimestamp)) {
                          updatedInfo.hasNewCitations = false;
                          delete updatedInfo.previousCitations;
                          delete updatedInfo.changeTimestamp;
                      }
                  }
                  
                  // 检查论文引用变化
                  if (author.papers && author.papers.length > 0 && updatedInfo.papers && updatedInfo.papers.length > 0) {
                      const paperChangeList = this.comparePapers(author.papers, updatedInfo.papers);
                      if (paperChangeList.length > 0) {
                          updatedInfo.paperChanges = paperChangeList;
                          paperChanges.push({
                              authorName: author.name,
                              changes: paperChangeList
                          });
                          console.log(`${author.name} 检测到 ${paperChangeList.length} 篇论文引用变化`);
                      } else {
                          // 保持原有的论文变化记录（如果存在且时间未过期）
                          if (author.paperChanges && this.isChangeRecent(author.changeTimestamp)) {
                              updatedInfo.paperChanges = author.paperChanges;
                          }
                      }
                  }
                  
                  // 合并数据：保持机构和研究领域不变，更新其他信息
                  authors[i] = {
                      ...author, // 保持原有的所有信息
                      ...updatedInfo, // 覆盖更新的信息
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
          if (citationChanges.length > 0 || paperChanges.length > 0) {
              await this.showChangeNotifications(citationChanges, paperChanges);
          }
          
          if (errors.length > 0) {
              console.log('失败详情:', errors);
          }
          
      } catch (error) {
          console.error('自动刷新过程出错:', error);
      }
  }

  // 显示变化通知（包括总引用和论文变化）
  async showChangeNotifications(citationChanges, paperChanges) {
      const totalCitationIncrease = citationChanges.reduce((sum, change) => sum + change.increase, 0);
      const totalPaperChanges = paperChanges.reduce((sum, author) => sum + author.changes.length, 0);
      
      if (citationChanges.length === 1 && paperChanges.length <= 1) {
          // 单个作者变化
          const citationChange = citationChanges[0];
          const authorPaperChanges = paperChanges.find(pc => pc.authorName === citationChange.name);
          
          let message = `${citationChange.name} 的总引用从 ${citationChange.oldCitations} 增加到 ${citationChange.newCitations} (+${citationChange.increase})`;
          
          if (authorPaperChanges && authorPaperChanges.changes.length > 0) {
              message += `\n其中 ${authorPaperChanges.changes.length} 篇论文引用发生变化`;
          }
          
          chrome.notifications.create({
              type: 'basic',
              iconUrl: 'icon48.png',
              title: '🎉 引用数量更新',
              message: message
          });
      } else {
          // 多个作者变化
          let message = '';
          
          if (citationChanges.length > 0) {
              const authorNames = citationChanges.map(c => c.name).join(', ');
              message += `${citationChanges.length} 位学者总引用增加 ${totalCitationIncrease} 次`;
          }
          
          if (totalPaperChanges > 0) {
              if (message) message += '\n';
              message += `共 ${totalPaperChanges} 篇论文引用发生变化`;
          }
          
          chrome.notifications.create({
              type: 'basic',
              iconUrl: 'icon48.png',
              title: `🎉 ${Math.max(citationChanges.length, paperChanges.length)} 位学者引用更新`,
              message: message
          });
      }
  }

  // 获取完整作者信息（包括所有论文）
  async fetchCompleteAuthorInfoWithRetry(url, preferredDomain = null, maxRetries = 2) {
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
                  const result = await this.fetchCompleteAuthorInfo(testUrl, userId, preferredDomain);
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
                  const result = await this.fetchCompleteAuthorInfo(testUrl, userId, domain);
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
      throw new Error(`所有域名都无法访问。尝试了 ${this.scholarDomains.length} 个域名，每个重试 ${maxRetries} 次。`);
  }

  // 获取完整作者信息（基本信息 + 所有论文）
  async fetchCompleteAuthorInfo(baseUrl, userId, domain) {
      // 第一步：获取基本信息
      const basicInfo = await this.fetchBasicAuthorInfo(baseUrl);
      
      // 第二步：获取所有论文
      console.log(`开始获取 ${basicInfo.name} 的完整论文列表...`);
      const allPapers = await this.fetchAllPapersRecursively(baseUrl, userId, domain);
      
      return {
          ...basicInfo,
          papers: allPapers,
          totalPapers: allPapers.length,
          userId: userId
      };
  }

  // 获取基本作者信息（使用正则表达式）
  async fetchBasicAuthorInfo(url) {
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

  // 完整解析方法（用于首次添加作者）- 使用正则表达式
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
          const interestsMatch = html.match(/Cited by \d+[^"]*?((?:‪[^‬]+‬(?:\s*-\s*)?)+)/);
          let interests = '未知领域';
          if (interestsMatch) {
              const interestsList = interestsMatch[1].match(/‪([^‬]+)‬/g);
              if (interestsList) {
                  interests = interestsList.map(item => item.replace(/‪|‬/g, '')).join(', ');
              }
          } else {
              // 备用方案：从所有匹配项中过滤
              const allMatches = html.match(/‪([^‬]+)‬/g);
              if (allMatches) {
                  const filtered = allMatches
                      .map(item => item.replace(/‪|‬/g, ''))
                      .filter(item => !['Professor', 'Institute', 'University', 'Cited by'].some(kw => item.includes(kw)));
                  if (filtered.length > 0) {
                      interests = filtered.join(', ');
                  }
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
              i10Index: citationData.i10Index
          };
      } catch (error) {
          throw new Error(`解析页面失败: ${error.message}`);
      }
  }

  // 解析引用数据（使用正则表达式）
  parseScholarCitationData(html, url) {
      try {
          // 查找引用统计表格
          const tableMatch = html.match(/<table[^>]*id="gsc_rsb_st"[^>]*>(.*?)<\/table>/s);
          if (!tableMatch) {
              throw new Error('无法找到引用统计表格');
          }

          const tableHtml = tableMatch[1];
          
          // 提取所有数字，按顺序应该是：总引用、近5年引用、H指数、近5年H指数、i10指数、近5年i10指数
          const numberMatches = tableHtml.match(/class="gsc_rsb_std">(\d+(?:,\d+)*|&nbsp;|-)<\/td>/g);
          
          if (!numberMatches || numberMatches.length < 6) {
              console.log('引用数据匹配结果:', numberMatches);
              throw new Error('引用数据格式不完整');
          }

          // 解析数字，处理逗号和空值
          const parseNumber = (match) => {
              const numStr = match.match(/>\s*([^<]+)\s*</)[1];
              if (numStr === '&nbsp;' || numStr === '-' || numStr.trim() === '') {
                  return 0;
              }
              return parseInt(numStr.replace(/,/g, '')) || 0;
          };

          const totalCitations = parseNumber(numberMatches[0]);
          const hIndex = parseNumber(numberMatches[2]);
          const i10Index = parseNumber(numberMatches[4]);

          console.log(`引用数据解析成功: 总引用=${totalCitations}, H指数=${hIndex}, i10指数=${i10Index}`);

          return {
              totalCitations,
              hIndex,
              i10Index
          };
      } catch (error) {
          console.error('解析引用数据失败:', error);
          
          // 备用解析方法
          try {
              const citationRegex = /Citations<\/a><\/td><td[^>]*>(\d+(?:,\d+)*)/;
              const hIndexRegex = /h-index<\/a><\/td><td[^>]*>(\d+(?:,\d+)*)/;
              const i10IndexRegex = /i10-index<\/a><\/td><td[^>]*>(\d+(?:,\d+)*)/;

              const citationMatch = html.match(citationRegex);
              const hMatch = html.match(hIndexRegex);
              const i10Match = html.match(i10IndexRegex);

              const totalCitations = citationMatch ? parseInt(citationMatch[1].replace(/,/g, '')) || 0 : 0;
              const hIndex = hMatch ? parseInt(hMatch[1].replace(/,/g, '')) || 0 : 0;
              const i10Index = i10Match ? parseInt(i10Match[1].replace(/,/g, '')) || 0 : 0;

              console.log(`备用解析成功: 总引用=${totalCitations}, H指数=${hIndex}, i10指数=${i10Index}`);

              return {
                  totalCitations,
                  hIndex,
                  i10Index
              };
          } catch (backupError) {
              console.error('备用解析也失败:', backupError);
              throw new Error(`无法解析引用数据: ${error.message}`);
          }
      }
  }

  // 提取用户ID
  extractUserId(url) {
      const match = url.match(/user=([^&]+)/);
      return match ? match[1] : '';
  }

  // 递归获取所有论文（使用正则表达式）
  async fetchAllPapersRecursively(baseUrl, userId, domain, startIndex = 0, pageSize = 100) {
      const allPapers = [];
      let currentIndex = startIndex;
      let hasMore = true;
      let consecutiveEmptyPages = 0;
      const maxEmptyPages = 1;
      
      console.log(`📚 开始递归获取论文，起始索引: ${currentIndex}`);
      
      while (hasMore && consecutiveEmptyPages < maxEmptyPages) {
          try {
              const pageUrl = `https://${domain}/citations?user=${userId}&cstart=${currentIndex}&pagesize=${pageSize}&sortby=pubdate`;
              console.log(`📄 正在获取第 ${Math.floor(currentIndex/pageSize) + 1} 页`);
              
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
              const pagePapers = this.extractPapersFromHtmlWithRegex(html, currentIndex);
              
              if (pagePapers.length === 0) {
                  consecutiveEmptyPages++;
                  console.log(`⚠️ 第 ${Math.floor(currentIndex/pageSize) + 1} 页无论文数据 (连续空页: ${consecutiveEmptyPages})`);
                  
                  if (consecutiveEmptyPages >= maxEmptyPages) {
                      console.log(`🛑 连续 ${maxEmptyPages} 页无数据，停止获取`);
                      break;
                  }
              } else {
                  consecutiveEmptyPages = 0;
                  allPapers.push(...pagePapers);
                  console.log(`✅ 第 ${Math.floor(currentIndex/pageSize) + 1} 页获取成功: ${pagePapers.length} 篇论文`);
              }
              
              const hasMorePages = this.checkHasMorePagesWithRegex(html);
              if (!hasMorePages && pagePapers.length < pageSize) {
                  console.log(`📋 已到达最后一页，总共获取 ${allPapers.length} 篇论文`);
                  hasMore = false;
              } else {
                  currentIndex += pageSize;
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

  // 从HTML中提取论文信息（使用正则表达式）
// 增强版论文提取方法 - 处理特殊论文行
extractPapersFromHtmlWithRegex(html, startIndex = 0) {
    const papers = [];
    
    try {
        const tableMatch = html.match(/<tbody[^>]*id=\"gsc_a_b\"[^>]*>(.*?)<\/tbody>/s);
        if (!tableMatch) {
            console.log('未找到论文表格');
            return papers;
        }

        const tableHtml = tableMatch[1];
        
        // 匹配所有可能的论文行，包括特殊状态的行
        const rowMatches = tableHtml.match(/<tr[^>]*class=\"[^\"]*gsc_a_tr[^\"]*\"[^>]*>.*?<\/tr>/gs);
        
        if (!rowMatches) {
            console.log('未找到论文行');
            return papers;
        }

        console.log(`找到 ${rowMatches.length} 个论文行`);

        rowMatches.forEach((rowHtml, index) => {
            try {
                // 多种标题匹配策略
                let titleMatch = null;
                let title = '';
                let link = '';

                // 策略1: 标准论文标题匹配
                titleMatch = rowHtml.match(/<a[^>]*class=\"gsc_a_at\"[^>]*(?:href=\"([^\"]*)\")?[^>]*>([^<]+)<\/a>/);
                
                if (titleMatch) {
                    title = titleMatch[2].trim();
                    link = titleMatch[1] ? `https://scholar.google.com${titleMatch[1]}` : '';
                } else {
                    // 策略2: 处理无链接的标题（如某些引用条目）
                    const noLinkTitleMatch = rowHtml.match(/<span[^>]*class=\"gsc_a_at\"[^>]*>([^<]+)<\/span>/);
                    if (noLinkTitleMatch) {
                        title = noLinkTitleMatch[1].trim();
                        link = ''; // 无链接的论文
                    } else {
                        // 策略3: 处理特殊格式的标题
                        const specialTitleMatch = rowHtml.match(/<td[^>]*class=\"gsc_a_t\"[^>]*>.*?<a[^>]*>([^<]+)<\/a>/s);
                        if (specialTitleMatch) {
                            title = specialTitleMatch[1].trim();
                        } else {
                            // 策略4: 最后尝试提取任何可能的标题文本
                            const anyTitleMatch = rowHtml.match(/<td[^>]*class=\"gsc_a_t\"[^>]*>.*?>([^<]+)</s);
                            if (anyTitleMatch) {
                                title = anyTitleMatch[1].trim();
                            }
                        }
                    }
                }

                // 如果仍然没有找到标题，记录详细信息并跳过
                if (!title) {
                    console.log(`第${startIndex + index + 1}行HTML结构:`, rowHtml.substring(0, 200) + '...');
                    console.log(`第${startIndex + index + 1}行未找到标题，跳过`);
                    return;
                }

                // 提取引用数 - 支持多种格式
                let citations = 0;
                const citationMatch = rowHtml.match(/<a[^>]*class=\"gsc_a_ac[^\"]*\"[^>]*>(\d+)<\/a>/) || 
                                    rowHtml.match(/<span[^>]*class=\"gsc_a_ac[^\"]*\"[^>]*>(\d+)<\/span>/);
                if (citationMatch) {
                    citations = parseInt(citationMatch[1]) || 0;
                }

                // 提取年份 - 支持多种格式
                let year = '';
                const yearMatch = rowHtml.match(/<span[^>]*class=\"gsc_a_h[^\"]*\"[^>]*>(\d{4})<\/span>/) ||
                                rowHtml.match(/<td[^>]*class=\"gsc_a_y\"[^>]*>(\d{4})<\/td>/);
                if (yearMatch) {
                    year = yearMatch[1];
                }

                papers.push({
                    title,
                    citations,
                    year,
                    link,
                    index: startIndex + index,
                    hasLink: !!link // 标记是否有链接
                });

                console.log(`成功提取第${startIndex + index + 1}篇: ${title.substring(0, 50)}...`);

            } catch (error) {
                console.log(`解析第${startIndex + index + 1}篇论文失败:`, error);
                console.log(`问题行HTML:`, rowHtml.substring(0, 300) + '...');
            }
        });

    } catch (error) {
        console.error('提取论文信息失败:', error);
    }
    
    console.log(`本页提取到 ${papers.length} 篇论文`);
    return papers;
}


  // 检查是否还有更多页面（使用正则表达式）
  checkHasMorePagesWithRegex(html) {
      // 方法1: 检查"Show more"按钮
      if (html.match(/class="[^"]*gsc_bpf_more[^"]*"/) || html.includes('Show more')) {
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

  // 比较论文变化
  comparePapers(oldPapers, newPapers) {
      const changes = [];
      
      // 创建旧论文的映射表
      const oldPaperMap = new Map();
      oldPapers.forEach(paper => {
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

  isChangeRecent(changeTimestamp) {
      if (!changeTimestamp) return false;
      const changeTime = new Date(changeTimestamp);
      const now = new Date();
      const hoursDiff = (now - changeTime) / (1000 * 60 * 60);
      return hoursDiff < 24;
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
}

// 启动后台服务
new ScholarBackgroundService();