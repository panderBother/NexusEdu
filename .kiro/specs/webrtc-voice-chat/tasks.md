# Implementation Plan: WebRTC 连麦功能

## Overview

本实现计划将 WebRTC 连麦功能分解为一系列增量式的开发任务。实现策略采用自底向上的方式：首先构建核心基础设施（信令、WebRTC 服务扩展），然后实现业务逻辑（连麦管理器），最后构建 UI 组件。每个任务都包含相应的测试，确保功能正确性。

实现顺序：
1. 基础设施层（信令客户端、WebRTC 服务扩展）
2. 状态管理层（Pinia store）
3. 业务逻辑层（连麦管理器、连接管理器）
4. UI 组件层（控制面板、参与者网格）
5. 集成与优化

## Tasks

- [x] 1. 项目结构和类型定义
  - 创建目录结构：`src/features/voice-chat/`
  - 定义 TypeScript 接口和类型
  - 配置 fast-check 测试库
  - _Requirements: 所有需求的基础_

- [x] 2. 实现信令客户端（SignalingClient）
  - [x] 2.1 创建 SignalingClient 基础类
    - 实现 WebSocket 连接管理
    - 实现消息发送和接收
    - 实现事件发射器模式
    - _Requirements: 12.1, 12.2_
  
  - [ ]* 2.2 编写 SignalingClient 属性测试
    - **Property 42: Signaling Message Support**
    - **Validates: Requirements 12.1**
  
  - [x] 2.3 实现 HTTP 轮询降级机制
    - 检测 WebSocket 可用性
    - 实现 HTTP 轮询逻辑
    - 实现自动切换
    - _Requirements: 12.3, 12.4_
  
  - [ ]* 2.4 编写降级机制属性测试
    - **Property 44: WebSocket Fallback**
    - **Validates: Requirements 12.4**
  
  - [x] 2.5 实现消息认证和重试机制
    - 添加消息认证逻辑
    - 实现消息重试（最多 3 次）
    - 实现消息排序保证
    - _Requirements: 12.5, 12.6, 12.7_
  
  - [ ]* 2.6 编写认证和重试属性测试
    - **Property 45: Message Authentication**
    - **Property 46: Message Ordering**
    - **Property 47: Message Delivery Retry**
    - **Validates: Requirements 12.5, 12.6, 12.7**

- [x] 3. 扩展 WebRTC Service
  - [x] 3.1 扩展现有 WebRTCService 类
    - 添加 createPeerConnection 方法
    - 添加 SDP offer/answer 处理方法
    - 添加 ICE 候选处理方法
    - 保持向后兼容性
    - _Requirements: 11.1, 11.2, 1.1_
  
  - [ ]* 3.2 编写向后兼容性测试
    - **Property 40: Backward Compatibility**
    - **Validates: Requirements 11.2**
  
  - [x] 3.3 实现本地媒体流获取
    - 实现 getLocalMediaStream 方法
    - 配置音频处理（AEC, NS, AGC）
    - 处理权限拒绝
    - _Requirements: 5.1, 5.3, 6.1, 6.2, 6.3_
  
  - [ ]* 3.4 编写音频处理配置测试
    - **Property 18: Audio Processing Configuration**
    - **Validates: Requirements 6.1, 6.2, 6.3**
  
  - [x] 3.5 实现连接统计监控
    - 实现 getConnectionStats 方法
    - 每 2 秒收集统计数据
    - 计算网络质量指标
    - _Requirements: 9.3_
  
  - [ ]* 3.6 编写统计监控属性测试
    - **Property 32: Network Statistics Monitoring**
    - **Validates: Requirements 9.3**

- [x] 4. 实现 PeerConnectionManager
  - [x] 4.1 创建 PeerConnectionManager 类
    - 管理多个 RTCPeerConnection 实例
    - 实现连接创建、获取、移除
    - 实现连接状态监控
    - _Requirements: 1.4, 3.3_
  
  - [ ]* 4.2 编写连接管理属性测试
    - **Property 3: Simultaneous Publish and Subscribe**
    - **Property 10: Participant List Consistency**
    - **Validates: Requirements 1.4, 3.3, 3.4**
  
  - [x] 4.3 实现网络质量监控
    - 监控 packet loss, jitter, RTT
    - 计算网络质量等级
    - 触发质量变化事件
    - _Requirements: 3.6, 9.3_
  
  - [ ]* 4.4 编写网络质量属性测试
    - **Property 23: Network Quality Warning**
    - **Validates: Requirements 7.5**

- [x] 5. Checkpoint - 基础设施层验证
  - 确保所有测试通过
  - 验证信令客户端和 WebRTC 服务正常工作
  - 如有问题请询问用户

- [x] 6. 实现 Pinia State Store
  - [x] 6.1 创建 useVoiceChatStore
    - 定义状态结构
    - 实现基本的 getters 和 actions
    - _Requirements: 3.1, 3.2_
  
  - [ ]* 6.2 编写状态原子性测试
    - **Property 9: State Atomicity**
    - **Validates: Requirements 3.2**
  
  - [x] 6.3 实现参与者列表管理
    - 实现 addParticipant, removeParticipant
    - 实现 updateParticipant
    - 确保列表一致性
    - _Requirements: 3.3, 3.4_
  
  - [ ]* 6.4 编写参与者列表属性测试
    - **Property 10: Participant List Consistency**
    - **Validates: Requirements 3.3, 3.4**
  
  - [x] 6.5 实现音视频状态跟踪
    - 跟踪每个参与者的音视频状态
    - 实现状态更新（100ms 内）
    - _Requirements: 3.5, 5.6_
  
  - [ ]* 6.6 编写状态跟踪属性测试
    - **Property 11: Audio/Video Status Tracking**
    - **Validates: Requirements 3.5, 5.6**
  
  - [x] 6.7 实现状态持久化
    - 实现 persist 和 restore 方法
    - 持久化关键状态到 localStorage
    - _Requirements: 3.7_
  
  - [ ]* 6.8 编写状态持久化属性测试
    - **Property 12: State Persistence Round Trip**
    - **Validates: Requirements 3.7**
  
  - [x] 6.9 实现请求队列管理
    - 实现 addJoinRequest, removeJoinRequest
    - 实现请求状态更新
    - 实现请求超时（30 秒）
    - _Requirements: 4.2, 4.5_
  
  - [ ]* 6.10 编写请求队列属性测试
    - **Property 13: Request Timeout**
    - **Property 15: Request Queue Cleanup**
    - **Validates: Requirements 4.5, 4.7**

- [x] 7. 实现 VoiceChatManager
  - [x] 7.1 创建 VoiceChatManager 基础类
    - 实现 initialize 方法
    - 集成 SignalingClient 和 WebRTCService
    - 集成 PeerConnectionManager
    - _Requirements: 1.1, 2.1_
  
  - [x] 7.2 实现连麦申请流程（观众端）
    - 实现 requestJoin 方法
    - 发送连麦请求到主播
    - 防止重复请求
    - _Requirements: 2.1, 4.1, 4.6_
  
  - [ ]* 7.3 编写连麦申请属性测试
    - **Property 4: Join Request Delivery**
    - **Property 14: Duplicate Request Prevention**
    - **Validates: Requirements 2.1, 2.2, 4.6**
  
  - [x] 7.4 实现连麦接受流程（主播端）
    - 实现 acceptRequest 方法
    - 创建 SDP offer
    - 发送 offer 到观众
    - 处理 answer
    - 交换 ICE 候选
    - _Requirements: 2.3, 2.4, 4.3_
  
  - [ ]* 7.5 编写连麦接受属性测试
    - **Property 5: Request Acceptance Flow**
    - **Property 8: ICE Candidate Timing**
    - **Validates: Requirements 2.3, 2.4, 2.8**
  
  - [x] 7.6 实现连麦拒绝流程
    - 实现 rejectRequest 方法
    - 通知请求者
    - 清理请求队列
    - _Requirements: 2.5, 4.4_
  
  - [ ]* 7.7 编写连麦拒绝属性测试
    - **Property 6: Request Rejection Flow**
    - **Validates: Requirements 2.5, 4.4**
  
  - [x] 7.8 实现挂断流程
    - 实现 hangup 方法
    - 发送挂断信号
    - 关闭 WebRTC 连接
    - 清理资源
    - _Requirements: 2.6, 10.1_
  
  - [ ]* 7.9 编写挂断流程属性测试
    - **Property 7: Disconnection Cleanup**
    - **Validates: Requirements 2.6, 10.1**

- [x] 8. Checkpoint - 业务逻辑层验证
  - 确保所有测试通过
  - 验证完整的连麦流程
  - 如有问题请询问用户

- [x] 9. 实现音视频控制
  - [x] 9.1 实现音视频开关控制
    - 实现 toggleAudio 方法
    - 实现 toggleVideo 方法
    - 独立控制音视频轨道
    - 通知其他参与者
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  
  - [ ]* 9.2 编写音视频控制属性测试
    - **Property 16: Media Track Control**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**
  
  - [x] 9.3 实现远程静音控制（主播端）
    - 实现 remoteMute 方法
    - 发送静音指令
    - 更新参与者状态
    - _Requirements: 10.6_
  
  - [ ]* 9.4 编写远程控制属性测试
    - **Property 38: Remote Mute Control**
    - **Validates: Requirements 10.6**

- [x] 10. 实现 SRS API 集成
  - [x] 10.1 创建 SRSApiClient 类
    - 实现 publish 方法
    - 实现 play 方法
    - 实现 unpublish 和 stop 方法
    - 配置 API 端点：http://101.35.16.42:1985
    - _Requirements: 1.1, 1.2, 1.3, 1.6_
  
  - [ ]* 10.2 编写 SRS API 集成测试
    - **Property 1: WebRTC Connection Establishment**
    - **Property 2: Stream Subscription**
    - **Validates: Requirements 1.1, 1.2, 1.3**
  
  - [x] 10.3 实现 SRS 错误处理
    - 处理服务器不可达
    - 处理 API 错误响应
    - 实现重试逻辑
    - _Requirements: 8.6_
  
  - [ ]* 10.4 编写 SRS 错误处理测试
    - **Property 28: Server Unreachable Handling**
    - **Validates: Requirements 8.6**

- [x] 11. 实现错误处理和恢复
  - [x] 11.1 创建 ErrorHandler 类
    - 实现错误分类
    - 实现错误日志记录
    - 实现用户通知
    - _Requirements: 8.1, 8.2_
  
  - [ ]* 11.2 编写错误日志属性测试
    - **Property 27: Error Logging**
    - **Validates: Requirements 6.5, 8.5**
  
  - [x] 11.3 实现连接重试机制
    - 实现指数退避算法
    - 最多重试 3 次
    - 10 秒超时
    - _Requirements: 8.1, 8.2_
  
  - [ ]* 11.4 编写连接重试属性测试
    - **Property 24: Connection Retry Logic**
    - **Property 25: Retry Exhaustion Notification**
    - **Validates: Requirements 8.1, 8.2**
  
  - [x] 11.5 实现网络中断恢复
    - 检测网络中断
    - 自动重连
    - 通知受影响的参与者
    - _Requirements: 8.3, 8.7_
  
  - [ ]* 11.6 编写网络恢复属性测试
    - **Property 26: Network Interruption Recovery**
    - **Property 29: Connection Loss Notification**
    - **Validates: Requirements 8.3, 8.7**
  
  - [x] 11.7 实现权限拒绝处理
    - 检测权限拒绝
    - 显示清晰的错误消息
    - 提供重试机制
    - _Requirements: 5.7, 8.4_
  
  - [ ]* 11.8 编写权限处理属性测试
    - **Property 17: Permission Denial Handling**
    - **Validates: Requirements 5.7, 8.4**
  
  - [x] 11.9 实现控制操作失败处理
    - 捕获操作失败
    - 保持之前的状态
    - 显示错误消息
    - _Requirements: 10.7_
  
  - [ ]* 11.10 编写操作失败属性测试
    - **Property 39: Control Operation Failure Handling**
    - **Validates: Requirements 10.7**

- [x] 12. 实现性能优化
  - [x] 12.1 实现自适应视频分辨率
    - 监控带宽
    - 根据带宽调整分辨率
    - 带宽 < 500kbps 时降低分辨率
    - _Requirements: 9.1_
  
  - [ ]* 12.2 编写自适应分辨率属性测试
    - **Property 30: Adaptive Video Resolution**
    - **Validates: Requirements 9.1**
  
  - [x] 12.3 实现音频优先策略
    - 网络质量下降时优先保证音频
    - 先降低视频码率
    - _Requirements: 9.2_
  
  - [ ]* 12.4 编写音频优先属性测试
    - **Property 31: Audio Priority**
    - **Validates: Requirements 9.2**
  
  - [x] 12.5 实现动态码率调整
    - 监控丢包率
    - 丢包 > 10% 时降低码率 25%
    - 网络改善时逐步提高码率
    - _Requirements: 9.4, 9.5_
  
  - [ ]* 12.6 编写码率调整属性测试
    - **Property 33: Bitrate Adjustment**
    - **Property 34: Quality Recovery**
    - **Validates: Requirements 9.4, 9.5**
  
  - [x] 12.7 实现连接数限制
    - 限制最多 6 人同时连麦
    - 拒绝第 7 人的连接请求
    - 显示友好的错误消息
    - _Requirements: 7.7, 9.6_
  
  - [ ]* 12.8 编写连接限制属性测试
    - **Property 19: Connection Limit Enforcement**
    - **Validates: Requirements 7.7, 9.6**

- [x] 13. Checkpoint - 核心功能完成
  - 确保所有测试通过
  - 验证错误处理和性能优化
  - 如有问题请询问用户

- [x] 14. 实现 UI 组件 - 控制面板
  - [x] 14.1 创建 VoiceChatPanel 组件
    - 显示连麦状态
    - 显示参与者数量
    - 提供连麦/挂断按钮
    - _Requirements: 4.1, 10.1_
  
  - [x] 14.2 创建控制按钮组件
    - 静音/取消静音按钮
    - 摄像头开关按钮
    - 挂断按钮
    - 确保 100ms 内响应
    - _Requirements: 10.3, 10.4_
  
  - [ ]* 14.3 编写控制响应性测试
    - **Property 36: Control Responsiveness**
    - **Validates: Requirements 10.3, 10.4**
  
  - [x] 14.4 创建连麦请求列表（主播端）
    - 显示待处理的请求
    - 提供接受/拒绝按钮
    - 显示请求者信息
    - _Requirements: 4.2_
  
  - [ ]* 14.5 编写请求列表单元测试
    - 测试请求显示
    - 测试接受/拒绝交互

- [x] 15. 实现 UI 组件 - 参与者网格
  - [x] 15.1 创建 ParticipantGrid 组件
    - 实现网格布局
    - 根据参与者数量自适应（1-6 人）
    - _Requirements: 7.1, 7.2_
  
  - [ ]* 15.2 编写布局自适应属性测试
    - **Property 20: UI Participant Display**
    - **Property 21: Layout Adaptation**
    - **Validates: Requirements 7.1, 7.2, 7.4, 7.6**
  
  - [x] 15.3 创建 ParticipantCard 组件
    - 显示视频流
    - 显示参与者名称
    - 显示音视频状态图标
    - 显示网络质量指示器
    - _Requirements: 7.4, 7.5, 7.6_
  
  - [ ]* 15.4 编写参与者卡片单元测试
    - 测试状态图标显示
    - 测试网络质量警告
  
  - [x] 15.5 实现活跃说话者高亮
    - 检测音频活动
    - 高亮当前说话者的视频框
    - _Requirements: 7.3_
  
  - [ ]* 15.6 编写说话者高亮属性测试
    - **Property 22: Active Speaker Highlighting**
    - **Validates: Requirements 7.3**

- [x] 16. 实现主播端特殊功能
  - [x] 16.1 实现主播结束会话功能
    - 添加"结束连麦"按钮
    - 断开所有参与者
    - 清理所有连接
    - _Requirements: 10.2_
  
  - [ ]* 16.2 编写会话终止属性测试
    - **Property 35: Host Session Termination**
    - **Validates: Requirements 10.2**
  
  - [x] 16.3 实现主播强制断开功能
    - 添加"移除参与者"按钮
    - 发送断开通知（包含原因）
    - 更新参与者列表
    - _Requirements: 10.5_
  
  - [ ]* 16.4 编写强制断开属性测试
    - **Property 37: Forced Disconnection Notification**
    - **Validates: Requirements 10.5**

- [x] 17. 集成和连接所有组件
  - [x] 17.1 在主应用中集成 VoiceChatManager
    - 初始化 VoiceChatManager
    - 连接到 Pinia store
    - 设置事件监听器
    - _Requirements: 所有需求_
  
  - [x] 17.2 连接 UI 组件到状态管理
    - 绑定 UI 组件到 store
    - 实现响应式更新
    - 处理用户交互
    - _Requirements: 3.1, 3.2_
  
  - [ ]* 17.3 编写状态事件属性测试
    - **Property 41: Connection State Events**
    - **Validates: Requirements 11.6**
  
  - [x] 17.4 实现完整的连麦流程
    - 观众申请 → 主播接受 → 建立连接 → 音视频通信 → 挂断
    - 确保所有步骤正确执行
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.6_
  
  - [ ]* 17.5 编写端到端集成测试
    - 测试完整连麦流程
    - 测试多人连麦场景
    - 测试错误恢复流程

- [x] 18. Checkpoint - 集成验证
  - 确保所有测试通过
  - 手动测试完整流程
  - 如有问题请询问用户

- [ ] 19. 性能测试和优化
  - [x] 19.1 进行性能基准测试
    - 测试不同参与者数量下的性能
    - 测试不同网络条件下的表现
    - 记录性能指标
  
  - [x] 19.2 优化渲染性能
    - 使用 Vue 3 的性能优化技巧
    - 避免不必要的重渲染
    - 优化视频元素渲染
  
  - [x] 19.3 优化内存使用
    - 确保正确清理 MediaStream
    - 避免内存泄漏
    - 监控内存使用

- [ ] 20. 文档和示例
  - [x] 20.1 编写 API 文档
    - 文档化所有公共接口
    - 提供使用示例
    - 说明配置选项
  
  - [x] 20.2 创建使用示例
    - 创建简单的演示页面
    - 展示基本用法
    - 展示高级功能
  
  - [x] 20.3 编写故障排除指南
    - 常见问题和解决方案
    - 调试技巧
    - 性能优化建议

- [x] 21. Final Checkpoint - 完成验证
  - 运行所有测试套件
  - 验证所有需求已实现
  - 确认代码质量和覆盖率
  - 准备交付

## Notes

- 标记 `*` 的任务是可选的测试任务，可以跳过以加快 MVP 开发
- 每个任务都引用了具体的需求编号，确保可追溯性
- Checkpoint 任务确保增量验证
- 属性测试验证通用正确性属性
- 单元测试验证特定示例和边缘情况
- 建议按顺序执行任务，因为后续任务依赖前面的实现
- 使用 fast-check 进行属性测试，每个测试至少运行 100 次迭代
- 所有属性测试都应该标注对应的设计文档属性编号
