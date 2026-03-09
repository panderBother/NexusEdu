# 预渲染功能集成说明

## 概述

已成功将真正的预渲染功能集成到弹幕系统中。预渲染会在空闲时间提前渲染即将出现的弹幕，减少首次渲染延迟。

## 核心组件

### 1. PrerendererManager（预渲染管理器）

位置：`src/danmaku/prerender/PrerendererManager.ts`

功能：
- 在空闲时间使用 `requestIdleCallback` 预渲染即将出现的弹幕
- 管理预渲染队列，避免重复预渲染
- 跟踪统计信息：总预渲染数量、缓存命中率、平均渲染时间

配置参数：
```typescript
{
  enabled: true,              // 是否启用预渲染
  lookaheadTime: 5000,       // 预渲染时间窗口（5秒）
  batchSize: 20,             // 每次预渲染的弹幕数量
  interval: 1000,            // 预渲染间隔（1秒）
  maxConcurrent: 5           // 最大并发预渲染数量
}
```

### 2. PriorityQueue.peek() 方法

位置：`src/danmaku/queue/PriorityQueue.ts`

新增功能：
- `peek(lookaheadTime: number): DanmakuItem[]` - 查看即将出队的弹幕，不实际出队
- 用于预渲染管理器提前查看队列中的弹幕
- 按优先级从高到低返回最多 20 条弹幕

### 3. DanmakuManager 集成

位置：`src/danmaku/core/DanmakuManager.ts`

集成内容：
- 在 `initialize()` 中创建 `PrerendererManager` 实例
- 在 `start()` 中启动预渲染
- 在 `stop()` 中停止预渲染
- 在 `getStats()` 中返回预渲染统计信息

### 4. RenderCoordinator 统计追踪

位置：`src/danmaku/render/RenderCoordinator.ts`

新增功能：
- `getCache()` - 返回缓存实例供预渲染管理器使用
- `setPrerenderer()` - 设置预渲染管理器引用
- 在 `renderDanmaku()` 中追踪缓存命中/未命中，通知预渲染管理器

## 工作流程

```
1. 用户添加弹幕 → 进入 PriorityQueue
                    ↓
2. PrerendererManager 定期（1秒）检查队列
                    ↓
3. 使用 peek() 查看即将出现的弹幕（5秒内）
                    ↓
4. 在 requestIdleCallback 中预渲染这些弹幕
                    ↓
5. 将预渲染结果存入 RenderCache
                    ↓
6. 弹幕实际显示时，直接从缓存读取（命中）
                    ↓
7. 统计命中率和性能指标
```

## 预渲染 vs 缓存

### 缓存（Render Cache）
- **时机**：弹幕第一次渲染后
- **目的**：避免重复渲染相同内容
- **触发**：被动，弹幕已经显示

### 预渲染（Pre-rendering）
- **时机**：弹幕显示前的空闲时间
- **目的**：减少首次渲染延迟
- **触发**：主动，提前渲染

## 性能优化

1. **空闲时间利用**：使用 `requestIdleCallback` 在浏览器空闲时预渲染
2. **并发控制**：最多同时预渲染 5 条弹幕，避免阻塞主线程
3. **智能调度**：队列长度超过 100 时跳过预渲染（系统繁忙）
4. **去重机制**：避免重复预渲染同一条弹幕

## 统计信息

通过 `DanmakuManager.getStats()` 可以获取：

```typescript
{
  activeDanmaku: number,        // 当前活动弹幕数
  queueLength: number,          // 队列长度
  fps: number,                  // 帧率
  availableTracks: number,      // 可用轨道数
  cacheStats: {                 // 缓存统计
    size: number,
    count: number,
    hitRate: number
  },
  prerendererStats: {           // 预渲染统计
    totalPrerendered: number,   // 总预渲染数量
    cacheHits: number,          // 缓存命中次数
    cacheMisses: number,        // 缓存未命中次数
    hitRate: number,            // 命中率
    averageRenderTime: number   // 平均渲染时间
  }
}
```

## 使用示例

```typescript
// 初始化弹幕管理器
const manager = new DanmakuManager()
manager.initialize(canvas, {
  width: 1920,
  height: 1080,
  maxDanmaku: 300,
  trackHeight: 40,
  trackGap: 5,
  useOffscreen: true,
  cacheSize: 100
})

// 启动（自动启动预渲染）
manager.start()

// 添加弹幕
manager.addDanmaku({
  id: '1',
  text: '测试弹幕',
  type: DanmakuType.SCROLL,
  color: '#FFFFFF',
  size: DanmakuSize.MEDIUM,
  priority: 5,
  userId: 'user1',
  timestamp: Date.now()
})

// 查看统计信息
const stats = manager.getStats()
console.log('预渲染命中率:', stats.prerendererStats.hitRate)
console.log('平均渲染时间:', stats.prerendererStats.averageRenderTime)
```

## 注意事项

1. **TypeScript 编译器目标**：代码使用了 ES2015+ 特性（Set, Map, Promise, async/await），需要确保 tsconfig 的 target 和 lib 设置正确
2. **浏览器兼容性**：`requestIdleCallback` 在旧版浏览器中可能不支持，代码已提供 `setTimeout` 降级方案
3. **内存管理**：预渲染会增加内存使用，可以通过调整 `lookaheadTime` 和 `batchSize` 控制
4. **性能监控**：建议在生产环境中监控预渲染命中率，根据实际情况调整参数

## 下一步优化

1. 根据网络状况动态调整预渲染参数
2. 支持预渲染优先级（优先预渲染 VIP、礼物弹幕）
3. 添加预渲染失败重试机制
4. 支持预渲染结果持久化（IndexedDB）
