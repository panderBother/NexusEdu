# Requirements Document

## Introduction

HLS 切片录播上传系统是一个高效的视频上传解决方案，充分利用 HLS 协议的切片特性，直接复用直播时生成的 .ts 切片文件进行上传。系统支持并行上传、断点续传和后台异步传输，避免大文件拆分带来的性能开销，提供流畅的用户体验。

## Glossary

- **Upload_System**: HLS 切片录播上传系统
- **Slice**: HLS 协议生成的 .ts 视频切片文件
- **M3U8_Index**: HLS 播放列表文件，包含切片的元数据和播放顺序
- **Upload_Queue**: 管理待上传切片的队列系统
- **Upload_Worker**: 在 WebWorker 中执行上传任务的后台线程
- **Upload_State**: 切片的上传状态（未上传/上传中/已完成/失败）
- **Progress_Manager**: 管理和计算上传进度的组件
- **Metadata_Store**: 存储切片元数据的 IndexedDB 数据库
- **Retry_Strategy**: 上传失败后的重试策略（指数退避）
- **SRS_Server**: 流媒体服务器，生成 HLS 切片

## Requirements

### Requirement 1: 切片复用与索引管理

**User Story:** 作为系统开发者，我希望直接复用直播时生成的 HLS 切片文件，这样可以避免大文件拆分的性能开销。

#### Acceptance Criteria

1. WHEN 直播结束后，THE Upload_System SHALL 读取 SRS_Server 生成的 M3U8_Index 文件
2. WHEN 解析 M3U8_Index 文件时，THE Upload_System SHALL 提取所有 Slice 的 URL、序号、时长和大小信息
3. THE Upload_System SHALL 维护 Slice 与 M3U8_Index 的映射关系
4. WHEN 所有 Slice 上传完成后，THE Upload_System SHALL 生成最终的 M3U8_Index 文件并上传到服务器

### Requirement 2: 并行上传队列

**User Story:** 作为用户，我希望系统能够同时上传多个切片，这样可以提高上传效率。

#### Acceptance Criteria

1. THE Upload_Queue SHALL 支持配置并发上传数量（默认值为 3 到 5 之间）
2. WHEN Upload_Queue 中有待上传的 Slice 时，THE Upload_System SHALL 同时处理不超过配置并发数的 Slice
3. WHEN 一个 Slice 上传完成后，THE Upload_Queue SHALL 自动从队列中取出下一个待上传的 Slice
4. WHEN 网络状况变化时，THE Upload_System SHALL 动态调整并发上传数量
5. THE Upload_Queue SHALL 按照 Slice 序号顺序管理待上传切片

### Requirement 3: 断点续传机制

**User Story:** 作为用户，我希望上传过程中如果网络中断或页面刷新，系统能够从中断处继续上传，而不是重新开始。

#### Acceptance Criteria

1. THE Metadata_Store SHALL 持久化每个 Slice 的 Upload_State
2. WHEN 页面加载时，THE Upload_System SHALL 从 Metadata_Store 恢复未完成的上传任务
3. WHEN Slice 上传失败时，THE Upload_System SHALL 将其 Upload_State 标记为失败并保存到 Metadata_Store
4. WHEN 恢复上传时，THE Upload_System SHALL 跳过已完成的 Slice，仅上传未完成或失败的 Slice
5. THE Upload_System SHALL 使用 IndexedDB 作为 Metadata_Store 的实现

### Requirement 4: 失败重试策略

**User Story:** 作为用户，我希望上传失败时系统能够自动重试，这样可以应对临时的网络波动。

#### Acceptance Criteria

1. WHEN Slice 上传失败时，THE Retry_Strategy SHALL 自动重试最多 3 次
2. THE Retry_Strategy SHALL 使用指数退避算法计算重试延迟时间
3. WHEN 重试次数达到上限后，THE Upload_System SHALL 将 Slice 标记为失败状态
4. WHEN Slice 标记为失败状态后，THE Upload_System SHALL 允许用户手动触发重试
5. THE Upload_System SHALL 记录每次失败的错误信息和时间戳

### Requirement 5: WebWorker 后台上传

**User Story:** 作为用户，我希望上传过程不会阻塞页面操作，这样我可以在上传时继续使用其他功能。

#### Acceptance Criteria

1. THE Upload_Worker SHALL 在独立的 WebWorker 线程中执行上传任务
2. WHEN 主线程发起上传请求时，THE Upload_System SHALL 通过 postMessage 将任务发送给 Upload_Worker
3. WHEN Upload_Worker 处理上传时，THE Upload_Worker SHALL 定期向主线程发送进度更新消息
4. THE Upload_Worker SHALL 处理文件读取、HTTP 请求和进度计算
5. WHEN 用户暂停上传时，THE Upload_System SHALL 通过 postMessage 通知 Upload_Worker 停止当前任务
6. WHEN 用户恢复上传时，THE Upload_System SHALL 通过 postMessage 通知 Upload_Worker 继续执行任务

### Requirement 6: 上传进度管理

**User Story:** 作为用户，我希望实时看到上传进度和预计剩余时间，这样我可以了解上传状态。

#### Acceptance Criteria

1. THE Progress_Manager SHALL 计算并显示总体上传进度（已上传字节数 / 总字节数）
2. THE Progress_Manager SHALL 显示每个 Slice 的上传状态和进度百分比
3. THE Progress_Manager SHALL 基于最近的上传速度计算预计剩余时间
4. THE Progress_Manager SHALL 计算并显示当前上传速度（字节/秒）
5. WHEN 所有 Slice 上传完成后，THE Upload_System SHALL 触发完成回调通知

### Requirement 7: 切片元数据管理

**User Story:** 作为系统开发者，我希望系统能够准确记录和管理每个切片的元数据，这样可以确保视频的完整性和正确性。

#### Acceptance Criteria

1. THE Metadata_Store SHALL 存储每个 Slice 的序号、时长、大小、本地 URL 和远程 URL
2. WHEN 解析 M3U8_Index 时，THE Upload_System SHALL 提取并存储所有 Slice 的元数据
3. WHEN Slice 上传完成后，THE Upload_System SHALL 更新该 Slice 的远程 URL 到 Metadata_Store
4. WHEN 所有 Slice 上传完成后，THE Upload_System SHALL 使用 Metadata_Store 中的数据生成最终的 M3U8_Index
5. THE Upload_System SHALL 确保生成的 M3U8_Index 中的 Slice 顺序与原始顺序一致

### Requirement 8: 错误处理与日志

**User Story:** 作为系统管理员，我希望系统能够详细记录错误信息，这样我可以诊断和解决问题。

#### Acceptance Criteria

1. WHEN 网络错误发生时，THE Upload_System SHALL 记录错误类型、时间戳和受影响的 Slice
2. WHEN 服务器返回错误响应时，THE Upload_System SHALL 记录 HTTP 状态码和响应内容
3. THE Upload_System SHALL 提供错误日志的查询接口
4. WHEN 上传失败次数超过阈值时，THE Upload_System SHALL 提供降级处理选项
5. THE Upload_System SHALL 在控制台输出关键操作的调试信息

### Requirement 9: 上传控制接口

**User Story:** 作为用户，我希望能够控制上传过程，包括暂停、恢复和取消上传。

#### Acceptance Criteria

1. THE Upload_System SHALL 提供暂停上传的接口
2. WHEN 用户暂停上传时，THE Upload_System SHALL 停止新的 Slice 上传，但允许当前上传中的 Slice 完成
3. THE Upload_System SHALL 提供恢复上传的接口
4. WHEN 用户恢复上传时，THE Upload_System SHALL 从暂停处继续上传剩余的 Slice
5. THE Upload_System SHALL 提供取消上传的接口
6. WHEN 用户取消上传时，THE Upload_System SHALL 终止所有上传任务并清理 Metadata_Store 中的相关数据

### Requirement 10: 与现有系统集成

**User Story:** 作为系统开发者，我希望上传系统能够无缝集成到现有的 Vue 3 项目中，这样可以复用现有的基础设施。

#### Acceptance Criteria

1. THE Upload_System SHALL 使用 Pinia 管理上传状态
2. THE Upload_System SHALL 使用 Axios 发送 HTTP 请求
3. THE Upload_System SHALL 提供 Vue 3 Composition API 风格的接口
4. THE Upload_System SHALL 支持 TypeScript 类型定义
5. WHEN 与后端 API 对接时，THE Upload_System SHALL 支持可配置的上传端点 URL
