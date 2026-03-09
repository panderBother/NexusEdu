/**
 * 弹幕管理器
 * 系统的核心协调者，负责弹幕的完整生命周期
 */

import type { DanmakuItem, DanmakuConfig, ActiveDanmaku } from '../types'
import { DanmakuType } from '../types'
import { PriorityQueue } from '../queue/PriorityQueue'
import { TrackManager } from '../track/TrackManager'
import { RenderCoordinator } from '../render/RenderCoordinator'
import { DanmakuValidator } from '../validation/DanmakuValidator'
import { PrerendererManager } from '../prerender/PrerendererManager'

/**
 * 用户限流记录
 */
interface UserRateLimit {
  userId: string
  count: number
  resetTime: number
}

/**
 * 弹幕管理器接口
 */
export interface IDanmakuManager {
  initialize(canvas: HTMLCanvasElement, config: DanmakuConfig): void
  addDanmaku(danmaku: DanmakuItem): void
  start(): void
  stop(): void
  update(deltaTime: number): void
  clear(): void
  getActiveDanmakuCount(): number
}

/**
 * 弹幕管理器实现
 */
export class DanmakuManager implements IDanmakuManager {
  private canvas: HTMLCanvasElement | null = null
  private config: DanmakuConfig | null = null
  private queue: PriorityQueue
  private trackManager: TrackManager
  private renderCoordinator: RenderCoordinator
  private prerenderer: PrerendererManager | null = null
  private activeDanmaku: ActiveDanmaku[] = []
  private animationFrameId: number | null = null
  private lastUpdateTime: number = 0
  private isRunning: boolean = false
  
  // 用户限流
  private userRateLimits: Map<string, UserRateLimit> = new Map()
  private readonly rateLimitWindow: number = 1000 // 1 秒
  private readonly maxDanmakuPerUser: number = 3

  // 性能监控
  private fps: number = 60
  private frameCount: number = 0
  private fpsUpdateTime: number = 0

  constructor() {
    this.queue = new PriorityQueue(5000)
    this.trackManager = new TrackManager()
    this.renderCoordinator = new RenderCoordinator()
  }

  /**
   * 初始化系统
   */
  initialize(canvas: HTMLCanvasElement, config: DanmakuConfig): void {
    this.canvas = canvas
    this.config = config

    // 初始化轨道管理器
    this.trackManager.initialize(
      config.height,
      config.trackHeight,
      config.trackGap,
      config.width
    )

    // 初始化渲染协调器
    this.renderCoordinator.initialize(canvas, config.useOffscreen)

    // 初始化预渲染管理器
    this.prerenderer = new PrerendererManager(
      this.renderCoordinator.getCache(),
      this.queue,
      {
        enabled: true,
        lookaheadTime: 5000,
        batchSize: 20,
        interval: 1000,
        maxConcurrent: 5
      }
    )

    // 设置预渲染管理器引用到渲染协调器（用于统计）
    this.renderCoordinator.setPrerenderer(this.prerenderer)

    console.log('DanmakuManager initialized', config)
  }

  /**
   * 添加弹幕到队列
   */
  addDanmaku(danmaku: DanmakuItem): void {
    // 验证弹幕数据
    const validation = DanmakuValidator.validate(danmaku)
    if (!validation.valid) {
      console.warn('Invalid danmaku:', validation.errors)
      return
    }

    const sanitized = validation.sanitized!

    // 用户限流检查
    if (!this.checkRateLimit(sanitized.userId)) {
      console.warn('Rate limit exceeded for user:', sanitized.userId)
      return
    }

    // 添加到队列
    this.queue.enqueue(sanitized)
  }

  /**
   * 启动渲染循环
   */
  start(): void {
    if (this.isRunning) {
      return
    }

    this.isRunning = true
    this.lastUpdateTime = performance.now()
    this.fpsUpdateTime = performance.now()
    
    // 启动预渲染
    if (this.prerenderer) {
      this.prerenderer.start()
    }
    
    this.animate()
  }

  /**
   * 停止渲染循环
   */
  stop(): void {
    this.isRunning = false
    
    // 停止预渲染
    if (this.prerenderer) {
      this.prerenderer.stop()
    }
    
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
  }

  /**
   * 更新弹幕状态
   */
  update(deltaTime: number): void {
    if (!this.config) {
      return
    }

    // 从队列中取出弹幕并分配轨道
    this.processQueue()

    // 更新活动弹幕位置
    this.updateActiveDanmaku(deltaTime)

    // 移除离开屏幕的弹幕
    this.removeOffscreenDanmaku()

    // 自动密度降级
    this.autoDensityControl()

    // 渲染
    this.renderCoordinator.render(this.activeDanmaku)
  }

  /**
   * 清除所有弹幕
   */
  clear(): void {
    this.queue.clear()
    this.activeDanmaku = []
    this.renderCoordinator.clear()
  }

  /**
   * 获取当前活动弹幕数量
   */
  getActiveDanmakuCount(): number {
    return this.activeDanmaku.length
  }

  /**
   * 获取 FPS
   */
  getFPS(): number {
    return this.fps
  }

  /**
   * 获取队列长度
   */
  getQueueLength(): number {
    return this.queue.getLength()
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      activeDanmaku: this.activeDanmaku.length,
      queueLength: this.queue.getLength(),
      fps: this.fps,
      availableTracks: this.trackManager.getAvailableTrackCount(),
      cacheStats: this.renderCoordinator.getCacheStats(),
      prerendererStats: this.prerenderer ? this.prerenderer.getStats() : null
    }
  }

  /**
   * 动画循环
   */
  private animate = (): void => {
    if (!this.isRunning) {
      return
    }

    const currentTime = performance.now()
    const deltaTime = currentTime - this.lastUpdateTime
    this.lastUpdateTime = currentTime

    // 更新弹幕
    this.update(deltaTime)

    // 更新 FPS
    this.updateFPS(currentTime)

    // 请求下一帧
    this.animationFrameId = requestAnimationFrame(this.animate)
  }

  /**
   * 处理队列
   */
  private processQueue(): void {
    if (!this.config) {
      return
    }

    // 检查是否可以添加更多弹幕
    if (this.activeDanmaku.length >= this.config.maxDanmaku) {
      return
    }

    // 每帧最多处理 10 条弹幕
    const batchSize = Math.min(10, this.config.maxDanmaku - this.activeDanmaku.length)
    const danmakuList = this.queue.dequeueBatch(batchSize)

    for (const danmaku of danmakuList) {
      // 分配轨道
      const track = this.trackManager.allocateTrack(danmaku)
      
      if (track) {
        // 创建活动弹幕
        const activeDanmaku = this.createActiveDanmaku(danmaku, track)
        this.activeDanmaku.push(activeDanmaku)
      } else {
        // 没有可用轨道，重新入队
        this.queue.enqueue(danmaku)
      }
    }
  }

  /**
   * 创建活动弹幕
   */
  private createActiveDanmaku(danmaku: DanmakuItem, track: any): ActiveDanmaku {
    const duration = this.calculateDuration(danmaku)
    
    let x: number
    let y: number

    if (danmaku.type === DanmakuType.TOP || danmaku.type === DanmakuType.BOTTOM) {
      // 顶部和底部弹幕居中显示
      x = this.config!.width / 2
      y = track.y
    } else {
      // 滚动弹幕从右侧开始
      x = this.config!.width
      y = track.y
    }

    return {
      ...danmaku,
      x,
      y,
      track,
      startTime: Date.now(),
      duration,
      paused: false
    }
  }

  /**
   * 更新活动弹幕位置
   */
  private updateActiveDanmaku(deltaTime: number): void {
    if (!this.config) {
      return
    }

    for (const danmaku of this.activeDanmaku) {
      if (danmaku.paused) {
        continue
      }

      // 滚动弹幕从右向左移动
      if (danmaku.type === DanmakuType.SCROLL || 
          danmaku.type === DanmakuType.VIP || 
          danmaku.type === DanmakuType.GIFT) {
        const speed = this.config.width / danmaku.duration
        danmaku.x -= speed * deltaTime
      }

      // 顶部和底部弹幕固定位置，不移动
    }
  }

  /**
   * 移除离开屏幕的弹幕
   */
  private removeOffscreenDanmaku(): void {
    if (!this.config) {
      return
    }

    const currentTime = Date.now()
    const toRemove: number[] = []

    for (let i = 0; i < this.activeDanmaku.length; i++) {
      const danmaku = this.activeDanmaku[i]
      
      // 滚动弹幕：检查是否完全离开屏幕
      if (danmaku.type === DanmakuType.SCROLL || 
          danmaku.type === DanmakuType.VIP || 
          danmaku.type === DanmakuType.GIFT) {
        const width = this.estimateTextWidth(danmaku.text, danmaku.size)
        if (danmaku.x + width < 0) {
          toRemove.push(i)
          this.trackManager.releaseTrack(danmaku.track.id)
        }
      }
      
      // 顶部和底部弹幕：检查是否超时
      if (danmaku.type === DanmakuType.TOP || danmaku.type === DanmakuType.BOTTOM) {
        if (currentTime - danmaku.startTime > danmaku.duration) {
          toRemove.push(i)
          this.trackManager.releaseTrack(danmaku.track.id)
        }
      }
    }

    // 从后向前删除，避免索引问题
    for (let i = toRemove.length - 1; i >= 0; i--) {
      this.activeDanmaku.splice(toRemove[i], 1)
    }
  }

  /**
   * 自动密度控制
   */
  private autoDensityControl(): void {
    if (!this.config) {
      return
    }

    // 如果活动弹幕超过 200 条，自动降低密度
    if (this.activeDanmaku.length > 200) {
      // 移除优先级最低的弹幕
      this.activeDanmaku.sort((a, b) => b.priority - a.priority)
      const toRemove = this.activeDanmaku.splice(Math.floor(this.activeDanmaku.length * 0.5))
      
      // 释放轨道
      for (const danmaku of toRemove) {
        this.trackManager.releaseTrack(danmaku.track.id)
      }
    }
  }

  /**
   * 检查用户限流
   */
  private checkRateLimit(userId: string): boolean {
    const currentTime = Date.now()
    const limit = this.userRateLimits.get(userId)

    if (!limit || currentTime > limit.resetTime) {
      // 创建新的限流记录
      this.userRateLimits.set(userId, {
        userId,
        count: 1,
        resetTime: currentTime + this.rateLimitWindow
      })
      return true
    }

    if (limit.count >= this.maxDanmakuPerUser) {
      return false
    }

    limit.count++
    return true
  }

  /**
   * 计算弹幕显示时长
   */
  private calculateDuration(danmaku: DanmakuItem): number {
    if (danmaku.speed) {
      return danmaku.speed
    }

    if (danmaku.type === DanmakuType.TOP || danmaku.type === DanmakuType.BOTTOM) {
      return 3000 // 固定显示 3 秒
    }

    return 6000 // 滚动弹幕默认 6 秒
  }

  /**
   * 估算文本宽度
   */
  private estimateTextWidth(text: string, size: number): number {
    return text.length * size * 0.6
  }

  /**
   * 更新 FPS
   */
  private updateFPS(currentTime: number): void {
    this.frameCount++

    if (currentTime - this.fpsUpdateTime >= 1000) {
      this.fps = this.frameCount
      this.frameCount = 0
      this.fpsUpdateTime = currentTime
    }
  }
}
