/**
 * 历史回放管理器
 * 负责历史弹幕的加载和回放
 */

import type { DanmakuItem } from '../types'
import { IndexedDBStore } from '../storage/IndexedDBStore'

/**
 * 回放状态
 */
export enum PlaybackState {
  STOPPED = 'stopped',
  PLAYING = 'playing',
  PAUSED = 'paused'
}

/**
 * 回放速度
 */
export enum PlaybackSpeed {
  SLOW = 0.5,
  NORMAL = 1.0,
  FAST = 2.0,
  VERY_FAST = 4.0
}

/**
 * 历史回放管理器接口
 */
export interface IHistoryPlayer {
  loadHistory(startTime: number, endTime: number): Promise<void>
  play(): void
  pause(): void
  stop(): void
  setSpeed(speed: PlaybackSpeed): void
  seek(timestamp: number): void
  getState(): PlaybackState
}

/**
 * 历史回放管理器实现
 */
export class HistoryPlayer implements IHistoryPlayer {
  private store: IndexedDBStore
  private historyData: DanmakuItem[] = []
  private state: PlaybackState = PlaybackState.STOPPED
  private speed: PlaybackSpeed = PlaybackSpeed.NORMAL
  private currentIndex: number = 0
  private startTime: number = 0
  private playbackStartTime: number = 0
  private pausedTime: number = 0
  private timerId: number | null = null
  
  // 回调函数
  private danmakuCallbacks: Array<(danmaku: DanmakuItem) => void> = []
  private stateCallbacks: Array<(state: PlaybackState) => void> = []

  constructor(store?: IndexedDBStore) {
    this.store = store || new IndexedDBStore()
  }

  /**
   * 加载历史弹幕
   */
  async loadHistory(startTime: number, endTime: number): Promise<void> {
    try {
      // 确保数据库已初始化
      await this.store.initialize()

      // 查询历史弹幕
      this.historyData = await this.store.queryDanmaku(startTime, endTime)

      // 按时间戳排序
      this.historyData.sort((a, b) => a.timestamp - b.timestamp)

      this.startTime = startTime
      this.currentIndex = 0

      console.log(`Loaded ${this.historyData.length} historical danmaku`)
    } catch (error) {
      console.error('Failed to load history:', error)
      throw error
    }
  }

  /**
   * 开始回放
   */
  play(): void {
    if (this.state === PlaybackState.PLAYING) {
      return
    }

    if (this.historyData.length === 0) {
      console.warn('No history data to play')
      return
    }

    if (this.state === PlaybackState.PAUSED) {
      // 从暂停恢复
      this.playbackStartTime += Date.now() - this.pausedTime
    } else {
      // 开始新的回放
      this.playbackStartTime = Date.now()
      this.currentIndex = 0
    }

    this.state = PlaybackState.PLAYING
    this.notifyStateChange()
    this.scheduleNext()
  }

  /**
   * 暂停回放
   */
  pause(): void {
    if (this.state !== PlaybackState.PLAYING) {
      return
    }

    this.state = PlaybackState.PAUSED
    this.pausedTime = Date.now()
    this.notifyStateChange()

    if (this.timerId !== null) {
      clearTimeout(this.timerId)
      this.timerId = null
    }
  }

  /**
   * 停止回放
   */
  stop(): void {
    this.state = PlaybackState.STOPPED
    this.currentIndex = 0
    this.notifyStateChange()

    if (this.timerId !== null) {
      clearTimeout(this.timerId)
      this.timerId = null
    }
  }

  /**
   * 设置回放速度
   */
  setSpeed(speed: PlaybackSpeed): void {
    this.speed = speed

    // 如果正在播放，重新调度
    if (this.state === PlaybackState.PLAYING) {
      if (this.timerId !== null) {
        clearTimeout(this.timerId)
        this.timerId = null
      }
      this.scheduleNext()
    }
  }

  /**
   * 跳转到指定时间
   */
  seek(timestamp: number): void {
    // 查找对应的索引
    let index = 0
    for (let i = 0; i < this.historyData.length; i++) {
      if (this.historyData[i].timestamp >= timestamp) {
        index = i
        break
      }
    }

    this.currentIndex = index
    this.playbackStartTime = Date.now() - (timestamp - this.startTime) / this.speed

    // 如果正在播放，重新调度
    if (this.state === PlaybackState.PLAYING) {
      if (this.timerId !== null) {
        clearTimeout(this.timerId)
        this.timerId = null
      }
      this.scheduleNext()
    }
  }

  /**
   * 获取回放状态
   */
  getState(): PlaybackState {
    return this.state
  }

  /**
   * 获取回放速度
   */
  getSpeed(): PlaybackSpeed {
    return this.speed
  }

  /**
   * 获取当前进度
   */
  getProgress(): number {
    if (this.historyData.length === 0) {
      return 0
    }
    return this.currentIndex / this.historyData.length
  }

  /**
   * 获取当前时间
   */
  getCurrentTime(): number {
    if (this.state === PlaybackState.STOPPED) {
      return this.startTime
    }

    const elapsed = (Date.now() - this.playbackStartTime) * this.speed
    return this.startTime + elapsed
  }

  /**
   * 监听弹幕事件
   */
  onDanmaku(callback: (danmaku: DanmakuItem) => void): void {
    this.danmakuCallbacks.push(callback)
  }

  /**
   * 监听状态变化
   */
  onStateChange(callback: (state: PlaybackState) => void): void {
    this.stateCallbacks.push(callback)
  }

  /**
   * 清除所有回调
   */
  clearCallbacks(): void {
    this.danmakuCallbacks = []
    this.stateCallbacks = []
  }

  /**
   * 调度下一条弹幕
   */
  private scheduleNext(): void {
    if (this.state !== PlaybackState.PLAYING) {
      return
    }

    if (this.currentIndex >= this.historyData.length) {
      // 回放结束
      this.stop()
      return
    }

    const danmaku = this.historyData[this.currentIndex]
    const currentTime = this.getCurrentTime()
    const delay = Math.max(0, (danmaku.timestamp - currentTime) / this.speed)

    this.timerId = window.setTimeout(() => {
      // 发送弹幕
      this.notifyDanmaku(danmaku)
      this.currentIndex++

      // 调度下一条
      this.scheduleNext()
    }, delay)
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
   * 通知状态变化
   */
  private notifyStateChange(): void {
    for (const callback of this.stateCallbacks) {
      try {
        callback(this.state)
      } catch (error) {
        console.error('State change callback error:', error)
      }
    }
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      totalDanmaku: this.historyData.length,
      currentIndex: this.currentIndex,
      progress: this.getProgress(),
      state: this.state,
      speed: this.speed,
      currentTime: this.getCurrentTime()
    }
  }

  /**
   * 销毁回放器
   */
  destroy(): void {
    this.stop()
    this.clearCallbacks()
    this.historyData = []
  }
}
