# 🎮 NexusEdu - 智学在线教育平台（赛博朋克主题）

<div align="center">

![Vue](https://img.shields.io/badge/Vue-3.5.18-brightgreen)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8.0-blue)
![Vite](https://img.shields.io/badge/Vite-7.0.6-purple)
![License](https://img.shields.io/badge/license-MIT-green)

**支持 AI 人像防遮挡和 Worker 离屏渲染**

[快速开始](#-快速开始) • [功能特性](#-功能特性) • [项目结构](#-项目结构) • [API文档](#-api文档)

</div>

---

## ✨ 项目简介

NexusEdu 使用 Vue 3 + TypeScript 构建。项目采用模块化架构，支持 AI 人像防遮挡、Worker 离屏渲染等高级功能，具有炫酷的视觉效果和流畅的交互体验。

### 🎯 设计理念

- **赛博朋克美学**: 霓虹发光、扫描线、全息网格等科幻元素
- **高性能渲染**: 支持 Worker 离屏渲染，减少主线程负担
- **AI 智能防遮挡**: 基于 MediaPipe 的人像分割技术
- **模块化架构**: 核心库与业务逻辑分离，易于扩展
- **完整功能**: 弹幕发送、屏蔽管理、视频切换、样式定制

---

## 🚀 快速开始

### 前置要求

- Node.js >= 20.19.0
- npm 或 pnpm

### 安装和运行

```bash
# 进入项目目录
cd NexusEdu

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产构建
npm run preview

# 运行测试
npm run test
```

访问 `http://localhost:5173` 查看项目

---

## 📦 功能特性

### 🎨 视觉效果

- ✨ 霓虹发光边框和文字（青色 #00ffff 主题）
- 💫 脉冲动画和角落装饰
- 🔄 扫描线和数据流动画
- 🌐 全息网格背景
- 💎 毛玻璃效果（backdrop-filter）
- ⚡ 平滑的过渡动画

### 🎬 播放器功能

#### 弹幕系统

- **多类型弹幕**: 滚动弹幕、顶部固定、底部固定、高级弹幕、图片弹幕
- **实时渲染**: 基于 Canvas 的高性能渲染
- **智能布局**: 轨道算法避免弹幕重叠
- **速度控制**: 支持 100-300 速度档位
- **透明度调节**: 0-100% 实时调节
- **显示区域**: 支持 1/4、半屏、3/4、全屏显示区域

#### 弹幕管理

- **类型屏蔽**: 可屏蔽滚动、固定、高级、图片等类型
- **等级屏蔽**: 1-10 级弹幕过滤
- **关键词屏蔽**: 自定义屏蔽词管理（支持添加/删除）
- **实时过滤**: 弹幕过滤器实时生效

#### 弹幕发送

- **样式定制**: 字号、颜色、模式（滚动/顶部/底部）
- **表情图片**: 丰富的表情包支持
- **祝福弹幕**: 特殊样式祝福弹幕
- **快捷键发送**: Enter 键快速发送

### 🤖 AI 功能

#### 人像防遮挡（AI Portrait Unobstructed）

- **实时分割**: 基于 MediaPipe Selfie Segmentation
- **智能避让**: 弹幕自动避开人物区域
- **实时处理**: 每帧自动更新分割掩码
- **性能优化**: 异步处理避免阻塞渲染

### ⚡ Worker 离屏渲染

- **主线程减负**: 弹幕渲染移至 Worker 线程
- **兼容性检测**: 自动检测浏览器 Worker 支持
- **无缝切换**: 支持主线程和 Worker 模式切换
- **性能监控**: 实时 FPS 和网络质量监测

### 🎮 视频播放

- **多视频支持**: 内置多个演示视频
- **自动切换**: 视频结束自动播放下一个
- **视频切换**: 支持手动切换不同视频源
- **音量控制**: 默认低音量（5%）播放
- **全屏支持**: 支持全屏播放模式

---

## 📂 项目结构

```
NexusEdu/
├── lib/                          # 核心弹幕渲染库
│   ├── ai-segmentation/          # AI 人像分割模块
│   │   ├── ai-mask-system.ts     # AI 掩码系统
│   │   ├── mask-generator.ts     # 掩码生成器
│   │   └── model-manager.ts      # 模型管理器
│   ├── barrage/                  # 弹幕对象定义
│   │   ├── base-barrage.ts       # 基础弹幕类
│   │   ├── scroll-barrage.ts     # 滚动弹幕
│   │   ├── fixed-barrage.ts     # 固定弹幕
│   │   └── senior-barrage.ts    # 高级弹幕
│   ├── core/                     # 核心渲染引擎
│   │   ├── fixed-barrage-layout.ts   # 固定弹幕布局
│   │   ├── virtual-track-algorithm.ts # 虚拟轨道算法
│   │   └── pre-render-optimizer.ts    # 预渲染优化
│   ├── worker/                   # Worker 渲染模块
│   │   ├── barrage-worker.ts     # Worker 线程脚本
│   │   ├── compatibility-layer.ts    # 兼容层
│   │   └── worker-manager.ts     # Worker 管理器
│   ├── utils/                    # 工具函数
│   │   ├── canvas.ts             # Canvas 工具
│   │   ├── color.ts              # 颜色处理
│   │   └── math.ts               # 数学计算
│   └── index.ts                  # 主入口（BarrageRenderer）
│
├── src/                          # 业务代码
│   ├── App.vue                   # 主播放器页面（赛博朋克风格）
│   ├── App1.vue                  # 备用播放器页面
│   ├── main.ts                   # 入口文件
│   ├── components/               # 通用组件
│   ├── composables/              # Vue 组合式函数
│   │   ├── barrageOpen.ts        # 弹幕开关
│   │   ├── disable.ts            # 屏蔽管理
│   │   ├── opacity.ts            # 透明度控制
│   │   ├── renderRegion.ts       # 显示区域
│   │   ├── sendBarrage.ts        # 弹幕发送
│   │   ├── speed.ts              # 速度控制
│   │   ├── portraitUnobstructed.ts   # AI 防遮挡
│   │   └── videoChange.ts        # 视频切换
│   ├── danmaku/                  # 弹幕相关组件
│   ├── data/                     # 数据定义
│   ├── features/                 # 功能模块
│   ├── router/                   # 路由配置
│   ├── services/                 # 服务层
│   ├── stores/                   # Pinia 状态管理
│   ├── utils/                    # 工具函数
│   └── views/                    # 页面视图
│       ├── HomeView.vue          # 首页
│       ├── DiscoverView.vue      # 发现页
│       ├── LiveStreamView.vue    # 直播间
│       ├── LiveStreamPlayer.vue  # 播放器
│       ├── DanmakuDemo.vue       # 弹幕演示
│       └── ...
│
├── public/                       # 静态资源
│   ├── videos/                   # 演示视频
│   ├── icons/                    # 表情图标
│   └── imgs/                     # 其他图片
│
├── examples/                     # 示例代码
├── docs/                         # 文档
├── cyberpunk-player.vue          # 赛博朋克播放器组件
├── demo.html                     # 演示页面
├── test.html                     # 测试页面
├── package.json
├── vite.config.ts
└── README.md
```

---

## 🔧 技术栈

- **前端框架**: Vue 3.5.18 (Composition API)
- **开发语言**: TypeScript 5.8.0
- **构建工具**: Vite 7.0.6
- **路由管理**: Vue Router 4.5.1
- **状态管理**: Pinia 3.0.3
- **UI组件**: Element Plus 2.10.6
- **样式**: 原生 CSS3 + Tailwind CSS 4.1.11
- **AI/ML**:
  - MediaPipe Selfie Segmentation
  - TensorFlow.js 4.15.0
  - Body Segmentation 1.0.2
- **视频播放**:
  - xgplayer 3.0.23
  - flv.js 1.6.2
  - hls.js 1.6.15
- **测试**: Vitest 4.0.18

---

## 📖 API文档

### BarrageRenderer 核心类

```typescript
import BarrageRenderer from './lib/index';

// 创建实例
const renderer = new BarrageRenderer({
  container: 'container',        // 容器 ID
  video: videoElement,             // 视频元素
  barrageImages: [...],            // 弹幕图片资源
  renderConfig: {
    speed: 150,                    // 弹幕速度
    opacity: 0.8,                  // 透明度
    renderRegion: 1,               // 显示区域 (0-3)
    avoidOverlap: true,            // 避免重叠
    fontWeight: 'bold',            // 字体粗细
    barrageFilter: (barrage) => true,  // 弹幕过滤器
  },
  devConfig: {
    isRenderFPS: true,             // 显示 FPS
    isRenderBarrageBorder: false,  // 渲染弹幕边框
    isLogKeyData: true,            // 日志记录
  }
});

// 设置弹幕数据
renderer.setBarrages(barrages);

// 播放/暂停
renderer.play();
renderer.pause();

// 渲染单帧
renderer.renderFrame();

// 销毁
renderer.destroy();
```

### 弹幕数据结构

```typescript
interface BaseBarrage {
  id: string;
  text: string;
  type: "scroll" | "top" | "bottom" | "senior" | "special";
  startTime: number;
  color?: string;
  fontSize?: number;
  addition?: {
    grade?: number; // 弹幕等级 1-10
    isImage?: boolean;
    imageUrl?: string;
    // ...
  };
}
```

### Composables 使用

```typescript
// 弹幕开关
const { barrageOpen, barrageOpenChange } = useBarrageOpen(renderer);

// 发送弹幕
const {
  barrageText,
  currentFontsize,
  currentBarrageMode,
  currentBarrageColor,
  sendBarrage,
} = useSendBarrage(renderer, video);

// 视频切换
const { videos, currentVideo, videoSrc, changeNextVideo } = useVideoChange();

// AI 防遮挡
const { isOpenPortraitUnobstructed, handleAIUnobstructedChange } =
  usePortraitUnobstructed(video, currentVideoItem, renderer);
```

---

## 🎨 赛博朋克主题定制

### CSS 变量

```css
:root {
  --cyber-primary: #00ffff; /* 主色 - 青色 */
  --cyber-secondary: #ff0080; /* 副色 - 洋红 */
  --cyber-accent: #ffff00; /* 强调色 - 黄色 */
  --cyber-bg-dark: #0a0a0f; /* 深色背景 */
  --cyber-panel: rgba(10, 10, 15, 0.9); /* 面板背景 */
  --cyber-border: rgba(0, 255, 255, 0.3); /* 边框颜色 */
  --cyber-glow: 0 0 20px rgba(0, 255, 255, 0.5);
  --cyber-bg-dark: #0a0a0f;      /* 深色背景 */
  --cyber-panel: rgba(10, 10, 15, 0.9);  /* 面板背景 */
  --cyber-border: rgba(0, 255, 255, 0.3);  /* 边框颜色 */
  --cyber-glow: 0 0 20px rgba(0, 255, 255, 0.5);  /* 发光效果 */
}
```

### 主要组件样式

- **视频容器**: `.video-wrapper` - 95vh 高度，赛博朋克边框
- **控制栏**: `.video-control-bar` - 底部固定，青色边框
- **设置面板**: `.video-settings-panel` - 右上角悬浮面板
- **弹幕输入**: `.cyber-input-group` - 霓虹输入框
- **按钮**: `.cyber-btn` - 发光按钮效果

---

## 📱 响应式设计

- **桌面**: 完整功能，视频 95vh 高度
- **平板**: 自适应布局，保持核心功能
- **移动端**: 优化触摸交互，简化部分功能

---

## 🧪 测试

```bash
# 运行单元测试
npm run test

# 运行测试并生成覆盖率报告
npm run test:coverage

# 打开测试 UI
npm run test:ui
```

---

## 🤝 贡献

欢迎提交 Issues 和 Pull Requests！

### 开发规范

- 使用 TypeScript 严格模式
- 遵循 Vue 3 Composition API 最佳实践
- 核心库代码放在 `lib/` 目录
- 业务逻辑使用 Composables 组织

---

## 📄 许可证

MIT License

---

## 🌟 特别说明

本项目专注于高性能弹幕渲染和赛博朋克 UI 设计，提供：

- ✅ 高性能 Canvas 弹幕渲染引擎
- ✅ AI 人像防遮挡功能
- ✅ Worker 离屏渲染支持
- ✅ 赛博朋克风格完整 UI
- ✅ 模块化可扩展架构
- ✅ 丰富的弹幕管理功能

**注意**: AI 人像分割需要浏览器支持 WebGL，Worker 渲染需要浏览器支持 OffscreenCanvas。

---

<div align="center">

**用代码创造赛博空间 | 让弹幕飞舞在霓虹之下**

Made with 💙 by NexusEdu Team

</div>
