/**
 * WebRTC 连麦功能类型定义
 * 基于 SRS-SFU 架构
 */

// ==================== 基础类型 ====================

export type UserRole = 'host' | 'audience'

export type ConnectionState = 
  | 'idle'           // 空闲状态
  | 'requesting'     // 发送连麦请求
  | 'waiting'        // 等待主播审批
  | 'offering'       // 创建并发送 Offer
  | 'answering'      // 创建并发送 Answer
  | 'connecting'     // ICE 连接中
  | 'connected'      // 已连接
  | 'disconnecting'  // 断开连接中
  | 'failed'         // 连接失败
  | 'closed'         // 连接已关闭

export type NetworkQualityLevel = 'excellent' | 'good' | 'fair' | 'poor'

export type RequestStatus = 'pending' | 'accepted' | 'rejected' | 'expired'

// ==================== 网络质量 ====================

export interface NetworkQuality {
  level: NetworkQualityLevel
  packetLoss: number  // 丢包率 (0-1)
  jitter: number      // 抖动 (ms)
  rtt: number         // 往返时延 (ms)
}

// ==================== 参与者 ====================

export interface Participant {
  id: string
  name: string
  role: UserRole
  audioEnabled: boolean
  videoEnabled: boolean
  connectionState: RTCPeerConnectionState
  networkQuality: NetworkQuality
}

// ==================== 连麦请求 ====================

export interface JoinRequest {
  id: string
  userId: string
  userName: string
  timestamp: number
  status: RequestStatus
}

// ==================== 当前用户 ====================

export interface CurrentUser {
  id: string
  role: UserRole
  audioEnabled: boolean
  videoEnabled: boolean
}

// ==================== 事件类型 ====================

export type VoiceChatEvent = 
  | 'request-received'
  | 'request-accepted'
  | 'request-rejected'
  | 'participant-joined'
  | 'participant-left'
  | 'connection-state-changed'
  | 'network-quality-changed'
  | 'error'

export type SignalingEvent =
  | 'connected'
  | 'disconnected'
  | 'join-request'
  | 'offer'
  | 'answer'
  | 'ice-candidate'
  | 'hangup'
  | 'error'

// ==================== 信令消息 ====================

export interface SignalingMessage {
  type: SignalingEvent
  from: string
  to: string
  data: any
  timestamp: number
}

// ==================== WebRTC 配置 ====================

export interface WebRTCConfig {
  iceServers: RTCIceServer[]
  iceTransportPolicy: RTCIceTransportPolicy
  bundlePolicy: RTCBundlePolicy
  rtcpMuxPolicy: RTCRtcpMuxPolicy
}

export const defaultWebRTCConfig: WebRTCConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ],
  iceTransportPolicy: 'all',
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require'
}

// ==================== 媒体约束 ====================

export interface AudioConstraints {
  echoCancellation: boolean
  noiseSuppression: boolean
  autoGainControl: boolean
  sampleRate: number
  channelCount: number
}

export interface VideoConstraints {
  width: { min: number; ideal: number; max: number }
  height: { min: number; ideal: number; max: number }
  frameRate: { min: number; ideal: number; max: number }
  facingMode: 'user' | 'environment'
}

export interface MediaConstraints {
  audio: AudioConstraints
  video: VideoConstraints | false
}

export const defaultMediaConstraints: MediaConstraints = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 48000,
    channelCount: 1
  },
  video: {
    width: { min: 320, ideal: 640, max: 1280 },
    height: { min: 240, ideal: 480, max: 720 },
    frameRate: { min: 15, ideal: 24, max: 30 },
    facingMode: 'user'
  }
}

// ==================== SRS API ====================

export interface PublishParams {
  app: string
  stream: string
  sdp: string
}

export interface PublishResponse {
  code: number
  server: string
  sessionid: string
  sdp: string
}

export interface PlayParams {
  app: string
  stream: string
  sdp: string
}

export interface PlayResponse {
  code: number
  server: string
  sessionid: string
  sdp: string
}

// ==================== 错误处理 ====================

export type ErrorCategory = 
  | 'connection'
  | 'permission'
  | 'signaling'
  | 'state'
  | 'media'

export interface VoiceChatError {
  code: string
  message: string
  category: ErrorCategory
  severity: 'low' | 'medium' | 'high' | 'critical'
  recoverable: boolean
  context: Record<string, any>
  timestamp: number
}

// ==================== 重试配置 ====================

export interface RetryConfig {
  maxAttempts: number
  initialDelay: number
  maxDelay: number
  backoffMultiplier: number
}

export const defaultRetryConfig: RetryConfig = {
  maxAttempts: 3,
  initialDelay: 1000,      // 1 second
  maxDelay: 10000,         // 10 seconds
  backoffMultiplier: 2
}

// ==================== 事件处理器 ====================

export type EventHandler<T = any> = (data: T) => void

export type SignalingEventHandler = EventHandler<SignalingMessage>
