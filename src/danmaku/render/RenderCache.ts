/**
 * LRU 渲染缓存
 * 使用 LRU 策略管理预渲染的弹幕纹理
 */

import type { DanmakuItem, CacheEntry } from '../types'

/**
 * 渲染缓存接口
 */
export interface IRenderCache {
  get(key: string): ImageBitmap | null
  set(key: string, texture: ImageBitmap): void
  generateKey(danmaku: DanmakuItem): string
  clear(): void
  getSize(): number
  getHitRate(): number
}

/**
 * LRU 缓存节点
 */
class CacheNode {
  key: string
  entry: CacheEntry
  prev: CacheNode | null = null
  next: CacheNode | null = null

  constructor(key: string, entry: CacheEntry) {
    this.key = key
    this.entry = entry
  }
}

/**
 * LRU 渲染缓存实现
 * 使用双向链表 + Map 实现 O(1) 的 get 和 set 操作
 */
export class RenderCache implements IRenderCache {
  private cache: Map<string, CacheNode>
  private head: CacheNode | null = null
  private tail: CacheNode | null = null
  private maxSize: number // 最大缓存大小（字节）
  private currentSize: number = 0
  private hits: number = 0
  private misses: number = 0

  constructor(maxSizeMB: number = 100) {
    this.cache = new Map()
    this.maxSize = maxSizeMB * 1024 * 1024 // 转换为字节
  }

  /**
   * 获取缓存
   */
  get(key: string): ImageBitmap | null {
    const node = this.cache.get(key)
    
    if (!node) {
      this.misses++
      return null
    }

    // 更新访问信息
    node.entry.lastAccessed = Date.now()
    node.entry.accessCount++
    this.hits++

    // 移动到链表头部（最近使用）
    this.moveToHead(node)

    return node.entry.texture
  }

  /**
   * 设置缓存
   */
  set(key: string, texture: ImageBitmap): void {
    // 如果已存在，更新
    if (this.cache.has(key)) {
      const node = this.cache.get(key)!
      node.entry.texture = texture
      node.entry.lastAccessed = Date.now()
      node.entry.accessCount++
      this.moveToHead(node)
      return
    }

    // 估算纹理大小（宽 * 高 * 4 字节 RGBA）
    const size = texture.width * texture.height * 4

    // 如果缓存已满，移除最少使用的条目
    while (this.currentSize + size > this.maxSize && this.tail) {
      this.removeTail()
    }

    // 创建新节点
    const entry: CacheEntry = {
      key,
      texture,
      size,
      lastAccessed: Date.now(),
      accessCount: 1
    }

    const node = new CacheNode(key, entry)
    this.cache.set(key, node)
    this.currentSize += size

    // 添加到链表头部
    this.addToHead(node)
  }

  /**
   * 生成缓存键
   * 基于文本、颜色和大小生成唯一键
   */
  generateKey(danmaku: DanmakuItem): string {
    return `${danmaku.text}_${danmaku.color}_${danmaku.size}`
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear()
    this.head = null
    this.tail = null
    this.currentSize = 0
    this.hits = 0
    this.misses = 0
  }

  /**
   * 获取当前缓存大小（字节）
   */
  getSize(): number {
    return this.currentSize
  }

  /**
   * 获取缓存命中率
   */
  getHitRate(): number {
    const total = this.hits + this.misses
    return total === 0 ? 0 : this.hits / total
  }

  /**
   * 获取缓存条目数量
   */
  getEntryCount(): number {
    return this.cache.size
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      size: this.currentSize,
      maxSize: this.maxSize,
      entryCount: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: this.getHitRate()
    }
  }

  /**
   * 移动节点到链表头部
   */
  private moveToHead(node: CacheNode): void {
    this.removeNode(node)
    this.addToHead(node)
  }

  /**
   * 添加节点到链表头部
   */
  private addToHead(node: CacheNode): void {
    node.prev = null
    node.next = this.head

    if (this.head) {
      this.head.prev = node
    }

    this.head = node

    if (!this.tail) {
      this.tail = node
    }
  }

  /**
   * 从链表中移除节点
   */
  private removeNode(node: CacheNode): void {
    if (node.prev) {
      node.prev.next = node.next
    } else {
      this.head = node.next
    }

    if (node.next) {
      node.next.prev = node.prev
    } else {
      this.tail = node.prev
    }
  }

  /**
   * 移除链表尾部节点（最少使用）
   */
  private removeTail(): void {
    if (!this.tail) {
      return
    }

    const node = this.tail
    this.removeNode(node)
    this.cache.delete(node.key)
    this.currentSize -= node.entry.size
  }
}
