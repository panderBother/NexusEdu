# 实现计划：多协议自适应拉流系统

## 概述

本实现计划将多协议自适应拉流系统分解为增量式的开发任务。实现顺序遵循从底层到上层、从核心到外围的原则，确保每个步骤都能独立验证。系统使用 TypeScript + Vue 3 + Pinia 技术栈，复用现有的 WebRTCService 类。

## 任务列表

- [x] 1. 创建核心类型定义和接口
  - 创建 `src/types/adaptive-stream.ts` 文件
  - 定义所有枚举类型（NetworkQuality, StreamProtocol）
  - 定义所有接口类型（NetworkMetrics, PlayerConfig, PlayerState 等）
  - 定义配置接口（NetworkMonitorConfig, ProtocolSwitcherConfig 等）
  - _需求：1.4, 2.1, 2.2, 2.3, 8.1, 8.2, 8.3, 8.4_

- [x] 2. 实现网络监测模块（NetworkMonitor）
  - [x] 2.1 创建 NetworkMonitor 类基础结构
    - 创建 `src/services/NetworkMonitor.ts` 文件
    - 实现构造函数和配置处理
    - 实现事件发射器（使用 mitt 或自定义 EventEmitter）
    - 实现 start/stop/pause/resume 方法框架
    - _需求：1.1, 9.1, 9.2_
  
  - [x] 2.2 实现网络指标采集
    - 实现 RTT 估算（使用 performance API 或 Image 加载测试）
    - 实现带宽估算（使用 navigator.connection API 或降级方案）
    - 实现丢包率估算（尝试使用 WebRTC getStats，降级为估算值）
    - 实现定时采样逻辑（setInterval）
    - _需求：1.2_
  
  - [x] 2.3 实现网络质量计算
    - 实现 calculateQuality 函数
    - 根据阈值判定 Good/Fair/Poor
    - 实现质量变化检测和事件触发
    - _需求：1.3, 1.4, 1.5, 1.6, 1.7, 1.8_
  
  - [ ]* 2.4 编写 NetworkMonitor 属性测试
    - **属性 1：网络质量计算正确性**
    - **验证：需求 1.4, 1.5, 1.6, 1.7**
  
  - [ ]* 2.5 编写 NetworkMonitor 属性测试
    - **属性 2：质量变化触发通知**
    - **验证：需求 1.8**
  
  - [ ]* 2.6 编写 NetworkMonitor 属性测试
    - **属性 18：采样频率自适应**
    - **验证：需求 9.1, 9.2**
  
  - [ ]* 2.7 编写 NetworkMonitor 单元测试
    - 测试边界值（RTT = 100ms, 300ms）
    - 测试 API 不可用时的降级方案
    - 测试采样间隔调整
    - _需求：1.2, 7.5, 9.1, 9.2_

- [x] 3. 实现流 URL 生成工具
  - [x] 3.1 创建 StreamUrlGenerator 类
    - 创建 `src/utils/StreamUrlGenerator.ts` 文件
    - 实现 generate 静态方法
    - 处理 srsHost 格式化（移除协议前缀和端口）
    - 生成三种协议的 URL
    - _需求：2.4, 2.5, 2.6, 2.7_
  
  - [ ]* 3.2 编写 URL 生成属性测试
    - **属性 4：流 URL 格式正确性**
    - **验证：需求 2.4, 2.5, 2.6, 2.7**
  
  - [ ]* 3.3 编写 URL 生成单元测试
    - 测试各种 srsHost 格式（带/不带协议、端口）
    - 测试特殊字符的 URL 编码
    - _需求：2.5, 2.6, 2.7_

- [x] 4. 实现协议切换决策器（ProtocolSwitcher）
  - [x] 4.1 创建 ProtocolSwitcher 类基础结构
    - 创建 `src/services/ProtocolSwitcher.ts` 文件
    - 实现构造函数和配置处理
    - 实现事件发射器
    - 维护质量历史队列（用于稳定性检查）
    - 维护上次切换时间戳（用于频率限制）
    - _需求：3.4, 9.4_
  
  - [x] 4.2 实现协议选择逻辑
    - 实现质量到协议的映射（Good→WebRTC, Fair→FLV, Poor→HLS）
    - 实现 setNetworkQuality 方法
    - 实现稳定性检查（连续 N 次相同质量）
    - 实现切换频率限制（最小间隔检查）
    - 触发 switch-required 事件
    - _需求：2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 3.5, 9.4, 9.5_
  
  - [x] 4.3 实现手动模式控制
    - 实现 setManualProtocol 方法
    - 实现 enableAutoSwitch/disableAutoSwitch 方法
    - 实现 isAutoSwitchEnabled 方法
    - 手动模式下禁用自动切换逻辑
    - _需求：5.1, 5.2, 5.3, 5.4, 5.5_
  
  - [ ]* 4.4 编写 ProtocolSwitcher 属性测试
    - **属性 3：协议优先级映射完整性**
    - **验证：需求 2.1, 2.2, 2.3, 3.1, 3.2, 3.3**
  
  - [ ]* 4.5 编写 ProtocolSwitcher 属性测试
    - **属性 5：稳定性检查防抖动**
    - **验证：需求 3.4, 9.5**
  
  - [ ]* 4.6 编写 ProtocolSwitcher 属性测试
    - **属性 6：协议切换频率限制**
    - **验证：需求 9.4**
  
  - [ ]* 4.7 编写 ProtocolSwitcher 属性测试
    - **属性 11：手动模式禁用自动切换**
    - **验证：需求 5.3**
  
  - [ ]* 4.8 编写 ProtocolSwitcher 属性测试
    - **属性 12：手动切换立即执行**
    - **验证：需求 5.2**
  
  - [ ]* 4.9 编写 ProtocolSwitcher 属性测试
    - **属性 13：自动模式恢复切换**
    - **验证：需求 5.4**
  
  - [ ]* 4.10 编写 ProtocolSwitcher 单元测试
    - 测试边界情况（恰好 3 次采样）
    - 测试切换间隔边界（恰好 10 秒）
    - 测试手动切换不受频率限制
    - _需求：3.4, 5.2, 9.4_

- [x] 5. 检查点 - 核心逻辑验证
  - 确保所有测试通过
  - 验证网络监测和协议切换逻辑正确
  - 如有问题请向用户询问

- [x] 6. 实现播放器基类和具体播放器
  - [x] 6.1 创建 BasePlayer 抽象类
    - 创建 `src/services/players/BasePlayer.ts` 文件
    - 定义抽象方法（initialize, load, play, pause, destroy）
    - 实现通用方法（getCurrentTime, seek）
    - _需求：6.3_
  
  - [x] 6.2 实现 WebRTCPlayer
    - 创建 `src/services/players/WebRTCPlayer.ts` 文件
    - 继承 BasePlayer
    - 复用现有的 WebRTCService 类
    - 实现 initialize 方法（创建 WebRTCService 实例）
    - 实现 load 方法（调用 playFromSRS）
    - 实现 play/pause 方法（控制 video 元素）
    - 实现 destroy 方法（调用 WebRTCService.stop）
    - _需求：6.3_
  
  - [x] 6.3 实现 FLVPlayer
    - 创建 `src/services/players/FLVPlayer.ts` 文件
    - 继承 BasePlayer
    - 复用现有的 WebRTCService 类（其中包含 FLV 播放逻辑）
    - 实现 initialize 方法（创建 WebRTCService 实例）
    - 实现 load 方法（调用 playFLVSRS）
    - 实现 play/pause 方法（控制 video 元素）
    - 实现 destroy 方法（调用 WebRTCService.stopFlv）
    - _需求：6.3_
  
  - [x] 6.4 实现 HLSPlayer
    - 创建 `src/services/players/HLSPlayer.ts` 文件
    - 继承 BasePlayer
    - 导入 hls.js 库
    - 实现 initialize 方法（创建 Hls 实例或检测原生支持）
    - 实现 load 方法（加载 HLS 流）
    - 实现 play/pause 方法（控制 video 元素）
    - 实现 destroy 方法（销毁 Hls 实例）
    - 处理 Safari 原生 HLS 支持的降级
    - _需求：6.3_
  
  - [ ]* 6.5 编写播放器属性测试
    - **属性 9：播放器类型正确性**
    - **验证：需求 6.1, 6.3**
  
  - [ ]* 6.6 编写播放器单元测试
    - 测试每个播放器的初始化
    - 测试加载失败的错误处理
    - 测试资源清理
    - _需求：6.3, 6.4, 6.5, 6.6, 7.1_

- [x] 7. 实现播放器管理器（PlayerManager）
  - [x] 7.1 创建 PlayerManager 类基础结构
    - 创建 `src/services/PlayerManager.ts` 文件
    - 实现构造函数（接收 PlayerConfig）
    - 维护当前播放器引用和协议状态
    - 实现事件发射器
    - 实现播放器工厂方法（createPlayer）
    - _需求：6.1, 6.2, 6.3_
  
  - [x] 7.2 实现无缝协议切换逻辑
    - 实现 switchProtocol 方法
    - 记录当前播放时间（如果支持）
    - 创建新播放器并初始化
    - 等待新播放器稳定播放（waitForStablePlayback）
    - 销毁旧播放器
    - 更新当前播放器引用
    - 处理切换失败（保持旧播放器）
    - _需求：4.1, 4.2, 4.3, 4.4, 4.5, 4.7_
  
  - [x] 7.3 实现播放控制方法
    - 实现 play 方法
    - 实现 pause 方法
    - 实现 stop 方法
    - 实现 getState 方法
    - 实现 getCurrentProtocol 方法
    - _需求：8.1, 8.4, 8.8_
  
  - [x] 7.4 实现资源清理
    - 实现 destroy 方法
    - 销毁当前播放器
    - 移除所有事件监听器
    - 清空 video 元素
    - _需求：6.4, 6.5, 6.6, 6.7_
  
  - [ ]* 7.5 编写 PlayerManager 属性测试
    - **属性 8：播放器互斥性**
    - **验证：需求 6.2**
  
  - [ ]* 7.6 编写 PlayerManager 属性测试
    - **属性 10：资源清理完整性**
    - **验证：需求 6.4, 6.5, 6.6**
  
  - [ ]* 7.7 编写 PlayerManager 属性测试
    - **属性 19：DOM 元素复用**
    - **验证：需求 9.3**
  
  - [ ]* 7.8 编写 PlayerManager 单元测试
    - 测试切换过程中的错误处理
    - 测试播放时间恢复（HLS）
    - 测试所有播放器都失败的情况
    - _需求：4.5, 7.1, 7.4_

- [x] 8. 实现错误处理和降级策略
  - [x] 8.1 创建 ErrorRecoveryStrategy 工具类
    - 创建 `src/utils/ErrorRecoveryStrategy.ts` 文件
    - 实现 isRecoverable 方法（判断错误是否可恢复）
    - 实现 getNextProtocol 方法（获取降级协议）
    - 实现 getRetryConfig 方法（获取重试配置）
    - _需求：7.1, 7.3, 7.4_
  
  - [x] 8.2 在 PlayerManager 中集成错误处理
    - 在 switchProtocol 中捕获错误
    - 调用 ErrorRecoveryStrategy 判断是否可恢复
    - 可恢复：重试当前协议
    - 不可恢复：降级到下一个协议
    - 所有协议都失败：保持当前状态，触发错误事件
    - _需求：3.6, 3.7, 7.1, 7.2, 7.3, 7.4_
  
  - [ ]* 8.3 编写错误处理属性测试
    - **属性 7：切换失败降级链**
    - **验证：需求 3.6, 7.1, 7.4**
  
  - [ ]* 8.4 编写错误处理属性测试
    - **属性 16：错误信息非空性**
    - **验证：需求 7.2, 7.7**
  
  - [ ]* 8.5 编写错误处理属性测试
    - **属性 17：网络监测失败降级**
    - **验证：需求 7.5**
  
  - [ ]* 8.6 编写错误处理单元测试
    - 测试重试逻辑（指数退避）
    - 测试降级链完整性
    - 测试错误事件触发
    - _需求：7.1, 7.2, 7.3, 7.4, 7.6_

- [x] 9. 检查点 - 播放器模块验证
  - 确保所有测试通过
  - 验证播放器切换和错误处理逻辑
  - 如有问题请向用户询问

- [x] 10. 实现主控制器（AdaptiveStreamPlayer）
  - [x] 10.1 创建 AdaptiveStreamPlayer 类
    - 创建 `src/services/AdaptiveStreamPlayer.ts` 文件
    - 实现构造函数（初始化三个核心模块）
    - 生成流 URL（使用 StreamUrlGenerator）
    - 创建 NetworkMonitor 实例
    - 创建 ProtocolSwitcher 实例
    - 创建 PlayerManager 实例
    - _需求：2.4_
  
  - [x] 10.2 连接各模块的事件流
    - 实现 setupEventHandlers 方法
    - 监听 NetworkMonitor 的 quality-change 事件
    - 将质量变化传递给 ProtocolSwitcher
    - 监听 ProtocolSwitcher 的 switch-required 事件
    - 调用 PlayerManager 执行切换
    - 处理切换失败，调用 fallbackToNextProtocol
    - _需求：1.8, 3.5_
  
  - [x] 10.3 实现控制方法
    - 实现 start 方法（启动监测和播放）
    - 实现 stop 方法（停止监测和播放）
    - 实现 pause 方法（暂停播放，降低监测频率）
    - 实现 resume 方法（恢复播放，恢复监测频率）
    - 实现 setManualProtocol 方法（手动切换协议）
    - 实现 enableAutoSwitch 方法（恢复自动切换）
    - _需求：1.1, 5.2, 5.4, 9.1, 9.2_
  
  - [x] 10.4 实现状态查询和事件转发
    - 实现 getState 方法（聚合各模块状态）
    - 转发各模块的事件到外部
    - 实现 destroy 方法（清理所有模块）
    - _需求：8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8_
  
  - [ ]* 10.5 编写 AdaptiveStreamPlayer 集成测试
    - 测试完整的启动流程
    - 测试网络质量变化触发协议切换
    - 测试手动切换和自动切换的交互
    - _需求：1.1, 3.1, 3.2, 3.3, 5.2, 5.3, 5.4_
  
  - [ ]* 10.6 编写状态管理属性测试
    - **属性 14：状态查询一致性**
    - **验证：需求 8.1, 8.2, 8.3, 8.4, 8.8**
  
  - [ ]* 10.7 编写状态管理属性测试
    - **属性 15：状态变化事件完整性**
    - **验证：需求 8.5, 8.6, 8.7**

- [x] 11. 实现 Pinia Store
  - [x] 11.1 创建 stream store
    - 创建 `src/stores/stream.ts` 文件
    - 定义 state（protocol, playerStatus, networkQuality, networkMetrics, isAutoSwitch, isManualMode, config, error）
    - 定义 getters（isPlaying, hasError, protocolDisplayName）
    - 定义 actions（updateProtocol, updatePlayerStatus, updateNetworkQuality, updateNetworkMetrics, setManualMode, setError）
    - _需求：8.1, 8.2, 8.3, 8.4_
  
  - [ ]* 11.2 编写 store 单元测试
    - 测试状态更新
    - 测试 getters 计算
    - _需求：8.1, 8.2, 8.3, 8.4_

- [x] 12. 创建 Vue 3 组件
  - [x] 12.1 创建 AdaptivePlayer 组件
    - 创建 `src/components/AdaptivePlayer.vue` 文件
    - 定义 template（video 元素、状态显示、控制按钮）
    - 在 setup 中创建 AdaptiveStreamPlayer 实例
    - 连接 player 事件到 store actions
    - 实现 onMounted（启动播放器）
    - 实现 onUnmounted（销毁播放器）
    - _需求：1.1, 6.7_
  
  - [x] 12.2 实现手动控制 UI
    - 添加协议选择按钮（WebRTC/FLV/HLS）
    - 添加自动/手动模式切换按钮
    - 绑定点击事件到 player 方法
    - 根据 store 状态显示/隐藏控制元素
    - _需求：5.1, 5.2, 5.4_
  
  - [x] 12.3 实现状态显示 UI
    - 显示当前协议和延迟等级
    - 显示网络质量（Good/Fair/Poor）
    - 显示当前模式（自动/手动）
    - 显示播放状态（loading/playing/paused/error）
    - 显示错误信息（如果有）
    - _需求：8.1, 8.2, 8.3, 8.4_
  
  - [x] 12.4 添加样式
    - 添加 video 元素样式
    - 添加控制栏样式
    - 添加状态指示器样式（不同质量用不同颜色）
    - 添加响应式布局
    - _需求：无（UI 实现）_

- [x] 13. 实现配置能力
  - [x] 13.1 扩展配置接口
    - 在 AdaptiveStreamPlayerConfig 中添加所有可配置项
    - 为每个配置项提供默认值
    - 在各模块构造函数中使用配置
    - _需求：10.1, 10.2, 10.3, 10.4, 10.5, 10.6_
  
  - [ ]* 13.2 编写配置属性测试
    - **属性 20：配置项可定制性**
    - **验证：需求 10.1, 10.2, 10.3, 10.4, 10.5, 10.6**
  
  - [ ]* 13.3 编写配置单元测试
    - 测试默认配置
    - 测试自定义配置
    - 测试无效配置的处理
    - _需求：10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

- [x] 14. 集成到现有项目
  - [x] 14.1 更新路由配置
    - 在 `src/router/index.ts` 中添加新路由
    - 创建演示页面路由
    - _需求：无（集成任务）_
  
  - [x] 14.2 创建演示页面
    - 创建 `src/views/AdaptiveStreamDemo.vue` 文件
    - 使用 AdaptivePlayer 组件
    - 添加配置面板（可选）
    - 添加使用说明
    - _需求：无（演示任务）_
  
  - [x] 14.3 更新项目文档
    - 更新 README.md，添加功能说明
    - 添加使用示例代码
    - 添加配置选项说明
    - _需求：无（文档任务）_

- [x] 15. 最终检查点
  - 运行所有测试（单元测试 + 属性测试）
  - 验证测试覆盖率（目标 80%+）
  - 在真实环境中测试播放和切换
  - 测试不同网络条件下的表现
  - 如有问题请向用户询问

## 注意事项

1. **测试优先**：每个模块实现后立即编写测试，确保功能正确
2. **增量开发**：每个任务都应该是可独立验证的
3. **复用现有代码**：充分利用现有的 WebRTCService 类
4. **错误处理**：每个模块都要有完善的错误处理
5. **性能优化**：注意内存泄漏和资源清理
6. **浏览器兼容**：考虑不同浏览器的 API 支持情况

## 可选任务（标记为 *）

所有标记为 `*` 的测试任务都是可选的，可以根据项目时间和优先级决定是否实现。但建议至少实现核心属性测试（属性 1-10），以确保系统的正确性。
