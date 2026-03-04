# 增强版网络监控使用指南

## 概述

增强版网络监控系统整合了浏览器 API 和播放器事件监听，提供更精准的网络状态检测和智能协议切换。

## 核心特性

### 1. 双重监控机制

- **浏览器 API 监控**：定时采集 RTT、带宽、丢包率
- **播放器事件监控**：实时监听卡顿、缓冲、错误等事件

### 2. 智能协议切换

- **自动降级**：检测到卡顿、缓冲不足时自动降级
- **自动升级**：网络状况良好时自动升级到低延迟协议
- **紧急切换**：严重问题时立即切换，不等待稳定性检查

### 3. 详细统计数据

- 卡顿次数和总时长
- 错误次数
- 缓冲区健康度历史
- 播放冻结次数

## 使用方法

### 基础使用

```typescript
import { AdaptiveStreamPlayer } from '@/services/AdaptiveStreamPlayer';

// 创建播放器实例
const player = new AdaptiveStreamPlayer({
  videoElement: document.querySelector('video')!,
  srsHost: 'http://your-srs-server:1985',
  app: 'live',
  streamId: 'stream1',
  networkMonitor: {
    sampleInterval: 2000,  // 采样间隔 2 秒
    rttThresholds: {
      good: 100,   // RTT < 100ms 为 good
      poor: 300    // RTT > 300ms 为 poor
    }
  },
  protocolSwitcher: {
    stabilityRequirement: 3,    // 需要连续 3 次相同质量才切换
    minSwitchInterval: 10000,   // 最小切换间隔 10 秒
    autoSwitch: true            // 启用自动切换
  }
});

// 启动播放器（会自动绑定监控）
await player.start();

// 监听事件
player.on('protocol-change', (protocol) => {
  console.log(`协议切换到: ${protocol}`);
});

player.on('network-quality-change', (quality) => {
  console.log(`网络质量: ${quality}`);
});

player.on('metrics-update', (metrics) => {
  console.log('网络指标:', metrics);
});
```

### 监听增强事件

```typescript
// 1. 卡顿事件
player.on('frequent-stall', ({ count }) => {
  console.log(`频繁卡顿 ${count} 次`);
  // 可以显示提示给用户
});

player.on('severe-stall', ({ duration }) => {
  console.log(`严重卡顿 ${duration}ms`);
});

// 2. 缓冲区事件
player.on('buffer-critical', ({ health }) => {
  console.log(`缓冲区严重不足: ${health}s`);
});

player.on('buffer-low', ({ health, average }) => {
  console.log(`缓冲区不足: ${health}s (平均: ${average}s)`);
});

player.on('buffer-healthy', ({ health, average }) => {
  console.log(`缓冲区充足: ${health}s (平均: ${average}s)`);
});

// 3. 播放错误
player.on('playback-error', ({ error, count }) => {
  console.error(`播放错误 (${count}次):`, error);
});

// 4. 网络停滞
player.on('network-stalled', () => {
  console.log('网络停滞');
});

// 5. 播放冻结
player.on('playback-frozen', ({ count }) => {
  console.log(`播放冻结 ${count} 次`);
});
```

### 手动控制

```typescript
// 手动设置协议
player.setManualProtocol('hls');

// 启用自动切换
player.enableAutoSwitch();

// 获取当前状态
const state = player.getState();
console.log('当前协议:', state.protocol);
console.log('网络质量:', state.networkQuality);
console.log('是否自动切换:', state.isAutoSwitch);
console.log('播放器状态:', state.playerState);
```

### 获取统计数据

```typescript
// 通过 networkMonitor 获取详细统计
const stats = player.networkMonitor.getStats();
console.log('卡顿次数:', stats.stallCount);
console.log('总卡顿时长:', stats.totalStallTime, 'ms');
console.log('错误次数:', stats.errorCount);
console.log('平均缓冲健康度:', stats.avgBufferHealth, 's');
console.log('播放冻结次数:', stats.playbackFrozenCount);
```

## 监控事件详解

### 1. 卡顿监控

**触发条件：**
- `waiting` 事件：播放器缓冲不足，暂停等待数据
- 连续 3 次卡顿触发 `frequent-stall`
- 单次卡顿超过 3 秒触发 `severe-stall`

**自动响应：**
- 频繁卡顿 → 降级协议
- 严重卡顿 → 紧急降级

### 2. 缓冲区监控

**触发条件：**
- `progress` 事件：下载进度更新时检查缓冲区
- 缓冲健康度 < 1s → `buffer-critical`
- 缓冲健康度 < 3s → `buffer-low`
- 缓冲健康度 > 10s 且平均 > 8s → `buffer-healthy`

**自动响应：**
- 缓冲区严重不足 → 紧急降级
- 缓冲区不足且平均 < 2s → 降级协议
- 缓冲区充足且平均 > 10s → 升级协议

### 3. 播放冻结监控

**触发条件：**
- `timeupdate` 事件：检测播放时间是否前进
- 连续 10 次时间未变化 → `playback-frozen`

**自动响应：**
- 播放冻结 → 降级协议

### 4. 网络停滞监控

**触发条件：**
- `stalled` 事件：网络下载中断

**自动响应：**
- 网络停滞 → 切换到 HLS（最稳定）

### 5. 错误监控

**触发条件：**
- `error` 事件：播放器错误

**自动响应：**
- 播放错误 → 切换到下一个协议

## 协议切换策略

### 协议优先级

```
网络质量 good  → WebRTC (超低延迟 ~500ms)
网络质量 fair  → FLV     (低延迟 ~2-3s)
网络质量 poor  → HLS     (高延迟 ~10-30s，但稳定)
```

### 降级链

```
WebRTC → FLV → HLS
```

### 升级链

```
HLS → FLV → WebRTC
```

### 切换条件

**自动切换（基于网络质量）：**
- 需要连续 3 次相同质量
- 最小切换间隔 10 秒

**紧急切换（基于播放器事件）：**
- 立即切换，不等待稳定性检查
- 不受最小切换间隔限制

## 最佳实践

### 1. 合理配置阈值

```typescript
{
  networkMonitor: {
    // 根据目标用户网络环境调整
    rttThresholds: {
      good: 100,   // 光纤/5G
      poor: 300    // 4G/宽带
    },
    bandwidthThresholds: {
      good: 2,     // 2 Mbps
      poor: 1      // 1 Mbps
    }
  }
}
```

### 2. 监听关键事件

```typescript
// 至少监听这些事件以提供用户反馈
player.on('protocol-change', showProtocolNotification);
player.on('frequent-stall', showBufferingTip);
player.on('playback-error', showErrorMessage);
```

### 3. 提供手动控制

```typescript
// 允许用户手动选择协议
<select onChange={(e) => player.setManualProtocol(e.target.value)}>
  <option value="webrtc">超低延迟</option>
  <option value="flv">低延迟</option>
  <option value="hls">流畅优先</option>
</select>

// 允许用户切换自动/手动模式
<button onClick={() => player.enableAutoSwitch()}>
  启用自动切换
</button>
```

### 4. 显示统计信息

```typescript
// 定期更新统计信息显示
setInterval(() => {
  const stats = player.networkMonitor.getStats();
  updateStatsUI(stats);
}, 1000);
```

## 故障排查

### 问题：频繁切换协议

**原因：**
- 网络质量波动大
- 稳定性要求设置过低

**解决：**
```typescript
{
  protocolSwitcher: {
    stabilityRequirement: 5,    // 增加到 5 次
    minSwitchInterval: 15000    // 增加到 15 秒
  }
}
```

### 问题：切换不及时

**原因：**
- 稳定性要求设置过高
- 最小切换间隔过长

**解决：**
```typescript
{
  protocolSwitcher: {
    stabilityRequirement: 2,    // 减少到 2 次
    minSwitchInterval: 5000     // 减少到 5 秒
  }
}
```

### 问题：监控不生效

**检查：**
1. 确认播放器已启动：`await player.start()`
2. 确认事件已绑定：在 `start()` 之后绑定事件
3. 查看控制台日志：所有监控事件都有日志输出

## 性能影响

### 资源消耗

- **CPU**：轻量级，主要是定时器和事件监听
- **内存**：约 1-2 MB（统计数据和事件处理器）
- **网络**：零额外流量（利用已有数据）

### 优化建议

```typescript
// 播放暂停时降低采样频率
player.pause();  // 自动切换到 10 秒采样

// 播放恢复时恢复正常频率
player.resume(); // 自动切换到 2 秒采样
```

## 总结

增强版网络监控系统通过整合多种监控手段，提供了更智能、更及时的协议切换能力，显著提升了直播播放的稳定性和用户体验。
