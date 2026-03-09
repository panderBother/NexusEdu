/**
 * 预渲染管理器
 * 在空闲时间提前渲染即将出现的弹幕，减少首次渲染延迟
 */

import type { DanmakuItem, DanmakuQueue } from '../types'
import type { RenderCache } from '../render/RenderCache'

/**
 * 预渲染配置
 */
export interface PrerendererConfig {
  enabled: boolean              // 是否启用预渲染
  lookaheadTime: number        // 预渲染时间窗口（毫秒），默认 5000ms
  batchSize: number            // 每次预渲染的弹幕数量，默认 20
  interval: number             // 预渲染间隔（毫秒），默认 1000ms
  maxConcurrent: number        // 最大并发预渲染数量，默认 5
}

/**
 * 预渲染统计
 */
export interface PrerendererStats {
  totalPrerendered: number     // 总预渲染数量
  cacheHits: number           // 预渲染命中次数
  cacheMisses: number         // 预渲染未命中次数
  hitRate: number             // 命中率
  averageRenderTime: number   // 平均渲染时间
}

/**
 * 预渲染管理器
 */
export class PrerendererManager {
  private config: PrerendererConfig
  private cache: RenderCache
  private queue: DanmakuQueue
  private timerId: number | null = null
  private isRunning: boolean = false
  
  // 统计信息
  private stats: PrerendererStats = {
    totalPrerendered: 0,
    cacheHits: 0,
    cacheMisses: 0,
    hitRate: 0,
    averageRenderTime: 0
  }
  
  // 正在预渲染的弹幕（避免重复预渲染）
  private renderingKeys: Set<string> = new Set()
  
  // 渲染时间记录
  private renderTimes: number[] = []

  constructor(
    cache: RenderCache,
    queue: DanmakuQueue,
    config?: Partial<PrerendererConfig>
  ) {
    this.cache = cache
    this.queue = queue
    this.config = {
      enabled: config?.enabled ?? true,
      lookaheadTime: config?.lookaheadTime ?? 5000,
      batchSize: config?.batchSize ?? 20,
      interval: config?.interval ?? 1000,
      maxConcurrent: config?.maxConcurrent ?? 5
    }
  }

  /**
   * 启动预渲染
   */
  start(): void {
    if (!this.config.enabled || this.isRunning) {
      return
    }

    this.isRunning = true
    this.scheduleNextPrerender()
    
    console.log('[预渲染] 已启动', this.config)
  }

  /**
   * 停止预渲染
   */
  stop(): void {
    this.isRunning = false
    
    if (this.timerId !== null) {
      clearTimeout(this.timerId)
      this.timerId = null
    }
    
    this.renderingKeys.clear()
    
    console.log('[预渲染] 已停止')
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<PrerendererConfig>): void {
    this.config = { ...this.config, ...config }
    
    // 如果禁用了预渲染，停止
    if (!this.config.enabled && this.isRunning) {
      this.stop()
    }
    
    // 如果启用了预渲染，启动
    if (this.config.enabled && !this.isRunning) {
      this.start()
    }
  }

  /**
   * 获取统计信息
   */
  getStats(): PrerendererStats {
    return { ...this.stats }
  }

  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.stats = {
      totalPrerendered: 0,
      cacheHits: 0,
      cacheMisses: 0,
      hitRate: 0,
      averageRenderTime: 0
    }
    this.renderTimes = []
  }

  /**
   * 记录缓存命中
   */
  recordCacheHit(): void {
    this.stats.cacheHits++
    this.updateHitRate()
  }

  /**
   * 记录缓存未命中
   */
  recordCacheMiss(): void {
    this.stats.cacheMisses++
    this.updateHitRate()
  }

  /**
   * 调度下一次预渲染
   */
  private scheduleNextPrerender(): void {
    if (!this.isRunning) {
      return
    }

    this.timerId = window.setTimeout(() => {
      this.prerenderBatch()
      this.scheduleNextPrerender()
    }, this.config.interval)
  }

  /**
   * 批量预渲染
   */
  private async prerenderBatch(): Promise<void> {
    // 检查是否有足够的空闲时间
    if (!this.hasIdleTime()) {
      console.log('[预渲染] 系统繁忙，跳过本次预渲染')
      return
    }

    // 获取即将出现的弹幕
    const upcomingDanmaku = this.getUpcomingDanmaku()
    
    if (upcomingDanmaku.length === 0) {
      return
    }

    console.log(`[预渲染] 开始预渲染 ${upcomingDanmaku.length} 条弹幕`)

    // 使用 requestIdleCallback 在空闲时间预渲染
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(
        () => this.prerenderDanmakuList(upcomingDanmaku),
        { timeout: 2000 }
      )
    } else {
      // 降级方案：使用 setTimeout
      setTimeout(() => this.prerenderDanmakuList(upcomingDanmaku), 0)
    }
  }

  /**
   * 获取即将出现的弹幕
   */
  private getUpcomingDanmaku(): DanmakuItem[] {
    // 使用 peek 方法查看队列中即将出现的弹幕
    return this.queue.peek(this.config.lookaheadTime)
  }

  /**
   * 预渲染弹幕列表
   */
  private async prerenderDanmakuList(danmakuList: DanmakuItem[]): Promise<void> {
    const startTime = performance.now()
    let prerenderedCount = 0

    for (const danmaku of danmakuList) {
      // 检查并发数量限制
      if (this.renderingKeys.size >= this.config.maxConcurrent) {
        break
      }

      // 生成缓存键
      const cacheKey = this.cache.generateKey(danmaku)

      // 如果已经在缓存中，跳过
      if (this.cache.get(cacheKey)) {
        continue
      }

      // 如果正在预渲染，跳过
      if (this.renderingKeys.has(cacheKey)) {
        continue
      }

      // 标记为正在预渲染
      this.renderingKeys.add(cacheKey)

      // 预渲染
      try {
        await this.prerenderDanmaku(danmaku, cacheKey)
        prerenderedCount++
      } catch (error) {
        console.error('[预渲染] 预渲染失败:', error)
      } finally {
        // 移除标记
        this.renderingKeys.delete(cacheKey)
      }
    }

    const endTime = performance.now()
    const renderTime = endTime - startTime

    // 更新统计信息
    this.stats.totalPrerendered += prerenderedCount
    this.recordRenderTime(renderTime)

    console.log(`[预渲染] 完成，预渲染 ${prerenderedCount} 条，耗时 ${renderTime.toFixed(2)}ms`)
  }

  /**
   * 预渲染单个弹幕
   */
  private async prerenderDanmaku(danmaku: DanmakuItem, cacheKey: string): Promise<void> {
    // 创建临时 canvas
    const canvas = document.createElement('canvas')
    canvas.width = 500
    canvas.height = 100
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      throw new Error('Failed to get 2D context')
    }

    // 渲染弹幕文本
    this.renderDanmakuText(ctx, danmaku)

    // 创建 ImageBitmap
    const imageBitmap = await createImageBitmap(canvas)

    // 存入缓存
    this.cache.set(cacheKey, imageBitmap)

    console.log(`[预渲染] 已预渲染: ${danmaku.text}`)
  }

  /**
   * 渲染弹幕文本
   */
  private renderDanmakuText(
    ctx: CanvasRenderingContext2D,
    danmaku: DanmakuItem
  ): void {
    const { text, color, size } = danmaku

    // 设置字体
    ctx.font = `${size}px Arial, sans-serif`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'

    // 绘制黑色描边
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 2
    ctx.strokeText(text, 0, 50)

    // 绘制文本
    ctx.fillStyle = color
    ctx.fillText(text, 0, 50)
  }

  /**
   * 检查是否有空闲时间
   */
  private hasIdleTime(): boolean {
    // 简化实现：检查队列长度
    // 如果队列很长，说明系统繁忙，不适合预渲染
    return this.queue.getLength() < 100
  }

  /**
   * 记录渲染时间
   */
  private recordRenderTime(time: number): void {
    this.renderTimes.push(time)

    // 只保留最近 10 次记录
    if (this.renderTimes.length > 10) {
      this.renderTimes.shift()
    }

    // 计算平均渲染时间
    const sum = this.renderTimes.reduce((a, b) => a + b, 0)
    this.stats.averageRenderTime = sum / this.renderTimes.length
  }

  /**
   * 更新命中率
   */
  private updateHitRate(): void {
    const total = this.stats.cacheHits + this.stats.cacheMisses
    this.stats.hitRate = total === 0 ? 0 : this.stats.cacheHits / total
  }
}
