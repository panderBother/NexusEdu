/**
 * 核心数据结构测试
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { PriorityQueue } from '../queue/PriorityQueue'
import { TrackManager } from '../track/TrackManager'
import { RenderCache } from '../render/RenderCache'
import { DanmakuType, DanmakuSize } from '../types'
import type { DanmakuItem } from '../types'

describe('PriorityQueue', () => {
  let queue: PriorityQueue

  beforeEach(() => {
    queue = new PriorityQueue(100)
  })

  it('should enqueue and dequeue items', () => {
    const danmaku: DanmakuItem = {
      id: '1',
      text: 'test',
      type: DanmakuType.SCROLL,
      color: '#ffffff',
      size: DanmakuSize.MEDIUM,
      priority: 5,
      userId: 'user1',
      timestamp: Date.now()
    }

    queue.enqueue(danmaku)
    expect(queue.getLength()).toBe(1)

    const dequeued = queue.dequeue()
    expect(dequeued).toEqual(danmaku)
    expect(queue.isEmpty()).toBe(true)
  })

  it('should dequeue by priority order', () => {
    const low: DanmakuItem = {
      id: '1',
      text: 'low',
      type: DanmakuType.SCROLL,
      color: '#ffffff',
      size: DanmakuSize.MEDIUM,
      priority: 1,
      userId: 'user1',
      timestamp: Date.now()
    }

    const high: DanmakuItem = {
      id: '2',
      text: 'high',
      type: DanmakuType.SCROLL,
      color: '#ffffff',
      size: DanmakuSize.MEDIUM,
      priority: 10,
      userId: 'user1',
      timestamp: Date.now()
    }

    queue.enqueue(low)
    queue.enqueue(high)

    const first = queue.dequeue()
    expect(first?.priority).toBe(10)

    const second = queue.dequeue()
    expect(second?.priority).toBe(1)
  })

  it('should respect max size', () => {
    const smallQueue = new PriorityQueue(2)

    for (let i = 0; i < 5; i++) {
      smallQueue.enqueue({
        id: `${i}`,
        text: `test${i}`,
        type: DanmakuType.SCROLL,
        color: '#ffffff',
        size: DanmakuSize.MEDIUM,
        priority: i,
        userId: 'user1',
        timestamp: Date.now()
      })
    }

    expect(smallQueue.getLength()).toBe(2)
  })
})

describe('TrackManager', () => {
  let trackManager: TrackManager

  beforeEach(() => {
    trackManager = new TrackManager()
    trackManager.initialize(600, 30, 10, 1920)
  })

  it('should initialize tracks', () => {
    expect(trackManager.getTrackCount()).toBeGreaterThan(0)
    expect(trackManager.getScrollTrackCount()).toBeGreaterThan(0)
  })

  it('should allocate track for danmaku', () => {
    const danmaku: DanmakuItem = {
      id: '1',
      text: 'test',
      type: DanmakuType.SCROLL,
      color: '#ffffff',
      size: DanmakuSize.MEDIUM,
      priority: 5,
      userId: 'user1',
      timestamp: Date.now()
    }

    const track = trackManager.allocateTrack(danmaku)
    expect(track).not.toBeNull()
    expect(track?.occupied).toBe(true)
  })

  it('should release track', () => {
    const danmaku: DanmakuItem = {
      id: '1',
      text: 'test',
      type: DanmakuType.SCROLL,
      color: '#ffffff',
      size: DanmakuSize.MEDIUM,
      priority: 5,
      userId: 'user1',
      timestamp: Date.now()
    }

    const track = trackManager.allocateTrack(danmaku)
    expect(track).not.toBeNull()

    const availableBefore = trackManager.getAvailableTrackCount()
    trackManager.releaseTrack(track!.id)
    const availableAfter = trackManager.getAvailableTrackCount()

    expect(availableAfter).toBeGreaterThan(availableBefore)
  })

  it('should separate tracks by type', () => {
    expect(trackManager.getTopTrackCount()).toBeGreaterThan(0)
    expect(trackManager.getBottomTrackCount()).toBeGreaterThan(0)
    expect(trackManager.getScrollTrackCount()).toBeGreaterThan(0)
  })
})

describe('RenderCache', () => {
  let cache: RenderCache

  beforeEach(() => {
    cache = new RenderCache(1) // 1MB
  })

  it('should store and retrieve textures', () => {
    const key = 'test_key'
    const mockTexture = {
      width: 100,
      height: 50
    } as ImageBitmap

    cache.set(key, mockTexture)
    const retrieved = cache.get(key)

    expect(retrieved).toBe(mockTexture)
  })

  it('should generate consistent keys', () => {
    const danmaku: DanmakuItem = {
      id: '1',
      text: 'test',
      type: DanmakuType.SCROLL,
      color: '#ffffff',
      size: DanmakuSize.MEDIUM,
      priority: 5,
      userId: 'user1',
      timestamp: Date.now()
    }

    const key1 = cache.generateKey(danmaku)
    const key2 = cache.generateKey(danmaku)

    expect(key1).toBe(key2)
  })

  it('should track hit rate', () => {
    const key = 'test_key'
    const mockTexture = {
      width: 100,
      height: 50
    } as ImageBitmap

    cache.set(key, mockTexture)
    cache.get(key) // hit
    cache.get('nonexistent') // miss

    const hitRate = cache.getHitRate()
    expect(hitRate).toBe(0.5)
  })

  it('should clear cache', () => {
    const key = 'test_key'
    const mockTexture = {
      width: 100,
      height: 50
    } as ImageBitmap

    cache.set(key, mockTexture)
    expect(cache.getEntryCount()).toBe(1)

    cache.clear()
    expect(cache.getEntryCount()).toBe(0)
    expect(cache.getSize()).toBe(0)
  })
})
