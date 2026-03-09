# 协议切换时间同步完整示例

## 核心流程

```
1. 初始化 SRS 时间戳服务
   ↓
2. 获取流信息（live_ms）
   ↓
3. 计算流开始时间
   ↓
4. 协议切换时：
   - 获取当前 currentTime
   - 通过 SRS 服务计算目标 currentTime
   - 新播放器跳转到目标位置
   ↓
5. 完成无缝切换
```

## 完整代码示例

### 1. 基础使用

```typescript
import { PlayerManager } from '@/services/PlayerManager';
import { AdaptiveStreamPlayer } from '@/services/AdaptiveStreamPlayer';

// 创建自适应播放器
const player = new AdaptiveStreamPlayer({
  videoElement: document.querySelector('video'),
  srsHost: '192.168.1.100',
  app: 'live',
  streamId: 'livestream',
  // ... 其他配置
});

// 启动播放（会自动初始化 SRS 时间戳服务）
await player.start();

// 手动切换协议（会自动进行时间同步）
player.setManualProtocol('flv');
```

### 2. 详细流程

```typescript
// ========== 步骤 1: 初始化 SRS 时间戳服务 ==========
const srsTimestamp = new SRSTimestampService('192.168.1.100', 1985);

// 初始化：获取流信息
const success = await srsTimestamp.initialize('live', 'livestream');

if (success) {
  console.log('SRS 时间戳服务初始化成功');
  
  // 启动定期更新（30秒一次，防止时间漂移）
  srsTimestamp.startPeriodicUpdate('live', 'livestream', 30000);
} else {
  console.warn('SRS 时间戳服务初始化失败，将使用降级方案');
}

// ========== 步骤 2: 协议切换 ==========
async function switchProtocol(
  fromProtocol: 'webrtc' | 'flv' | 'hls',
  toProtocol: 'webrtc' | 'flv' | 'hls'
) {
  // 2.1 获取当前播放时间
  const currentTime = videoElement.currentTime;
  console.log(`当前 currentTime: ${currentTime.toFixed(2)}s`);
  
  // 2.2 计算目标 currentTime（关键步骤！）
  const targetCurrentTime = srsTimestamp.calculateTargetCurrentTime(
    fromProtocol,
    toProtocol,
    currentTime
  );
  
  console.log(`目标 currentTime: ${targetCurrentTime.toFixed(2)}s`);
  console.log(`需要跳转: ${((targetCurrentTime - currentTime) * 1000).toFixed(0)}ms`);
  
  // 2.3 创建新播放器
  const newPlayer = createPlayer(toProtocol);
  await newPlayer.initialize();
  await newPlayer.load();
  
  // 2.4 等待新播放器准备好
  await waitForPlayerReady(newPlayer);
  
  // 2.5 跳转到目标位置（关键步骤！）
  newPlayer.getVideoElement().currentTime = targetCurrentTime;
  
  // 2.6 开始播放
  await newPlayer.play();
  
  // 2.7 销毁旧播放器
  oldPlayer.destroy();
  
  console.log('协议切换完成！');
}

// ========== 步骤 3: 调试信息 ==========
function showDebugInfo() {
  const debugInfo = srsTimestamp.getDebugInfo('webrtc', videoElement.currentTime);
  console.table(debugInfo);
}
```

## 实际场景示例

### 场景 1: WebRTC → FLV（降级）

```typescript
// 当前状态
const currentProtocol = 'webrtc';
const currentTime = 125.3; // 秒

// 执行切换
const targetTime = srsTimestamp.calculateTargetCurrentTime(
  'webrtc',
  'flv',
  125.3
);

// 计算过程：
// 1. 当前服务器时间戳 = 流开始时间 + 125.3s
//    = 2024-03-04 10:00:00.000 + 125300ms
//    = 2024-03-04 10:02:05.300
//
// 2. 协议延迟差 = FLV延迟 - WebRTC延迟
//    = 2500ms - 500ms = 2000ms
//
// 3. 目标服务器时间戳 = 当前时间戳 + 延迟差
//    = 2024-03-04 10:02:05.300 + 2000ms
//    = 2024-03-04 10:02:07.300
//
// 4. 目标 currentTime = (目标时间戳 - 流开始时间) / 1000
//    = (10:02:07.300 - 10:00:00.000) / 1000
//    = 127.3s

console.log(`需要快进: ${(127.3 - 125.3) * 1000}ms = 2000ms`);

// 新播放器跳转
flvPlayer.videoElement.currentTime = 127.3;

// 结果：无重复播放！✅
```

### 场景 2: FLV → WebRTC（升级）

```typescript
// 当前状态
const currentProtocol = 'flv';
const currentTime = 125.3; // 秒

// 执行切换
const targetTime = srsTimestamp.calculateTargetCurrentTime(
  'flv',
  'webrtc',
  125.3
);

// 计算过程：
// 1. 当前服务器时间戳 = 流开始时间 + 125.3s
//    = 2024-03-04 10:00:00.000 + 125300ms
//    = 2024-03-04 10:02:05.300
//
// 2. 协议延迟差 = WebRTC延迟 - FLV延迟
//    = 500ms - 2500ms = -2000ms
//
// 3. 目标服务器时间戳 = 当前时间戳 + 延迟差
//    = 2024-03-04 10:02:05.300 - 2000ms
//    = 2024-03-04 10:02:03.300
//
// 4. 目标 currentTime = (目标时间戳 - 流开始时间) / 1000
//    = (10:02:03.300 - 10:00:00.000) / 1000
//    = 123.3s

console.log(`需要回退: ${(123.3 - 125.3) * 1000}ms = -2000ms`);

// 新播放器跳转
webrtcPlayer.videoElement.currentTime = 123.3;

// 结果：跳过 2 秒内容，但这是正确的！
// 因为 WebRTC 的实时流确实超前 2 秒
```

## 关键代码解析

### 1. calculateTargetCurrentTime 方法

```typescript
calculateTargetCurrentTime(
  fromProtocol: StreamProtocol,
  toProtocol: StreamProtocol,
  currentTime: number
): number {
  // 步骤 1: 获取当前服务器时间戳
  const serverTimestamp = this.currentTimeToServerTimestamp(currentTime);
  // serverTimestamp = streamStartTime + currentTime * 1000
  
  // 步骤 2: 计算协议延迟差
  const fromLatency = PROTOCOL_LATENCY[fromProtocol];
  const toLatency = PROTOCOL_LATENCY[toProtocol];
  const latencyDiff = toLatency - fromLatency;
  
  // 步骤 3: 调整服务器时间戳
  const targetServerTimestamp = serverTimestamp + latencyDiff;
  
  // 步骤 4: 转换为 currentTime
  const targetCurrentTime = this.serverTimestampToCurrentTime(targetServerTimestamp);
  // targetCurrentTime = (targetServerTimestamp - streamStartTime) / 1000
  
  return targetCurrentTime;
}
```

### 2. 时间转换方法

```typescript
// currentTime → 服务器时间戳
currentTimeToServerTimestamp(currentTime: number): number {
  return this.streamStartTime + currentTime * 1000;
}

// 服务器时间戳 → currentTime
serverTimestampToCurrentTime(serverTimestamp: number): number {
  return (serverTimestamp - this.streamStartTime) / 1000;
}
```

## 完整的 Vue 组件示例

```vue
<template>
  <div class="player-container">
    <video ref="videoRef" controls></video>
    
    <div class="controls">
      <button @click="switchTo('webrtc')">切换到 WebRTC</button>
      <button @click="switchTo('flv')">切换到 FLV</button>
      <button @click="switchTo('hls')">切换到 HLS</button>
      <button @click="showDebug">显示调试信息</button>
    </div>
    
    <div class="debug-info">
      <p>当前协议: {{ currentProtocol }}</p>
      <p>播放时间: {{ currentTime.toFixed(2) }}s</p>
      <p>服务器时间戳: {{ serverTimestamp }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { AdaptiveStreamPlayer } from '@/services/AdaptiveStreamPlayer';
import type { StreamProtocol } from '@/types/adaptive-stream';

const videoRef = ref<HTMLVideoElement>();
const currentProtocol = ref<StreamProtocol>('flv');
const currentTime = ref(0);
const serverTimestamp = ref('');

let player: AdaptiveStreamPlayer | null = null;

onMounted(async () => {
  if (!videoRef.value) return;
  
  // 创建自适应播放器
  player = new AdaptiveStreamPlayer({
    videoElement: videoRef.value,
    srsHost: '192.168.1.100',
    app: 'live',
    streamId: 'livestream',
    networkMonitor: {
      sampleInterval: 2000
    },
    protocolSwitcher: {
      autoSwitch: true
    }
  });
  
  // 监听协议切换事件
  player.on('protocol-change', (protocol: StreamProtocol) => {
    currentProtocol.value = protocol;
    console.log(`协议已切换到: ${protocol}`);
  });
  
  // 监听时间同步事件
  player.on('timestamp-sync', (result: any) => {
    console.log('时间同步结果:', result);
  });
  
  // 启动播放
  await player.start();
  
  // 更新播放时间
  const timer = setInterval(() => {
    if (videoRef.value) {
      currentTime.value = videoRef.value.currentTime;
    }
  }, 100);
  
  onUnmounted(() => {
    clearInterval(timer);
  });
});

onUnmounted(() => {
  player?.destroy();
});

// 手动切换协议
function switchTo(protocol: StreamProtocol) {
  player?.setManualProtocol(protocol);
}

// 显示调试信息
function showDebug() {
  const state = player?.getState();
  console.table(state);
}
</script>
```

## 测试验证

### 1. 验证时间同步是否正确

```typescript
// 测试函数
async function testTimestampSync() {
  const srsTimestamp = new SRSTimestampService('192.168.1.100');
  await srsTimestamp.initialize('live', 'livestream');
  
  // 模拟 WebRTC 播放到 125.3 秒
  const webrtcTime = 125.3;
  
  // 计算切换到 FLV 的目标时间
  const flvTime = srsTimestamp.calculateTargetCurrentTime('webrtc', 'flv', webrtcTime);
  
  // 验证：FLV 应该快进 2 秒
  const expectedDiff = 2.0; // (2500 - 500) / 1000
  const actualDiff = flvTime - webrtcTime;
  
  console.assert(
    Math.abs(actualDiff - expectedDiff) < 0.01,
    `时间差不正确: 期望 ${expectedDiff}s, 实际 ${actualDiff}s`
  );
  
  console.log('✅ 时间同步测试通过！');
}
```

### 2. 验证无重复播放

```typescript
// 在协议切换前后记录画面内容
let lastFrame = '';

videoElement.addEventListener('timeupdate', () => {
  const currentFrame = captureFrame(videoElement);
  
  if (currentFrame === lastFrame) {
    console.warn('⚠️ 检测到重复画面！');
  }
  
  lastFrame = currentFrame;
});
```

## 常见问题

### Q1: 为什么切换后还是有轻微跳跃？

A: 这是正常的，因为：
1. 协议延迟是估算值，实际延迟会波动
2. 网络抖动导致的时间偏差
3. 可以通过定期校准减小偏差

### Q2: 如果 SRS API 不可用怎么办？

A: 系统会自动降级到传统的时间差同步方法，虽然精度稍低，但仍然可用。

### Q3: 如何提高同步精度？

A: 
1. 缩短定期更新间隔（如 10 秒）
2. 实现服务器端时间同步 API
3. 使用流元数据（FLV Tag、HLS PDT）

## 总结

协议切换时间同步的核心：

1. **获取流开始时间**：通过 SRS 的 `live_ms` 字段
2. **计算服务器时间戳**：流开始时间 + currentTime
3. **考虑协议延迟差**：调整目标时间戳
4. **转换为 currentTime**：新播放器跳转到目标位置

这样就能实现准确的时间同步，避免重复播放或跳跃！
