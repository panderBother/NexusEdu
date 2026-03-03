# 🌟 CyberLive - 赛博朋克风格直播平台

<div align="center">

![Vue](https://img.shields.io/badge/Vue-3.5.18-brightgreen)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8.0-blue)
![Vite](https://img.shields.io/badge/Vite-7.0.6-purple)
![License](https://img.shields.io/badge/license-MIT-green)

**一个炫酷的赛博朋克/科幻风格直播平台UI**

[快速开始](#-快速开始) • [功能特性](#-功能特性) • [页面展示](#-页面展示) • [文档](#-文档)

</div>

---

## ✨ 项目简介

CyberLive 是一个采用赛博朋克/科幻风格设计的现代化直播平台前端项目，使用 Vue 3 + TypeScript 构建。项目包含完整的UI页面设计，具有炫酷的视觉效果和流畅的交互动画。

### 🎯 设计理念

- **科幻未来感**: 霓虹发光、扫描线、全息网格等赛博朋克元素
- **沉浸式体验**: 流畅的动画过渡和视觉反馈
- **响应式设计**: 完美适配桌面、平板和移动设备
- **组件化开发**: 高度模块化，易于维护和扩展

## 🚀 快速开始

### 前置要求

- Node.js >= 20.19.0
- npm 或 yarn

### 安装和运行

```bash
# 克隆项目
cd d:\前端项目\webrtc

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产构建
npm run preview
```

访问 `http://localhost:5173` 查看项目

## 📦 功能特性

### 🎨 视觉效果

- ✨ 霓虹发光边框和文字
- 💫 脉冲动画效果
- 🔄 扫描线和数据流动画
- 🌐 全息网格覆盖
- 🎆 渐变色彩主题
- 💎 毛玻璃效果
- ⚡ 平滑的过渡动画

### 📱 页面功能

#### 1️⃣ 首页
- Hero 横幅展示
- 热门直播网格
- 分类浏览
- 筛选功能

#### 2️⃣ 发现页
- 轮播横幅
- 分类导航
- 热门标签云
- 推荐主播
- 人气榜单

#### 3️⃣ 关注页
- 在线主播列表
- 标签切换
- 开播提醒

#### 4️⃣ 个人中心
- 用户资料卡片
- 统计数据展示
- 快捷操作入口
- 作品网格

#### 5️⃣ 直播间
- 科幻风格播放器
- 三栏布局
- 实时聊天室
- 主播信息

#### 6️⃣ 搜索
- 实时搜索
- 历史记录
- 热门榜单
- 分类结果

#### 7️⃣ 消息
- 聊天列表
- 消息通知
- 实时对话

#### 8️⃣ 开播设置
- 摄像头预览
- 直播设置表单
- 画质选择
- 隐私设置

#### 9️⃣ 自适应拉流系统
- 多协议支持（WebRTC/FLV/HLS）
- 智能协议切换
- 网络质量监测
- 手动/自动模式切换

## 🎨 页面展示

### 首页
- 🏠 Hero 区域：大标题、统计数据、科幻背景
- 📺 直播卡片：悬停效果、LIVE标识、观看人数
- 🎯 分类卡片：图标、名称、直播数量

### 直播间
- 🎥 视频播放器：边角装饰、扫描线、控制栏
- 👤 主播信息：头像、统计、关注按钮
- 💬 聊天室：实时消息、表情、VIP标识

### 个人中心
- 📊 统计面板：粉丝、关注、获赞、作品
- ⚡ 快捷操作：开始直播、我的作品、钱包、数据
- 🎬 作品网格：视频缩略图、点赞数

## 🛠️ 技术栈

- **前端框架**: Vue 3.5.18
- **开发语言**: TypeScript 5.8.0
- **构建工具**: Vite 7.0.6
- **路由管理**: Vue Router 4.5.1
- **状态管理**: Pinia 3.0.3
- **UI组件**: Element Plus 2.10.6
- **样式**: 原生CSS3（科幻赛博风格）

## 📂 项目结构

```
webrtc/
├── src/
│   ├── views/                    # 页面组件
│   │   ├── HomeView.vue          # 首页
│   │   ├── DiscoverView.vue      # 发现
│   │   ├── FollowView.vue        # 关注
│   │   ├── ProfileView.vue       # 个人中心
│   │   ├── MessageView.vue       # 消息
│   │   ├── SearchView.vue        # 搜索
│   │   ├── LiveStreamView.vue    # 直播间
│   │   ├── LiveStreamPlayer.vue  # 播放器
│   │   ├── StartLiveView.vue     # 开播
│   │   └── BottomNav.vue         # 底部导航
│   ├── router/
│   │   └── index.ts              # 路由配置
│   ├── App.vue                   # 根组件
│   └── main.ts                   # 入口文件
├── PROJECT_STRUCTURE.md          # 详细项目说明
├── QUICK_START.md                # 快速开始指南
└── package.json
```

## 📖 文档

- **[PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)** - 详细的项目结构说明
- **[QUICK_START.md](./QUICK_START.md)** - 快速开始和测试指南

## 🎯 路由配置

| 路径 | 页面 | 描述 |
|------|------|------|
| `/` | 首页 | 推荐直播流 |
| `/discover` | 发现 | 分类浏览 |
| `/follow` | 关注 | 关注的主播 |
| `/profile` | 个人中心 | 用户资料 |
| `/message` | 消息 | 聊天通知 |
| `/search` | 搜索 | 全局搜索 |
| `/view` | 直播间 | 观看直播 |
| `/start-live` | 开播 | 开始直播 |
| `/adaptive-stream` | 自适应拉流 | 多协议自适应播放 |

## 🎨 设计风格

### 色彩方案
- **主色**: 青色 (#00f7ff) 和洋红 (#ff0080)
- **背景**: 深蓝渐变 (#0a0e27, #16213e)
- **强调**: 红色 (#ff0050) 用于直播标识
- **成功**: 绿色 (#0f0) 用于在线状态

### 视觉元素
- 🔷 科幻边角装饰
- 💠 霓虹发光效果
- ⚡ 扫描线动画
- 🌐 全息网格
- 💫 数据流效果
- 🎆 渐变背景

## 🔧 开发说明

### 多协议自适应拉流系统

#### 功能特性
- **智能协议切换**: 根据网络质量自动在 WebRTC、FLV、HLS 三种协议间切换
- **低延迟优先**: 网络良好时优先使用 WebRTC 协议（<1秒延迟）
- **无缝切换**: 协议切换过程平滑，不中断播放
- **网络监测**: 实时监测 RTT、丢包率、带宽等网络指标
- **手动控制**: 支持手动选择播放协议

#### 使用示例
```typescript
import { AdaptiveStreamPlayer } from '@/services/AdaptiveStreamPlayer';

// 创建播放器实例
const player = new AdaptiveStreamPlayer({
  videoElement: videoRef.value,
  srsHost: 'http://101.35.16.42:1985',
  app: 'live',
  streamId: 'stream1'
});

// 启动播放
await player.start();

// 监听事件
player.on('protocol-change', (protocol) => {
  console.log('协议切换:', protocol);
});

player.on('network-quality-change', (quality) => {
  console.log('网络质量:', quality);
});

// 手动切换协议
player.setManualProtocol('webrtc');

// 启用自动切换
player.enableAutoSwitch();
```

#### 配置选项
```typescript
{
  // 网络监测配置
  networkMonitor: {
    sampleInterval: 2000,        // 采样间隔（ms）
    rttThresholds: {
      good: 100,                 // RTT 优秀阈值（ms）
      poor: 300                  // RTT 较差阈值（ms）
    },
    packetLossThresholds: {
      good: 0.01,                // 丢包率优秀阈值
      poor: 0.05                 // 丢包率较差阈值
    },
    bandwidthThresholds: {
      good: 2,                   // 带宽优秀阈值（Mbps）
      poor: 1                    // 带宽较差阈值（Mbps）
    }
  },
  // 协议切换配置
  protocolSwitcher: {
    stabilityRequirement: 3,     // 稳定性要求（连续采样次数）
    minSwitchInterval: 10000,    // 最小切换间隔（ms）
    autoSwitch: true             // 是否启用自动切换
  }
}
```

#### 协议说明
| 协议 | 延迟 | 适用场景 | 网络要求 |
|------|------|----------|----------|
| WebRTC | <1秒 | 超低延迟直播 | 网络质量优秀 |
| FLV | 1-3秒 | 低延迟直播 | 网络质量良好 |
| HLS | 5-10秒 | 稳定播放 | 网络质量较差 |

### 当前状态
✅ **UI设计完成** - 所有页面的 template 和 style 已完成  
⏳ **业务逻辑待开发** - script 部分预留，需根据实际需求补充

### 下一步开发
1. **WebRTC 集成** - 实现实时音视频传输
2. **后端API对接** - 用户系统、直播流管理
3. **WebSocket聊天** - 实时消息功能
4. **状态管理** - 使用 Pinia 管理全局状态
5. **性能优化** - 懒加载、虚拟滚动等

### 自定义样式
所有样式都在各组件的 `<style scoped>` 中，可以轻松修改：
```css
/* 修改主题色 */
--primary-cyan: #00f7ff;
--primary-magenta: #ff0080;
```

## 📱 响应式设计

- **桌面**: 完整三栏布局，所有功能可用
- **平板**: 两栏布局，隐藏部分侧边栏
- **移动**: 单栏布局，底部导航优化

## 🤝 贡献

欢迎提交 Issues 和 Pull Requests！

## 📄 许可证

MIT License

## 🌟 特别说明

本项目专注于 UI/UX 设计和前端实现，提供：
- ✅ 完整的页面布局和结构
- ✅ 炫酷的科幻视觉效果
- ✅ 流畅的交互动画
- ✅ 响应式设计
- ✅ 组件化架构

**注意**: WebRTC 直播功能的 JavaScript 逻辑需要根据实际业务需求补充实现。

---

<div align="center">

**用科技点亮未来 | 用代码创造赛博空间**

Made with 💙 by CyberLive Team

</div>
