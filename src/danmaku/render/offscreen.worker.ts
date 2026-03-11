/**
 * 离屏渲染 Worker
 * 在 Web Worker 线程中执行弹幕渲染任务
 */

import type { WorkerMessage, RenderPayload, CachePayload, ActiveDanmaku, WorkerResponse } from '../types'
import { DanmakuType } from '../types'

// Worker 上下文
let offscreenCanvas: OffscreenCanvas | null = null
let ctx: OffscreenCanvasRenderingContext2D | null = null

/**
 * 监听主线程消息
 */
self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const { type, payload } = event.data

  try {
    switch (type) {
      case 'render':
        handleRender(payload as RenderPayload)
        break
      case 'cache':
        handleCache(payload as CachePayload)
        break
      case 'clear':
        handleClear()
        break
      default:
        sendError(`Unknown message type: ${type}`)
    }
  } catch (error) {
    sendError(error instanceof Error ? error.message : String(error))
  }
}

/**
 * 处理渲染请求
 */
function handleRender(payload: RenderPayload): void {
  const { danmakuList, canvasWidth, canvasHeight } = payload

  // 初始化 OffscreenCanvas（如果需要）
  if (!offscreenCanvas || offscreenCanvas.width !== canvasWidth || offscreenCanvas.height !== canvasHeight) {
    offscreenCanvas = new OffscreenCanvas(canvasWidth, canvasHeight)
    ctx = offscreenCanvas.getContext('2d')
    
    if (!ctx) {
      sendError('Failed to get 2D context')
      return
    }
  }

  if (!ctx) {
    sendError('Context not initialized')
    return
  }

  // 清空画布
  ctx.clearRect(0, 0, canvasWidth, canvasHeight)

  // 渲染所有弹幕
  for (const danmaku of danmakuList) {
    renderDanmaku(ctx, danmaku)
  }

  // 创建 ImageBitmap 并发送回主线程
  const imageBitmap = offscreenCanvas.transferToImageBitmap()
  
  const response: WorkerResponse = {
    type: 'rendered',
    payload: {
      imageBitmap,
      transferables: [imageBitmap]
    }
  }

  self.postMessage(response, { transfer: [imageBitmap] })
}

/**
 * 处理缓存请求（预渲染单个弹幕）
 */
function handleCache(payload: CachePayload): void {
  const { danmaku } = payload

  // 创建临时 canvas 用于预渲染
  const tempCanvas = new OffscreenCanvas(500, 100)
  const tempCtx = tempCanvas.getContext('2d')

  if (!tempCtx) {
    sendError('Failed to create temp context')
    return
  }

  // 渲染弹幕文本
  renderDanmakuText(tempCtx, danmaku.text, danmaku.color, danmaku.size, 0, 50)

  // 创建 ImageBitmap
  const imageBitmap = tempCanvas.transferToImageBitmap()

  const response: WorkerResponse = {
    type: 'cached',
    payload: {
      key: `${danmaku.text}_${danmaku.color}_${danmaku.size}`,
      imageBitmap,
      transferables: [imageBitmap]
    }
  }

  self.postMessage(response, { transfer: [imageBitmap] })
}

/**
 * 处理清空请求
 */
function handleClear(): void {
  if (ctx && offscreenCanvas) {
    ctx.clearRect(0, 0, offscreenCanvas.width, offscreenCanvas.height)
  }
}

/**
 * 渲染单个弹幕
 */
function renderDanmaku(ctx: OffscreenCanvasRenderingContext2D, danmaku: ActiveDanmaku): void {
  const { x, y, text, color, size, type } = danmaku

  // 保存上下文状态
  ctx.save()

  // 设置字体
  ctx.font = `${size}px Arial, sans-serif`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'

  // VIP 弹幕添加特殊边框
  if (type === DanmakuType.VIP) {
    renderVIPBorder(ctx, x, y, text, size)
  }

  // 礼物弹幕添加动画效果
  if (type === DanmakuType.GIFT) {
    renderGiftEffect(ctx, x, y, text, size)
  }

  // 渲染弹幕文本
  renderDanmakuText(ctx, text, color, size, x, y)

  // 恢复上下文状态
  ctx.restore()
}

/**
 * 渲染弹幕文本（带描边）
 */
function renderDanmakuText(
  ctx: OffscreenCanvasRenderingContext2D,
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
function renderVIPBorder(
  ctx: OffscreenCanvasRenderingContext2D,
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
function renderGiftEffect(
  ctx: OffscreenCanvasRenderingContext2D,
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
 * 发送错误消息
 */
function sendError(message: string): void {
  const response: WorkerResponse = {
    type: 'error',
    payload: { message }
  }
  self.postMessage(response)
}

// 导出类型（用于 TypeScript）
export {}
