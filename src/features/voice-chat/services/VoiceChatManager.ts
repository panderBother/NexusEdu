/**
 * VoiceChatManager
 * 连麦管理器，协调整个连麦流程
 */

import { WebRTCService } from '@/services/WebRTCService'
import { SignalingClient } from './SignalingClient'
import { PeerConnectionManager } from './PeerConnectionManager'
import { useVoiceChatStore } from '../stores/voiceChatStore'
import type {
  UserRole,
  Participant,
  VoiceChatEvent,
  EventHandler,
  JoinRequest,
  NetworkQuality
} from '../types'
import { MAX_PARTICIPANTS } from '../constants'

export class VoiceChatManager {
  private webrtcService: WebRTCService
  private signalingClient: SignalingClient
  private peerConnectionManager: PeerConnectionManager
  private store: ReturnType<typeof useVoiceChatStore>
  private eventHandlers: Map<VoiceChatEvent, Set<EventHandler>> = new Map()
  private userId: string = ''
  private role: UserRole = 'audience'
  private localStream: MediaStream | null = null
  private iceCandidateQueue: Map<string, RTCIceCandidateInit[]> = new Map()

  constructor() {
    this.webrtcService = new WebRTCService()
    this.signalingClient = new SignalingClient()
    this.peerConnectionManager = new PeerConnectionManager()
    this.store = useVoiceChatStore()
  }

  /**
   * 初始化
   */
  async initialize(userId: string, role: UserRole): Promise<void> {
    this.userId = userId
    this.role = role

    // 设置当前用户
    this.store.setCurrentUser({
      id: userId,
      role,
      audioEnabled: false,
      videoEnabled: false
    })

    // 设置信令事件监听
    this.setupSignalingListeners()
  }

  /**
   * 连接信令服务器
   */
  async connectSignaling(url: string, token: string): Promise<void> {
    await this.signalingClient.connect(url, token)
  }

  /**
   * 连麦申请（观众端）
   */
  async requestJoin(): Promise<void> {
    if (this.role !== 'audience') {
      throw new Error('Only audience can request to join')
    }

    // 检查是否已有待处理的请求
    const hasPendingRequest = this.store.requestQueue.some(
      r => r.userId === this.userId && r.status === 'pending'
    )
    if (hasPendingRequest) {
      throw new Error('Already have a pending request')
    }

    this.store.updateConnectionState('requesting')

    // 发送连麦请求到主播
    await this.signalingClient.sendJoinRequest('host')

    this.store.updateConnectionState('waiting')
  }

  /**
   * 接受连麦（主播端）
   */
  async acceptRequest(requestId: string): Promise<void> {
    if (this.role !== 'host') {
      throw new Error('Only host can accept requests')
    }

    // 检查参与者数量限制
    if (this.store.participantCount >= MAX_PARTICIPANTS) {
      throw new Error(`Maximum ${MAX_PARTICIPANTS} participants allowed`)
    }

    const request = this.store.requestQueue.find(r => r.id === requestId)
    if (!request) {
      throw new Error('Request not found')
    }

    // 更新请求状态
    this.store.updateRequestStatus(requestId, 'accepted')

    // 创建 PeerConnection
    const pc = this.peerConnectionManager.createConnection(request.userId)

    // 添加本地流
    if (this.localStream) {
      this.webrtcService.addLocalStreamToPeer(pc, this.localStream)
    }

    // 设置 ICE 候选监听
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.signalingClient.sendIceCandidate(request.userId, event.candidate.toJSON())
      }
    }

    // 设置远程流监听
    pc.ontrack = (event) => {
      const stream = event.streams[0]
      this.store.addRemoteStream(request.userId, stream)
      this.emit('participant-joined', {
        id: request.userId,
        name: request.userName,
        role: 'audience',
        audioEnabled: true,
        videoEnabled: true,
        connectionState: pc.connectionState,
        networkQuality: {
          level: 'excellent',
          packetLoss: 0,
          jitter: 0,
          rtt: 0
        }
      })
    }

    // 创建 Offer
    this.store.updateConnectionState('offering')
    const offer = await this.webrtcService.createOffer(pc)

    // 发送 Offer
    await this.signalingClient.sendOffer(request.userId, offer)

    // 监控连接状态
    this.peerConnectionManager.monitorConnectionState(request.userId, (state) => {
      this.store.updateParticipant(request.userId, { connectionState: state })
      if (state === 'connected') {
        this.store.updateConnectionState('connected')
      }
      this.emit('connection-state-changed', { participantId: request.userId, state })
    })

    // 监控网络质量
    this.peerConnectionManager.monitorNetworkQuality(request.userId, (quality) => {
      this.store.updateParticipant(request.userId, { networkQuality: quality })
      this.emit('network-quality-changed', { participantId: request.userId, quality })
    })

    // 从请求队列中移除
    this.store.removeJoinRequest(requestId)
  }

  /**
   * 拒绝连麦（主播端）
   */
  async rejectRequest(requestId: string): Promise<void> {
    if (this.role !== 'host') {
      throw new Error('Only host can reject requests')
    }

    const request = this.store.requestQueue.find(r => r.id === requestId)
    if (!request) {
      throw new Error('Request not found')
    }

    // 更新请求状态
    this.store.updateRequestStatus(requestId, 'rejected')

    // 发送拒绝通知
    await this.signalingClient.sendHangup(request.userId)

    // 从请求队列中移除
    this.store.removeJoinRequest(requestId)

    this.emit('request-rejected', { requestId, userId: request.userId })
  }

  /**
   * 挂断连麦
   */
  async hangup(): Promise<void> {
    // 关闭所有连接
    this.peerConnectionManager.closeAllConnections()

    // 停止本地流
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop())
      this.localStream = null
    }

    // 发送挂断信号
    const participants = Array.from(this.store.participants.keys())
    for (const participantId of participants) {
      await this.signalingClient.sendHangup(participantId)
    }

    // 清理状态
    this.store.reset()
    this.store.updateConnectionState('closed')
  }

  /**
   * 控制音频
   */
  async toggleAudio(enabled: boolean): Promise<void> {
    if (!this.localStream) {
      throw new Error('No local stream available')
    }

    const audioTracks = this.localStream.getAudioTracks()
    audioTracks.forEach(track => {
      track.enabled = enabled
    })

    // 更新状态
    if (this.store.currentUser) {
      this.store.currentUser.audioEnabled = enabled
    }

    // 通知其他参与者
    // TODO: 发送音频状态变化通知
  }

  /**
   * 控制视频
   */
  async toggleVideo(enabled: boolean): Promise<void> {
    if (!this.localStream) {
      throw new Error('No local stream available')
    }

    const videoTracks = this.localStream.getVideoTracks()
    videoTracks.forEach(track => {
      track.enabled = enabled
    })

    // 更新状态
    if (this.store.currentUser) {
      this.store.currentUser.videoEnabled = enabled
    }

    // 通知其他参与者
    // TODO: 发送视频状态变化通知
  }

  /**
   * 远程静音控制（主播端）
   */
  async remoteMute(participantId: string, muted: boolean): Promise<void> {
    if (this.role !== 'host') {
      throw new Error('Only host can remotely mute participants')
    }

    // 发送远程静音指令
    // TODO: 通过信令发送静音指令

    // 更新参与者状态
    this.store.updateParticipant(participantId, { audioEnabled: !muted })
  }

  /**
   * 获取参与者列表
   */
  getParticipants(): Participant[] {
    return this.store.participantList
  }

  /**
   * 获取本地媒体流
   */
  async getLocalStream(constraints?: MediaStreamConstraints): Promise<MediaStream> {
    if (!this.localStream) {
      this.localStream = await this.webrtcService.getLocalMediaStream(constraints)
      this.store.setLocalStream(this.localStream)
    }
    return this.localStream
  }

  /**
   * 事件监听
   */
  on(event: VoiceChatEvent, handler: EventHandler): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set())
    }
    this.eventHandlers.get(event)!.add(handler)
  }

  /**
   * 取消事件监听
   */
  off(event: VoiceChatEvent, handler: EventHandler): void {
    const handlers = this.eventHandlers.get(event)
    if (handlers) {
      handlers.delete(handler)
    }
  }

  /**
   * 触发事件
   */
  private emit(event: VoiceChatEvent, data: any): void {
    const handlers = this.eventHandlers.get(event)
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data)
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error)
        }
      })
    }
  }

  /**
   * 设置信令监听器
   */
  private setupSignalingListeners(): void {
    // 连麦请求
    this.signalingClient.on('join-request', (message) => {
      if (this.role === 'host') {
        const request: JoinRequest = {
          id: `req_${Date.now()}`,
          userId: message.from,
          userName: message.from,
          timestamp: message.timestamp,
          status: 'pending'
        }
        this.store.addJoinRequest(request)
        this.store.startRequestTimeout(request.id)
        this.emit('request-received', request)
      }
    })

    // Offer
    this.signalingClient.on('offer', async (message) => {
      const pc = this.peerConnectionManager.createConnection(message.from)

      // 添加本地流
      if (this.localStream) {
        this.webrtcService.addLocalStreamToPeer(pc, this.localStream)
      }

      // 设置 ICE 候选监听
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          this.signalingClient.sendIceCandidate(message.from, event.candidate.toJSON())
        }
      }

      // 设置远程流监听
      pc.ontrack = (event) => {
        const stream = event.streams[0]
        this.store.addRemoteStream(message.from, stream)
      }

      // 设置远程描述
      await this.webrtcService.setRemoteDescription(pc, message.data.sdp)

      // 处理队列中的 ICE 候选
      const queuedCandidates = this.iceCandidateQueue.get(message.from) || []
      for (const candidate of queuedCandidates) {
        await this.webrtcService.addIceCandidate(pc, candidate)
      }
      this.iceCandidateQueue.delete(message.from)

      // 创建 Answer
      this.store.updateConnectionState('answering')
      const answer = await this.webrtcService.createAnswer(pc)

      // 发送 Answer
      await this.signalingClient.sendAnswer(message.from, answer)

      this.store.updateConnectionState('connecting')
    })

    // Answer
    this.signalingClient.on('answer', async (message) => {
      const pc = this.peerConnectionManager.getConnection(message.from)
      if (pc) {
        await this.webrtcService.setRemoteDescription(pc, message.data.sdp)

        // 处理队列中的 ICE 候选
        const queuedCandidates = this.iceCandidateQueue.get(message.from) || []
        for (const candidate of queuedCandidates) {
          await this.webrtcService.addIceCandidate(pc, candidate)
        }
        this.iceCandidateQueue.delete(message.from)

        this.store.updateConnectionState('connecting')
      }
    })

    // ICE 候选
    this.signalingClient.on('ice-candidate', async (message) => {
      const pc = this.peerConnectionManager.getConnection(message.from)
      if (pc && pc.remoteDescription) {
        await this.webrtcService.addIceCandidate(pc, message.data.candidate)
      } else {
        // 如果还没有设置远程描述，先加入队列
        if (!this.iceCandidateQueue.has(message.from)) {
          this.iceCandidateQueue.set(message.from, [])
        }
        this.iceCandidateQueue.get(message.from)!.push(message.data.candidate)
      }
    })

    // 挂断
    this.signalingClient.on('hangup', (message) => {
      this.peerConnectionManager.removeConnection(message.from)
      this.store.removeParticipant(message.from)
      this.emit('participant-left', { participantId: message.from })
    })

    // 错误
    this.signalingClient.on('error', (message) => {
      this.store.setError(new Error(message.data.error))
      this.emit('error', message.data)
    })
  }
}
