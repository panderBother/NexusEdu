# 需求文档

## 简介

多协议自适应拉流系统是一个智能的视频流播放解决方案，能够根据用户的网络状态在 WebRTC、FLV 和 HLS 三种流媒体协议之间自动切换，确保在各种网络环境下都能提供最佳的播放体验。系统优先使用低延迟协议，在网络质量下降时自动降级到更稳定的协议，并在网络恢复时自动升级，整个切换过程对用户透明且无缝。

## 术语表

- **System**: 多协议自适应拉流系统
- **Network_Monitor**: 网络状态监测模块
- **Protocol_Switcher**: 协议切换控制器
- **Player_Manager**: 播放器管理器
- **WebRTC_Player**: WebRTC 协议播放器
- **FLV_Player**: FLV 协议播放器（基于 xgplayer-flv）
- **HLS_Player**: HLS 协议播放器（基于 hls.js）
- **Network_Quality**: 网络质量等级（Good/Fair/Poor）
- **Protocol**: 流媒体协议（WebRTC/FLV/HLS）
- **Stream_URL**: 流媒体地址
- **Seamless_Switch**: 无缝切换（切换过程中保持播放连续性）
- **RTT**: 往返时延（Round-Trip Time）
- **Packet_Loss**: 丢包率
- **Bandwidth**: 带宽

## 需求

### 需求 1：网络状态监测

**用户故事：** 作为系统，我需要实时监测用户的网络质量，以便为协议切换提供决策依据。

#### 验收标准

1. WHEN THE System 启动时，THE Network_Monitor SHALL 开始监测网络状态
2. THE Network_Monitor SHALL 每隔 2 秒采集一次网络指标（RTT、Packet_Loss、Bandwidth）
3. WHEN 网络指标采集完成时，THE Network_Monitor SHALL 计算 Network_Quality 等级
4. THE Network_Monitor SHALL 将 Network_Quality 分类为 Good、Fair 或 Poor
5. WHEN RTT < 100ms 且 Packet_Loss < 1% 且 Bandwidth > 2Mbps 时，THE Network_Monitor SHALL 判定 Network_Quality 为 Good
6. WHEN RTT 在 100-300ms 之间或 Packet_Loss 在 1-5% 之间或 Bandwidth 在 1-2Mbps 之间时，THE Network_Monitor SHALL 判定 Network_Quality 为 Fair
7. WHEN RTT > 300ms 或 Packet_Loss > 5% 或 Bandwidth < 1Mbps 时，THE Network_Monitor SHALL 判定 Network_Quality 为 Poor
8. WHEN Network_Quality 发生变化时，THE Network_Monitor SHALL 通知 Protocol_Switcher

### 需求 2：协议优先级管理

**用户故事：** 作为系统，我需要根据协议特性定义优先级，以便在不同网络条件下选择最合适的协议。

#### 验收标准

1. THE System SHALL 定义 WebRTC 为最高优先级协议（优先级 1）
2. THE System SHALL 定义 FLV 为中等优先级协议（优先级 2）
3. THE System SHALL 定义 HLS 为最低优先级协议（优先级 3）
4. THE System SHALL 为每个 Protocol 关联对应的 Stream_URL 格式
5. WHEN 请求 WebRTC 流时，THE System SHALL 使用 webrtc:// 协议的 Stream_URL
6. WHEN 请求 FLV 流时，THE System SHALL 使用 http:// 或 https:// 协议的 .flv 格式 Stream_URL
7. WHEN 请求 HLS 流时，THE System SHALL 使用 http:// 或 https:// 协议的 .m3u8 格式 Stream_URL

### 需求 3：自动协议切换

**用户故事：** 作为用户，我希望系统能够根据网络状况自动切换协议，以便在不同网络环境下都能获得最佳播放体验。

#### 验收标准

1. WHEN Network_Quality 为 Good 且当前 Protocol 不是 WebRTC 时，THE Protocol_Switcher SHALL 切换到 WebRTC
2. WHEN Network_Quality 为 Fair 且当前 Protocol 不是 FLV 时，THE Protocol_Switcher SHALL 切换到 FLV
3. WHEN Network_Quality 为 Poor 且当前 Protocol 不是 HLS 时，THE Protocol_Switcher SHALL 切换到 HLS
4. WHEN Network_Quality 连续 3 次采样保持稳定时，THE Protocol_Switcher SHALL 执行协议切换
5. WHEN 协议切换被触发时，THE Protocol_Switcher SHALL 通知 Player_Manager 执行切换
6. WHEN 协议切换失败时，THE Protocol_Switcher SHALL 尝试切换到下一个优先级的 Protocol
7. WHEN 所有 Protocol 都切换失败时，THE Protocol_Switcher SHALL 保持当前 Protocol 并记录错误

### 需求 4：无缝播放切换

**用户故事：** 作为用户，我希望协议切换过程中播放不中断，以便获得流畅的观看体验。

#### 验收标准

1. WHEN 协议切换开始时，THE Player_Manager SHALL 保持当前播放器继续播放
2. WHEN 新协议播放器准备就绪时，THE Player_Manager SHALL 记录当前播放时间戳
3. WHEN 新协议播放器开始播放时，THE Player_Manager SHALL 尝试从记录的时间戳继续播放
4. WHEN 新协议播放器播放稳定后，THE Player_Manager SHALL 销毁旧协议播放器
5. WHEN 新协议播放器初始化失败时，THE Player_Manager SHALL 保持旧协议播放器继续运行
6. THE Player_Manager SHALL 在切换过程中避免出现黑屏或播放中断
7. WHEN 切换完成时，THE Player_Manager SHALL 触发切换完成事件

### 需求 5：手动协议控制

**用户故事：** 作为用户，我希望能够手动选择播放协议，以便在特殊情况下覆盖自动切换逻辑。

#### 验收标准

1. THE System SHALL 提供手动选择 Protocol 的接口
2. WHEN 用户手动选择 Protocol 时，THE System SHALL 立即切换到指定的 Protocol
3. WHEN 手动模式启用时，THE Protocol_Switcher SHALL 停止自动切换
4. WHEN 用户取消手动模式时，THE Protocol_Switcher SHALL 恢复自动切换
5. THE System SHALL 记录当前是否处于手动模式
6. WHEN 手动切换到的 Protocol 不可用时，THE System SHALL 通知用户并保持当前 Protocol

### 需求 6：播放器生命周期管理

**用户故事：** 作为系统，我需要正确管理各个协议播放器的生命周期，以便避免资源泄漏和冲突。

#### 验收标准

1. WHEN 初始化播放时，THE Player_Manager SHALL 根据初始 Network_Quality 创建对应的播放器
2. THE Player_Manager SHALL 确保同一时间只有一个播放器处于活动状态
3. WHEN 创建新播放器时，THE Player_Manager SHALL 初始化对应的播放器实例（WebRTC_Player、FLV_Player 或 HLS_Player）
4. WHEN 销毁播放器时，THE Player_Manager SHALL 释放播放器占用的所有资源
5. WHEN 销毁播放器时，THE Player_Manager SHALL 移除所有事件监听器
6. WHEN 销毁播放器时，THE Player_Manager SHALL 清理 DOM 元素
7. THE Player_Manager SHALL 在组件卸载时销毁所有播放器实例

### 需求 7：错误处理与降级

**用户故事：** 作为系统，我需要妥善处理各种错误情况，以便在异常情况下仍能提供服务。

#### 验收标准

1. WHEN 播放器初始化失败时，THE System SHALL 尝试使用下一个优先级的 Protocol
2. WHEN 播放过程中发生错误时，THE System SHALL 记录错误信息
3. WHEN 播放错误可恢复时，THE System SHALL 尝试重新连接当前 Protocol
4. WHEN 播放错误不可恢复时，THE System SHALL 切换到下一个优先级的 Protocol
5. WHEN Network_Monitor 获取网络信息失败时，THE System SHALL 使用默认的 Network_Quality 值（Fair）
6. WHEN Stream_URL 不可用时，THE System SHALL 通知用户并停止播放
7. THE System SHALL 为所有错误情况提供清晰的错误消息

### 需求 8：状态管理与通知

**用户故事：** 作为开发者，我需要访问系统的当前状态和接收状态变化通知，以便在 UI 中展示相关信息。

#### 验收标准

1. THE System SHALL 维护当前使用的 Protocol 状态
2. THE System SHALL 维护当前的 Network_Quality 状态
3. THE System SHALL 维护是否处于手动模式的状态
4. THE System SHALL 维护播放器的播放状态（playing/paused/loading/error）
5. WHEN Protocol 发生变化时，THE System SHALL 触发协议变化事件
6. WHEN Network_Quality 发生变化时，THE System SHALL 触发网络质量变化事件
7. WHEN 播放状态发生变化时，THE System SHALL 触发播放状态变化事件
8. THE System SHALL 提供查询当前状态的接口

### 需求 9：性能优化

**用户故事：** 作为系统，我需要优化资源使用和性能，以便减少对用户设备的影响。

#### 验收标准

1. THE Network_Monitor SHALL 在播放器暂停时降低监测频率到每 10 秒一次
2. THE Network_Monitor SHALL 在播放器停止时停止网络监测
3. THE Player_Manager SHALL 在切换协议时复用 DOM 容器元素
4. THE System SHALL 限制协议切换频率为最多每 10 秒一次
5. WHEN 短时间内 Network_Quality 频繁波动时，THE System SHALL 使用平滑算法避免频繁切换
6. THE System SHALL 在播放器空闲时释放不必要的内存资源

### 需求 10：配置与扩展性

**用户故事：** 作为开发者，我希望系统提供灵活的配置选项，以便根据不同场景调整系统行为。

#### 验收标准

1. THE System SHALL 允许配置网络质量判定的阈值（RTT、Packet_Loss、Bandwidth）
2. THE System SHALL 允许配置网络监测的采样间隔
3. THE System SHALL 允许配置协议切换的稳定性要求（连续采样次数）
4. THE System SHALL 允许配置协议切换的最小间隔时间
5. THE System SHALL 允许配置是否启用自动切换功能
6. THE System SHALL 允许配置各协议的 Stream_URL 模板
7. THE System SHALL 提供扩展接口以支持未来添加新的流媒体协议
