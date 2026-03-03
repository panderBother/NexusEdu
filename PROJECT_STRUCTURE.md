# 🚀 CyberLive 直播项目结构说明

## 📁 项目概述

这是一个采用赛博朋克/科幻风格的 Vue 3 + TypeScript 直播平台项目，包含完整的UI页面设计。

## 🎨 技术栈

- **框架**: Vue 3 + TypeScript
- **路由**: Vue Router 4
- **状态管理**: Pinia
- **UI库**: Element Plus
- **样式**: CSS3 (科幻赛博朋克风格)
- **构建工具**: Vite

## 📂 项目结构

```
webrtc/
├── src/
│   ├── views/              # 页面组件
│   │   ├── HomeView.vue           # 首页 - 推荐直播流
│   │   ├── DiscoverView.vue       # 发现页 - 分类浏览、热门标签
│   │   ├── FollowView.vue         # 关注页 - 关注的主播列表
│   │   ├── ProfileView.vue        # 个人中心 - 用户资料、作品
│   │   ├── MessageView.vue        # 消息页 - 聊天、通知
│   │   ├── SearchView.vue         # 搜索页 - 搜索直播、主播
│   │   ├── LiveStreamView.vue     # 直播间页面 - 观看直播
│   │   ├── LiveStreamPlayer.vue   # 视频播放器组件
│   │   ├── StartLiveView.vue      # 开播页面 - 开始直播
│   │   └── BottomNav.vue          # 底部导航组件
│   ├── router/
│   │   └── index.ts        # 路由配置
│   ├── App.vue             # 根组件
│   └── main.ts             # 入口文件
├── public/                 # 静态资源
└── package.json           # 项目配置
```

## 🎯 页面功能说明

### 1. 首页 (HomeView.vue)
**路由**: `/`
- Hero 横幅区域（大标题、统计数据）
- 热门直播网格展示
- 热门分类卡片
- 支持筛选功能

### 2. 发现页 (DiscoverView.vue)
**路由**: `/discover`
- 轮播横幅
- 分类导航网格
- 热门标签云
- 推荐主播列表
- 人气榜单（日/周/月）

### 3. 关注页 (FollowView.vue)
**路由**: `/follow`
- 标签切换（直播中/全部/最近访问）
- 在线主播列表
- 未开播主播列表
- 开播提醒功能

### 4. 个人中心 (ProfileView.vue)
**路由**: `/profile` 或 `/profile/:id`
- 用户信息卡片
- 统计数据展示
- 快捷操作入口
- 内容标签页（作品/收藏/历史）
- 视频网格展示

### 5. 消息页 (MessageView.vue)
**路由**: `/message`
- 聊天列表
- 标签切换（聊天/通知/系统）
- 聊天弹窗（点击进入聊天）
- 消息发送功能

### 6. 搜索页 (SearchView.vue)
**路由**: `/search`
- 搜索框
- 搜索历史
- 热门搜索榜单
- 搜索结果（综合/直播/主播/话题）

### 7. 直播间页面 (LiveStreamView.vue)
**路由**: `/view`
- 完整的直播间布局
- 三栏布局（主播信息/视频/聊天）
- 视频播放器组件
- 实时聊天室
- 礼物打赏系统

### 8. 视频播放器 (LiveStreamPlayer.vue)
**组件**: 可复用的播放器
- 科幻边框装饰
- 扫描线动画
- 全息网格效果
- 播放控制栏
- 画质切换
- 全屏功能

### 9. 开播页面 (StartLiveView.vue)
**路由**: `/start-live`
- 摄像头预览
- 直播设置表单
- 分类选择
- 画质设置
- 封面上传
- 隐私设置

### 10. 底部导航 (BottomNav.vue)
**组件**: 全局导航
- 5个导航项（首页/发现/开播/关注/我的）
- 中间开播按钮（凸起设计）
- 活跃状态指示
- 发光动画效果

## 🎨 设计风格特点

### 颜色方案
- **主背景**: 深蓝渐变 (#0a0e27, #16213e)
- **强调色**: 青色 (#00f7ff) 和洋红 (#ff0080)
- **直播标识**: 红色 (#ff0050)
- **成功/在线**: 绿色 (#0f0)

### 视觉效果
- ✨ 发光效果 (box-shadow, text-shadow)
- 🔄 动画效果 (pulse, rotate, scan, shimmer)
- 💫 毛玻璃 (backdrop-filter)
- 🌈 渐变背景
- 📊 科幻边框
- 🔲 全息网格

### 交互效果
- 悬停提升 (translateY)
- 点击缩放 (scale)
- 边框发光
- 平滑过渡

## 🔗 路由配置

| 路径 | 组件 | 描述 |
|------|------|------|
| `/` | HomeView | 首页 |
| `/discover` | DiscoverView | 发现 |
| `/follow` | FollowView | 关注 |
| `/profile` | ProfileView | 个人中心 |
| `/message` | MessageView | 消息 |
| `/search` | SearchView | 搜索 |
| `/view` | LiveStreamView | 直播间 |
| `/start-live` | StartLiveView | 开始直播 |

## 📱 响应式设计

- **桌面端**: 完整三栏布局
- **平板端**: 两栏布局，隐藏侧边栏
- **移动端**: 单栏布局，底部导航

### 断点
- 桌面: > 1024px
- 平板: 768px - 1024px
- 移动: < 768px

## 🚀 快速开始

### 安装依赖
```bash
npm install
```

### 开发模式
```bash
npm run dev
```

### 构建生产
```bash
npm run build
```

### 预览生产构建
```bash
npm run preview
```

## 📝 页面跳转说明

### 从首页跳转
```javascript
// 跳转到直播间
$router.push('/view')

// 跳转到主播主页
$router.push(`/profile/${userId}`)

// 跳转到搜索
$router.push('/search')
```

### 从底部导航跳转
- 点击首页图标 → `/`
- 点击发现图标 → `/discover`
- 点击中间按钮 → `/start-live`
- 点击关注图标 → `/follow`
- 点击我的图标 → `/profile`

### 编程式导航
```javascript
// 在组件中使用
import { useRouter } from 'vue-router'
const router = useRouter()

// 跳转
router.push('/path')

// 返回
router.back()

// 带参数跳转
router.push({ name: 'profile-detail', params: { id: 123 } })
```

## 🎯 下一步开发建议

1. **添加 WebRTC 功能**
   - 集成直播推流
   - 实现实时视频传输
   - 添加音视频设备控制

2. **后端对接**
   - 用户认证系统
   - 直播流管理API
   - 聊天WebSocket服务
   - 礼物打赏系统

3. **功能增强**
   - 弹幕系统
   - 礼物动画
   - 分享功能
   - 录制回放
   - 数据统计

4. **性能优化**
   - 懒加载
   - 虚拟滚动
   - 图片优化
   - CDN加速

## 📄 许可证

MIT License

## 👨‍💻 作者

CyberLive Team

---

**注意**: 当前版本只包含UI设计和页面结构，WebRTC相关的JavaScript逻辑需要根据实际业务需求补充实现。
