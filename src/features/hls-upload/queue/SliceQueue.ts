/**
 * 切片队列管理
 * 负责管理待上传切片的优先级队列，支持并发控制
 */

import type { SliceMetadata, QueueStatus } from '../types'

export class SliceQueue {
  private pendingQueue: SliceMetadata[] = []
  private uploadingMap: Map<string, SliceMetadata> = new Map()
  private completedSet: Set<string> = new Set()
  private failedMap: Map<string, SliceMetadata> = new Map()
  private maxConcurrency: number

  constructor(maxConcurrency: number = 3) {
    this.maxConcurrency = maxConcurrency
  }

  /**
   * 添加切片到队列
   */
  enqueue(slice: SliceMetadata): void {
    // 根据状态添加到对应的集合
    if (slice.status === 'completed') {
      this.completedSet.add(slice.id)
    } else if (slice.status === 'failed') {
      this.failedMap.set(slice.id, slice)
    } else if (slice.status === 'uploading') {
      this.uploadingMap.set(slice.id, slice)
    } else {
      // pending 状态，添加到待上传队列
      this.pendingQueue.push(slice)
      // 按 index 排序
      this.pendingQueue.sort((a, b) => a.index - b.index)
    }
  }

  /**
   * 批量添加切片
   */
  enqueueBatch(slices: SliceMetadata[]): void {
    for (const slice of slices) {
      this.enqueue(slice)
    }
  }

  /**
   * 获取下一个待上传切片
   */
  dequeue(): SliceMetadata | null {
    // 检查并发限制
    if (this.uploadingMap.size >= this.maxConcurrency) {
      return null
    }

    // 从待上传队列取出第一个
    const slice = this.pendingQueue.shift()
    if (!slice) {
      return null
    }

    // 标记为上传中
    slice.status = 'uploading'
    this.uploadingMap.set(slice.id, slice)

    return slice
  }

  /**
   * 获取多个待上传切片（用于并行上传）
   */
  dequeueBatch(count: number): SliceMetadata[] {
    const slices: SliceMetadata[] = []
    const availableSlots = Math.min(
      count,
      this.maxConcurrency - this.uploadingMap.size
    )

    for (let i = 0; i < availableSlots; i++) {
      const slice = this.dequeue()
      if (!slice) break
      slices.push(slice)
    }

    return slices
  }

  /**
   * 标记切片为上传中
   */
  markAsUploading(sliceId: string): void {
    // 从待上传队列中移除
    const index = this.pendingQueue.findIndex(s => s.id === sliceId)
    if (index !== -1) {
      const slice = this.pendingQueue.splice(index, 1)[0]
      slice.status = 'uploading'
      this.uploadingMap.set(sliceId, slice)
    }
  }

  /**
   * 标记切片为已完成
   */
  markAsCompleted(sliceId: string): void {
    // 从上传中移除
    const slice = this.uploadingMap.get(sliceId)
    if (slice) {
      slice.status = 'completed'
      this.uploadingMap.delete(sliceId)
      this.completedSet.add(sliceId)
    }

    // 从失败队列移除（如果存在）
    if (this.failedMap.has(sliceId)) {
      this.failedMap.delete(sliceId)
      this.completedSet.add(sliceId)
    }
  }

  /**
   * 标记切片为失败（重新加入队列）
   */
  markAsFailed(sliceId: string): void {
    // 从上传中移除
    const slice = this.uploadingMap.get(sliceId)
    if (slice) {
      slice.status = 'failed'
      this.uploadingMap.delete(sliceId)
      this.failedMap.set(sliceId, slice)
    }
  }

  /**
   * 重试失败的切片
   */
  retryFailed(): void {
    const failedSlices = Array.from(this.failedMap.values())
    this.failedMap.clear()

    for (const slice of failedSlices) {
      slice.status = 'pending'
      this.pendingQueue.push(slice)
    }

    // 重新排序
    this.pendingQueue.sort((a, b) => a.index - b.index)
  }

  /**
   * 获取队列状态
   */
  getStatus(): QueueStatus {
    return {
      pending: this.pendingQueue.length,
      uploading: this.uploadingMap.size,
      completed: this.completedSet.size,
      failed: this.failedMap.size,
      total: this.pendingQueue.length + this.uploadingMap.size + this.completedSet.size + this.failedMap.size
    }
  }

  /**
   * 获取待上传切片数量
   */
  getPendingCount(): number {
    return this.pendingQueue.length
  }

  /**
   * 获取上传中切片数量
   */
  getUploadingCount(): number {
    return this.uploadingMap.size
  }

  /**
   * 检查是否有可用的上传槽位
   */
  hasAvailableSlot(): boolean {
    return this.uploadingMap.size < this.maxConcurrency
  }

  /**
   * 检查队列是否为空
   */
  isEmpty(): boolean {
    return this.pendingQueue.length === 0 && this.uploadingMap.size === 0
  }

  /**
   * 检查是否全部完成
   */
  isAllCompleted(): boolean {
    return this.pendingQueue.length === 0 && 
           this.uploadingMap.size === 0 && 
           this.failedMap.size === 0
  }

  /**
   * 更新并发数
   */
  setMaxConcurrency(maxConcurrency: number): void {
    this.maxConcurrency = maxConcurrency
  }

  /**
   * 清空队列
   */
  clear(): void {
    this.pendingQueue = []
    this.uploadingMap.clear()
    this.completedSet.clear()
    this.failedMap.clear()
  }

  /**
   * 获取所有切片
   */
  getAllSlices(): SliceMetadata[] {
    return [
      ...this.pendingQueue,
      ...Array.from(this.uploadingMap.values()),
      ...Array.from(this.failedMap.values())
    ]
  }
}
