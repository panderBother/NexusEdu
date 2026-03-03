# Requirements Document

## Introduction

本文档定义了基于 SRS-SFU 架构的 WebRTC 连麦功能需求。该功能允许主播与观众进行实时音视频互动，支持多人连麦场景，并提供优质的音视频体验。系统采用 SFU（Selective Forwarding Unit）模式，由 SRS 服务器负责流的转发，客户端通过 WebRTC 技术实现低延迟的实时通信。

## Glossary

- **System**: WebRTC 连麦系统
- **SRS_Server**: SRS 流媒体服务器，运行在 SFU 模式
- **Publisher**: 推流端，包括主播和连麦观众
- **Subscriber**: 订阅端，接收其他参与者的音视频流
- **Signaling_Channel**: 信令通道，用于交换 SDP 和 ICE 候选信息
- **WebRTC_Service**: 前端 WebRTC 服务类，封装 WebRTC API
- **Connection_Manager**: 连接管理器，维护所有 WebRTC 连接状态
- **Audio_Processor**: 音频处理器，负责回声消除、降噪等
- **State_Store**: Pinia 状态存储，管理连麦状态
- **UI_Controller**: UI 控制器，处理用户交互
- **Participant**: 连麦参与者，包括主播和连麦观众
- **Request_Queue**: 连麦请求队列，存储待处理的连麦申请

## Requirements

### Requirement 1: SRS-SFU 架构集成

**User Story:** 作为系统架构师，我希望集成 SRS-SFU 架构，以便实现高效的多人音视频通信。

#### Acceptance Criteria

1. WHEN a Participant initiates publishing, THE System SHALL establish a WebRTC connection to SRS_Server in SFU mode
2. WHEN a Publisher successfully publishes a stream, THE System SHALL register the stream with SRS_Server and obtain a unique stream identifier
3. WHEN a Participant subscribes to another Participant's stream, THE System SHALL request the stream from SRS_Server using the stream identifier
4. THE System SHALL support simultaneous publishing and subscribing for each Participant
5. WHEN multiple Participants are connected, THE SRS_Server SHALL forward streams without mixing, allowing each Subscriber to receive individual streams
6. THE System SHALL use SRS HTTP API at http://101.35.16.42:1985 for signaling operations

### Requirement 2: 信令交互流程

**User Story:** 作为开发者，我希望实现完整的信令交互流程，以便协调连麦过程中的所有通信。

#### Acceptance Criteria

1. WHEN an audience member requests to join voice chat, THE System SHALL send a connection request through Signaling_Channel to the host
2. WHEN the host receives a connection request, THE System SHALL add it to Request_Queue and notify the host
3. WHEN the host accepts a request, THE System SHALL initiate SDP offer/answer exchange between the host and the audience member
4. WHEN SDP exchange is complete, THE System SHALL exchange ICE candidates between both parties through Signaling_Channel
5. IF the host rejects a request, THEN THE System SHALL notify the requesting audience member and remove the request from Request_Queue
6. WHEN either party initiates disconnection, THE System SHALL send a hangup signal through Signaling_Channel and close the WebRTC connection
7. THE System SHALL handle SDP offer/answer exchange using SRS HTTP API endpoints
8. WHEN ICE candidates are gathered, THE System SHALL send them through Signaling_Channel within 5 seconds

### Requirement 3: 连麦状态管理

**User Story:** 作为前端开发者，我希望有清晰的状态管理，以便准确反映连麦过程的各个阶段。

#### Acceptance Criteria

1. THE State_Store SHALL maintain connection states: idle, requesting, connecting, connected, disconnecting
2. WHEN a state transition occurs, THE State_Store SHALL update the state atomically and emit change events
3. THE State_Store SHALL maintain a list of all active Participants with their connection status
4. WHEN a Participant joins or leaves, THE State_Store SHALL update the Participant list immediately
5. THE State_Store SHALL track audio and video status (enabled/disabled) for each Participant
6. WHEN network quality changes, THE State_Store SHALL update quality metrics for each connection
7. THE State_Store SHALL persist critical state information to prevent data loss on page refresh

### Requirement 4: 连麦申请与审批

**User Story:** 作为主播，我希望能够审批连麦申请，以便控制谁可以加入连麦。

#### Acceptance Criteria

1. WHEN an audience member clicks the join button, THE System SHALL send a connection request to the host
2. THE System SHALL display pending requests in Request_Queue to the host with requester information
3. WHEN the host accepts a request, THE System SHALL initiate the WebRTC connection establishment process
4. WHEN the host rejects a request, THE System SHALL notify the requester and remove the request from Request_Queue
5. IF a request is not processed within 30 seconds, THEN THE System SHALL automatically expire the request and notify the requester
6. THE System SHALL prevent duplicate requests from the same audience member while a request is pending
7. WHEN a connection is successfully established, THE System SHALL remove the request from Request_Queue

### Requirement 5: 音视频流管理

**User Story:** 作为参与者，我希望能够控制自己的音视频流，以便根据需要开关麦克风和摄像头。

#### Acceptance Criteria

1. WHEN a Participant enables their microphone, THE System SHALL start capturing audio and add it to the published stream
2. WHEN a Participant disables their microphone, THE System SHALL stop the audio track and notify other Participants
3. WHEN a Participant enables their camera, THE System SHALL start capturing video and add it to the published stream
4. WHEN a Participant disables their camera, THE System SHALL stop the video track and notify other Participants
5. THE System SHALL allow independent control of audio and video tracks
6. WHEN a track state changes, THE System SHALL update the state in State_Store within 100ms
7. THE System SHALL handle media device permission requests and notify users if permissions are denied

### Requirement 6: 音频优化处理

**User Story:** 作为用户，我希望获得高质量的音频体验，以便清晰地进行语音交流。

#### Acceptance Criteria

1. WHEN capturing audio, THE Audio_Processor SHALL enable echo cancellation (AEC) by default
2. WHEN capturing audio, THE Audio_Processor SHALL enable noise suppression (NS) by default
3. WHEN capturing audio, THE Audio_Processor SHALL enable automatic gain control (AGC) by default
4. THE System SHALL use WebRTC native audio processing capabilities through getUserMedia constraints
5. WHEN audio quality issues are detected, THE System SHALL log diagnostic information for troubleshooting
6. THE System SHALL allow users to toggle audio processing features if needed

### Requirement 7: 多人连麦布局

**User Story:** 作为用户，我希望看到清晰的多人连麦界面，以便了解所有参与者的状态。

#### Acceptance Criteria

1. WHEN Participants join voice chat, THE UI_Controller SHALL display their video feeds in a grid layout
2. THE UI_Controller SHALL adapt the layout based on the number of Participants (1-6 people)
3. WHEN a Participant speaks, THE UI_Controller SHALL highlight their video feed with a visual indicator
4. THE UI_Controller SHALL display audio and video status icons for each Participant
5. WHEN network quality is poor for a Participant, THE UI_Controller SHALL display a warning indicator
6. THE UI_Controller SHALL show the Participant's name or identifier on their video feed
7. WHEN more than 6 Participants attempt to join, THE System SHALL prevent additional connections and notify the user

### Requirement 8: 错误处理与恢复

**User Story:** 作为用户，我希望系统能够优雅地处理错误，以便在出现问题时获得清晰的反馈。

#### Acceptance Criteria

1. IF a WebRTC connection fails to establish within 10 seconds, THEN THE System SHALL retry up to 3 times with exponential backoff
2. IF all retry attempts fail, THEN THE System SHALL notify the user with a descriptive error message
3. WHEN a network interruption is detected, THE System SHALL attempt to re-establish the connection automatically
4. IF media device permissions are denied, THEN THE System SHALL display a clear message explaining how to grant permissions
5. WHEN an ICE connection fails, THE System SHALL log diagnostic information and attempt to use alternative ICE candidates
6. IF SRS_Server is unreachable, THEN THE System SHALL display a server error message and prevent connection attempts
7. WHEN a connection is lost during voice chat, THE System SHALL notify all affected Participants and update their status to disconnected

### Requirement 9: 性能优化

**User Story:** 作为用户，我希望系统能够根据网络状况自适应调整，以便在不同网络环境下都能正常使用。

#### Acceptance Criteria

1. WHEN network bandwidth is limited, THE System SHALL reduce video resolution to maintain connection stability
2. WHEN network quality degrades, THE System SHALL prioritize audio quality over video quality
3. THE System SHALL monitor network statistics (packet loss, jitter, RTT) every 2 seconds
4. WHEN packet loss exceeds 10%, THE System SHALL reduce video bitrate by 25%
5. WHEN network quality improves, THE System SHALL gradually increase video quality up to the maximum supported resolution
6. THE System SHALL limit the maximum number of simultaneous connections to 6 to ensure performance
7. THE System SHALL use adaptive bitrate streaming based on available bandwidth

### Requirement 10: 连麦控制操作

**User Story:** 作为参与者，我希望能够方便地控制连麦过程，以便随时加入或退出连麦。

#### Acceptance Criteria

1. WHEN a Participant clicks the hangup button, THE System SHALL close their WebRTC connection and notify other Participants
2. WHEN the host ends the voice chat session, THE System SHALL disconnect all Participants and close all connections
3. THE System SHALL provide a mute/unmute toggle button that responds within 100ms
4. THE System SHALL provide a camera on/off toggle button that responds within 100ms
5. WHEN a Participant is disconnected by the host, THE System SHALL notify them with the reason
6. THE System SHALL allow the host to mute any Participant's audio remotely
7. WHEN a control operation fails, THE System SHALL display an error message and maintain the previous state

### Requirement 11: WebRTC Service 扩展

**User Story:** 作为开发者，我希望扩展现有的 WebRTC_Service 类，以便支持连麦功能而不破坏现有功能。

#### Acceptance Criteria

1. THE System SHALL extend the existing WebRTC_Service class to add voice chat capabilities
2. THE System SHALL maintain backward compatibility with existing push/pull stream functionality
3. THE System SHALL encapsulate all WebRTC connection logic within WebRTC_Service
4. THE System SHALL expose a clean API for initiating, accepting, and terminating voice chat connections
5. THE System SHALL handle all SDP and ICE candidate exchanges internally
6. THE System SHALL emit events for connection state changes that can be consumed by UI components
7. THE System SHALL provide methods for controlling audio and video tracks

### Requirement 12: 信令通道实现

**User Story:** 作为系统架构师，我希望实现可靠的信令通道，以便在参与者之间交换控制信息。

#### Acceptance Criteria

1. THE Signaling_Channel SHALL support sending connection requests, SDP offers/answers, and ICE candidates
2. THE Signaling_Channel SHALL deliver messages with a maximum latency of 500ms under normal network conditions
3. THE Signaling_Channel SHALL use WebSocket for real-time communication when available
4. IF WebSocket is unavailable, THEN THE Signaling_Channel SHALL fall back to HTTP polling with 1-second intervals
5. THE Signaling_Channel SHALL authenticate all messages to prevent unauthorized access
6. THE Signaling_Channel SHALL handle message ordering to ensure SDP exchange completes before ICE candidate exchange
7. WHEN a message fails to deliver, THE Signaling_Channel SHALL retry up to 3 times before reporting failure
