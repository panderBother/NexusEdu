# 协议切换时间戳同步方案

## 问题背景

### 延迟差异

不同直播协议的延迟差异显著：

```
WebRTC: ~500ms   (超低延迟)
FLV:    ~2-3s    (低延迟)
HLS:    ~10-30s  (高延迟)
```

### 切换问题

#### 场景 1：降级切换（快 → 慢）

**WebRTC → FLV**

```
时间轴对比：
WebRTC: ========[当前 10:00:00.5]========>
FLV:    ====[当前 10:00:00.0 落后 2.5s]====>

问题：切换后 FLV 会重播 2.5 秒前的内容
表现：用户看到重复的画面
```

**示例：**
- WebRTC 正在播放主播说"大家好"（10:00:00.5）
- 切换到 FLV 后，又听到一遍"大家好"（10:00:00.0）
- 用户体验：画面倒退，重复播放

#### 场景 2：升级切换（慢 → 快）

**FLV → WebRTC**

```
时间轴对比：
FLV:    ========[当前 10:00:03.0]========>
WebRTC: ============[当前 10:00:00.5 快 2.5s]=>

问题：切换后 WebRTC 跳过了 2.5 秒内容
表现：用户看到画面跳跃
```

**示例：**
- FLV 正在播放主播说"今天我们讲..."（10:00:03.0）
- 切换到 WebRTC 后，直接跳到"...第三个知识点"（10:00:00.5 + 2.5s = 10:00:03.0）
- 用户体验：跳过了中间内容，不连贯

## 解决方案

### 方案对比

| 方案 | 适用场景 | 优点 | 缺点 | 用户体验 |
|------|---------|------|------|---------|
| **快进策略** | 降级（快→慢） | 无重复播放 | 跳过部分内容 | ⭐⭐⭐ |
| **等待策略** | 升级（慢→快） | 不跳过内容 | 短暂等待 | ⭐⭐⭐⭐ |
| **平滑过渡** | 任何切换 | 体验最好 | 实现复杂 | ⭐⭐⭐⭐⭐ |
| **无同步** | 要求不高 | 实现简单 | 有重复或跳跃 | ⭐⭐ |

### 方案 1：快进策略（Skip Forward）

**原理：** 跳过重复内容，直接到最新位置

**适用场景：** 降级切换（WebRTC → FLV → HLS）

**实现：**
```typescript
// 计算时间差
const timeDiff = toLatency - fromLatency; // FLV(2.5s) - WebRTC(0.5s) = 2s

// 快进到目标位置
if (timeDiff > 0) {
  const targetTime = currentTime + timeDiff / 1000;
  videoElement.currentTime = targetTime; // 快进 2 秒
}
```

**效果：**
```
切换前：WebRTC [10:00:00.5]
切换后：FLV     [10:00:00.0] → 快进到 [10:00:02.5]
结果：  无重复，但跳过了 2 秒内容
```

**优点：**
- 无重复播放
- 实现简单
- 立即生效

**缺点：**
- 跳过部分内容
- 需要协议支持 seek（HLS 支持，WebRTC/FLV 直播流不支持）

### 方案 2：延迟切换策略（Wait Catch Up）⭐ 实际可行

**原理：** 预加载新协议，但延迟切换，让旧协议继续播放追赶时间差

**适用场景：** 升级切换（HLS → FLV → WebRTC）

**实现：**
```typescript
// 计算时间差
const timeDiff = toLatency - fromLatency; // WebRTC(0.5s) - FLV(2.5s) = -2s

// 预加载新协议（但不显示）
const webrtcPlayer = createWebRTCPlayer();
await webrtcPlayer.load(); // 预加载

// 旧协议继续播放，追赶时间差
const waitTime = Math.min(Math.abs(timeDiff), 3000); // 最多等 3 秒
await new Promise(resolve => setTimeout(resolve, waitTime));

// 切换到新协议
await switchToWebRTC();
```

**效果：**
```
切换前：FLV    [10:00:03.0]
        ↓ 预加载 WebRTC（不显示）
        FLV 继续播放 2 秒
        ↓
切换后：FLV    [10:00:05.0]
        WebRTC [10:00:05.5]
结果：  时间差从 2.5s 缩小到 0.5s，跳跃幅度大幅减小
```

**优点：**
- 跳跃幅度大幅减小
- 实现相对简单
- 不需要缓存视频

**缺点：**
- 仍有小幅跳跃（但可接受）
- 切换时间延长
- 延迟了享受低延迟的时间

**注意：** 这里"等待"的是让旧协议继续播放，而不是等待新协议。新协议的实时流无法"等待"，只能让旧协议追赶。

### 方案 3：平滑过渡策略（Smooth Transition）⭐ 推荐

**原理：** 使用倍速播放追赶时间差

**适用场景：** 任何切换

**实现：**

#### 降级场景（快 → 慢）：加速播放追赶

```typescript
// WebRTC → FLV，FLV 落后 2.5 秒
const timeDiff = 2500; // ms
const speedUpRate = 1.5; // 1.5 倍速

// 计算需要加速播放的时长
const speedUpDuration = timeDiff / (speedUpRate - 1); // 2500 / 0.5 = 5000ms

// 加速播放 5 秒
videoElement.playbackRate = 1.5;
await new Promise(resolve => setTimeout(resolve, 5000));
videoElement.playbackRate = 1.0; // 恢复正常速度
```

**效果：**
```
切换前：WebRTC [10:00:00.5]
切换后：FLV     [10:00:00.0]
        ↓ 以 1.5x 速度播放 5 秒
        [10:00:07.5] (实际时间) = [10:00:00.0 + 7.5s] (播放内容)
结果：  平滑追赶，用户几乎无感知
```

#### 升级场景（慢 → 快）：减速播放等待

```typescript
// FLV → WebRTC，WebRTC 超前 2.5 秒
const timeDiff = -2500; // ms
const slowDownRate = 0.8; // 0.8 倍速

// 计算需要减速播放的时长
const slowDownDuration = Math.abs(timeDiff) / (1 - slowDownRate); // 2500 / 0.2 = 12500ms

// 减速播放 12.5 秒
videoElement.playbackRate = 0.8;
await new Promise(resolve => setTimeout(resolve, 12500));
videoElement.playbackRate = 1.0; // 恢复正常速度
```

**效果：**
```
切换前：FLV    [10:00:03.0]
切换后：WebRTC [10:00:00.5]
        ↓ 以 0.8x 速度播放 12.5 秒
        [10:00:13.0] (实际时间) = [10:00:00.5 + 10s] (播放内容)
结果：  平滑等待，用户几乎无感知
```

**优点：**
- 用户体验最好
- 不跳过内容
- 不明显等待
- 适用所有场景

**缺点：**
- 实现相对复杂
- 倍速播放可能被用户察觉（但通常不明显）

### 方案 4：无同步策略（No Sync）

**原理：** 直接切换，不做任何时间对齐

**适用场景：** 对时间精度要求不高的场景

**实现：**
```typescript
// 直接切换，不做任何处理
await newPlayer.load();
await newPlayer.play();
```

**优点：**
- 实现最简单
- 切换最快

**缺点：**
- 会有重复或跳跃
- 用户体验差

## 推荐策略

### 自动选择策略

```typescript
function getRecommendedStrategy(fromProtocol, toProtocol) {
  const fromLatency = PROTOCOL_LATENCY[fromProtocol];
  const toLatency = PROTOCOL_LATENCY[toProtocol];
  
  if (toLatency > fromLatency) {
    // 降级（快 → 慢）：会有重复，建议快进跳过
    return SyncStrategy.SKIP_FORWARD;
  } else if (toLatency < fromLatency) {
    // 升级（慢 → 快）：会有跳跃，建议平滑过渡
    return SyncStrategy.SMOOTH_TRANSITION;
  } else {
    // 相同延迟，无需同步
    return SyncStrategy.NO_SYNC;
  }
}
```

### 具体场景推荐

| 切换方向 | 时间差 | 推荐策略 | 理由 |
|---------|-------|---------|------|
| WebRTC → FLV | +2s | 快进 | 跳过 2 秒重复内容 |
| WebRTC → HLS | +14.5s | 快进 | 跳过 14.5 秒重复内容 |
| FLV → HLS | +12.5s | 快进 | 跳过 12.5 秒重复内容 |
| HLS → FLV | -12.5s | 平滑过渡 | 减速播放等待 |
| HLS → WebRTC | -14.5s | 平滑过渡 | 减速播放等待 |
| FLV → WebRTC | -2s | 平滑过渡 | 减速播放等待 |

## 使用示例

### 基础使用

```typescript
import { TimestampSynchronizer, SyncStrategy } from '@/services/TimestampSynchronizer';

// 创建同步器
const sync = new TimestampSynchronizer({
  strategy: SyncStrategy.SMOOTH_TRANSITION,
  maxWaitTime: 3000,      // 最大等待 3 秒
  speedUpRate: 1.5,       // 1.5 倍速
  toleranceTime: 200      // 容忍 200ms 误差
});

// 执行同步
const result = await sync.synchronize(
  'webrtc',              // 源协议
  'flv',                 // 目标协议
  currentTime,           // 当前播放时间
  videoElement           // 视频元素
);

console.log('同步结果:', result);
// {
//   success: true,
//   strategy: 'smooth_transition',
//   timeDiff: 2000,
//   action: 'speedup',
//   message: '倍速播放 4000ms 追赶'
// }
```

### 自动选择策略

```typescript
// 获取推荐策略
const recommendedStrategy = TimestampSynchronizer.getRecommendedStrategy('webrtc', 'flv');
console.log('推荐策略:', recommendedStrategy); // 'skip_forward'

// 使用推荐策略
sync.updateConfig({ strategy: recommendedStrategy });
await sync.synchronize('webrtc', 'flv', currentTime, videoElement);
```

### 监听同步事件

```typescript
playerManager.on('timestamp-sync', (result) => {
  console.log('时间同步:', result);
  
  if (result.action === 'skip') {
    showNotification(`跳过了 ${result.timeDiff}ms 重复内容`);
  } else if (result.action === 'speedup') {
    showNotification(`正在追赶时间差...`);
  }
});
```

## 实际效果对比

### 无同步 vs 有同步

**场景：WebRTC → FLV（降级）**

| 指标 | 无同步 | 快进策略 | 平滑过渡 |
|------|-------|---------|---------|
| 重复内容 | 2.5 秒 | 0 秒 | 0 秒 |
| 跳过内容 | 0 秒 | 2.5 秒 | 0 秒 |
| 等待时间 | 0 秒 | 0 秒 | 0 秒 |
| 倍速播放 | 无 | 无 | 5 秒 1.5x |
| 用户体验 | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

**场景：FLV → WebRTC（升级）**

| 指标 | 无同步 | 等待策略 | 平滑过渡 |
|------|-------|---------|---------|
| 重复内容 | 0 秒 | 0 秒 | 0 秒 |
| 跳过内容 | 2.5 秒 | 0 秒 | 0 秒 |
| 等待时间 | 0 秒 | 2.5 秒 | 0 秒 |
| 倍速播放 | 无 | 无 | 12.5 秒 0.8x |
| 用户体验 | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

## 注意事项

### 1. 协议限制

**WebRTC/FLV 直播流不支持 seek**
- 快进策略不可用
- 只能使用等待或平滑过渡策略

**HLS 支持 seek**
- 所有策略都可用
- 快进策略效果最好

### 2. 延迟估算

协议延迟会受多种因素影响：
- 网络状况
- 服务器配置
- 编码参数
- 缓冲策略

建议：
- 定期测量实际延迟
- 动态调整延迟配置
- 提供手动校准功能

### 3. 用户感知

**倍速播放的感知阈值：**
- 1.2x 以下：几乎无感知
- 1.2x - 1.5x：轻微感知
- 1.5x 以上：明显感知

建议：
- 降级使用 1.2x - 1.5x 加速
- 升级使用 0.8x - 0.9x 减速
- 避免过大的倍速变化

### 4. 容错处理

```typescript
try {
  const result = await sync.synchronize(...);
  if (!result.success) {
    console.warn('同步失败，使用无同步策略');
    // 降级到无同步策略
  }
} catch (error) {
  console.error('同步异常:', error);
  // 继续播放，不影响主流程
}
```

## 面试回答要点

**面试官：从高延迟切到低延迟会跳跃怎么办？**

**你的回答：**

"这确实是个关键问题。直播流的特点是实时性，WebRTC 的实时流已经到了最新位置，不可能'倒回去'等 FLV。我的解决方案是**延迟切换策略**：

1. **问题分析**：比如从 FLV（延迟 2.5s）切到 WebRTC（延迟 0.5s），WebRTC 的实时流已经超前 2 秒，直接切换会跳过这 2 秒内容。

2. **核心思路**：不是让 WebRTC 等 FLV，而是让 FLV 继续播放追赶时间差，同时预加载 WebRTC。

3. **具体实现**：
   ```typescript
   // 1. 预加载 WebRTC（但不显示）
   const webrtcPlayer = createWebRTCPlayer();
   await webrtcPlayer.load();
   
   // 2. FLV 继续播放 2 秒（追赶时间差）
   await sleep(2000);
   
   // 3. 切换到 WebRTC
   await switchToWebRTC();
   ```

4. **效果**：
   - 切换前：FLV 在 10:00:03.0
   - FLV 继续播放 2 秒到 10:00:05.0
   - 切换后：WebRTC 在 10:00:05.5
   - 时间差从 2.5 秒缩小到 0.5 秒

5. **权衡**：
   - 优点：跳跃幅度大幅减小（从 2.5s 降到 0.5s）
   - 缺点：切换时间延长 2 秒，但用户可以接受
   - 实际：设置最大等待时间 3 秒，避免等太久

6. **备选方案**：如果时间差很大（> 5 秒），直接切换并显示提示："已切换到实时画面，跳过 X 秒"，让用户知道这是正常的。

这样既减小了跳跃，又保持了实时性，是直播场景下的最佳平衡。"
