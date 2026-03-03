# 需求文档：直播平台核心功能

## 简介

本文档定义了基于 WebRTC 和 SRS 流媒体服务器的直播平台的四个核心功能模块：多协议自适应拉流系统、HLS 切片录播上传系统、WebRTC 连麦功能和高性能弹幕系统。这些功能将增强直播平台的稳定性、用户体验和互动性。

## 术语表

- **System**: 直播平台前端应用系统
- **Protocol_Switcher**: 多协议自适应拉流模块
- **Network_Monitor**: 网络质量监控模块
- **HLS_Uploader**: HLS 切片上传模块
- **WebWorker**: 浏览器后台线程
- **Mic_Manager**: 连麦管理模块
- **SFU**: Selective Forwarding Unit（选择性转发单元）
- **Danmaku_Renderer**: 弹幕渲染引擎
- **Canvas**: HTML5 画布元素
- **Track**: 虚拟弹幕轨道
- **SRS**: Simple Realtime Server（流媒体服务器）
- **WebRTC**: Web Real-Time Communication（网页实时通信）
- **FLV**: Flash Video（流媒体格式）
- **HLS**: HTTP Live Streaming（HTTP 直播流）
- **RTT**: Round-Trip Time（往返时延）
- **Packet_Loss**: 数据包丢失率
- **Bandwidth**: 网络带宽
- **TS_Segment**: HLS 传输流切片文件

## 需求

### 需求 1：多协议自适应拉流

**用户故事：** 作为观众，我希望系统能够根据我的网络状况自动选择最佳的播放协议，以便获得流畅的观看体验。

#### 验收标准

1. WHEN THE System SHALL start playback, THE Protocol_Switcher SHALL detect the current network quality and select the optimal protocol from WebRTC, FLV, or HLS
2. WHILE THE System SHALL is playing, THE Network_Monitor SHALL continuously measure RTT, Packet_Loss, and Bandwidth every 2 seconds
3. WHEN THE Packet_Loss SHALL exceeds 5% OR RTT exceeds 300ms, THE Protocol_Switcher SHALL downgrade from WebRTC to FLV
4. WHEN THE Packet_Loss SHALL exceeds 10% OR RTT exceeds 500ms, THE Protocol_Switcher SHALL downgrade from FLV to HLS
5. WHEN THE network quality SHALL improves AND Packet_Loss drops below 3% AND RTT drops below 200ms for 10 consecutive seconds, THE Protocol_Switcher SHALL upgrade to a lower-latency protocol
6. WHEN THE protocol SHALL switches, THE System SHALL maintain playback continuity without visible interruption or black screen
7. WHEN THE protocol SHALL switches, THE System SHALL emit a notification event containing the old protocol, new protocol, and reason for switching
8. THE Protocol_Switcher SHALL prevent protocol oscillation by enforcing a minimum 15-second interval between consecutive switches

### 需求 2：HLS 切片录播上传

**用户故事：** 作为主播，我希望系统能够在直播过程中自动录制并上传视频切片，以便观众可以回放我的直播内容。

#### 验收标准

1. WHEN THE System SHALL receives HLS TS_Segments during live streaming, THE HLS_Uploader SHALL queue them for upload
2. THE HLS_Uploader SHALL upload TS_Segments in parallel with a maximum concurrency of 3 uploads
3. WHEN THE upload SHALL fails, THE HLS_Uploader SHALL retry up to 3 times with exponential backoff starting at 1 second
4. WHEN THE upload SHALL is interrupted, THE HLS_Uploader SHALL implement resumable upload by storing the upload progress locally
5. THE HLS_Uploader SHALL execute upload operations in a WebWorker to avoid blocking the main thread
6. WHEN THE upload SHALL completes successfully, THE HLS_Uploader SHALL emit a progress event containing the uploaded segment identifier and total progress percentage
7. WHEN THE upload SHALL fails after all retries, THE HLS_Uploader SHALL emit an error event and store the failed segment for manual retry
8. THE HLS_Uploader SHALL persist the upload queue to IndexedDB to survive page refreshes
9. WHEN THE network SHALL reconnects after disconnection, THE HLS_Uploader SHALL automatically resume pending uploads

### 需求 3：WebRTC 连麦功能

**用户故事：** 作为主播或观众，我希望能够与其他用户进行实时音视频连麦，以便增强直播互动性。

#### 验收标准

1. WHEN THE user SHALL requests to join a mic session, THE Mic_Manager SHALL send a signaling request to the SFU server
2. WHEN THE host SHALL receives a mic request, THE System SHALL display a notification with accept and reject options
3. WHEN THE host SHALL accepts a mic request, THE Mic_Manager SHALL establish a WebRTC peer connection between the requester and the SFU
4. WHEN THE peer connection SHALL is established, THE Mic_Manager SHALL add the participant to the active participants list
5. THE Mic_Manager SHALL enable echo cancellation and noise suppression on all audio tracks
6. WHEN THE participant SHALL leaves the mic session, THE Mic_Manager SHALL close the peer connection and remove the participant from the list
7. THE System SHALL support a maximum of 6 simultaneous mic participants including the host
8. WHEN THE mic layout SHALL changes, THE System SHALL automatically adjust the video grid layout to accommodate all participants
9. WHEN THE connection quality SHALL degrades for a participant, THE System SHALL display a visual indicator on their video tile
10. THE Mic_Manager SHALL synchronize participant state changes across all connected clients within 500ms

### 需求 4：高性能弹幕系统

**用户故事：** 作为观众，我希望能够发送和查看弹幕，并且即使在高并发场景下也能保持流畅的显示效果。

#### 验收标准

1. THE Danmaku_Renderer SHALL use an offscreen Canvas for rendering to optimize performance
2. WHEN THE System SHALL receives a danmaku message, THE Danmaku_Renderer SHALL pre-render the text to a cached bitmap
3. THE Danmaku_Renderer SHALL implement a virtual Track system with collision detection to prevent danmaku overlap
4. THE Danmaku_Renderer SHALL support rendering at least 1000 danmaku messages per second while maintaining 60 FPS
5. WHEN THE danmaku SHALL enters the screen, THE Danmaku_Renderer SHALL assign it to the first available Track with no collision
6. WHEN THE no Track SHALL is available, THE Danmaku_Renderer SHALL queue the danmaku and display it when a Track becomes free
7. THE Danmaku_Renderer SHALL recycle danmaku objects using an object pool to minimize garbage collection
8. WHEN THE user SHALL clicks on a danmaku, THE System SHALL display interaction options including like, reply, and mention user
9. THE Danmaku_Renderer SHALL support configurable danmaku speed, opacity, and font size
10. WHEN THE danmaku volume SHALL exceeds the rendering capacity, THE System SHALL prioritize displaying VIP or paid danmaku messages

### 需求 5：系统集成与状态管理

**用户故事：** 作为开发者，我希望各个功能模块能够无缝集成并共享状态，以便维护系统的一致性和可扩展性。

#### 验收标准

1. THE System SHALL use Pinia stores to manage state for each feature module
2. WHEN THE any module SHALL emits an event, THE System SHALL propagate it to all subscribed components
3. THE System SHALL provide a unified error handling mechanism that captures and logs errors from all modules
4. WHEN THE System SHALL initializes, THE System SHALL load configuration from a centralized config file
5. THE System SHALL expose a plugin API that allows each module to register lifecycle hooks
6. WHEN THE user SHALL navigates away from the live stream page, THE System SHALL properly cleanup all active connections and resources
7. THE System SHALL persist critical state to localStorage to enable session recovery after page refresh

### 需求 6：性能与监控

**用户故事：** 作为系统管理员，我希望能够监控系统性能指标，以便及时发现和解决性能问题。

#### 验收标准

1. THE System SHALL collect performance metrics including FPS, memory usage, and network throughput every 5 seconds
2. WHEN THE FPS SHALL drops below 30 for more than 5 seconds, THE System SHALL emit a performance warning event
3. WHEN THE memory usage SHALL exceeds 500MB, THE System SHALL trigger garbage collection and emit a memory warning
4. THE System SHALL log all protocol switches, upload events, and mic session changes to a centralized logging service
5. THE System SHALL provide a debug panel that displays real-time metrics when enabled via a query parameter
6. WHEN THE System SHALL detects an error, THE System SHALL include contextual information such as user ID, stream ID, and timestamp in the error report
