# WebRTC 语音连麦功能

基于 SRS-SFU 架构的 WebRTC 连麦功能实现。

## 功能特性

- ✅ 支持主播与观众实时音视频互动
- ✅ 支持多人连麦（最多 6 人）
- ✅ 完整的信令交互流程
- ✅ 连麦申请与审批机制
- ✅ 音视频流独立控制
- ✅ 音频优化处理（AEC、NS、AGC）
- ✅ 自适应码率和分辨率
- ✅ 网络质量监控
- ✅ 错误处理和自动重连
- ✅ 响应式 UI 组件

## 架构设计

### 分层架构

```
┌─────────────────────────────────────┐
│         UI Components Layer         │
│  VoiceChatPanel, ParticipantGrid   │
└─────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────┐
│      State Management Layer         │
│        Pinia Store (Vuex)          │
└─────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────┐
│      Business Logic Layer           │
│       VoiceChatManager             │
└─────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────┐
│         WebRTC Layer                │
│  PeerConnectionManager, WebRTC API │
└─────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────┐
│        Signaling Layer              │
│      SignalingClient (WS)          │
└─────────────────────────────────────┘
```

## 快速开始

### 1. 基本使用

```typescript
import { VoiceChatManager } from '@/features/voice-chat'

// 创建管理器实例
const manager = new VoiceChatManager()

// 初始化（主播或观众）
await manager.initialize('user_123', 'host') // 或 'audience'

// 连接信令服务器
await manager.connectSignaling('ws://your-signaling-server', 'token')

// 获取本地媒体流
const stream = await manager.getLocalStream()
```

### 2. 观众申请连麦

```typescript
// 观众端
await manager.requestJoin()
```

### 3. 主播接受/拒绝连麦

```typescript
// 主播端
await manager.acceptRequest(requestId)
// 或
await manager.rejectRequest(requestId)
```

### 4. 控制音视频

```typescript
// 静音/取消静音
await manager.toggleAudio(false) // 静音
await manager.toggleAudio(true)  // 取消静音

// 关闭/开启摄像头
await manager.toggleVideo(false)
await manager.toggleVideo(true)
```

### 5. 挂断连麦

```typescript
await manager.hangup()
```

## 组件使用

### VoiceChatPanel

连麦控制面板，显示连接状态、参与者数量、控制按钮等。

```vue
<template>
  <VoiceChatPanel :manager="voiceChatManager" />
</template>

<script setup>
import { VoiceChatPanel } from '@/features/voice-chat'
import { ref } from 'vue'

const voiceChatManager = ref(new VoiceChatManager())
</script>
```

### ParticipantGrid

参与者视频网格，自动适应 1-6 人布局。

```vue
<template>
  <ParticipantGrid
    :participants="store.participantList"
    :remote-streams="store.remoteStreams"
  />
</template>

<script setup>
import { ParticipantGrid, useVoiceChatStore } from '@/features/voice-chat'

const store = useVoiceChatStore()
</script>
```

### MediaControls

音视频控制按钮组件。

```vue
<template>
  <MediaControls
    :manager="voiceChatManager"
    @audio-toggle="handleAudioToggle"
    @video-toggle="handleVideoToggle"
    @hangup="handleHangup"
  />
</template>
```

## 状态管理

使用 Pinia Store 管理连麦状态：

```typescript
import { useVoiceChatStore } from '@/features/voice-chat'

const store = useVoiceChatStore()

// 访问状态
console.log(store.connectionState)
console.log(store.participantList)
console.log(store.isConnected)

// 更新状态
store.updateConnectionState('connected')
store.addParticipant(participant)
```

## 事件监听

```typescript
// 监听连麦请求
manager.on('request-received', (request) => {
  console.log('收到连麦请求:', request)
})

// 监听参与者加入
manager.on('participant-joined', (participant) => {
  console.log('参与者加入:', participant)
})

// 监听连接状态变化
manager.on('connection-state-changed', ({ participantId, state }) => {
  console.log(`${participantId} 连接状态:`, state)
})

// 监听网络质量变化
manager.on('network-quality-changed', ({ participantId, quality }) => {
  console.log(`${participantId} 网络质量:`, quality)
})

// 监听错误
manager.on('error', (error) => {
  console.error('错误:', error)
})
```

## 配置选项

### WebRTC 配置

```typescript
const config = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' }
  ],
  iceTransportPolicy: 'all',
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require'
}
```

### 媒体约束

```typescript
const constraints = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 48000,
    channelCount: 1
  },
  video: {
    width: { ideal: 640 },
    height: { ideal: 480 },
    frameRate: { ideal: 24 }
  }
}
```

## 性能优化

### 自适应码率

系统会根据网络状况自动调整视频码率：

- 丢包率 > 10%：降低码率 25%
- 丢包率 < 5%：逐步提高码率

### 自适应分辨率

带宽不足时自动降低视频分辨率：

- < 300 kbps: 320x240 @ 15fps
- < 500 kbps: 480x360 @ 20fps
- >= 500 kbps: 640x480 @ 24fps

### 音频优先

网络质量下降时优先保证音频质量，降低视频码率。

## 错误处理

### 连接失败重试

自动重试最多 3 次，使用指数退避算法：

```typescript
import { withRetry } from '@/features/voice-chat'

await withRetry(
  async () => {
    // 你的操作
  },
  {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2
  }
)
```

### 权限拒绝处理

```typescript
try {
  const stream = await manager.getLocalStream()
} catch (error) {
  if (error.name === 'NotAllowedError') {
    // 显示权限说明
    alert('请允许访问麦克风和摄像头')
  }
}
```

## 常量配置

```typescript
import {
  SRS_SERVER_URL,
  MAX_PARTICIPANTS,
  CONNECTION_TIMEOUT,
  REQUEST_TIMEOUT,
  ERROR_CODES,
  ERROR_MESSAGES
} from '@/features/voice-chat'

console.log('SRS 服务器:', SRS_SERVER_URL)
console.log('最大参与者数:', MAX_PARTICIPANTS)
```

## 类型定义

完整的 TypeScript 类型定义：

```typescript
import type {
  UserRole,
  ConnectionState,
  NetworkQuality,
  Participant,
  JoinRequest,
  VoiceChatEvent,
  SignalingEvent
} from '@/features/voice-chat'
```

## 演示页面

访问 `/voice-chat` 路由查看完整演示。

## 技术栈

- Vue 3 + TypeScript
- Pinia (状态管理)
- WebRTC API
- SRS 服务器 (SFU 模式)
- WebSocket (信令)

## 浏览器兼容性

- Chrome 74+
- Firefox 66+
- Safari 12.1+
- Edge 79+

## 注意事项

1. **HTTPS 要求**: WebRTC 需要在 HTTPS 环境下运行（localhost 除外）
2. **权限请求**: 首次使用需要用户授权麦克风和摄像头权限
3. **网络要求**: 建议带宽 >= 500 kbps
4. **连接限制**: 最多支持 6 人同时连麦
5. **信令服务器**: 需要配置可用的信令服务器地址

## 故障排除

### 连接失败

1. 检查网络连接
2. 确认 SRS 服务器可访问
3. 检查防火墙设置
4. 查看浏览器控制台错误

### 音视频无法显示

1. 检查设备权限
2. 确认设备可用
3. 检查浏览器兼容性
4. 查看 WebRTC 统计信息

### 网络质量差

1. 降低视频分辨率
2. 关闭视频只保留音频
3. 检查网络带宽
4. 减少参与者数量

## 开发计划

- [ ] 支持屏幕共享
- [ ] 支持录制功能
- [ ] 支持美颜滤镜
- [ ] 支持虚拟背景
- [ ] 支持更多音频效果

## License

MIT
