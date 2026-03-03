/**
 * 渲染协调器
 * 协调主线程和 Worker 线程的渲染工作
 */

import type { ActiveDanmaku, WorkerMessage, WorkerResponse, RenderPayload } from '../types'
import { DanmakuType } from '../types'
import { RenderCache } from './RenderCache'

/**
 * 渲染协调器接口
 */
export interface IRenderCoordinator {
  initialize(canvas: HTMLCanvasElement, useOffscreen: boolean): void
  render(danmakuList: ActiveDanmaku[]): void
  clear(): void
  destroy(): void
}

/**
 * 渲染协调器实现
 */
export class RenderCoordinator implements IRenderCoordinator {
  private canvas: HTMLCanvasElement | null = null
  private ctx: CanvasRenderingContext2D | null = null
  private worker: Worker | null = null
  private useOffscreen: boolean = false
  private cache: RenderCache
  private canvasWidth: number = 0
  private canvasHeight: number = 0

  constructor(cacheSizeMB: number = 100) {
    this.cache = new RenderCache(cacheSizeMB)
  }

  /**
   * 初始化渲染器
   */
  initialize(canvas: HTMLCanvasElement, useOffscreen: boolean = true): void {
    this.canvas = canvas
    this.canvasWidth = canvas.width
    this.canvasHeight = canvas.height
    this.ctx = canvas.getContext('2d')

    if (!this.ctx) {
      throw new Error('Failed to get 2D context')
    }

    // 尝试使用离屏渲染
    if (useOffscreen && this.supportsOffscreenCanvas()) {
      try {
        this.initializeWorker()
        this.useOffscreen = true
      } catch (error) {
        console.warn('Failed to initialize Worker, falling back to main thread rendering:', error)
        this.useOffscreen = false
      }
    } else {
      this.useOffscreen = false
    }
  }

  /**
   * 渲染弹幕列表
   */
  render(danmakuList: ActiveDanmaku[]): void {
    if (!this.canvas || !this.ctx) {
      return
    }

    // 过滤可见区域内的弹幕（性能优化）
    const visibleDanmaku = this.filterVisibleDanmaku(danmakuList)

    if (this.useOffscreen && this.worker) {
      // 使用 Worker 渲染
      this.renderWithWorker(visibleDanmaku)
    } else {
      // 使用主线程渲染
      this.renderOnMainThread(visibleDanmaku)
    }
  }

  /**
   * 清空画布
   */
  clear(): void {
    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    }

    if (this.worker) {
      const message: WorkerMessage = {
        type: 'clear',
        payload: null
      }
      this.worker.postMessage(message)
    }
  }

  /**
   * 销毁渲染器
   */
  destroy(): void {
    if (this.worker) {
      this.worker.terminate()
      this.worker = null
    }

    this.cache.clear()
    this.canvas = null
    this.ctx = null
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats() {
    return this.cache.getStats()
  }

  /**
   * 检查是否支持 OffscreenCanvas
   */
  private supportsOffscreenCanvas(): boolean {
    return typeof OffscreenCanvas !== 'undefined' && typeof Worker !== 'undefined'
  }

  /**
   * 初始化 Worker
   */
  private initializeWorker(): void {
    // 注意：在实际使用中，需要配置 Vite 来正确处理 Worker
    // 这里使用相对路径，Vite 会自动处理
    this.worker = new Worker(
      new URL('./offscreen.worker.ts', import.meta.url),
      { type: 'module' }
    )

    this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      this.handleWorkerResponse(event.data)
    }

    this.worker.onerror = (error: ErrorEvent) => {
      console.error('Worker error:', error)
      // 降级到主线程渲染
      this.useOffscreen = false
      this.worker?.terminate()
      this.worker = null
    }
  }

  /**
   * 处理 Worker 响应
   */
  private handleWorkerResponse(response: WorkerResponse): void {
    if (response.type === 'rendered') {
      const { imageBitmap } = response.payload
      if (this.ctx && imageBitmap) {
        this.ctx.drawImage(imageBitmap, 0, 0)
      }
    } else if (response.type === 'cached') {
      const { key, imageBitmap } = response.payload
      if (key && imageBitmap) {
        this.cache.set(key, imageBitmap)
      }
    } else if (response.type === 'error') {
      console.error('Worker error:', response.payload.message)
    }
  }

  /**
   * 使用 Worker 渲染
   */
  private renderWithWorker(danmakuList: ActiveDanmaku[]): void {
    if (!this.worker) {
      return
    }

    const payload: RenderPayload = {
      danmakuList,
      canvasWidth: this.canvasWidth,
      canvasHeight: this.canvasHeight
    }

    const message: WorkerMessage = {
      type: 'render',
      payload
    }

    this.worker.postMessage(message)
  }

  /**
   * 在主线程渲染
   */
  private renderOnMainThread(danmakuList: ActiveDanmaku[]): void {
    if (!this.ctx || !this.canvas) {
      return
    }

    // 清空画布
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    // 渲染所有弹幕
    for (const danmaku of danmakuList) {
      this.renderDanmaku(this.ctx, danmaku)
    }
  }

  /**
   * 渲染单个弹幕
   */
  private renderDanmaku(ctx: CanvasRenderingContext2D, danmaku: ActiveDanmaku): void {
    const { x, y, text, color, size, type } = danmaku

    // 检查缓存
    const cacheKey = this.cache.generateKey(danmaku)
    const cachedTexture = this.cache.get(cacheKey)

    if (cachedTexture) {
      // 使用缓存的纹理
      ctx.drawImage(cachedTexture, x, y)
      return
    }

    // 保存上下文状态
    ctx.save()

    // 设置字体
    ctx.font = `${size}px Arial, sans-serif`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'

    // VIP 弹幕添加特殊边框
    if (type === DanmakuType.VIP) {
      this.renderVIPBorder(ctx, x, y, text, size)
    }

    // 礼物弹幕添加动画效果
    if (type === DanmakuType.GIFT) {
      this.renderGiftEffect(ctx, x, y, text, size)
    }

    // 渲染弹幕文本
    this.renderDanmakuText(ctx, text, color, size, x, y)

    // 恢复上下文状态
    ctx.restore()

    // 预渲染到缓存（异步）
    this.prerenderToCache(danmaku)
  }

  /**
   * 渲染弹幕文本（带描边）
   */
  private renderDanmakuText(
    ctx: CanvasRenderingContext2D,
    text: string,
    color: string,
    size: number,
    x: number,
    y: number
  ): void {
    // 设置字体
    ctx.font = `${size}px Arial, sans-serif`

    // 绘制黑色描边
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 2
    ctx.strokeText(text, x, y)

    // 绘制文本
    ctx.fillStyle = color
    ctx.fillText(text, x, y)
  }

  /**
   * 渲染 VIP 边框
   */
  private renderVIPBorder(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    text: string,
    size: number
  ): void {
    // 测量文本宽度
    ctx.font = `${size}px Arial, sans-serif`
    const metrics = ctx.measureText(text)
    const width = metrics.width

    // 绘制金色边框
    ctx.strokeStyle = '#FFD700'
    ctx.lineWidth = 3
    ctx.strokeRect(x - 5, y - 5, width + 10, size + 10)

    // 绘制 VIP 图标（简化为文字）
    ctx.fillStyle = '#FFD700'
    ctx.font = `${size * 0.6}px Arial, sans-serif`
    ctx.fillText('VIP', x - 30, y)
  }

  /**
   * 渲染礼物效果
   */
  private renderGiftEffect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    text: string,
    size: number
  ): void {
    // 添加发光效果
    ctx.shadowColor = '#FF69B4'
    ctx.shadowBlur = 10
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 0

    // 绘制礼物图标（简化为星星）
    ctx.fillStyle = '#FF69B4'
    ctx.font = `${size * 0.8}px Arial, sans-serif`
    ctx.fillText('★', x - 25, y)
  }

  /**
   * 预渲染到缓存
   */
  private prerenderToCache(danmaku: ActiveDanmaku): void {
    // 创建临时 canvas
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = 500
    tempCanvas.height = 100
    const tempCtx = tempCanvas.getContext('2d')

    if (!tempCtx) {
      return
    }

    // 渲染弹幕文本
    this.renderDanmakuText(tempCtx, danmaku.text, danmaku.color, danmaku.size, 0, 50)

    // 创建 ImageBitmap 并缓存
    if (typeof createImageBitmap !== 'undefined') {
      createImageBitmap(tempCanvas).then(imageBitmap => {
        const cacheKey = this.cache.generateKey(danmaku)
        this.cache.set(cacheKey, imageBitmap)
      }).catch(error => {
        console.warn('Failed to create ImageBitmap:', error)
      })
    }
  }

  /**
   * 过滤可见区域内的弹幕
   */
  private filterVisibleDanmaku(danmakuList: ActiveDanmaku[]): ActiveDanmaku[] {
    return danmakuList.filter(danmaku => {
      // 估算弹幕宽度
      const width = this.estimateTextWidth(danmaku.text, danmaku.size)
      
      // 检查是否在可见区域内
      return danmaku.x + width >= 0 && danmaku.x <= this.canvasWidth
    })
  }

  /**
   * 估算文本宽度
   */
  private estimateTextWidth(text: string, size: number): number {
    // 简化计算：每个字符约占字体大小的 0.6 倍宽度
    return text.length * size * 0.6
  }
}
