// background.js - 修复版本，解决重复通知问题（持久化通知去重数据）
importScripts('i18n.js');
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
    this.REFRESH_INTERVAL_MINUTES = 30;
    this.ALARM_NAME = 'scholarAutoRefresh';
    this.KEEPALIVE_ALARM = 'keepAlive';
    
    // 修复：移除实例变量，改用持久化存储
    this.notificationCooldown = 5 * 60 * 1000; // 5分钟冷却时间（常量）
    
    console.log('🚀 Scholar Background Service 启动');
    this.init();
}

async init() {
    I18n.currentLang = await I18n.getLanguage();
    this.setupAlarms();
    this.setupEventListeners();
    
    // 启动后立即执行一次检查
    setTimeout(() => {
        this.performStartupCheck();
    }, 3000);
}

setupAlarms() {
    // 先清除现有的alarm
    chrome.alarms.clear(this.ALARM_NAME, (wasCleared) => {
        console.log(`🔄 清除现有定时任务: ${wasCleared ? '成功' : '无需清除'}`);
        
        // 创建新的定时任务 - 关键修复：立即开始，然后周期执行
        chrome.alarms.create(this.ALARM_NAME, {
            delayInMinutes: 0.1,  // 6秒后立即执行第一次
            periodInMinutes: this.REFRESH_INTERVAL_MINUTES
        });
        
        console.log(`⏰ 已创建定时任务: 立即开始，然后每${this.REFRESH_INTERVAL_MINUTES}分钟执行`);
        
        // 验证创建是否成功
        setTimeout(() => {
            chrome.alarms.get(this.ALARM_NAME, (alarm) => {
                if (alarm) {
                    console.log('✅ 定时任务创建成功，下次执行:', new Date(alarm.scheduledTime));
                } else {
                    console.error('❌ 定时任务创建失败，重试...');
                    this.setupAlarms(); // 重试
                }
            });
        }, 1000);
    });

    // 创建保活alarm
    chrome.alarms.create(this.KEEPALIVE_ALARM, {
        delayInMinutes: 1,
        periodInMinutes: 10
    });
}

setupEventListeners() {
    // 最重要：Alarm监听器
    chrome.alarms.onAlarm.addListener((alarm) => {
        console.log(`🔔 Alarm触发: ${alarm.name} at ${new Date().toISOString()}`);
        
        if (alarm.name === this.ALARM_NAME) {
            console.log('📚 开始执行定时刷新任务');
            this.executeAutoRefresh().catch(error => {
                console.error('❌ 定时刷新失败:', error);
            });
        } else if (alarm.name === this.KEEPALIVE_ALARM) {
            console.log('💓 保活检查');
            this.performHealthCheck();
        }
    });

    // 扩展安装/更新事件
    chrome.runtime.onInstalled.addListener((details) => {
        console.log('📦 扩展事件:', details.reason);
        this.setupAlarms();
        
        if (details.reason === 'install') {
            this.showNotification({
                type: 'basic',
                iconUrl: 'icon48.png',
                title: 'Scholar Monitor',
                message: t('notify_installed')
            });
        }
    });

    // Chrome启动事件
    chrome.runtime.onStartup.addListener(() => {
        console.log('🚀 Chrome启动，重新设置定时任务');
        this.setupAlarms();
    });

    // 消息监听器 - 修复：添加缺失的消息处理
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        console.log('📨 收到消息:', request.action);
        
        this.handleMessage(request, sender)
            .then(response => {
                console.log('✅ 消息处理完成:', request.action);
                sendResponse(response);
            })
            .catch(error => {
                console.error('❌ 消息处理失败:', error);
                sendResponse({success: false, error: error.message});
            });
        
        return true; // 保持消息通道开放
    });

    // 存储变化监听器
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local') {
            if (changes.language) {
                I18n.currentLang = changes.language.newValue || 'zh';
                console.log(`Language changed to: ${I18n.currentLang}`);
            }
            if (changes.authors) {
                console.log('📚 作者列表发生变化，确保定时任务正常');
                this.ensureAlarmIsActive();
            }
        }
    });
}

async handleMessage(request, sender) {
    switch (request.action) {
        case 'getStatus':
            return {
                success: true, 
                status: await this.getStatus()
            };
            
        case 'manualRefresh':
            console.log('🔄 手动刷新请求');
            // 手动刷新时不发送通知，避免重复
            await this.executeAutoRefresh(false); // 传入参数禁用通知
            return {success: true, message: '手动刷新完成'};
            
        case 'resetAlarm':
            console.log('⚡ 重置定时任务请求');
            this.setupAlarms();
            return {success: true, message: '定时任务已重置'};
            
        case 'clearLogs':
            await this.saveRefreshLogs([]);
            return {success: true, message: '日志已清除'};
            
        case 'testAlarm':
            return await this.testAlarmFunctionality();
            
        default:
            throw new Error(`未知操作: ${request.action}`);
    }
}

// 启动检查
async performStartupCheck() {
    try {
        console.log('🔍 执行启动检查...');
        
        const authors = await this.getStoredAuthors();
        console.log(`📊 当前监控 ${authors.length} 位作者`);
        
        if (authors.length === 0) {
            console.log('📝 暂无需要监控的作者');
            return;
        }

        // 检查上次更新时间
        const lastUpdateTime = await this.getLastUpdateTime();
        const now = new Date();
        const timeSinceLastUpdate = lastUpdateTime ? 
            (now - new Date(lastUpdateTime)) / (1000 * 60) : Infinity;

        console.log(`⏰ 距离上次更新: ${Math.round(timeSinceLastUpdate)}分钟`);

        // 如果超过35分钟没有更新，立即执行一次
        if (timeSinceLastUpdate > 35) {
            console.log('⚡ 距离上次更新时间过长，立即执行刷新');
            await this.executeAutoRefresh();
        }

        this.ensureAlarmIsActive();

    } catch (error) {
        console.error('❌ 启动检查失败:', error);
    }
}

// 健康检查
async performHealthCheck() {
    try {
        // 检查主alarm是否存在
        chrome.alarms.get(this.ALARM_NAME, (alarm) => {
            if (!alarm) {
                console.log('⚠️ 主定时任务丢失，重新创建');
                this.setupAlarms();
            } else {
                console.log('✅ 定时任务正常，下次执行:', new Date(alarm.scheduledTime));
            }
        });
        
        // 检查是否有待处理的作者
        const authors = await this.getStoredAuthors();
        const lastUpdate = await this.getLastUpdateTime();
        
        if (lastUpdate) {
            const timeSinceUpdate = (Date.now() - new Date(lastUpdate)) / (1000 * 60);
            console.log(`⏰ 健康检查 - 距离上次更新: ${Math.round(timeSinceUpdate)} 分钟`);
            
            // 如果超过40分钟没有更新且有作者需要监控，触发一次刷新
            if (timeSinceUpdate > 40 && authors.length > 0) {
                console.log('🚨 长时间未更新，触发紧急刷新');
                this.executeAutoRefresh();
            }
        }
        
    } catch (error) {
        console.error('❌ 健康检查失败:', error);
    }
}

// 确保alarm处于活动状态
async ensureAlarmIsActive() {
    return new Promise((resolve) => {
        chrome.alarms.get(this.ALARM_NAME, (alarm) => {
            if (!alarm) {
                console.log('⚠️ 定时任务不存在，重新创建');
                this.setupAlarms();
            } else {
                console.log('✅ 定时任务正常运行，下次执行时间:', new Date(alarm.scheduledTime));
            }
            resolve();
        });
    });
}

// 新增：获取上次通知信息（从存储中）
async getLastNotificationInfo() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['lastNotificationHash', 'lastNotificationTime'], (result) => {
            resolve({
                hash: result.lastNotificationHash || null,
                time: result.lastNotificationTime || 0
            });
        });
    });
}

// 新增：保存通知信息（到存储中）
async saveNotificationInfo(hash, time) {
    return new Promise((resolve) => {
        chrome.storage.local.set({
            lastNotificationHash: hash,
            lastNotificationTime: time
        }, resolve);
    });
}

// 执行自动刷新 - 修复：添加通知控制参数
async executeAutoRefresh(enableNotifications = true) {
    const startTime = new Date();
    console.log('🔄 开始执行自动刷新...', startTime.toISOString());
    
    try {
        const changes = await this.autoRefreshAll();
        
        const endTime = new Date();
        const duration = endTime - startTime;
        console.log(`✅ 自动刷新完成，耗时: ${duration}ms`);
        
        await this.recordRefreshAttempt(startTime, endTime, true);
        
        // 只有在启用通知且有变化时才发送通知
        if (enableNotifications && changes && (changes.citationChanges.length > 0 || changes.paperChanges.length > 0)) {
            await this.showChangeNotifications(changes.citationChanges, changes.paperChanges);
        }
        
    } catch (error) {
        const endTime = new Date();
        console.error('❌ 自动刷新失败:', error);
        
        await this.recordRefreshAttempt(startTime, endTime, false, error.message);
        
        // 错误通知也要控制
        if (enableNotifications) {
            await this.showNotification({
                type: 'basic',
                iconUrl: 'icon48.png',
                title: t('notify_error_title'),
                message: t('notify_refresh_failed', {error: error.message.substring(0, 100)})
            });
        }
    }
}

// 测试alarm功能
async testAlarmFunctionality() {
    return new Promise((resolve) => {
        const testAlarmName = 'test_alarm_' + Date.now();
        
        console.log('🧪 开始测试alarm功能...');
        
        // 创建测试alarm
        chrome.alarms.create(testAlarmName, {delayInMinutes: 0.1});
        
        // 监听测试alarm
        const testListener = (alarm) => {
            if (alarm.name === testAlarmName) {
                chrome.alarms.onAlarm.removeListener(testListener);
                chrome.alarms.clear(testAlarmName);
                console.log('✅ Alarm功能测试成功');
                resolve({
                    success: true, 
                    message: 'Alarm功能正常',
                    testTime: new Date().toISOString()
                });
            }
        };
        
        chrome.alarms.onAlarm.addListener(testListener);
        
        // 10秒后超时
        setTimeout(() => {
            chrome.alarms.onAlarm.removeListener(testListener);
            chrome.alarms.clear(testAlarmName);
            console.log('❌ Alarm功能测试超时');
            resolve({
                success: false, 
                message: 'Alarm功能测试超时',
                testTime: new Date().toISOString()
            });
        }, 10000);
    });
}
async autoRefreshAll() {
    try {
        const authors = await this.getStoredAuthors();
        if (authors.length === 0) {
            console.log('📝 没有需要刷新的作者');
            return null;
        }

        console.log(`🔄 开始刷新 ${authors.length} 位作者...`);
        let successCount = 0;
        let errorCount = 0;
        const errors = [];
        const citationChanges = [];
        const paperChanges = [];

        for (let i = 0; i < authors.length; i++) {
            const author = authors[i];
            console.log(`👤 正在刷新作者: ${author.name} (${i + 1}/${authors.length})`);
            
            try {
                // 添加请求间隔，避免被限制
                if (i > 0) {
                    await new Promise(resolve => setTimeout(resolve, 3000));
                }
                
                const updatedInfo = await this.fetchCompleteAuthorInfoWithRetry(
                    author.url, 
                    author.workingDomain
                );
                
                // 检查总引用变化
                if (updatedInfo.totalCitations !== author.totalCitations) {
                    const change = {
                        name: author.name,
                        oldCitations: author.totalCitations,
                        newCitations: updatedInfo.totalCitations,
                        increase: updatedInfo.totalCitations - author.totalCitations
                    };
                    citationChanges.push(change);
                    
                    updatedInfo.hasNewCitations = true;
                    updatedInfo.previousCitations = author.totalCitations;
                    updatedInfo.changeTimestamp = new Date().toISOString();
                    
                    console.log(`📈 ${author.name} 总引用变化: ${author.totalCitations} -> ${updatedInfo.totalCitations} (+${change.increase})`);
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
                
                // 检查论文引用变化
                if (author.papers && author.papers.length > 0 && 
                    updatedInfo.papers && updatedInfo.papers.length > 0) {
                    const paperChangeList = this.comparePapers(author.papers, updatedInfo.papers);
                    if (paperChangeList.length > 0) {
                        updatedInfo.paperChanges = paperChangeList;
                        paperChanges.push({
                            authorName: author.name,
                            changes: paperChangeList
                        });
                        console.log(`📄 ${author.name} 检测到 ${paperChangeList.length} 篇论文引用变化`);
                    } else if (author.paperChanges && this.isChangeRecent(author.changeTimestamp)) {
                        updatedInfo.paperChanges = author.paperChanges;
                    }
                }
                
                authors[i] = {
                    ...author,
                    ...updatedInfo,
                    lastUpdated: new Date().toISOString()
                };
                
                successCount++;
                console.log(`✅ ${author.name} 刷新成功`);
                
            } catch (error) {
                console.error(`❌ 自动刷新 ${author.name} 失败:`, error.message);
                errorCount++;
                errors.push({
                    name: author.name,
                    error: error.message
                });
                
                authors[i].lastUpdated = new Date().toISOString();
                authors[i].lastError = error.message;
            }
        }

        await this.saveAuthors(authors);
        
        console.log(`📊 自动刷新完成: 成功 ${successCount}, 失败 ${errorCount}`);
        
        if (errors.length > 0) {
            console.log('❌ 失败详情:', errors);
        }
        
        // 返回变化数据供通知使用
        return {
            citationChanges,
            paperChanges,
            successCount,
            errorCount
        };
        
    } catch (error) {
        console.error('❌ 自动刷新过程出错:', error);
        throw error;
    }
}

// 记录刷新尝试
async recordRefreshAttempt(startTime, endTime, success, errorMessage = null) {
    const duration = endTime - startTime;
    
    const refreshLog = {
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        duration: duration,
        success: success,
        error: errorMessage
    };

    try {
        const logs = await this.getRefreshLogs();
        logs.push(refreshLog);
        
        // 只保留最近20次记录
        if (logs.length > 20) {
            logs.splice(0, logs.length - 20);
        }

        await this.saveRefreshLogs(logs);
        await this.setLastUpdateTime();
        
        console.log(`📊 刷新记录已保存 ${success ? '✅' : '❌'}`);
        
    } catch (error) {
        console.error('❌ 保存刷新记录失败:', error);
    }
}

// 修复：通知去重和控制方法
generateNotificationHash(citationChanges, paperChanges) {
    const data = {
        citations: citationChanges.map(c => `${c.name}:${c.increase}`).sort(),
        papers: paperChanges.map(p => `${p.authorName}:${p.changes.length}`).sort(),
        timestamp: Math.floor(Date.now() / (1000 * 60 * 5)) // 5分钟内的通知视为相同
    };
    return JSON.stringify(data);
}

// 修复：使用持久化存储检查是否应该显示通知
async shouldShowNotification(citationChanges, paperChanges) {
    const now = Date.now();
    const lastInfo = await this.getLastNotificationInfo();
    
    // 检查冷却时间
    if (now - lastInfo.time < this.notificationCooldown) {
        console.log('🔕 通知在冷却期内，跳过');
        return false;
    }
    
    // 检查内容是否重复
    const currentHash = this.generateNotificationHash(citationChanges, paperChanges);
    if (lastInfo.hash === currentHash) {
        console.log('🔕 重复通知内容，跳过');
        return false;
    }
    
    return true;
}

// 修复：保存通知时间到持久化存储
async showNotification(options) {
    try {
        await chrome.notifications.create(options);
        const now = Date.now();
        await this.saveNotificationInfo(null, now); // 保存通知时间
        console.log('🔔 通知已发送');
    } catch (error) {
        console.error('❌ 发送通知失败:', error);
    }
}

// 修复：显示变化通知 - 使用持久化去重机制
async showChangeNotifications(citationChanges, paperChanges) {
    // 检查是否应该显示通知
    if (!(await this.shouldShowNotification(citationChanges, paperChanges))) {
        return;
    }
    
    const totalCitationIncrease = citationChanges.reduce((sum, change) => sum + change.increase, 0);
    const totalPaperChanges = paperChanges.reduce((sum, author) => sum + author.changes.length, 0);
    
    // 生成并保存通知哈希
    const notificationHash = this.generateNotificationHash(citationChanges, paperChanges);
    const now = Date.now();
    await this.saveNotificationInfo(notificationHash, now);
    
    if (citationChanges.length === 1 && paperChanges.length <= 1) {
        const citationChange = citationChanges[0];
        const authorPaperChanges = paperChanges.find(pc => pc.authorName === citationChange.name);

        let message = t('notify_single_change', {
            name: citationChange.name,
            old: citationChange.oldCitations,
            new: citationChange.newCitations,
            increase: citationChange.increase
        });

        if (authorPaperChanges && authorPaperChanges.changes.length > 0) {
            message += '\n' + t('notify_paper_changes_single', {count: authorPaperChanges.changes.length});
        }

        await chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icon48.png',
            title: t('notify_citation_update'),
            message: message
        });
    } else {
        let message = '';

        if (citationChanges.length > 0) {
            message += t('notify_multi_citations', {count: citationChanges.length, total: totalCitationIncrease});
        }

        if (totalPaperChanges > 0) {
            if (message) message += '\n';
            message += t('notify_multi_papers', {count: totalPaperChanges});
        }

        await chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icon48.png',
            title: t('notify_multi_title', {count: Math.max(citationChanges.length, paperChanges.length)}),
            message: message
        });
    }
    
    console.log('🔔 变化通知已发送');
}

async getStatus() {
    const [lastUpdateTime, authors, refreshLogs] = await Promise.all([
        this.getLastUpdateTime(),
        this.getStoredAuthors(),
        this.getRefreshLogs()
    ]);
    
    return new Promise((resolve) => {
        chrome.alarms.get(this.ALARM_NAME, (alarm) => {
            resolve({
                lastUpdateTime,
                authorsCount: authors.length,
                alarmActive: !!alarm,
                nextAlarmTime: alarm ? new Date(alarm.scheduledTime).toISOString() : null,
                recentLogs: refreshLogs.slice(-5),
                serviceWorkerStatus: 'active',
                currentTime: new Date().toISOString()
            });
        });
    });
}

// 辅助方法
isChangeRecent(changeTimestamp) {
    if (!changeTimestamp) return false;
    const changeTime = new Date(changeTimestamp);
    const now = new Date();
    const hoursDiff = (now - changeTime) / (1000 * 60 * 60);
    return hoursDiff < 24;
}

comparePapers(oldPapers, newPapers) {
    const changes = [];
    
    for (const newPaper of newPapers) {
        const oldPaper = oldPapers.find(p => p.title === newPaper.title);
        if (oldPaper && oldPaper.citations !== newPaper.citations) {
            changes.push({
                title: newPaper.title,
                oldCitations: oldPaper.citations,
                newCitations: newPaper.citations,
                increase: newPaper.citations - oldPaper.citations
            });
        }
    }
    
    return changes;
}

// 存储相关方法
async getRefreshLogs() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['refreshLogs'], (result) => {
            resolve(result.refreshLogs || []);
        });
    });
}

async saveRefreshLogs(logs) {
    return new Promise((resolve) => {
        chrome.storage.local.set({refreshLogs: logs}, resolve);
    });
}

async getLastUpdateTime() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['lastUpdateTime'], (result) => {
            resolve(result.lastUpdateTime);
        });
    });
}

async setLastUpdateTime() {
    const now = new Date().toISOString();
    console.log('💾 设置最后更新时间:', now);
    
    return new Promise((resolve) => {
        chrome.storage.local.set({lastUpdateTime: now}, () => {
            console.log('✅ 最后更新时间已保存');
            resolve();
        });
    });
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
          const interestsMatch = html.match(/\d+[^"]*?((?:‪[^‬]+‬(?:\s*-\s*)?)+)/);
          let interests = '未知领域';
          if (interestsMatch) {
              const interestsList = interestsMatch[1].match(/‪([^‬]+)‬/g);
              if (interestsList) {
                  interests = interestsList.map(item => item.replace(/‪|‬/g, '')).join(', ');
              }
          } else {
              // 备用方案：从所有匹配项中过滤
              const allMatches = html.match(/content="[^"]*‪([^‬]+)‬(?:\s*"|\s*>)/);
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
    //   changes.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
      
      return changes;
  }
}

// 启动后台服务
// 创建全局实例
const scholarService = new ScholarBackgroundService();

// 保持Service Worker活跃
console.log('🔥 Scholar Monitor Service Worker 已启动');
console.log('⏰ 当前时间:', new Date().toISOString());

// 导出服务实例供其他脚本使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = scholarService;
}
