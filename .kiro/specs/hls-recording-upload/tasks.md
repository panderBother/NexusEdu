# Implementation Plan: HLS 切片录播上传系统

## Overview

本实施计划将 HLS 切片录播上传系统分解为可执行的编码任务。实现顺序遵循从底层到上层的原则：首先实现核心数据结构和工具类，然后实现存储层，接着实现上传逻辑，最后集成到 Vue 组件和 Pinia store 中。

每个任务都包含具体的实现目标和对应的需求引用，确保可追溯性。

## Tasks

- [x] 1. 项目结构和类型定义
  - 创建目录结构：`src/features/hls-upload/`
  - 定义核心 TypeScript 接口和类型（UploadTask, SliceMetadata, SliceStatus, UploadProgress 等）
  - 配置 fast-check 测试库
  - _Requirements: 10.3, 10.4_

- [x] 2. 实现 M3U8 解析器
  - [x] 2.1 实现 M3U8Parser 类
    - 实现 `parse()` 方法：解析 M3U8 文本内容，提取版本、targetDuration、segments
    - 实现 `generate()` 方法：从 M3U8Playlist 对象生成标准 M3U8 文本
    - 处理相对 URL 和绝对 URL 的转换
    - _Requirements: 1.2, 1.4, 7.4_
  
  - [ ]* 2.2 编写 M3U8 解析器的属性测试
    - **Property 1: M3U8 Round-Trip Consistency**
    - **Validates: Requirements 1.2, 1.4, 7.4, 7.5**
  
  - [ ]* 2.3 编写 M3U8 解析器的单元测试
    - 测试标准 M3U8 格式解析
    - 测试边缘情况：空播放列表、单个切片、特殊字符
    - 测试错误处理：无效格式、缺失字段
    - _Requirements: 1.2_

- [x] 3. 实现 IndexedDB 元数据存储
  - [x] 3.1 实现 MetadataStore 类
    - 实现数据库初始化：创建 object stores 和 indexes
    - 实现 `saveTask()`, `getTask()`, `getAllTasks()` 方法
    - 实现 `updateSliceStatus()` 和 `updateSliceStatusBatch()` 方法
    - 实现 `deleteTask()` 和 `cleanupCompletedTasks()` 方法
    - _Requirements: 3.1, 7.1, 7.3_
  
  - [ ]* 3.2 编写元数据存储的属性测试
    - **Property 6: Metadata Persistence Round-Trip**
    - **Validates: Requirements 3.1, 7.1, 7.3**
  
  - [ ]* 3.3 编写元数据存储的单元测试
    - 测试数据库初始化和版本升级
    - 测试批量操作性能
    - 测试并发读写
    - 测试存储配额处理
    - _Requirements: 3.1_

- [x] 4. 实现切片队列管理
  - [x] 4.1 实现 SliceQueue 类
    - 实现优先级队列数据结构（按 index 排序）
    - 实现 `enqueue()`, `enqueueBatch()`, `dequeue()`, `dequeueBatch()` 方法
    - 实现状态管理：`markAsUploading()`, `markAsCompleted()`, `markAsFailed()`
    - 实现并发控制逻辑
    - _Requirements: 2.1, 2.2, 2.3, 2.5_
  
  - [ ]* 4.2 编写队列管理的属性测试
    - **Property 4: Concurrency Limit Invariant**
    - **Property 5: Queue Progression Property**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.5**
  
  - [ ]* 4.3 编写队列管理的单元测试
    - 测试空队列操作
    - 测试单个切片场景
    - 测试大量切片场景（1000+ 切片）
    - _Requirements: 2.1, 2.2_

- [x] 5. Checkpoint - 确保核心数据结构测试通过
  - 确保所有测试通过，如有问题请询问用户

- [x] 6. 实现重试策略
  - [x] 6.1 实现 ExponentialBackoffStrategy 类
    - 实现 `shouldRetry()` 方法：判断是否应该重试
    - 实现 `calculateDelay()` 方法：计算指数退避延迟
    - 实现 `isRetryableError()` 方法：判断错误类型是否可重试
    - _Requirements: 4.1, 4.2, 4.3_
  
  - [ ]* 6.2 编写重试策略的属性测试
    - **Property 9: Retry Count Limit**
    - **Property 10: Exponential Backoff Calculation**
    - **Validates: Requirements 4.1, 4.2, 4.3**
  
  - [ ]* 6.3 编写重试策略的单元测试
    - 测试不同错误类型的重试判断
    - 测试延迟计算的边界值
    - _Requirements: 4.1, 4.2_

- [x] 7. 实现进度追踪器
  - [x] 7.1 实现 ProgressTracker 类
    - 实现 `initializeTask()` 方法：初始化任务进度
    - 实现 `updateSliceProgress()` 方法：更新切片进度
    - 实现 `markSliceCompleted()` 方法：标记切片完成
    - 实现 `calculateSpeed()` 方法：计算上传速度（使用滑动窗口）
    - 实现 `calculateETA()` 方法：计算预计剩余时间
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  
  - [ ]* 7.2 编写进度追踪器的属性测试
    - **Property 14: Total Progress Calculation**
    - **Property 15: Speed and ETA Calculation**
    - **Validates: Requirements 6.1, 6.3, 6.4**
  
  - [ ]* 7.3 编写进度追踪器的单元测试
    - 测试进度计算精度
    - 测试速度计算的时间窗口
    - 测试 ETA 计算的边界情况（速度为 0、剩余字节为 0）
    - _Requirements: 6.1, 6.3, 6.4_

- [x] 8. 实现 WebWorker 上传器
  - [x] 8.1 创建 upload.worker.ts
    - 实现 Worker 消息监听和分发
    - 实现 `handleUploadSlice()` 方法：处理切片上传请求
    - 使用 Axios 发送 HTTP 请求，配置 onUploadProgress 回调
    - 实现进度报告：定期向主线程发送进度消息
    - 实现暂停和取消逻辑：使用 AbortController
    - _Requirements: 5.1, 5.2, 5.3, 5.5, 5.6, 10.2_
  
  - [ ]* 8.2 编写 Worker 通信的属性测试
    - **Property 12: Worker Message Passing**
    - **Property 13: Progress Update Frequency**
    - **Validates: Requirements 5.2, 5.3, 5.5, 5.6**
  
  - [ ]* 8.3 编写 Worker 的单元测试
    - 测试 Worker 初始化和消息处理
    - 测试上传进度报告
    - 测试暂停和恢复逻辑
    - 测试错误处理和重试
    - _Requirements: 5.1, 5.2, 5.3_

- [x] 9. 实现上传管理器
  - [x] 9.1 实现 UploadManager 类
    - 实现 `initializeUpload()` 方法：
      - 从 SRS Server 获取 M3U8 文件
      - 解析 M3U8 提取切片信息
      - 创建 UploadTask 并保存到 MetadataStore
      - 初始化 SliceQueue
    - 实现 `startUpload()` 方法：启动上传流程
    - 实现 Worker 生命周期管理：创建、消息通信、销毁
    - 实现并发控制：根据配置从队列取出切片发送给 Worker
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 5.2_
  
  - [x] 9.2 实现上传控制方法
    - 实现 `pauseUpload()` 方法：暂停上传，停止新切片上传
    - 实现 `resumeUpload()` 方法：恢复上传，继续处理队列
    - 实现 `cancelUpload()` 方法：取消上传，清理数据
    - 实现 `retryFailedSlices()` 方法：重试失败的切片
    - _Requirements: 9.2, 9.4, 9.6, 4.4_
  
  - [x] 9.3 实现状态恢复逻辑
    - 实现页面加载时从 MetadataStore 恢复未完成任务
    - 过滤已完成的切片，重建队列
    - _Requirements: 3.2, 3.4_
  
  - [ ]* 9.4 编写上传管理器的属性测试
    - **Property 2: M3U8 Fetch and Parse Completeness**
    - **Property 3: Slice-to-Index Mapping Invariant**
    - **Property 7: State Recovery Completeness**
    - **Property 18: Pause Behavior**
    - **Property 19: Resume Behavior**
    - **Property 20: Cancel and Cleanup**
    - **Validates: Requirements 1.1, 1.2, 1.3, 3.2, 3.4, 9.2, 9.4, 9.6**

- [x] 10. Checkpoint - 确保核心上传逻辑测试通过
  - 确保所有测试通过，如有问题请询问用户

- [x] 11. 实现错误处理器
  - [x] 11.1 实现 ErrorHandler 类
    - 实现 `handleUploadError()` 方法：处理上传错误，返回处理决策
    - 实现 `handleWorkerError()` 方法：处理 Worker 错误
    - 实现 `handleStorageError()` 方法：处理存储错误
    - 实现错误日志记录：记录错误类型、时间戳、受影响切片
    - _Requirements: 8.1, 8.2, 4.5_
  
  - [ ]* 11.2 编写错误处理的属性测试
    - **Property 8: Failure State Persistence**
    - **Property 17: Error Logging Completeness**
    - **Validates: Requirements 3.3, 4.5, 8.1, 8.2**
  
  - [ ]* 11.3 编写错误处理的单元测试
    - 测试各种错误类型的处理决策
    - 测试错误日志的完整性
    - 测试降级处理逻辑
    - _Requirements: 8.1, 8.2_

- [x] 12. 实现 Pinia Store
  - [x] 12.1 创建 useUploadStore
    - 定义 state：activeTasks, config, worker, progress
    - 实现 actions：
      - `initUpload()`: 调用 UploadManager.initializeUpload()
      - `startUpload()`: 调用 UploadManager.startUpload()
      - `pauseUpload()`: 调用 UploadManager.pauseUpload()
      - `resumeUpload()`: 调用 UploadManager.resumeUpload()
      - `cancelUpload()`: 调用 UploadManager.cancelUpload()
      - `retryFailed()`: 调用 UploadManager.retryFailedSlices()
    - 实现 getters：
      - `getTaskProgress()`: 获取任务进度
      - `getTaskStatus()`: 获取任务状态
    - _Requirements: 10.1, 10.3_
  
  - [x] 12.2 实现配置管理
    - 实现 `updateConfig()` action：更新上传配置
    - 支持配置持久化到 localStorage
    - _Requirements: 2.1, 10.5_
  
  - [ ]* 12.3 编写 Store 的单元测试
    - 测试 actions 的调用流程
    - 测试 state 更新逻辑
    - 测试 getters 的计算结果
    - _Requirements: 10.1_

- [-] 13. 实现 Vue 组件
  - [x] 13.1 创建 UploadManager.vue 组件
    - 实现上传任务列表展示
    - 实现上传控制按钮：开始、暂停、恢复、取消
    - 实现总体进度条和进度信息展示
    - 使用 Composition API 和 TypeScript
    - _Requirements: 10.3, 10.4_
  
  - [-] 13.2 创建 SliceProgressList.vue 组件
    - 实现切片列表展示：序号、状态、进度
    - 实现失败切片的重试按钮
    - 实现虚拟滚动（处理大量切片）
    - _Requirements: 6.2_
  
  - [ ] 13.3 创建 UploadConfig.vue 组件
    - 实现配置表单：并发数、超时、重试次数、上传端点
    - 实现配置验证和保存
    - _Requirements: 2.1, 10.5_
  
  - [ ]* 13.4 编写组件的集成测试
    - 测试组件渲染和交互
    - 测试与 Store 的集成
    - 测试用户操作流程
    - _Requirements: 10.3_

- [ ] 14. 实现完成回调和最终 M3U8 生成
  - [ ] 14.1 实现完成检测逻辑
    - 在 UploadManager 中监听所有切片完成
    - 触发完成回调
    - _Requirements: 6.5_
  
  - [ ] 14.2 实现最终 M3U8 生成和上传
    - 从 MetadataStore 读取所有切片的远程 URL
    - 使用 M3U8Parser 生成最终的 M3U8 文件
    - 上传 M3U8 文件到服务器
    - _Requirements: 1.4, 7.4, 7.5_
  
  - [ ]* 14.3 编写完成流程的属性测试
    - **Property 16: Completion Detection**
    - **Validates: Requirements 6.5**

- [ ] 15. 实现配置端点支持
  - [ ] 15.1 实现可配置的上传端点
    - 在 UploadConfig 中添加 uploadEndpoint 字段
    - 在 Worker 中使用配置的端点 URL
    - _Requirements: 10.5_
  
  - [ ]* 15.2 编写配置端点的属性测试
    - **Property 21: Configurable Upload Endpoint**
    - **Validates: Requirements 10.5**

- [ ] 16. 集成和端到端测试
  - [ ]* 16.1 编写端到端集成测试
    - 测试完整上传流程：初始化 → 上传 → 完成
    - 测试断点续传流程：上传 → 中断 → 恢复
    - 测试错误恢复流程：失败 → 重试 → 成功
    - 测试并发上传场景
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 3.2, 3.4, 4.1, 4.2, 4.3_

- [ ] 17. 最终 Checkpoint - 确保所有测试通过
  - 运行所有单元测试、属性测试和集成测试
  - 确保测试覆盖率达到要求
  - 如有问题请询问用户

## Notes

- 任务标记 `*` 的为可选任务，可以跳过以加快 MVP 开发
- 每个任务都引用了具体的需求，确保可追溯性
- Checkpoint 任务确保增量验证
- 属性测试验证通用正确性属性
- 单元测试验证具体示例和边缘情况
- 使用 fast-check 库进行属性测试，每个测试至少运行 100 次迭代
