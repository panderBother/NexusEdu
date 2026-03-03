/**
 * WebSocket 客户端
 * 负责实时通信和自动重连
 */

import type { DanmakuItem, WebSocketMessage } from '../types'

/**
 * 连接状态
 */
export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  FAILED = 'failed'
}

/**
 * WebSocket 客户端接口
 */
export interface IWebSocketClient {
  connect(url: string): Promise<void>
  disconnect(): void
  sendDanmaku(danmaku: DanmakuItem): void
  onDanmaku(callback: (danmaku: DanmakuItem) => void): void
  onConnectionChange(callback: (connected: boolean) => void): void
  reconnect(): Promise<void>
}

/**
 * WebSocket 客户端实现
 */
export class WebSocketClient implements IWebSocketClient {
  private ws: WebSocket | null = null
  private url: string = ''
  private state: ConnectionState = ConnectionState.DISCONNECTED
  private reconnectAttempts: number = 0
  private maxReconnectAttempts: number = 5
  private reconnectDelay: number = 1000 // 初始重连延迟（毫秒）
  private reconnectTimer: number | null = null
  private messageQueue: WebSocketMessage[] = []
  private maxQueueSize: number = 100

  // 回调函数
  private danmakuCallbacks: Array<(danmaku: DanmakuItem) => void> = []
  private connectionCallbacks: Array<(connected: boolean) => void> = []

  /**
   * 连接服务器
   */
  async connect(url: string): Promise<void> {
    this.url = url
    this.state = ConnectionState.CONNECTING

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(url)

        this.ws.onopen = () => {
          this.handleOpen()
          resolve()
        }

        this.ws.onmessage = (event) => {
          this.handleMessage(event)
        }

        this.ws.onerror = (error) => {
          this.handleError(error)
          reject(error)
        }

        this.ws.onclose = () => {
          this.handleClose()
        }
      } catch (error) {
        this.state = ConnectionState.FAILED
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

    this.state = ConnectionState.DISCONNECTED
    this.notifyConnectionChange(false)
  }

  /**
   * 发送弹幕
   */
  sendDanmaku(danmaku: DanmakuItem): void {
    const message: WebSocketMessage = {
      type: 'danmaku',
      payload: danmaku,
      timestamp: Date.now()
    }

    this.sendMessage(message)
  }

  /**
   * 监听弹幕消息
   */
  onDanmaku(callback: (danmaku: DanmakuItem) => void): void {
    this.danmakuCallbacks.push(callback)
  }

  /**
   * 监听连接状态变化
   */
  onConnectionChange(callback: (connected: boolean) => void): void {
    this.connectionCallbacks.push(callback)
  }

  /**
   * 重连
   */
  async reconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.state = ConnectionState.FAILED
      console.error('Max reconnect attempts reached')
      return
    }

    this.state = ConnectionState.RECONNECTING
    this.reconnectAttempts++

    // 指数退避
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)
    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`)

    return new Promise((resolve, reject) => {
      this.reconnectTimer = window.setTimeout(async () => {
        try {
          await this.connect(this.url)
          this.reconnectAttempts = 0 // 重置重连计数
          resolve()
        } catch (error) {
          console.error('Reconnect failed:', error)
          // 继续尝试重连
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            await this.reconnect()
          }
          reject(error)
        }
      }, delay)
    })
  }

  /**
   * 获取连接状态
   */
  getState(): ConnectionState {
    return this.state
  }

  /**
   * 是否已连接
   */
  isConnected(): boolean {
    return this.state === ConnectionState.CONNECTED && this.ws?.readyState === WebSocket.OPEN
  }

  /**
   * 处理连接打开
   */
  private handleOpen(): void {
    this.state = ConnectionState.CONNECTED
    this.reconnectAttempts = 0
    console.log('WebSocket connected')
    this.notifyConnectionChange(true)

    // 发送队列中的消息
    this.flushMessageQueue()
  }

  /**
   * 处理消息
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data)

      switch (message.type) {
        case 'danmaku':
          this.notifyDanmaku(message.payload)
          break
        case 'like':
        case 'comment':
        case 'report':
          // 处理其他类型的消息
          console.log('Received message:', message)
          break
        default:
          console.warn('Unknown message type:', message.type)
      }
    } catch (error) {
      console.error('Failed to parse message:', error)
    }
  }

  /**
   * 处理错误
   */
  private handleError(error: Event): void {
    console.error('WebSocket error:', error)
    this.state = ConnectionState.FAILED
  }

  /**
   * 处理连接关闭
   */
  private handleClose(): void {
    console.log('WebSocket closed')
    this.state = ConnectionState.DISCONNECTED
    this.notifyConnectionChange(false)

    // 自动重连
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnect().catch(error => {
        console.error('Auto reconnect failed:', error)
      })
    }
  }

  /**
   * 发送消息
   */
  private sendMessage(message: WebSocketMessage): void {
    if (this.isConnected()) {
      try {
        this.ws!.send(JSON.stringify(message))
      } catch (error) {
        console.error('Failed to send message:', error)
        this.queueMessage(message)
      }
    } else {
      // 连接未建立，加入队列
      this.queueMessage(message)
    }
  }

  /**
   * 将消息加入队列
   */
  private queueMessage(message: WebSocketMessage): void {
    if (this.messageQueue.length >= this.maxQueueSize) {
      // 队列已满，移除最旧的消息
      this.messageQueue.shift()
    }
    this.messageQueue.push(message)
  }

  /**
   * 发送队列中的消息
   */
  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.isConnected()) {
      const message = this.messageQueue.shift()!
      this.sendMessage(message)
    }
  }

  /**
   * 通知弹幕回调
   */
  private notifyDanmaku(danmaku: DanmakuItem): void {
    for (const callback of this.danmakuCallbacks) {
      try {
        callback(danmaku)
      } catch (error) {
        console.error('Danmaku callback error:', error)
      }
    }
  }

  /**
   * 通知连接状态变化
   */
  private notifyConnectionChange(connected: boolean): void {
    for (const callback of this.connectionCallbacks) {
      try {
        callback(connected)
      } catch (error) {
        console.error('Connection callback error:', error)
      }
    }
  }

  /**
   * 清除所有回调
   */
  clearCallbacks(): void {
    this.danmakuCallbacks = []
    this.connectionCallbacks = []
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      state: this.state,
      reconnectAttempts: this.reconnectAttempts,
      queueLength: this.messageQueue.length,
      isConnected: this.isConnected()
    }
  }
}
