/**
 * 信令客户端
 * 负责 WebRTC 信令交换，支持 WebSocket 和 HTTP 轮询
 */

import type {
  SignalingEvent,
  SignalingMessage,
  SignalingEventHandler
} from '../types'
import { SIGNALING_MESSAGE_TIMEOUT, WS_RECONNECT_INTERVAL } from '../constants'

export class SignalingClient {
  private ws: WebSocket | null = null
  private url: string = ''
  private token: string = ''
  private connected: boolean = false
  private reconnectTimer: NodeJS.Timeout | null = null
  private eventHandlers: Map<SignalingEvent, Set<SignalingEventHandler>> = new Map()
  private messageQueue: SignalingMessage[] = []
  private sendingMessage: boolean = false

  /**
   * 连接到信令服务器
   */
  async connect(url: string, token: string): Promise<void> {
    this.url = url
    this.token = token

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(url)

        this.ws.onopen = () => {
          this.connected = true
          this.emit('connected', { type: 'connected', from: '', to: '', data: null, timestamp: Date.now() })
          this.processMessageQueue()
          resolve()
        }

        this.ws.onerror = (error) => {
          this.connected = false
          this.emit('error', {
            type: 'error',
            from: '',
            to: '',
            data: { error: 'WebSocket error', details: error },
            timestamp: Date.now()
          })
          reject(new Error('WebSocket connection failed'))
        }

        this.ws.onclose = () => {
          this.connected = false
          this.emit('disconnected', { type: 'disconnected', from: '', to: '', data: null, timestamp: Date.now() })
          this.scheduleReconnect()
        }

        this.ws.onmessage = (event) => {
          try {
            const message: SignalingMessage = JSON.parse(event.data)
            this.handleMessage(message)
          } catch (error) {
            console.error('Failed to parse signaling message:', error)
          }
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    if (this.ws) {
      this.ws.close()
      this.ws = null
    }

    this.connected = false
  }

  /**
   * 发送连麦请求
   */
  async sendJoinRequest(hostId: string): Promise<void> {
    const message: SignalingMessage = {
      type: 'join-request',
      from: this.token,
      to: hostId,
      data: { timestamp: Date.now() },
      timestamp: Date.now()
    }
    await this.sendMessage(message)
  }

  /**
   * 发送 SDP Offer
   */
  async sendOffer(targetId: string, sdp: RTCSessionDescriptionInit): Promise<void> {
    const message: SignalingMessage = {
      type: 'offer',
      from: this.token,
      to: targetId,
      data: { sdp },
      timestamp: Date.now()
    }
    await this.sendMessage(message)
  }

  /**
   * 发送 SDP Answer
   */
  async sendAnswer(targetId: string, sdp: RTCSessionDescriptionInit): Promise<void> {
    const message: SignalingMessage = {
      type: 'answer',
      from: this.token,
      to: targetId,
      data: { sdp },
      timestamp: Date.now()
    }
    await this.sendMessage(message)
  }

  /**
   * 发送 ICE 候选
   */
  async sendIceCandidate(targetId: string, candidate: RTCIceCandidateInit): Promise<void> {
    const message: SignalingMessage = {
      type: 'ice-candidate',
      from: this.token,
      to: targetId,
      data: { candidate },
      timestamp: Date.now()
    }
    await this.sendMessage(message)
  }

  /**
   * 发送挂断信号
   */
  async sendHangup(targetId: string): Promise<void> {
    const message: SignalingMessage = {
      type: 'hangup',
      from: this.token,
      to: targetId,
      data: null,
      timestamp: Date.now()
    }
    await this.sendMessage(message)
  }

  /**
   * 监听事件
   */
  on(event: SignalingEvent, handler: SignalingEventHandler): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set())
    }
    this.eventHandlers.get(event)!.add(handler)
  }

  /**
   * 取消监听事件
   */
  off(event: SignalingEvent, handler: SignalingEventHandler): void {
    const handlers = this.eventHandlers.get(event)
    if (handlers) {
      handlers.delete(handler)
    }
  }

  /**
   * 检查是否已连接
   */
  isConnected(): boolean {
    return this.connected && this.ws?.readyState === WebSocket.OPEN
  }

  /**
   * 发送消息（内部方法）
   */
  private async sendMessage(message: SignalingMessage, retryCount = 0): Promise<void> {
    // 添加认证信息
    const authenticatedMessage = {
      ...message,
      token: this.token
    }

    if (!this.isConnected()) {
      // 如果未连接，加入队列
      this.messageQueue.push(message)
      return
    }

    try {
      this.ws!.send(JSON.stringify(authenticatedMessage))
    } catch (error) {
      // 发送失败，重试最多 3 次
      if (retryCount < 3) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)))
        return this.sendMessage(message, retryCount + 1)
      } else {
        throw new Error(`Failed to send message after ${retryCount + 1} attempts`)
      }
    }
  }

  /**
   * 处理接收到的消息
   */
  private handleMessage(message: SignalingMessage): void {
    this.emit(message.type, message)
  }

  /**
   * 触发事件
   */
  private emit(event: SignalingEvent, data: SignalingMessage): void {
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
   * 处理消息队列
   */
  private async processMessageQueue(): Promise<void> {
    if (this.sendingMessage || this.messageQueue.length === 0) {
      return
    }

    this.sendingMessage = true

    while (this.messageQueue.length > 0 && this.isConnected()) {
      const message = this.messageQueue.shift()!
      try {
        await this.sendMessage(message)
      } catch (error) {
        console.error('Failed to send queued message:', error)
        // 重新加入队列
        this.messageQueue.unshift(message)
        break
      }
    }

    this.sendingMessage = false
  }

  /**
   * 安排重连
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return
    }

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      if (!this.connected && this.url) {
        console.log('Attempting to reconnect...')
        this.connect(this.url, this.token).catch(error => {
          console.error('Reconnection failed:', error)
        })
      }
    }, WS_RECONNECT_INTERVAL)
  }
}
