/**
 * 预渲染功能测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PrerendererManager } from '../prerender/PrerendererManager'
import { PriorityQueue } from '../queue/PriorityQueue'
import { RenderCache } from '../render/RenderCache'
import { DanmakuType, DanmakuSize } from '../types'
import type { DanmakuItem } from '../types'

describe('预渲染功能测试', () => {
  let cache: RenderCache
  let queue: PriorityQueue
  let prerenderer: PrerendererManager

  beforeEach(() => {
    cache = new RenderCache(10)
    queue = new PriorityQueue(100)
    prerenderer = new PrerendererManager(cache, queue, {
      enabled: true,
      lookaheadTime: 5000,
      batchSize: 10,
      interval: 100,
      maxConcurrent: 3
    })
  })

  it('应该能够创建预渲染管理器', () => {
    expect(prerenderer).toBeDefined()
    expect(prerenderer.getStats()).toEqual({
      totalPrerendered: 0,
      cacheHits: 0,
      cacheMisses: 0,
      hitRate: 0,
      averageRenderTime: 0
    })
  })

  it('应该能够启动和停止预渲染', () => {
    prerenderer.start()
    prerenderer.stop()
    expect(prerenderer.getStats().totalPrerendered).toBe(0)
  })

  it('应该能够记录缓存命中和未命中', () => {
    prerenderer.recordCacheHit()
    prerenderer.recordCacheHit()
    prerenderer.recordCacheMiss()

    const stats = prerenderer.getStats()
    expect(stats.cacheHits).toBe(2)
    expect(stats.cacheMisses).toBe(1)
    expect(stats.hitRate).toBeCloseTo(2 / 3)
  })

  it('应该能够更新配置', () => {
    prerenderer.updateConfig({ enabled: false })
    prerenderer.start()
    // 禁用后不应该启动
    expect(prerenderer.getStats().totalPrerendered).toBe(0)
  })

  it('应该能够重置统计信息', () => {
    prerenderer.recordCacheHit()
    prerenderer.recordCacheMiss()
    prerenderer.resetStats()

    const stats = prerenderer.getStats()
    expect(stats.cacheHits).toBe(0)
    expect(stats.cacheMisses).toBe(0)
    expect(stats.hitRate).toBe(0)
  })
})

describe('PriorityQueue.peek() 测试', () => {
  let queue: PriorityQueue

  beforeEach(() => {
    queue = new PriorityQueue(100)
  })

  it('应该能够查看队列中的弹幕而不出队', () => {
    const danmaku1: DanmakuItem = {
      id: '1',
      text: '测试1',
      type: DanmakuType.SCROLL,
      color: '#FFFFFF',
      size: DanmakuSize.MEDIUM,
      priority: 5,
      userId: 'user1',
      timestamp: Date.now()
    }

    const danmaku2: DanmakuItem = {
      id: '2',
      text: '测试2',
      type: DanmakuType.SCROLL,
      color: '#FFFFFF',
      size: DanmakuSize.MEDIUM,
      priority: 3,
      userId: 'user2',
      timestamp: Date.now()
    }

    queue.enqueue(danmaku1)
    queue.enqueue(danmaku2)

    // peek 不应该改变队列长度
    const peeked = queue.peek(5000)
    expect(queue.getLength()).toBe(2)
    expect(peeked.length).toBeGreaterThan(0)
  })

  it('应该按优先级返回弹幕', () => {
    const danmaku1: DanmakuItem = {
      id: '1',
      text: '低优先级',
      type: DanmakuType.SCROLL,
      color: '#FFFFFF',
      size: DanmakuSize.MEDIUM,
      priority: 3,
      userId: 'user1',
      timestamp: Date.now()
    }

    const danmaku2: DanmakuItem = {
      id: '2',
      text: '高优先级',
      type: DanmakuType.SCROLL,
      color: '#FFFFFF',
      size: DanmakuSize.MEDIUM,
      priority: 8,
      userId: 'user2',
      timestamp: Date.now()
    }

    queue.enqueue(danmaku1)
    queue.enqueue(danmaku2)

    const peeked = queue.peek(5000)
    // 高优先级应该在前面
    expect(peeked[0].priority).toBeGreaterThanOrEqual(peeked[peeked.length - 1].priority)
  })

  it('应该限制返回数量', () => {
    // 添加 30 条弹幕
    for (let i = 0; i < 30; i++) {
      queue.enqueue({
        id: `${i}`,
        text: `测试${i}`,
        type: DanmakuType.SCROLL,
        color: '#FFFFFF',
        size: DanmakuSize.MEDIUM,
        priority: 5,
        userId: `user${i}`,
        timestamp: Date.now()
      })
    }

    const peeked = queue.peek(5000)
    // 最多返回 20 条
    expect(peeked.length).toBeLessThanOrEqual(20)
  })
})
