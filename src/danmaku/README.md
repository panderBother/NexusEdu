# 高性能弹幕系统

一个基于 Canvas 和 Web Worker 的高性能弹幕渲染引擎，支持每秒千条级别的弹幕流畅展示。

## 特性

- ✅ **离屏渲染**：使用 OffscreenCanvas 在 Worker 线程中渲染，避免阻塞主线程
- ✅ **LRU 缓存**：预渲染弹幕纹理，减少重复渲染开销
- ✅ **虚拟轨道**：智能分配弹幕位置，避免重叠
- ✅ **优先级队列**：支持 VIP 弹幕和礼物弹幕优先显示
- ✅ **用户限流**：防止弹幕刷屏
- ✅ **实时通信**：WebSocket 实时接收和发送弹幕
- ✅ **历史存储**：IndexedDB 存储最近 7 天的历史弹幕
- ✅ **交互功能**：点赞、评论、@提及、屏蔽、举报
- ✅ **控制面板**：可见性、透明度、速度、密度、关键词过滤

## 技术栈

- Vue 3 + TypeScript
- Canvas API + OffscreenCanvas
- Web Worker
- Pinia (状态管理)
- WebSocket (实时通信)
- IndexedDB (持久化存储)

## 快速开始

### 1. 访问演示页面

```
http://localhost:5173/#/danmaku
```

### 2. 基本使用

```vue
<template>
  <div class="app">
    <DanmakuCanvas :width="1920" :height="1080" />
    <DanmakuInput @send="onSend" />
    <DanmakuControl />
  </div>
</template>

<script setup>
import { useDanmakuStore } from '@/stores/danmaku'
import DanmakuCanvas from '@/components/danmaku/DanmakuCanvas.vue'
import DanmakuInput from '@/components/danmaku/DanmakuInput.vue'
import DanmakuControl from '@/components/danmaku/DanmakuControl.vue'

const danmakuStore = useDanmakuStore()

// 连接 WebSocket 服务器（可选）
// await danmakuStore.connect('ws://localhost:8080/danmaku')

function onSend(danmaku) {
  console.log('Danmaku sent:', danmaku)
}
</script>
```

### 3. 发送弹幕

```typescript
import { useDanmakuStore } from '@/stores/danmaku'
import { DanmakuType, DanmakuSize } from '@/danmaku/types'

const danmakuStore = useDanmakuStore()

// 发送弹幕
danmakuStore.addDanmaku({
  id: '',
  text: '这是一条测试弹幕',
  type: DanmakuType.SCROLL,
  color: '#FFFFFF',
  size: DanmakuSize.MEDIUM,
  priority: 5,
  userId: 'user123',
  timestamp: Date.now()
})
```

## 架构

```
src/danmaku/
├── core/              # 核心管理器
│   └── DanmakuManager.ts
├── queue/             # 优先级队列
│   └── PriorityQueue.ts
├── track/             # 轨道管理
│   └── TrackManager.ts
├── render/            # 渲染层
│   ├── RenderCoordinator.ts
│   ├── RenderCache.ts
│   └── offscreen.worker.ts
├── validation/        # 数据验证
│   └── DanmakuValidator.ts
├── network/           # 网络通信
│   └── WebSocketClient.ts
├── storage/           # 数据存储
│   └── IndexedDBStore.ts
├── control/           # 控制管理
│   └── ControlManager.ts
├── interaction/       # 交互管理
│   └── InteractionManager.ts
├── history/           # 历史回放
│   └── HistoryPlayer.ts
└── types/             # 类型定义
    └── index.ts
```

## 性能指标

- **渲染性能**：支持 1000+ 条弹幕/秒，保持 60fps
- **内存占用**：LRU 缓存限制在 100MB
- **响应延迟**：接收到弹幕后 100ms 内开始显示
- **用户限流**：1 秒内最多 3 条弹幕/用户
- **队列容量**：最大 5000 条弹幕缓冲

## 配置选项

```typescript
interface DanmakuConfig {
  width: number                 // Canvas 宽度
  height: number                // Canvas 高度
  maxDanmaku: number           // 最大同时显示弹幕数
  trackHeight: number          // 轨道高度
  trackGap: number             // 轨道间距
  useOffscreen: boolean        // 是否使用离屏渲染
  cacheSize: number            // 缓存大小（MB）
}
```

## 控制设置

```typescript
interface ControlSettings {
  visible: boolean              // 弹幕可见性
  opacity: number               // 透明度 (0-1)
  speed: SpeedLevel            // 速度（慢/中/快）
  density: DensityLevel        // 密度（稀疏/正常/密集）
  keywordFilters: string[]     // 关键词过滤
  userFilters: string[]        // 用户过滤
  blockedUsers: string[]       // 屏蔽用户
}
```

## API 文档

### DanmakuManager

```typescript
// 初始化
danmakuManager.initialize(canvas, config)

// 添加弹幕
danmakuManager.addDanmaku(danmaku)

// 启动/停止
danmakuManager.start()
danmakuManager.stop()

// 清除所有弹幕
danmakuManager.clear()

// 获取统计信息
danmakuManager.getStats()
```

### ControlManager

```typescript
// 设置可见性
controlManager.setVisible(true)

// 设置透明度
controlManager.setOpacity(0.8)

// 设置速度
controlManager.setSpeed(SpeedLevel.MEDIUM)

// 添加关键词过滤
controlManager.addKeywordFilter('广告')

// 屏蔽用户
controlManager.blockUser('userId')
```

### WebSocketClient

```typescript
// 连接服务器
await wsClient.connect('ws://localhost:8080/danmaku')

// 发送弹幕
wsClient.sendDanmaku(danmaku)

// 监听弹幕
wsClient.onDanmaku((danmaku) => {
  console.log('Received:', danmaku)
})

// 断开连接
wsClient.disconnect()
```

## 测试

```bash
# 运行所有测试
npm test

# 运行特定测试
npm test src/danmaku/tests/core-structures.test.ts

# 查看测试覆盖率
npm run test:coverage
```

## 注意事项

1. **WebSocket 服务器**：演示页面默认不连接 WebSocket，需要自行配置服务器地址
2. **浏览器兼容性**：需要支持 OffscreenCanvas 的现代浏览器（Chrome 69+, Firefox 105+）
3. **性能优化**：在低端设备上会自动降级到主线程渲染
4. **内存管理**：系统会自动清理离开屏幕的弹幕和过期的缓存

## 故障排除

### 弹幕不显示

1. 检查 Canvas 元素是否正确初始化
2. 检查弹幕可见性设置
3. 查看浏览器控制台是否有错误

### 性能问题

1. 降低 maxDanmaku 配置
2. 减少缓存大小
3. 禁用离屏渲染（useOffscreen: false）
4. 降低弹幕密度

### WebSocket 连接失败

1. 检查服务器地址是否正确
2. 检查网络连接
3. 查看浏览器控制台的错误信息

## 许可证

MIT
