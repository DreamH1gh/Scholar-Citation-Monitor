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

    // 引用明细追踪硬上限：超过此引用数的论文不追踪（受限于反爬 + 抓取页数 cap，
    // 高引用论文无法建立完整基线，强行追踪会污染 diff 并大幅增加封号风险）
    this.MAX_TRACKABLE_CITATIONS = 100;

    // warmup 批次级覆盖率判定：Scholar 偶发返回稀疏引用列表（cited by 页面条目远少于 citations 数），
    // 单篇看 length>0 无法识别——这种异常通常是 Scholar 全局抽风，一次 refresh 内所有论文都受影响。
    // 做批次级聚合：同作者本批次所有 warmup 抓取的 总抓取数/总引用数 < 阈值时整批作废下次重试，
    // 避免用残缺基线下次 diff 把缺失的引用者全误报为新增
    this.WARMUP_COVERAGE_THRESHOLD = 0.6;
    this.WARMUP_MIN_SAMPLE = 3; // 样本太少时跳过判定（统计无意义）

    // 修复：移除实例变量，改用持久化存储
    this.notificationCooldown = 5 * 60 * 1000; // 5分钟冷却时间（常量）
    
    console.log('🚀 Scholar Background Service 启动');
    this.init();
}

async init() {
    I18n.currentLang = await I18n.getLanguage();
    this.setupAlarms(false);
    this.setupEventListeners();
    await this.dedupeHistoryOnce();

    // 启动后立即执行一次检查
    setTimeout(() => {
        this.performStartupCheck();
    }, 3000);
}

setupAlarms(forceReset = false) {
    chrome.alarms.get(this.ALARM_NAME, (existingAlarm) => {
        const needCreate = forceReset || !existingAlarm;
        if (!needCreate) {
            console.log(`✅ 定时任务已存在，下次执行: ${new Date(existingAlarm.scheduledTime)}`);
            chrome.alarms.get(this.KEEPALIVE_ALARM, (ka) => {
                if (!ka) {
                    chrome.alarms.create(this.KEEPALIVE_ALARM, {
                        delayInMinutes: 1,
                        periodInMinutes: 10
                    });
                }
            });
            return;
        }
        chrome.alarms.clear(this.ALARM_NAME, () => {
            chrome.alarms.create(this.ALARM_NAME, {
                delayInMinutes: 0.1,
                periodInMinutes: this.REFRESH_INTERVAL_MINUTES
            });
            chrome.alarms.create(this.KEEPALIVE_ALARM, {
                delayInMinutes: 1,
                periodInMinutes: 10
            });
            console.log(`⏰ 已创建定时任务 (forceReset=${forceReset})`);
        });
    });
}

setupEventListeners() {
    // 最重要：Alarm监听器
    chrome.alarms.onAlarm.addListener(async (alarm) => {
        console.log(`🔔 Alarm触发: ${alarm.name} at ${new Date().toISOString()}`);

        if (alarm.name === this.ALARM_NAME) {
            console.log('📚 开始执行定时刷新任务');
            try {
                await this.executeAutoRefresh();
            } catch (error) {
                console.error('❌ 定时刷新失败:', error);
            }
        } else if (alarm.name === this.KEEPALIVE_ALARM) {
            console.log('💓 保活检查');
            try {
                await this.performHealthCheck();
            } catch (error) {
                console.error('❌ 健康检查失败:', error);
            }
        }
    });

    // 扩展安装/更新事件
    chrome.runtime.onInstalled.addListener((details) => {
        console.log('📦 扩展事件:', details.reason);
        this.setupAlarms(true);
        
        if (details.reason === 'install') {
            this.showNotification({
                type: 'basic',
                iconUrl: 'icon48.png',
                title: 'Scholar Monitor',
                message: t('notify_installed')
            });
        }

        // 更新时清理旧版本可能堆叠的桌面通知（dual-ID 时代遗留）
        if (details.reason === 'update') {
            chrome.notifications.clear('scholar-citation-multi');
        }
    });

    // Chrome启动事件
    chrome.runtime.onStartup.addListener(() => {
        console.log('🚀 Chrome启动，重新设置定时任务');
        this.setupAlarms(false);
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
            const refreshResult = await this.executeAutoRefresh(false);
            return {
                success: true,
                message: '手动刷新完成',
                result: refreshResult || {successCount: 0, errorCount: 0, errors: []}
            };
            
        case 'resetAlarm':
            console.log('⚡ 重置定时任务请求');
            this.setupAlarms(true);
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

        // 如果超过35分钟没有更新，提前 alarm 让监听器统一触发（避免与 alarm 双重 executeAutoRefresh）
        if (timeSinceLastUpdate > 35) {
            console.log('⚡ 距离上次更新时间过长，提前 alarm 立即触发');
            chrome.alarms.create(this.ALARM_NAME, {
                delayInMinutes: 0.1,
                periodInMinutes: this.REFRESH_INTERVAL_MINUTES
            });
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
                this.setupAlarms(false);
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
                await this.executeAutoRefresh();
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
                this.setupAlarms(false);
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
    // 并发守卫：防止 alarm 自动刷新与 popup 手动刷新重叠，避免重复请求 Scholar 导致封号
    if (this._refreshing) {
        console.log('⏳ 已有刷新任务在执行，跳过本次');
        return null;
    }
    this._refreshing = true;

    const startTime = new Date();
    console.log('🔄 开始执行自动刷新...', startTime.toISOString());

    try {
        const changes = await this.autoRefreshAll();

        const endTime = new Date();
        const duration = endTime - startTime;
        console.log(`✅ 自动刷新完成，耗时: ${duration}ms`);

        await this.recordRefreshAttempt(startTime, endTime, true);

        // 通知过滤：只对引用"增加"发通知，引用减少（Scholar 修正）静默更新基线。
        // modal 里仍保留所有变化（含减少），用户主动点开能看到。
        // 不过滤的话 notify_single_change 会出现 "(+-5)" / "从 100 增加到 95" 这种矛盾文案。
        if (changes) {
            changes.citationChanges = (changes.citationChanges || []).filter(c => c.increase > 0);
            changes.paperChanges = (changes.paperChanges || [])
                .map(p => ({authorName: p.authorName, changes: p.changes.filter(c => c.change > 0)}))
                .filter(p => p.changes.length > 0);
        }

        // 只有在启用通知且有正向变化时才发送通知
        if (enableNotifications && changes && (changes.citationChanges.length > 0 || changes.paperChanges.length > 0)) {
            await this.showChangeNotifications(changes.citationChanges, changes.paperChanges);
        }

        return changes;

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

        return null;
    } finally {
        this._refreshing = false;
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

            // 每个作者开始前重置反爬标志：本作者的 enrichCitationDetails 反爬不应影响下一个作者，
            // 但本作者内反爬后跳过 initializeBaseline（Scholar session 级反爬，继续请求也会被拦）
            this._authorAntiCrawlHit = false;

            try {
                // 添加请求间隔，避免被限制
                if (i > 0) {
                    await new Promise(resolve => setTimeout(resolve, 3000));
                }
                
                let updatedInfo = await this.fetchCompleteAuthorInfoWithRetry(
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
                    // 引用数没变：重读 storage，避免用循环开始时读到的旧 author 引用。
                    // 用户可能在抓取期间点"已读"（清掉 hasNewCitations/changeTimestamp/paperChanges）或 re-add 作者。
                    const latestSnap = await this.getStoredAuthors();
                    const latestAuthor = latestSnap.find(a => a.userId === author.userId) || author;

                    updatedInfo.hasNewCitations = latestAuthor.hasNewCitations;
                    updatedInfo.previousCitations = latestAuthor.previousCitations;
                    updatedInfo.changeTimestamp = latestAuthor.changeTimestamp;
                    updatedInfo.paperChanges = latestAuthor.paperChanges;

                    if (!this.isChangeRecent(updatedInfo.changeTimestamp)) {
                        // 过期：用 undefined / [] 覆盖（delete 在 spread 时会被 author 的旧值盖回）
                        updatedInfo.hasNewCitations = false;
                        updatedInfo.previousCitations = undefined;
                        updatedInfo.changeTimestamp = undefined;
                        updatedInfo.paperChanges = [];
                    }
                }
                
                // 把旧论文的 seenCiterIds / warmedUp 按 title 迁到新论文，
                // 否则未变化的论文每次刷新都会丢失基线（现存 bug，warmup 依赖此元数据）
                if (author.papers && updatedInfo.papers) {
                    this.mergePaperMetadata(author.papers, updatedInfo.papers);
                }

                // 检查论文引用变化
                // freshChangeTitles: 本次 refresh 真正检测到变化的论文 title 集合
                // 传给 enrichCitationDetails，让它只对这些论文重爬引用者；
                // 累积 paperChanges 里已预热但本次未变化的论文跳过，避免反复请求触发反爬
                let freshChangeTitles = new Set();
                if (author.papers && author.papers.length > 0 &&
                    updatedInfo.papers && updatedInfo.papers.length > 0) {
                    const paperChangeList = this.comparePapers(author.papers, updatedInfo.papers);
                    freshChangeTitles = new Set(paperChangeList.map(c => c.title));
                    if (paperChangeList.length > 0) {
                        // 累加合并：与已存在的 paperChanges 按 title merge，
                        // 用户多天不点已读时能看到累积总变化（而非被覆盖）
                        const existing = Array.isArray(updatedInfo.paperChanges) ? updatedInfo.paperChanges : [];
                        updatedInfo.paperChanges = this.mergePaperChanges(existing, paperChangeList);
                        paperChanges.push({
                            authorName: author.name,
                            changes: paperChangeList
                        });
                        console.log(`📄 ${author.name} 检测到 ${paperChangeList.length} 篇论文引用变化（累积 ${updatedInfo.paperChanges.length} 条）`);
                    }
                    // 没有新变化时 paperChanges 已在 else 分支从 latestAuthor 取，无需再用旧 author 引用兜底
                }

                // 新增引用明细：仅对本次检测到变化的论文抓取新引用者
                // （已预热但本次未变化的累积记录会跳过，保留 newCiters 不动）
                if (updatedInfo.paperChanges && updatedInfo.paperChanges.length > 0) {
                    try {
                        updatedInfo = await this.enrichCitationDetails(author, updatedInfo, freshChangeTitles);
                    } catch (err) {
                        console.error(`⚠️ 引用明细抓取异常 (${author.name}):`, err);
                    }
                }

                // 基线初始化：两开关都开 + 未初始化时，主动为所有合格论文建立基线
                // workingDomain 缺失时跳过：硬编码 fallback 在某些地区 ping 不通
                if (author.workingDomain) {
                    try {
                        updatedInfo = await this.initializeBaseline(author, updatedInfo, author.workingDomain);
                    } catch (err) {
                        console.error(`⚠️ 基线初始化异常 (${author.name}):`, err);
                    }
                }

                // 合并前重读 storage：spread 的第一项必须是 latest，否则 history / historyExpanded /
                // citationDetailsEnabled 等字段会被循环开始时读到的旧 author 引用覆盖
                const latestSnap2 = await this.getStoredAuthors();
                const latestAuthor2 = latestSnap2.find(a => a.userId === author.userId) || author;

                authors[i] = {
                    ...latestAuthor2,
                    ...updatedInfo,
                    lastUpdated: new Date().toISOString()
                };

                this.appendHistorySnapshot(authors[i], authors[i].totalCitations, authors[i].hIndex, authors[i].i10Index);

                successCount++;
                console.log(`✅ ${author.name} 刷新成功`);

                // 每位作者处理完立即落盘，避免 SW 中断丢失 history
                await this.saveAuthors(authors);

            } catch (error) {
                console.error(`❌ 自动刷新 ${author.name} 失败:`, error.message);
                errorCount++;
                errors.push({
                    name: author.name,
                    error: error.message
                });

                // 重读 storage 后合并：避免旧 authors[i] 引用覆盖 popup 期间改过的字段
                const latestErrSnap = await this.getStoredAuthors();
                const latestErrIdx = latestErrSnap.findIndex(a => a.userId === author.userId);
                if (latestErrIdx >= 0) {
                    latestErrSnap[latestErrIdx] = {
                        ...latestErrSnap[latestErrIdx],
                        lastUpdated: new Date().toISOString(),
                        lastError: error.message
                    };
                    await this.saveAuthors(latestErrSnap);
                }
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
            errorCount,
            errors
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

// 通知去重：基于内容生成 hash。冷却期内拦截短期重复，hash 拦截长期相同内容重复。
// 关键：不放 timestamp，否则超过 5 分钟后 hash 必然变化，hash 检查变成死代码。
// 旧版 `${name}:${increase}` 会把"上次 +10 (90→100)"和"这次 +10 (100→110)"误判为相同，
// 改用 oldCitations->newCitations 区分真正不同的事件。
generateNotificationHash(citationChanges, paperChanges) {
    const data = {
        citations: citationChanges
            .map(c => `${c.name}:${c.oldCitations}->${c.newCitations}`)
            .sort(),
        papers: paperChanges
            .flatMap(p => p.changes.map(c => `${p.authorName}:${c.title}:${c.oldCitations}->${c.newCitations}`))
            .sort()
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
        await chrome.notifications.create('scholar-error', options);
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

        await chrome.notifications.create('scholar-citation-update', {
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

        // 与单作者分支共用同一 ID：chrome.notifications.create(id, ...) 同 ID 更新、不同 ID 堆叠。
        // 旧版用 'scholar-citation-multi' 会导致单/多分支切换时通知并排堆叠。
        await chrome.notifications.create('scholar-citation-update', {
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
// 7 天窗口：累加模式下，用户多天不点已读也能看到累积变化；
// 超过 7 天才认为事件过期，自动清空 paperChanges（避免无限增长）
isChangeRecent(changeTimestamp) {
    if (!changeTimestamp) return false;
    const changeTime = new Date(changeTimestamp);
    const now = new Date();
    const hoursDiff = (now - changeTime) / (1000 * 60 * 60);
    return hoursDiff < 24 * 7;
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

// === Citation history ===
appendHistorySnapshot(author, citations, hIndex, i10Index) {
    if (!author.history) author.history = [];
    const now = new Date();
    const last = author.history[author.history.length - 1];
    const lastDate = last ? new Date(last.timestamp) : null;

    const isSameDay = lastDate &&
        lastDate.getFullYear() === now.getFullYear() &&
        lastDate.getMonth() === now.getMonth() &&
        lastDate.getDate() === now.getDate();

    // 同一天：覆盖该条记录，保证 sparkline 每天最多一个点
    if (isSameDay) {
        last.citations = citations;
        last.hIndex = hIndex;
        last.i10Index = i10Index;
        last.timestamp = now.toISOString();
        return;
    }
    author.history.push({
        timestamp: now.toISOString(),
        citations, hIndex, i10Index
    });
}

// 一次性数据修复：同一天只保留最后一条，用 flag 保证只执行一次
async dedupeHistoryOnce() {
    const FLAG = 'historyDedupe_v1';
    return new Promise((resolve) => {
        chrome.storage.local.get([FLAG], async (result) => {
            if (result[FLAG]) { resolve(); return; }
            const authors = await this.getStoredAuthors();
            let changed = false;
            for (const author of authors) {
                const before = (author.history || []).length;
                this.dedupeHistory(author);
                if ((author.history || []).length !== before) changed = true;
            }
            if (changed) {
                await this.saveAuthors(authors);
                console.log('🧹 历史去重完成');
            }
            chrome.storage.local.set({[FLAG]: true}, resolve);
        });
    });
}

dedupeHistory(author) {
    if (!author.history || author.history.length <= 1) return;
    const byDay = new Map();
    for (const snap of author.history) {
        const d = new Date(snap.timestamp);
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        const existing = byDay.get(key);
        if (!existing || new Date(snap.timestamp) > new Date(existing.timestamp)) {
            byDay.set(key, snap);
        }
    }
    author.history = Array.from(byDay.values())
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

async saveAuthors(authors) {
    return new Promise((resolve) => {
        chrome.storage.local.set({authors}, () => {
            if (chrome.runtime.lastError) {
                // 配额超限：裁剪 history 与 seenCiterIds，重试一次
                console.warn('Storage quota exceeded, trimming history & seenCiterIds:', chrome.runtime.lastError.message);
                authors.forEach(a => {
                    if (a.history && a.history.length > 365) {
                        a.history = a.history.slice(-365);
                    }
                    if (Array.isArray(a.papers)) {
                        a.papers.forEach(p => {
                            if (p.seenCiterIds && p.seenCiterIds.length > 100) {
                                p.seenCiterIds = p.seenCiterIds.slice(-100);
                            }
                        });
                    }
                });
                chrome.storage.local.set({authors}, resolve);
            } else {
                resolve();
            }
        });
    });
}

async getStoredAuthors() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['authors'], (result) => {
            resolve(result.authors || []);
        });
    });
}

// === 反爬告警 ===
// 触发反爬时把被拦的引用列表页 URL 存下来，popup 打开时读出来给用户「去验证」按钮
// Scholar 反爬是 session 级别，用户在浏览器里手动通过一次机器人验证后，
// 扩展后续 fetch 会带上同 cookie 的验证态，下次 refresh 就能正常抓取
//
// 单条覆盖式存储（不区分 authorId）：多作者同时反爬时只保留最后一个 alert。
// 因为 Scholar 验证是 session 级，用户验证任一作者的 link 都会解除全部封锁，
// 区分 authorId 反而是过度设计
async setAntiCrawlAlert(author, paperTitle, citingUrl) {
    if (!citingUrl) return;
    // 标记本作者本周期已反爬：autoRefreshAll 据此跳过 initializeBaseline
    this._authorAntiCrawlHit = true;
    return new Promise((resolve) => {
        chrome.storage.local.set({
            antiCrawlAlert: {
                authorId: author.userId,
                authorName: author.name,
                paperTitle,
                citingUrl,
                timestamp: Date.now()
            }
        }, resolve);
    });
}

async clearAntiCrawlAlert() {
    return new Promise((resolve) => {
        chrome.storage.local.remove('antiCrawlAlert', resolve);
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
              const pagePapers = this.extractPapersFromHtmlWithRegex(html, domain, currentIndex);
              
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
// domain 用于拼接 paperLink，避免跨域 fetch（href 中的 & 必须解码，否则 URL 字面带 &amp; 会导致 Scholar 404）
// domain 必传：硬编码 fallback 到 scholar.google.com 在某些地区 ping 不通
extractPapersFromHtmlWithRegex(html, domain, startIndex = 0) {
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

                // 策略1: 标准论文标题匹配（只匹配标签和标题文本，不耦合 href）
                titleMatch = rowHtml.match(/<a[^>]*class=\"gsc_a_at\"[^>]*>([^<]+)<\/a>/);

                if (titleMatch) {
                    title = titleMatch[1].trim();
                    // 单独提取 href，兼容 href 在 class 之前或之后两种属性顺序
                    // （Google Scholar 实际 HTML 是 href 在前，旧正则会漏抓）
                    const hrefMatch = rowHtml.match(/<a[^>]*href=\"([^\"]*)\"[^>]*class=\"gsc_a_at\"/) ||
                                     rowHtml.match(/<a[^>]*class=\"gsc_a_at\"[^>]*href=\"([^\"]*)\"/);
                    // 解码 HTML 实体（Scholar 属性中 & 编码为 &amp;，未解码会让 fetch 404）
                    const cleanHref = hrefMatch ? hrefMatch[1].replace(/&amp;/g, '&') : '';
                    link = cleanHref ? `https://${domain}${cleanHref}` : '';
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

  // 从 paper.link 提取 Scholar 的稳定论文 ID（citation_for_view=USER:HASH 中的 USER:HASH 部分）
  // 比 title 字符串稳定得多，用作 mergePaperMetadata 的主键
  // title 偶尔会因 HTML 实体解码、空白字符、Scholar 改标题等原因产生微小差异，
  // 导致 warmedUp 迁移失败 → 已预热的论文反复被 initializeBaseline / enrichCitationDetails 重抓
  extractPaperId(link) {
      if (!link) return null;
      const m = link.match(/citation_for_view=([^&]+)/);
      return m ? m[1] : null;
  }

  // 把旧论文的 seenCiterIds / warmedUp 迁移到新论文
  // 主键优先级：citation_for_view ID（稳定）→ title 字符串（fallback）
  mergePaperMetadata(oldPapers, newPapers) {
      const oldByTitle = new Map();
      const oldById = new Map();
      oldPapers.forEach(p => {
          oldByTitle.set(p.title, p);
          const pid = this.extractPaperId(p.link);
          if (pid) oldById.set(pid, p);
      });
      newPapers.forEach(np => {
          const npId = this.extractPaperId(np.link);
          let op = npId ? oldById.get(npId) : null;
          if (!op) op = oldByTitle.get(np.title);
          if (!op) return;
          if (op.seenCiterIds) np.seenCiterIds = op.seenCiterIds;
          if (op.warmedUp) np.warmedUp = op.warmedUp;
      });
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
                  link: newPaper.link,
                  // 透传已见引用者集合，供 enrichCitationDetails 续接
                  seenCiterIds: oldPaper.seenCiterIds || [],
                  // fetchFailed 语义："需要 diff 一次"。新建的 change 默认 true，
                  // enrichCitationDetails 成功 diff 后设 false。
                  // 这样无论什么原因导致 change 没被处理过（追踪开关刚开、上次反爬 break 在前面、
                  // 上次 freshChangeTitles 不含本论文），下次 refresh 都会通过 shouldRetryFailed
                  // 触发重试，避免静默跳过把累积变化永久吞掉
                  fetchFailed: true
              });
          }
      });

      // 按变化量排序（从大到小）
    //   changes.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));

      return changes;
  }

  // 合并累积 paperChanges：按 title merge，保留首次 oldCitations 和 firstSeenAt，
  // 更新 newCitations 和 change；seenCiterIds / newCiters 保留已积累的（enrichCitationDetails 会更新）
  // 这样用户多天不点已读，能看到"自上次已读以来的累积总变化"，而不是只看到最后一次
  mergePaperChanges(existing, newChanges) {
      const MAX_NEW_CITERS_PER_EVENT = 50;
      const map = new Map();
      (existing || []).forEach(c => map.set(c.title, {...c}));
      newChanges.forEach(nc => {
          const ec = map.get(nc.title);
          if (ec) {
              // 已有：保留首次旧值，更新新值
              map.set(nc.title, {
                  ...nc,
                  oldCitations: ec.oldCitations,
                  change: nc.newCitations - ec.oldCitations,
                  seenCiterIds: ec.seenCiterIds,
                  newCiters: (ec.newCiters || []).slice(0, MAX_NEW_CITERS_PER_EVENT),
                  firstSeenAt: ec.firstSeenAt,
              });
          } else {
              map.set(nc.title, {
                  ...nc,
                  firstSeenAt: new Date().toISOString(),
              });
          }
      });
      return Array.from(map.values());
  }

  // === 新增引用明细：抓取哪些新论文引用了该作者的文章 ===

  async getEnableCitationDetails() {
      return new Promise((resolve) => {
          chrome.storage.local.get(['enableCitationDetails'], (result) => {
              resolve(result.enableCitationDetails === true);
          });
      });
  }

  async getCitationDetailsThreshold() {
      // 硬上限，不再可配置。保留方法名是为了 enrichCitationDetails 调用点不变。
      return this.MAX_TRACKABLE_CITATIONS;
  }

  // 编排：对每篇合格论文（变化 + 阈值内）抓取新引用者
  // 首次抓取走 warmup：静默全量建立 seenCiterIds 基线，本次不报告 newCiters
  // 例外：oldCitations === 0 时无更早基线可比，所有当前引用者本就是新增，直接走 diff 并标记预热完成
  //
  // freshChangeTitles: 本次 refresh 真正检测到引用变化的论文 title 集合
  // 已预热的论文若不在该集合内，跳过 diff 抓取——否则累积模式下每次刷新都会
  // 对 paperChanges 里所有累积论文重爬引用者列表，浪费请求并加速触发 Scholar 反爬
  async enrichCitationDetails(author, updatedInfo, freshChangeTitles = new Set()) {
      const enabled = await this.getEnableCitationDetails();
      if (!enabled || !author.citationDetailsEnabled) return updatedInfo;

      // workingDomain 缺失时跳过：硬编码 fallback 到 scholar.google.com 在某些地区 ping 不通
      // （旧数据可能没有 workingDomain，下次 fetchCompleteAuthorInfoWithRetry 会重新确定）
      if (!author.workingDomain) {
          console.log(`⏭️ ${author.name} 缺少 workingDomain，跳过引用明细抓取`);
          return updatedInfo;
      }

      const threshold = await this.getCitationDetailsThreshold();
      const domain = author.workingDomain;

      const newPaperMap = new Map();
      (updatedInfo.papers || []).forEach(p => newPaperMap.set(p.title, p));

      const changes = updatedInfo.paperChanges || [];
      const warmupSamples = []; // 暂存 warmup 抓取结果，循环末尾做批次覆盖率判定
      for (const change of changes) {
          if (!change.change || change.change <= 0) continue;
          // 超过 MAX_TRACKABLE_CITATIONS 的论文不追踪：受分页 cap 限制无法建立完整基线
          // 用 > 而非 >=：正好等于上限（100）时仍可完整抓取（10 页 × 10 条），应追踪
          if (change.newCitations > threshold) {
              console.log(`⏭️ 跳过（超上限）: ${change.title.substring(0, 40)} (${change.newCitations} > ${threshold})`);
              continue;
          }

          const paperLink = change.link || (newPaperMap.get(change.title) || {}).link;
          if (!paperLink) {
              console.log(`⏭️ 跳过（无链接）: ${change.title.substring(0, 40)}`);
              continue;
          }

          const newPaper = newPaperMap.get(change.title);
          const isFirstCitation = change.oldCitations === 0;
          const needsWarmup = !isFirstCitation && !(newPaper && newPaper.warmedUp);

          // 已预热 + 本次未检测到变化 + 上次 diff 成功：跳过 diff 抓取
          // warmup 路径不受影响（未预热的论文仍要建基线）；
          // newCiters 保留累积值不动，modal 里仍能看到过往新增引用者
          // 用 !== false 而非 === true：兼容旧数据里 fetchFailed 为 undefined 的 change
          // （从未被 enrichCitationDetails 处理过，应视为需要重试，避免静默跳过把变化永久吞掉）
          const shouldRetryFailed = change.fetchFailed !== false;
          if (!needsWarmup && !freshChangeTitles.has(change.title) && !shouldRetryFailed) {
              continue;
          }

          // 本次 fetch 的结果引用，循环末尾统一检查 antiCrawl 标志
          let lastFetchResult = null;

          if (needsWarmup) {
              console.log(`🔥 预热基线: ${change.title.substring(0, 50)} (当前 ${change.newCitations})`);
              try {
                  const result = await this.fetchNewCitersForPaper(paperLink, domain, []);
                  lastFetchResult = result;
                  change.newCiters = [];
                  // 抓取失败（详情页解析失败/网络错/反爬）统一标 fetchFailed 让下次重试。
                  // 反爬时 updatedSeenIds 是空（fetchNewCitersForPaper 在首页就 break），
                  // 走这里不写 seenCiterIds / 不标 warmedUp，下次 refresh 重新走 warmup。
                  if (!result.fetchedAnyPage) {
                      change.fetchFailed = true;
                      console.warn(`⚠️ 预热失败（未拿到数据${result.antiCrawl ? '/反爬' : ''}），下次重试: ${change.title.substring(0, 40)}`);
                  } else {
                      // 暂存到批次：延后到循环末尾做覆盖率判定，
                      // 避免单篇接受后用残缺基线下次 diff 把缺失引用者全误报为新增。
                      // 不立即设 newPaper.warmedUp / change.fetchFailed=false，判定后统一回填。
                      // change.seenCiterIds / newPaper.seenCiterIds 先暂存——判定不达标时保留无妨，
                      // 下次重试走 warmup 仍传 []，不受已有 seenCiterIds 影响
                      change.seenCiterIds = result.updatedSeenIds;
                      if (newPaper) {
                          newPaper.seenCiterIds = result.updatedSeenIds;
                      }
                      warmupSamples.push({
                          change,
                          newPaper,
                          fetchedCount: result.updatedSeenIds.length,
                          expectedCount: change.newCitations
                      });
                      console.log(`✅ 预热抓取完成（待批次判定）: ${change.title.substring(0, 40)} 基线 ${result.updatedSeenIds.length} 篇`);
                  }
              } catch (err) {
                  console.warn(`⚠️ 预热失败 (${change.title.substring(0, 30)}):`, err.message);
                  change.newCiters = [];
                  change.fetchFailed = true;
              }
          } else {
              const seenSet = Array.isArray(change.seenCiterIds) ? change.seenCiterIds : [];
              console.log(`🔍 抓取引用论文: ${change.title.substring(0, 50)} (当前 ${change.newCitations}, 已知 ${seenSet.length})`);
              try {
                  const result = await this.fetchNewCitersForPaper(paperLink, domain, seenSet);
                  lastFetchResult = result;

                  // 抓取失败（详情页解析失败/网络错/反爬）统一标 fetchFailed 让下次 refresh 重试。
                  // 不覆盖 seenCiterIds / newCiters，保留累积值。
                  // 关键：反爬也必须走这里 —— 旧实现把反爬排除在外（!result.antiCrawl），
                  // 导致 diff 分支反爬后 fetchFailed=false，下次刷新时 needsWarmup=false +
                  // freshChangeTitles 不含 + shouldRetryFailed=false，被静默跳过，
                  // 反爬期间错过的变化明细永远不会被补抓。
                  if (!result.fetchedAnyPage) {
                      change.fetchFailed = true;
                      const prevCount = Array.isArray(change.newCiters) ? change.newCiters.length : 0;
                      console.warn(`⚠️ 抓取失败（未拿到数据${result.antiCrawl ? '/反爬' : ''}），保留累积 ${prevCount} 篇，下次重试: ${change.title.substring(0, 40)}`);
                  } else {
                      change.fetchFailed = false;
                      change.seenCiterIds = result.updatedSeenIds;

                      // 合并 newCiters（去重 by clusterId），上限 50：
                      // 用户多天不点已读时，每次 refresh 检测到变化都会跑 diff，
                      // 本次的新增要追加到已有 newCiters，而非覆盖（否则会丢失之前累积的新增）
                      const MAX_NEW_CITERS = 50;
                      const prevCiters = Array.isArray(change.newCiters) ? change.newCiters : [];
                      const existingIds = new Set(prevCiters.map(c => c.clusterId));
                      const merged = [...prevCiters];
                      for (const c of result.newCiters) {
                          if (!existingIds.has(c.clusterId)) {
                              merged.push(c);
                              existingIds.add(c.clusterId);
                              if (merged.length >= MAX_NEW_CITERS) break;
                          }
                      }
                      change.newCiters = merged;

                      const diffValid = result.updatedSeenIds.length > 0;
                      if (newPaper) {
                          newPaper.seenCiterIds = result.updatedSeenIds;
                          newPaper.newCiters = merged;
                          // 0→N 路径同样需要拿到数据才标记预热，否则下次走 diff 会全量误报
                          if (isFirstCitation && diffValid) newPaper.warmedUp = true;
                      }
                      console.log(`✅ ${change.title.substring(0, 40)} 本次新增 ${result.newCiters.length} 篇，累积 ${merged.length} 篇`);
                  }
              } catch (err) {
                  console.warn(`⚠️ 抓取引用论文失败 (${change.title.substring(0, 30)}):`, err.message);
                  // 异常路径：不清空 newCiters，标 fetchFailed 让下次重试
                  change.fetchFailed = true;
              }
          }

          // 反爬触发：存 alert 让 popup 提示用户去验证，并立即结束本作者抓取
          // Scholar 反爬是 session 级别，继续请求本作者其他论文也会被拦
          if (lastFetchResult && lastFetchResult.antiCrawl) {
              await this.setAntiCrawlAlert(author, change.title, lastFetchResult.citingUrl);
              console.warn(`🚨 反爬触发，结束 ${author.name} 引用明细抓取`);
              break;
          }

          await this.randomDelay(2500, 4500);
      }

      // 批次末尾统一判定：Scholar 抽风时整批 cited by 都会稀疏，聚合判定才能发现
      if (warmupSamples.length > 0) {
          if (this.shouldApplyWarmupBatch(warmupSamples)) {
              for (const s of warmupSamples) {
                  s.change.fetchFailed = false;
                  if (s.newPaper) s.newPaper.warmedUp = true;
              }
              console.log(`✅ ${author.name} warmup 批次接受 ${warmupSamples.length} 篇`);
          } else {
              // 回滚：保持 warmedUp=false，fetchFailed=true 触发下次重试
              for (const s of warmupSamples) {
                  s.change.fetchFailed = true;
              }
              console.warn(`🚨 ${author.name} warmup 批次覆盖率不达标，${warmupSamples.length} 篇结果回滚，下次 refresh 重试`);
          }
      }

      return updatedInfo;
  }

  // 批次级覆盖率判定：Scholar 偶发抽风时同作者所有论文的 cited by 列表都会变稀疏，
  // 单篇无法识别，聚合后看覆盖率才能发现
  // samples: [{ fetchedCount, expectedCount }]
  shouldApplyWarmupBatch(samples) {
      if (samples.length < this.WARMUP_MIN_SAMPLE) {
          console.log(`📊 warmup 批次样本 ${samples.length} < ${this.WARMUP_MIN_SAMPLE}，跳过覆盖率判定`);
          return true;
      }
      const totalFetched = samples.reduce((s, x) => s + x.fetchedCount, 0);
      const totalExpected = samples.reduce((s, x) => s + x.expectedCount, 0);
      if (totalExpected === 0) return true;
      const coverage = totalFetched / totalExpected;
      const apply = coverage >= this.WARMUP_COVERAGE_THRESHOLD;
      console.log(`📊 warmup 批次覆盖率 ${(coverage * 100).toFixed(1)}% (${totalFetched}/${totalExpected}) → ${apply ? '接受' : '回滚重试'}`);
      return apply;
  }

  // 基线初始化：两开关都开 + 存在未 warmedUp 的合格论文时，主动建立 seenCiterIds
  // 避免"基线永远是空"的困境 —— enrichCitationDetails 只处理 paperChanges 里有变化的论文，
  // 不变化的论文永远拿不到基线，导致新增引用者永远显示不出来
  //
  // 反爬策略（B 分摊）：每次 refresh 最多初始化 MAX_INITIALIZE_PER_REFRESH 篇，
  // 利用 30 分钟 alarm 周期自然分摊。140 篇作者约 5 小时自动完成，用户无感
  //
  // 状态判断：用 paper.warmedUp 作为每篇论文的断点，所有合格论文都 warmedUp 后 eligible=0 自动跳过
  async initializeBaseline(author, updatedInfo, domain) {
      // 本作者本 refresh 周期已反爬：跳过，避免继续请求延长 Scholar 封锁窗口
      // （反爬标志在 setAntiCrawlAlert 时设置，autoRefreshAll 每个作者开头重置）
      if (this._authorAntiCrawlHit) {
          console.log(`⏭️ ${author.name} 本周期已反爬，跳过基线初始化`);
          return updatedInfo;
      }

      const enabled = await this.getEnableCitationDetails();
      if (!enabled || !author.citationDetailsEnabled) {
          return updatedInfo;
      }

      const threshold = this.MAX_TRACKABLE_CITATIONS;
      const eligible = (updatedInfo.papers || []).filter(p =>
          p.citations > 0 && p.citations <= threshold && p.link && !p.warmedUp
      );

      if (eligible.length === 0) {
          return updatedInfo;
      }

      // 反爬核心：每次 refresh 只初始化一小批，剩下的下次 refresh 继续
      const MAX_INITIALIZE_PER_REFRESH = 15;
      const toInit = eligible.slice(0, MAX_INITIALIZE_PER_REFRESH);

      console.log(`📊 ${updatedInfo.name} 开始初始化 ${toInit.length}/${eligible.length} 篇（剩余 ${eligible.length - toInit.length} 篇下次继续）`);
      let successCount = 0;
      let consecutiveFailures = 0;
      const MAX_CONSECUTIVE_FAILURES = 3;

      // 暂存 warmup 抓取结果，循环末尾做批次覆盖率判定
      // Scholar 偶发抽风时整批 cited by 列表都会稀疏，立即标 warmedUp 会用残缺基线下次误报
      const warmupSamples = [];

      for (const paper of toInit) {
          try {
              const result = await this.fetchNewCitersForPaper(paper.link, domain, []);
              // 反爬触发：存 alert 提示用户去验证，并立即结束本次初始化
              // Scholar 反爬是 session 级别，等下次 refresh（30 分钟后）大概率仍被拦
              if (result.antiCrawl) {
                  await this.setAntiCrawlAlert(author, paper.title, result.citingUrl);
                  console.warn(`🚨 反爬触发，立即结束本次初始化（已成功 ${successCount}/${toInit.length}），下次 refresh 继续`);
                  break;
              }
              if (result.updatedSeenIds.length > 0) {
                  warmupSamples.push({
                      paper,
                      updatedSeenIds: result.updatedSeenIds,
                      fetchedCount: result.updatedSeenIds.length,
                      expectedCount: paper.citations
                  });
                  successCount++;
                  consecutiveFailures = 0;
              } else {
                  consecutiveFailures++;
                  console.log(`⚠️ ${paper.title.substring(0, 40)} 基线为空，连续失败 ${consecutiveFailures}`);
              }
          } catch (err) {
              consecutiveFailures++;
              console.warn(`⚠️ 初始化 ${paper.title.substring(0, 30)} 失败:`, err.message);
          }

          if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
              console.warn(`🚨 连续 ${MAX_CONSECUTIVE_FAILURES} 次失败，停止本次初始化（已成功 ${successCount}/${toInit.length}）`);
              break;
          }

          await this.randomDelay(2500, 4500);
      }

      // 批次末尾统一判定：覆盖率达标才回填 warmedUp，不达标整批回滚下次重试
      if (warmupSamples.length > 0 && this.shouldApplyWarmupBatch(warmupSamples)) {
          for (const s of warmupSamples) {
              s.paper.seenCiterIds = s.updatedSeenIds;
              s.paper.warmedUp = true;
          }
          console.log(`✅ ${updatedInfo.name} 本次初始化接受 ${warmupSamples.length}/${toInit.length} 篇`);
      } else if (warmupSamples.length > 0) {
          // 覆盖率不达标：不写 seenCiterIds、不标 warmedUp，保持论文"未预热"干净状态
          console.warn(`🚨 ${updatedInfo.name} warmup 批次覆盖率不达标，${warmupSamples.length} 篇结果回滚，下次 refresh 重试`);
      } else {
          console.warn(`❌ ${updatedInfo.name} 本次初始化全部失败，下次刷新重试`);
      }

      return updatedInfo;
  }

  // 抓取单篇论文的新引用论文：分页遍历到上限或末页，seen-set 仅用于去重
  // 返回值：
  //   - antiCrawl：true 表示 Scholar 触发反爬，调用方应立即停止后续抓取并 setAntiCrawlAlert
  //   - fetchedAnyPage：是否至少成功抓到一页非反爬 HTML。
  //     调用方用这个区分"抓取失败"（详情页解析失败/网络错/反爬未触发告警）和"成功但真无新增"，
  //     避免把抓取失败误判为无新增导致永久卡住（旧实现就是这个 bug）
  async fetchNewCitersForPaper(paperLink, domain, seenSet) {
      // 入口 URL：从详情页解析 "Cited by" 链接
      // 不再用 citation_for= 直拼 cites= —— 前者值是 USER:PAPER 格式（带冒号），
      // 后者要的是纯数字 cluster ID，直接拼接产不出有效 URL
      const detailResult = await this.fetchCitingUrlFromDetailPage(paperLink, domain);
      // 详情页反爬：直接传播 antiCrawl，fallbackUrl 作为 citingUrl 让用户能打开 paperLink 验证
      if (detailResult.antiCrawl) {
          return {
              newCiters: [],
              updatedSeenIds: [...seenSet],
              antiCrawl: true,
              citingUrl: detailResult.fallbackUrl,
              fetchedAnyPage: false
          };
      }
      const citingUrl = detailResult.citingUrl;
      if (!citingUrl) {
          // 详情页解析失败（无 cites= 链接，非反爬）：明确 fetchedAnyPage=false
          return {
              newCiters: [],
              updatedSeenIds: [...seenSet],
              antiCrawl: false,
              citingUrl: null,
              fetchedAnyPage: false
          };
      }

      const newCiters = [];
      const updatedSeenIds = [...seenSet];
      // Scholar 每页 10 条；10 页 × 10 = 100，与 MAX_TRACKABLE_CITATIONS 对齐
      const MAX_PAGES = 10;
      const PAGE_SIZE = 10;
      let antiCrawl = false;
      let fetchedAnyPage = false;

      // 默认排序（不加 sortby=）下顺序不稳定，不能基于「命中已见 ID」早停，
      // 否则会漏掉真正的新增。每次都遍历到 MAX_PAGES 或末页，seen-set 仅用于去重。
      for (let page = 0; page < MAX_PAGES; page++) {
          const start = page * PAGE_SIZE;
          const pageUrl = start === 0 ? citingUrl : `${citingUrl}&start=${start}`;

          if (page > 0) await this.randomDelay(2000, 3500);

          let html;
          try {
              html = await this.fetchScholarPage(pageUrl);
          } catch (err) {
              console.warn(`⚠️ 引用论文第 ${page + 1} 页抓取失败:`, err.message);
              break;
          }

          if (this.detectAntiCrawl(html)) {
              console.warn('🚨 检测到反爬限制，停止抓取本论文引用论文');
              antiCrawl = true;
              break;
          }

          // 至少成功拿到一页非反爬 HTML：后续 parseCitersFromHtml 即使返回空
          // 也算"成功但无数据"（可能是引用数=0），不归入抓取失败
          fetchedAnyPage = true;

          const citers = this.parseCitersFromHtml(html, domain);
          if (citers.length === 0) {
              console.log(`📄 第 ${page + 1} 页无论文，结束`);
              break;
          }

          for (const c of citers) {
              if (!updatedSeenIds.includes(c.clusterId)) {
                  updatedSeenIds.push(c.clusterId);
                  newCiters.push(c);
              }
          }

          if (citers.length < PAGE_SIZE) {
              console.log(`📋 已到最后一页`);
              break;
          }
      }

      // seen-set FIFO 上限 200
      const cappedSeenIds = updatedSeenIds.length > 200
          ? updatedSeenIds.slice(-200)
          : updatedSeenIds;

      return { newCiters, updatedSeenIds: cappedSeenIds, antiCrawl, citingUrl, fetchedAnyPage };
  }

  // 访问论文详情页，正则解析出 "Cited by" 链接（统一入口，不再依赖 citation_for_view= 直拼）
  // 返回 { citingUrl, antiCrawl, fallbackUrl }：
  //   - citingUrl：解析出的引用列表页 URL；解析失败/反爬时为 null
  //   - antiCrawl：详情页是否被 Scholar 反爬拦截
  //   - fallbackUrl：反爬时返回 paperLink 本身，让上层 setAntiCrawlAlert 能引导用户在浏览器打开它完成验证
  async fetchCitingUrlFromDetailPage(paperLink, domain) {
      // 防御性解码：旧数据 paperLink 可能含字面 &amp;，会让 Scholar 解析参数失败返回 404
      const cleanLink = paperLink.replace(/&amp;/g, '&');
      try {
          const html = await this.fetchScholarPage(cleanLink);
          // 详情页反爬检测：captcha 页面不含 cites= 链接，正则 miss 会误判为"无引用"。
          // 必须显式上报 antiCrawl，让上层走 setAntiCrawlAlert 引导用户验证
          if (this.detectAntiCrawl(html)) {
              console.warn('🚨 详情页被反爬拦截');
              return { citingUrl: null, antiCrawl: true, fallbackUrl: cleanLink };
          }
          // 优先匹配 "Cited by" 锚点，否则退化为任意 cites= 链接
          const match = html.match(/<a[^>]*href="([^"]*cites=\d+[^"]*)"[^>]*>[^<]*Cited by/i)
                     || html.match(/<a[^>]*href="([^"]*cites=\d+[^"]*)"/);
          if (!match) return { citingUrl: null, antiCrawl: false, fallbackUrl: null };
          // HTML 属性值里的 & 是 &amp; 编码的，必须解码，否则 fetch 该 URL 会拿到空结果
          const rawHref = match[1].replace(/&amp;/g, '&');
          const href = rawHref.startsWith('http') ? rawHref : `https://${domain}${rawHref}`;
          return { citingUrl: href, antiCrawl: false, fallbackUrl: null };
      } catch (e) {
          console.warn('⚠️ 详情页解析失败:', e.message);
          return { citingUrl: null, antiCrawl: false, fallbackUrl: null };
      }
  }

  // 通用 Scholar 页面抓取（带 UA + 超时），复用 background.js:866 的模式
  async fetchScholarPage(url) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      try {
          const response = await fetch(url, {
              method: 'GET',
              headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                  'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
                  'Cache-Control': 'no-cache'
              },
              signal: controller.signal
          });
          clearTimeout(timeoutId);
          if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          return await response.text();
      } catch (e) {
          clearTimeout(timeoutId);
          throw e;
      }
  }

  // 随机延迟：固定间隔容易被 Scholar 反爬识别，所有抓取间隔用随机区间
  randomDelay(minMs, maxMs) {
      const delay = minMs + Math.random() * (maxMs - minMs);
      return new Promise(r => setTimeout(r, delay));
  }

  // 从 scholar?cites= 搜索结果页 HTML 中解析引用论文列表
  // domain 用于把相对 href（/scholar?cluster=...）拼成绝对 URL；
  // 外链（jstage/arxiv/doi 等）是绝对 URL，直接用
  parseCitersFromHtml(html, domain) {
      const citers = [];
      const titleRegex = /<h3[^>]*class="gs_rt"[^>]*>([\s\S]*?)<\/h3>/g;
      let m;
      while ((m = titleRegex.exec(html)) !== null) {
          const titleHtml = m[1];
          const afterTitle = html.substring(m.index + m[0].length);

          // 收集 h3 里所有 a 标签，区分外链（出版社/DOI）与 scholar 内部链接
          // 旧实现只匹配 /scholar?cluster= 一种，导致 jstage/arxiv 这类真实发表页
          // 全被当成无外链处理，点 title 只能跳到 scholar cluster 页
          const anchorMatches = [...titleHtml.matchAll(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)];
          let clusterId = null;
          let titleText = '';
          let link = '';

          if (anchorMatches.length > 0) {
              // 优先外链：href 以 http 开头且非 scholar 域名 → 论文真实发表页
              const external = anchorMatches.find(am =>
                  am[1].startsWith('http') && !am[1].includes('scholar.google')
              );
              const chosen = external || anchorMatches[0];
              const rawHref = chosen[1].replace(/&amp;/g, '&');
              titleText = this.stripTags(chosen[2]).trim();

              // cluster ID 仍解析出来用作稳定去重 ID（外链 URL 不稳定，不适合做 seen-set 键）
              const clusterMatch = rawHref.match(/[?&]cluster=([^&"]+)/);
              if (clusterMatch) clusterId = clusterMatch[1];

              if (rawHref.startsWith('http')) {
                  link = rawHref;
              } else if (rawHref.startsWith('/')) {
                  link = `https://${domain}${rawHref}`;
              } else {
                  link = '';
              }
          } else {
              // 非链接结果（如 [CITATION] 条目）
              titleText = this.stripTags(titleHtml).replace(/^\[[^\]]*\]\s*/, '').trim();
              if (!titleText) continue;
          }

          // 解析作者/年份/出处行
          const metaMatch = afterTitle.match(/<div class="gs_a">([\s\S]*?)<\/div>/);
          const meta = metaMatch ? this.stripTags(metaMatch[1]).trim() : '';
          const years = meta.match(/\b(19|20)\d{2}\b/g);
          const year = years && years.length > 0 ? years[years.length - 1] : '';
          let authors = meta;
          if (year) {
              authors = meta.replace(new RegExp(',?\\s*' + year + '\\b.*$'), '').trim();
              const parts = authors.split(',');
              if (parts.length > 3) authors = parts.slice(0, 3).join(',') + ', et al.';
          }

          // cluster ID 缺失时用 hash(标题+年份) 作为代理 ID（不稳定，但保证去重可用）
          const effectiveId = clusterId || this.hashCiterId(titleText, year);

          citers.push({
              title: titleText,
              authors,
              year,
              clusterId: effectiveId,
              link
          });
      }
      return citers;
  }

  stripTags(html) {
      return String(html)
          .replace(/<[^>]+>/g, '')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&nbsp;/g, ' ');
  }

  // 反爬页面识别：Scholar 在请求过快/IP 异常时返回 captcha / 异常流量提示页
  // 详情页和引用列表页都用这个统一判定，避免反爬被静默吞掉
  // （旧实现只在引用列表页检测，详情页反爬会因 cites= 链接缺失直接返回 null，
  // 上层误判为"无引用"，触发"本次无新增"的误导文案）
  detectAntiCrawl(html) {
      if (!html) return false;
      const signals = [
          'unusual traffic',
          'captcha',
          "Please show you're not a robot",
          '异常流量',
          'detected unusual traffic',
          'show that you are not a robot'
      ];
      return signals.some(s => html.includes(s));
  }

  // FNV-like 哈希作为代理 citer ID（仅在 cluster ID 不可得时使用）
  hashCiterId(title, year) {
      const norm = (title + '|' + year).toLowerCase().replace(/[^a-z0-9]/g, '');
      let hash = 0;
      for (let i = 0; i < norm.length; i++) {
          hash = ((hash << 5) - hash + norm.charCodeAt(i)) | 0;
      }
      return 'h_' + Math.abs(hash).toString(36);
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
