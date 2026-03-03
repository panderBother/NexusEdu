/**
 * IndexedDB 元数据存储
 * 负责持久化上传任务和切片元数据
 */

import type {
  UploadTask,
  UploadTaskRecord,
  SliceMetadataRecord,
  SliceStatus,
  SliceStatusUpdate
} from '../types'

const DB_NAME = 'hls-upload-db'
const DB_VERSION = 1
const TASK_STORE = 'upload_tasks'
const SLICE_STORE = 'slice_metadata'

export class MetadataStore {
  private db: IDBDatabase | null = null

  /**
   * 初始化数据库
   */
  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => {
        reject(new Error(`Failed to open database: ${request.error?.message}`))
      }

      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // 创建任务存储
        if (!db.objectStoreNames.contains(TASK_STORE)) {
          db.createObjectStore(TASK_STORE, { keyPath: 'id' })
        }

        // 创建切片元数据存储
        if (!db.objectStoreNames.contains(SLICE_STORE)) {
          const sliceStore = db.createObjectStore(SLICE_STORE, { keyPath: 'id' })
          sliceStore.createIndex('taskId', 'taskId', { unique: false })
          sliceStore.createIndex('status', 'status', { unique: false })
          sliceStore.createIndex('taskId_status', ['taskId', 'status'], { unique: false })
        }
      }
    })
  }

  /**
   * 保存上传任务
   */
  async saveTask(task: UploadTask): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    const record: UploadTaskRecord = {
      id: task.id,
      m3u8Url: task.m3u8Url,
      status: task.status,
      totalSize: task.slices.reduce((sum, s) => sum + s.size, 0),
      uploadedSize: task.slices.filter(s => s.status === 'completed').reduce((sum, s) => sum + s.size, 0),
      totalSlices: task.slices.length,
      completedSlices: task.slices.filter(s => s.status === 'completed').length,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      config: task.config!
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([TASK_STORE], 'readwrite')
      const store = transaction.objectStore(TASK_STORE)
      const request = store.put(record)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(new Error(`Failed to save task: ${request.error?.message}`))
    })
  }

  /**
   * 获取上传任务
   */
  async getTask(taskId: string): Promise<UploadTask | null> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([TASK_STORE, SLICE_STORE], 'readonly')
      const taskStore = transaction.objectStore(TASK_STORE)
      const taskRequest = taskStore.get(taskId)

      taskRequest.onsuccess = () => {
        const taskRecord = taskRequest.result as UploadTaskRecord | undefined
        if (!taskRecord) {
          resolve(null)
          return
        }

        // 获取切片数据
        const sliceStore = transaction.objectStore(SLICE_STORE)
        const sliceIndex = sliceStore.index('taskId')
        const sliceRequest = sliceIndex.getAll(taskId)

        sliceRequest.onsuccess = () => {
          const slices = sliceRequest.result as SliceMetadataRecord[]
          const task: UploadTask = {
            id: taskRecord.id,
            m3u8Url: taskRecord.m3u8Url,
            slices,
            status: taskRecord.status,
            createdAt: taskRecord.createdAt,
            updatedAt: taskRecord.updatedAt,
            config: taskRecord.config
          }
          resolve(task)
        }

        sliceRequest.onerror = () => reject(new Error(`Failed to get slices: ${sliceRequest.error?.message}`))
      }

      taskRequest.onerror = () => reject(new Error(`Failed to get task: ${taskRequest.error?.message}`))
    })
  }

  /**
   * 获取所有任务
   */
  async getAllTasks(): Promise<UploadTask[]> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([TASK_STORE, SLICE_STORE], 'readonly')
      const taskStore = transaction.objectStore(TASK_STORE)
      const taskRequest = taskStore.getAll()

      taskRequest.onsuccess = async () => {
        const taskRecords = taskRequest.result as UploadTaskRecord[]
        const tasks: UploadTask[] = []

        for (const taskRecord of taskRecords) {
          const sliceStore = transaction.objectStore(SLICE_STORE)
          const sliceIndex = sliceStore.index('taskId')
          const sliceRequest = sliceIndex.getAll(taskRecord.id)

          await new Promise<void>((resolveSlice, rejectSlice) => {
            sliceRequest.onsuccess = () => {
              const slices = sliceRequest.result as SliceMetadataRecord[]
              tasks.push({
                id: taskRecord.id,
                m3u8Url: taskRecord.m3u8Url,
                slices,
                status: taskRecord.status,
                createdAt: taskRecord.createdAt,
                updatedAt: taskRecord.updatedAt,
                config: taskRecord.config
              })
              resolveSlice()
            }
            sliceRequest.onerror = () => rejectSlice(new Error(`Failed to get slices: ${sliceRequest.error?.message}`))
          })
        }

        resolve(tasks)
      }

      taskRequest.onerror = () => reject(new Error(`Failed to get tasks: ${taskRequest.error?.message}`))
    })
  }

  /**
   * 更新切片状态
   */
  async updateSliceStatus(taskId: string, sliceId: string, status: SliceStatus): Promise<void> {
    return this.updateSliceStatusBatch([{ taskId, sliceId, status }])
  }

  /**
   * 批量更新切片状态
   */
  async updateSliceStatusBatch(updates: SliceStatusUpdate[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([SLICE_STORE], 'readwrite')
      const store = transaction.objectStore(SLICE_STORE)

      let completed = 0
      const total = updates.length

      for (const update of updates) {
        const getRequest = store.get(update.sliceId)

        getRequest.onsuccess = () => {
          const slice = getRequest.result as SliceMetadataRecord | undefined
          if (!slice) {
            completed++
            if (completed === total) resolve()
            return
          }

          slice.status = update.status
          if (update.remoteUrl) slice.remoteUrl = update.remoteUrl
          if (update.error) {
            slice.lastError = update.error
            slice.lastErrorTime = Date.now()
          }
          if (update.status === 'completed') {
            slice.uploadedAt = Date.now()
          }

          const putRequest = store.put(slice)
          putRequest.onsuccess = () => {
            completed++
            if (completed === total) resolve()
          }
          putRequest.onerror = () => reject(new Error(`Failed to update slice: ${putRequest.error?.message}`))
        }

        getRequest.onerror = () => reject(new Error(`Failed to get slice: ${getRequest.error?.message}`))
      }
    })
  }

  /**
   * 删除任务
   */
  async deleteTask(taskId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([TASK_STORE, SLICE_STORE], 'readwrite')
      
      // 删除任务记录
      const taskStore = transaction.objectStore(TASK_STORE)
      const taskRequest = taskStore.delete(taskId)

      // 删除切片记录
      const sliceStore = transaction.objectStore(SLICE_STORE)
      const sliceIndex = sliceStore.index('taskId')
      const sliceRequest = sliceIndex.openCursor(IDBKeyRange.only(taskId))

      sliceRequest.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result
        if (cursor) {
          cursor.delete()
          cursor.continue()
        }
      }

      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(new Error(`Failed to delete task: ${transaction.error?.message}`))
    })
  }

  /**
   * 清理已完成的任务
   */
  async cleanupCompletedTasks(olderThan: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    const tasks = await this.getAllTasks()
    const tasksToDelete = tasks.filter(
      task => task.status === 'completed' && task.updatedAt < olderThan
    )

    for (const task of tasksToDelete) {
      await this.deleteTask(task.id)
    }
  }

  /**
   * 保存切片元数据
   */
  async saveSlices(slices: SliceMetadataRecord[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([SLICE_STORE], 'readwrite')
      const store = transaction.objectStore(SLICE_STORE)

      let completed = 0
      const total = slices.length

      for (const slice of slices) {
        const request = store.put(slice)
        request.onsuccess = () => {
          completed++
          if (completed === total) resolve()
        }
        request.onerror = () => reject(new Error(`Failed to save slice: ${request.error?.message}`))
      }
    })
  }
}
