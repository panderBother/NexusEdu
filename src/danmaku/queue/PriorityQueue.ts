/**
 * 优先级队列实现
 * 支持按优先级排序的弹幕队列，高优先级弹幕优先出队
 */

import type { DanmakuItem } from '../types'

/**
 * 弹幕队列接口
 */
export interface DanmakuQueue {
  enqueue(danmaku: DanmakuItem): void
  dequeue(): DanmakuItem | null
  dequeueBatch(count: number): DanmakuItem[]
  getLength(): number
  clear(): void
  isEmpty(): boolean
}

/**
 * 优先级队列实现
 * 使用 Map 按优先级分组存储弹幕，高优先级优先出队
 */
export class PriorityQueue implements DanmakuQueue {
  private queues: Map<number, DanmakuItem[]>
  private maxSize: number
  private totalLength: number

  constructor(maxSize: number = 5000) {
    this.queues = new Map()
    this.maxSize = maxSize
    this.totalLength = 0
  }

  /**
   * 入队
   * 如果队列已满，丢弃优先级最低的弹幕
   */
  enqueue(danmaku: DanmakuItem): void {
    // 如果队列已满，丢弃优先级最低的弹幕
    if (this.totalLength >= this.maxSize) {
      this.removeLowestPriority()
    }

    // 获取或创建该优先级的队列
    const priority = danmaku.priority
    if (!this.queues.has(priority)) {
      this.queues.set(priority, [])
    }

    const queue = this.queues.get(priority)!
    queue.push(danmaku)
    this.totalLength++
  }

  /**
   * 出队
   * 返回优先级最高的弹幕，相同优先级按 FIFO 顺序
   */
  dequeue(): DanmakuItem | null {
    if (this.isEmpty()) {
      return null
    }

    // 找到最高优先级
    const priorities = Array.from(this.queues.keys()).sort((a, b) => b - a)
    
    for (const priority of priorities) {
      const queue = this.queues.get(priority)!
      if (queue.length > 0) {
        const danmaku = queue.shift()!
        this.totalLength--

        // 如果该优先级队列为空，删除它
        if (queue.length === 0) {
          this.queues.delete(priority)
        }

        return danmaku
      }
    }

    return null
  }

  /**
   * 批量出队
   * 返回最多 count 个弹幕
   */
  dequeueBatch(count: number): DanmakuItem[] {
    const result: DanmakuItem[] = []
    
    for (let i = 0; i < count; i++) {
      const danmaku = this.dequeue()
      if (danmaku === null) {
        break
      }
      result.push(danmaku)
    }

    return result
  }

  /**
   * 获取队列长度
   */
  getLength(): number {
    return this.totalLength
  }

  /**
   * 清空队列
   */
  clear(): void {
    this.queues.clear()
    this.totalLength = 0
  }

  /**
   * 检查队列是否为空
   */
  isEmpty(): boolean {
    return this.totalLength === 0
  }

  /**
   * 移除优先级最低的弹幕
   */
  private removeLowestPriority(): void {
    if (this.isEmpty()) {
      return
    }

    // 找到最低优先级
    const priorities = Array.from(this.queues.keys()).sort((a, b) => a - b)
    
    for (const priority of priorities) {
      const queue = this.queues.get(priority)!
      if (queue.length > 0) {
        queue.shift()
        this.totalLength--

        // 如果该优先级队列为空，删除它
        if (queue.length === 0) {
          this.queues.delete(priority)
        }

        return
      }
    }
  }

  /**
   * 获取所有优先级（用于调试）
   */
  getPriorities(): number[] {
    return Array.from(this.queues.keys()).sort((a, b) => b - a)
  }

  /**
   * 获取指定优先级的队列长度（用于调试）
   */
  getPriorityLength(priority: number): number {
    const queue = this.queues.get(priority)
    return queue ? queue.length : 0
  }
}
