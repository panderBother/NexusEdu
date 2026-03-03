/**
 * Voice Chat Pinia Store
 * 管理连麦状态
 */

import { defineStore } from 'pinia'
import type {
  CurrentUser,
  ConnectionState,
  Participant,
  JoinRequest
} from '../types'

interface VoiceChatState {
  // 当前用户信息
  currentUser: CurrentUser | null
  
  // 连接状态
  connectionState: ConnectionState
  
  // 参与者列表
  participants: Map<string, Participant>
  
  // 连麦请求队列（主播端）
  requestQueue: JoinRequest[]
  
  // 本地媒体流
  localStream: MediaStream | null
  
  // 远程媒体流
  remoteStreams: Map<string, MediaStream>
  
  // 错误信息
  error: Error | null
}

export const useVoiceChatStore = defineStore('voiceChat', {
  state: (): VoiceChatState => ({
    currentUser: null,
    connectionState: 'idle',
    participants: new Map(),
    requestQueue: [],
    localStream: null,
    remoteStreams: new Map(),
    error: null
  }),

  getters: {
    // 获取参与者列表（数组形式）
    participantList: (state): Participant[] => {
      return Array.from(state.participants.values())
    },

    // 获取参与者数量
    participantCount: (state): number => {
      return state.participants.size
    },

    // 获取待处理的请求数量
    pendingRequestCount: (state): number => {
      return state.requestQueue.filter(r => r.status === 'pending').length
    },

    // 是否已连接
    isConnected: (state): boolean => {
      return state.connectionState === 'connected'
    },

    // 是否是主播
    isHost: (state): boolean => {
      return state.currentUser?.role === 'host'
    }
  },

  actions: {
    // 设置当前用户
    setCurrentUser(user: CurrentUser) {
      this.currentUser = user
    },

    // 更新连接状态
    updateConnectionState(state: ConnectionState) {
      this.connectionState = state
    },

    // 添加参与者
    addParticipant(participant: Participant) {
      this.participants.set(participant.id, participant)
    },

    // 移除参与者
    removeParticipant(participantId: string) {
      this.participants.delete(participantId)
      this.remoteStreams.delete(participantId)
    },

    // 更新参与者
    updateParticipant(participantId: string, updates: Partial<Participant>) {
      const participant = this.participants.get(participantId)
      if (participant) {
        this.participants.set(participantId, { ...participant, ...updates })
      }
    },

    // 添加连麦请求
    addJoinRequest(request: JoinRequest) {
      // 检查是否已存在相同用户的待处理请求
      const existingRequest = this.requestQueue.find(
        r => r.userId === request.userId && r.status === 'pending'
      )
      if (!existingRequest) {
        this.requestQueue.push(request)
      }
    },

    // 移除连麦请求
    removeJoinRequest(requestId: string) {
      const index = this.requestQueue.findIndex(r => r.id === requestId)
      if (index !== -1) {
        this.requestQueue.splice(index, 1)
      }
    },

    // 更新请求状态
    updateRequestStatus(requestId: string, status: JoinRequest['status']) {
      const request = this.requestQueue.find(r => r.id === requestId)
      if (request) {
        request.status = status
        // 如果不是 pending 状态，30 秒后自动清理
        if (status !== 'pending') {
          setTimeout(() => {
            this.removeJoinRequest(requestId)
          }, 30000)
        }
      }
    },

    // 设置本地流
    setLocalStream(stream: MediaStream | null) {
      this.localStream = stream
    },

    // 添加远程流
    addRemoteStream(participantId: string, stream: MediaStream) {
      this.remoteStreams.set(participantId, stream)
    },

    // 移除远程流
    removeRemoteStream(participantId: string) {
      this.remoteStreams.delete(participantId)
    },

    // 设置错误
    setError(error: Error) {
      this.error = error
    },

    // 清除错误
    clearError() {
      this.error = null
    },

    // 重置状态
    reset() {
      this.currentUser = null
      this.connectionState = 'idle'
      this.participants.clear()
      this.requestQueue = []
      this.localStream = null
      this.remoteStreams.clear()
      this.error = null
    },

    // 持久化状态
    persist(): string {
      const data = {
        currentUser: this.currentUser,
        connectionState: this.connectionState,
        participants: Array.from(this.participants.entries()),
        requestQueue: this.requestQueue
      }
      return JSON.stringify(data)
    },

    // 恢复状态
    restore(data: string) {
      try {
        const parsed = JSON.parse(data)
        this.currentUser = parsed.currentUser
        this.connectionState = parsed.connectionState
        this.participants = new Map(parsed.participants)
        this.requestQueue = parsed.requestQueue
      } catch (error) {
        console.error('Failed to restore state:', error)
      }
    },

    // 更新音视频状态（100ms 内）
    updateMediaStatus(participantId: string, audio?: boolean, video?: boolean) {
      const participant = this.participants.get(participantId)
      if (participant) {
        const updates: Partial<Participant> = {}
        if (audio !== undefined) updates.audioEnabled = audio
        if (video !== undefined) updates.videoEnabled = video
        this.updateParticipant(participantId, updates)
      }
    },

    // 处理请求超时（30 秒）
    startRequestTimeout(requestId: string) {
      setTimeout(() => {
        const request = this.requestQueue.find(r => r.id === requestId)
        if (request && request.status === 'pending') {
          this.updateRequestStatus(requestId, 'expired')
        }
      }, 30000)
    }
  }
})
