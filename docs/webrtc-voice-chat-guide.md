# WebRTC 语音连麦功能使用指南

## 概述

本项目实现了基于 SRS-SFU 架构的 WebRTC 语音连麦功能，支持主播与观众进行实时音视频互动。

## 功能特性

✅ **已完成的核心功能**：

1. **基础设施层**
   - ✅ WebRTCService 扩展（支持多 PeerConnection 管理）
   - ✅ SignalingClient（WebSocket 信令客户端）
   - ✅ PeerConnectionManager（连接管理器）
   - ✅ SRSApiClient（SRS API 集成）

2. **业务逻辑层**
   - ✅ VoiceChatManager（连麦管理器）
   - ✅ ErrorHandler（错误处理和恢复）
   - ✅ PerformanceOptimizer（性能优化）

3. **状态管理层**
   - ✅ Pinia Store（集中式状态管理）
   - ✅ 参与者列表管理
   - ✅ 连麦请求队列
   - ✅ 状态持久化

4. **UI 组件层**
   - ✅ VoiceChatPanel（控制面板）
   - ✅ MediaControls（音视频控制）
   - ✅ ParticipantGrid（参与者网格）
   - ✅ ParticipantCard（参与者卡片）

5. **性能优化**
   - ✅ 自适应视频分辨率
   - ✅ 动态码率调整
   - ✅ 音频优先策略
   - ✅ 网络质量监控

## 快速开始

### 1. 访问演示页面

在浏览器中访问：`http://localhost:5173/#/voice-chat`

### 2. 选择角色

- **主播**：可以接受/拒绝连麦请求，管理所有参与者
- **观众**：可以申请连麦，与主播进行音视频互动

### 3. 初始化

1. 选择角色（主播或观众）
2. 点击"初始化"按钮
3. 允许浏览器访问麦克风和摄像头

### 4. 开始连麦

**观众端**：
1. 点击"申请连麦"按钮
2. 等待主播审批

**主播端**：
1. 在连麦请求列表中查看待处理的请求
2. 点击"接受"或"拒绝"按钮

### 5. 控制音视频

- 🎤 点击麦克风按钮：静音/取消静音
- 📹 点击摄像头按钮：关闭/开启摄像头
- 📞 点击挂断按钮：结束连麦

## 架构说明

### 目录结构

```
src/features/voice-chat/
├── components/          # UI 组件
│   ├── VoiceChatPanel.vue
│   ├── MediaControls.vue
│   ├── ParticipantGrid.vue
│   └── ParticipantCard.vue
├── services/           # 核心服务
│   ├── VoiceChatManager.ts
│   ├── SignalingClient.ts
│   ├── PeerConnectionManager.ts
│   ├── SRSApiClient.ts
│   ├── ErrorHandler.ts
│   └── PerformanceOptimizer.ts
├── stores/            # 状态管理
│   └── voiceChatStore.ts
├── types/             # 类型定义
│   └── index.ts
├── constants/         # 常量配置
│   └── index.ts
├── utils/            # 工具函数
│   └── index.ts
└── index.ts          # 导出入口
```

### 数据流

```
用户操作 → UI 组件 → VoiceChatManager → WebRTC/Signaling → SRS 服务器
                ↓
            Pinia Store
                ↓
            UI 更新
```

## 配置说明

### SRS 服务器

默认配置：`http://101.35.16.42:1985`

可在 `src/features/voice-chat/constants/index.ts` 中修改：

```typescript
export const SRS_SERVER_URL = 'http://your-srs-server:1985'
```

### 连接限制

最大参与者数：6 人

可在常量文件中修改：

```typescript
export const MAX_PARTICIPANTS = 6
```

### 超时配置

```typescript
export const CONNECTION_TIMEOUT = 10000    // 连接超时：10 秒
export const REQUEST_TIMEOUT = 30000       // 请求超时：30 秒
export const ICE_CANDIDATE_TIMEOUT = 5000  // ICE 候选超时：5 秒
```

## 技术实现

### WebRTC 连接流程

1. **初始化**
   - 创建 VoiceChatManager 实例
   - 连接信令服务器
   - 获取本地媒体流

2. **连麦申请**（观众端）
   - 发送连麦请求到主播
   - 等待主播审批

3. **接受连麦**（主播端）
   - 创建 PeerConnection
   - 生成 SDP Offer
   - 发送 Offer 到观众

4. **建立连接**（观众端）
   - 接收 Offer
   - 生成 SDP Answer
   - 发送 Answer 到主播
   - 交换 ICE 候选

5. **连接完成**
   - 开始音视频传输
   - 监控网络质量
   - 自适应调整码率

### 性能优化策略

1. **自适应码率**
   - 丢包率 > 10%：降低码率 25%
   - 丢包率 < 5%：逐步提高码率

2. **自适应分辨率**
   - 带宽 < 300 kbps：320x240 @ 15fps
   - 带宽 < 500 kbps：480x360 @ 20fps
   - 带宽 >= 500 kbps：640x480 @ 24fps

3. **音频优先**
   - 网络质量下降时优先保证音频
   - 降低视频码率，保持音频质量

### 错误处理

1. **连接失败重试**
   - 自动重试 3 次
   - 指数退避算法

2. **网络中断恢复**
   - 检测网络中断
   - 自动重新连接

3. **权限拒绝处理**
   - 显示友好的错误提示
   - 提供权限设置指引

## 注意事项

### 浏览器要求

- Chrome 74+
- Firefox 66+
- Safari 12.1+
- Edge 79+

### 网络要求

- 建议带宽 >= 500 kbps
- 需要稳定的网络连接
- 建议使用有线网络或 WiFi

### 安全要求

- 必须在 HTTPS 环境下运行（localhost 除外）
- 需要用户授权麦克风和摄像头权限

### 已知限制

1. **信令服务器**：当前使用模拟信令，需要配置真实的信令服务器
2. **最大参与者数**：限制为 6 人
3. **浏览器兼容性**：不支持 IE 浏览器

## 故障排除

### 问题：无法初始化

**可能原因**：
- 浏览器不支持 WebRTC
- 未授权麦克风/摄像头权限

**解决方案**：
1. 使用支持的浏览器
2. 在浏览器设置中允许权限
3. 检查设备是否正常工作

### 问题：连接失败

**可能原因**：
- 网络连接问题
- SRS 服务器不可达
- 防火墙阻止

**解决方案**：
1. 检查网络连接
2. 确认 SRS 服务器地址正确
3. 检查防火墙设置

### 问题：音视频卡顿

**可能原因**：
- 网络带宽不足
- CPU 占用过高
- 参与者过多

**解决方案**：
1. 降低视频分辨率
2. 关闭视频只保留音频
3. 减少参与者数量

## 开发计划

### 待实现功能

- [ ] 真实信令服务器集成
- [ ] 屏幕共享
- [ ] 录制功能
- [ ] 美颜滤镜
- [ ] 虚拟背景
- [ ] 聊天消息
- [ ] 举手功能

### 待优化项

- [ ] 完善单元测试
- [ ] 添加属性测试
- [ ] 性能基准测试
- [ ] E2E 测试

## 参考资料

- [WebRTC API 文档](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
- [SRS 文档](https://ossrs.net/)
- [Vue 3 文档](https://vuejs.org/)
- [Pinia 文档](https://pinia.vuejs.org/)

## 联系方式

如有问题或建议，请提交 Issue 或 Pull Request。
