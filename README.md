# 📚 Scholar Citation Monitor / 学术引用监控器

[English](#english) | [中文](#中文)

---

## 🔗 Quick Links / 快速链接

[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/hcmmccenfdomniepffcngceogeaajigc?label=Chrome%20Web%20Store&logo=google-chrome&logoColor=white&color=4285F4)](https://chromewebstore.google.com/detail/scholar-citation-monitor/hcmmccenfdomniepffcngceogeaajigc)

> 🎉 **Now available on the Chrome Web Store!**
> 👉 [Install Scholar Citation Monitor](https://chromewebstore.google.com/detail/scholar-citation-monitor/hcmmccenfdomniepffcngceogeaajigc)

> 🎉 **现已上架 Chrome 应用商店！**
> 👉 [立即安装学术引用监控器](https://chromewebstore.google.com/detail/scholar-citation-monitor/hcmmccenfdomniepffcngceogeaajigc)

---

## English

### 🎯 What is this?

Ever found yourself refreshing your Google Scholar profile at 3 AM, hoping that one more citation magically appeared? 🌙✨

Or maybe you're in a friendly (but totally not competitive 😏) citation race with your lab mates, checking who's winning the "most cited paper of the month" award?

**Scholar Citation Monitor** is here to save you from the endless tab-opening madness! This Chrome extension monitors your favorite researchers' citation counts in the background, so you can focus on actual research instead of refreshing browsers like a maniac.

**🆕 New Features Added:**
- **📊 Complete Publication Monitoring**: Track all papers from a researcher's Google Scholar profile
- **📈 Detailed Citation Changes**: View specific citation changes for papers
- **🔄 Enhanced Auto-Update**: Improved background refresh system with smarter scheduling and error handling
- **📈 Citation History Visualization**: Expand any author card to see citation trend charts over 7D / 30D / 90D / 1Y / All time
- **🔍 New Citing Papers Tracking**: Automatically identifies which papers newly cite yours — builds a silent baseline in batches (max 15 per refresh), then shows genuinely new citers on each change. Only tracks papers with ≤100 citations to avoid Scholar's anti-bot blocking
- **📊 Cumulative Change Records**: Multiple citation changes accumulate into a total until you mark them as read (kept for 7 days), so you never miss updates between refreshes
- **⚙️ Settings Panel**: Toggle citation history display and new-citer tracking per preference
- **⚠️ Anti-Bot Intercept Banner**: When Google Scholar blocks fetching, a top banner guides you through the robot check and auto-resumes with one click

### 🚀 Features

- 📊 **Real-time Citation Tracking**: Monitor multiple authors without opening a single tab
- 🔄 **Smart Multi-domain Support**: Works with scholar.google.com and multiple regional domains worldwide
- 💾 **Persistent Storage**: Your data stays safe even after browser restarts
- 🎨 **Clean Interface**: Simple, intuitive popup design
- ⚡ **Lightweight**: No background tabs, no memory hogging
- 🔔 **Desktop Notifications**: Get notified instantly when citations increase
- 🌐 **8 Languages**: Chinese, English, German, French, Korean, Japanese, Spanish, and Portuguese

### 📁 Project Structure

```
scholar-citation-monitor/
├── 📄 manifest.json          # Extension configuration
├── 🎨 popup.html             # Main interface
├── ⚙️ popup.js               # Core functionality
├── 🔧 background.js          # Background service worker
├── 📝 content.js             # Content script (if needed)
├── 🖼️ icon16.png             # 16x16 icon
├── 🖼️ icon48.png             # 48x48 icon
└── 🖼️ icon128.png            # 128x128 icon
```

### 🛠️ Installation Guide

#### Method 1: Chrome Web Store (Recommended ⭐)

The easiest way to install — no developer mode required!

1. Visit the [Chrome Web Store page](https://chromewebstore.google.com/detail/scholar-citation-monitor/hcmmccenfdomniepffcngceogeaajigc)
2. Click **"Add to Chrome"**
3. **Pin the extension** to your toolbar for easy access
4. Done! 🎉

#### Method 2: Git Clone (For Developers / Easy Updates)

1. **Clone the repository** using Git:
  ```bash
  git clone https://github.com/DreamH1gh/Scholar-Citation-Monitor.git
  ```

2. **Open Chrome** and navigate to `chrome://extensions/`

3. **Enable Developer Mode** (toggle in the top-right corner)

4. **Click "Load unpacked"** and select the cloned project folder

5. **Pin the extension** to your toolbar for easy access

**🔄 To update to the latest version:**
```bash
git pull origin main
```
Then reload the extension in Chrome (click the refresh button in `chrome://extensions/`)

#### Method 3: Download ZIP (Manual Updates)

1. **Download** the latest release as ZIP from GitHub
2. **Extract** the ZIP file to your desired location
3. **Open Chrome** and navigate to `chrome://extensions/`
4. **Enable Developer Mode** (toggle in the top-right corner)
5. **Click "Load unpacked"** and select the extracted folder
6. **Pin the extension** to your toolbar for easy access

### 🎮 How to Use

1. **Click the extension icon** in your toolbar
2. **Paste a Google Scholar profile URL** (e.g., `https://scholar.google.com/citations?user=XXXXXXX`)
3. **Click "Add Author"** and watch the magic happen ✨
4. **Monitor multiple researchers** and see their citation counts update
5. **Refresh manually** or let the background service do it automatically

### 🤔 Why This Extension?

Because we've all been there:
- Checking citations every 5 minutes like it's social media 📱
- Opening 47 tabs just to check if your paper got one more citation
- Competing with your office mate about who has more h-index points
- Procrastinating actual research by obsessing over numbers

Now you can obsess more efficiently! 🎉

### 🤝 Contributing

Found a bug? Have a feature idea? Want to add support for other academic platforms?

Feel free to open an issue or submit a pull request. We welcome all contributions!

---

## 中文

### 🎯 这是什么？

你是否曾经在凌晨3点刷新自己的Google Scholar主页，希望奇迹般地多出一个引用？🌙✨

或者你正在和实验室的好兄弟们进行一场友好的（但绝对不是竞争性的😏）引用数比赛，看谁能赢得"本月最多引用论文"奖？

**学术引用监控器**来拯救你脱离无尽的标签页打开狂潮！这个Chrome扩展可以在后台监控你关注的研究者的引用数变化，让你专注于真正的研究，而不是像疯子一样刷新浏览器。

**🆕 新增功能：**
- **📊 完整论文监控**：追踪研究者Google Scholar主页上的所有论文
- **📈 详细引用变化**：查看论文的具体引用变化情况
- **🔄 增强自动更新**：改进的后台刷新系统，具备更智能的调度和错误处理机制
- **📈 引用历史可视化**：每个作者卡片可展开查看引用数变化趋势图（7天 / 30天 / 90天 / 1年 / 全部）
- **🔍 新增引用论文追踪**：自动识别哪些论文新引用了你的文章 —— 静默分批建立基线（每次刷新最多 15 篇），完成后每次变化都展示真正的新增引用者。仅追踪引用数 ≤ 100 的论文，避免触发 Scholar 反爬封号
- **📊 变化记录累加保留**：未点"已读"时，多次引用变化会累积显示为总变化（7 天内有效），不再错过刷新间隔期间的更新
- **⚙️ 设置面板**：可开关引用历史显示、新增引用论文追踪
- **⚠️ 反爬拦截横幅**：当 Google Scholar 拦截抓取时，顶部横幅会引导你完成人机验证，一键点击即可自动恢复

### 🚀 功能特色

- 📊 **实时引用追踪**：监控多个作者，无需打开任何标签页
- 🔄 **智能多域名支持**：支持全球多个 Google Scholar 区域域名
- 💾 **持久化存储**：即使重启浏览器，数据也不会丢失
- 🎨 **简洁界面**：简单直观的弹窗设计
- ⚡ **轻量级**：无后台标签页，不占用内存
- 🔔 **桌面通知**：引用数增加时立即推送通知
- 🌐 **8种语言**：中文、英文、德文、法文、韩文、日文、西班牙文、葡萄牙文

### 📁 项目结构

```
scholar-citation-monitor/
├── 📄 manifest.json          # 扩展配置文件
├── 🎨 popup.html             # 主界面
├── ⚙️ popup.js               # 核心功能
├── 🔧 background.js          # 后台服务
├── 📝 content.js             # 内容脚本（如需要）
├── 🖼️ icon16.png             # 16x16 图标
├── 🖼️ icon48.png             # 48x48 图标
└── 🖼️ icon128.png            # 128x128 图标
```

### 🛠️ 安装教程

#### 方法一：Chrome 应用商店（推荐 ⭐）

最简单的安装方式，无需开启开发者模式！

1. 访问 [Chrome 应用商店页面](https://chromewebstore.google.com/detail/scholar-citation-monitor/hcmmccenfdomniepffcngceogeaajigc)
2. 点击 **"添加至 Chrome"**
3. **将扩展固定**到工具栏以便使用
4. 完成！🎉

#### 方法二：Git克隆（适合开发者 / 便于更新）

1. **使用Git克隆仓库**：
  ```bash
  git clone https://github.com/DreamH1gh/Scholar-Citation-Monitor.git
  ```

2. **打开Chrome**，导航到 `chrome://extensions/`

3. **启用开发者模式**（右上角的开关）

4. **点击"加载已解压的扩展程序"**，选择克隆的项目文件夹

5. **将扩展固定**到工具栏以便使用

**🔄 更新到最新版本：**
```bash
git pull origin main
```
然后在Chrome中重新加载扩展（在 `chrome://extensions/` 中点击刷新按钮）

#### 方法三：下载ZIP（手动更新）

1. **从GitHub下载**最新版本的ZIP文件
2. **解压**ZIP文件到你想要的位置
3. **打开Chrome**，导航到 `chrome://extensions/`
4. **启用开发者模式**（右上角的开关）
5. **点击"加载已解压的扩展程序"**，选择解压后的文件夹
6. **将扩展固定**到工具栏以便使用

### 🎮 使用方法

1. **点击工具栏中的扩展图标**
2. **粘贴Google Scholar个人主页链接**（例如：`https://scholar.google.com/citations?user=XXXXXXX`）
3. **点击"添加作者"**，见证奇迹的发生✨
4. **监控多个研究者**，查看他们的引用数更新
5. **手动刷新**或让后台服务自动完成

### 🤔 为什么需要这个扩展？

因为我们都经历过：
- 每5分钟检查一次引用数，就像刷社交媒体一样📱
- 为了查看论文是否多了一个引用而打开47个标签页
- 和办公室同事比较谁的h指数更高
- 通过痴迷于数字来拖延真正的研究工作

现在你可以更高效地痴迷了！🎉

### 🤝 贡献代码

发现了bug？有功能建议？想要添加对其他学术平台的支持？

欢迎提交issue或pull request。我们欢迎所有贡献！

---

## 📄 License

MIT License - Feel free to use, modify, and distribute!

## 🙏 Acknowledgments

Special thanks to all the researchers who spend way too much time checking their citation counts. This one's for you! 🍻

---

*Made with ❤️ by researchers, for researchers*

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=DreamH1gh/Scholar-Citation-Monitor&type=Date)](https://www.star-history.com/#DreamH1gh/Scholar-Citation-Monitor&Date)