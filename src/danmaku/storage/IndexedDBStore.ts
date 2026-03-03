/**
 * IndexedDB 存储
 * 负责历史弹幕的持久化存储
 */

import type { DanmakuItem, DanmakuRecord } from '../types'

/**
 * IndexedDB 存储接口
 */
export interface IIndexedDBStore {
  initialize(): Promise<void>
  saveDanmaku(danmaku: DanmakuItem): Promise<void>
  saveBatch(danmakuList: DanmakuItem[]): Promise<void>
  queryDanmaku(startTime: number, endTime: number): Promise<DanmakuItem[]>
  deleteExpired(beforeTime: number): Promise<void>
  clear(): Promise<void>
}

/**
 * IndexedDB 存储实现
 */
export class IndexedDBStore implements IIndexedDBStore {
  private db: IDBDatabase | null = null
  private readonly dbName: string = 'DanmakuDB'
  private readonly dbVersion: number = 1
  private readonly storeName: string = 'danmaku'
  private readonly settingsStoreName: string = 'settings'
  private initialized: boolean = false

  /**
   * 初始化数据库
   */
  async initialize(): Promise<void> {
    if (this.initialized && this.db) {
      return
    }

    return new Promise((resolve, reject) => {
      // 检查 IndexedDB 支持
      if (!window.indexedDB) {
        reject(new Error('IndexedDB is not supported'))
        return
      }

      const request = window.indexedDB.open(this.dbName, this.dbVersion)

      request.onerror = () => {
        reject(new Error('Failed to open database'))
      }

      request.onsuccess = () => {
        this.db = request.result
        this.initialized = true
        console.log('IndexedDB initialized')
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // 创建弹幕存储
        if (!db.objectStoreNames.contains(this.storeName)) {
          const objectStore = db.createObjectStore(this.storeName, { keyPath: 'id' })
          
          // 创建索引
          objectStore.createIndex('timestamp', 'timestamp', { unique: false })
          objectStore.createIndex('userId', 'userId', { unique: false })
          objectStore.createIndex('savedAt', 'savedAt', { unique: false })
        }

        // 创建设置存储
        if (!db.objectStoreNames.contains(this.settingsStoreName)) {
          db.createObjectStore(this.settingsStoreName, { keyPath: 'key' })
        }
      }
    })
  }

  /**
   * 保存弹幕
   */
  async saveDanmaku(danmaku: DanmakuItem): Promise<void> {
    await this.ensureInitialized()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite')
      const objectStore = transaction.objectStore(this.storeName)

      const record: DanmakuRecord = {
        ...danmaku,
        savedAt: Date.now()
      }

      const request = objectStore.put(record)

      request.onsuccess = () => {
        resolve()
      }

      request.onerror = () => {
        reject(new Error('Failed to save danmaku'))
      }
    })
  }

  /**
   * 批量保存弹幕
   */
  async saveBatch(danmakuList: DanmakuItem[]): Promise<void> {
    await this.ensureInitialized()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite')
      const objectStore = transaction.objectStore(this.storeName)

      let completed = 0
      let hasError = false

      for (const danmaku of danmakuList) {
        const record: DanmakuRecord = {
          ...danmaku,
          savedAt: Date.now()
        }

        const request = objectStore.put(record)

        request.onsuccess = () => {
          completed++
          if (completed === danmakuList.length && !hasError) {
            resolve()
          }
        }

        request.onerror = () => {
          hasError = true
          reject(new Error('Failed to save danmaku batch'))
        }
      }

      // 处理空数组
      if (danmakuList.length === 0) {
        resolve()
      }
    })
  }

  /**
   * 查询弹幕
   */
  async queryDanmaku(startTime: number, endTime: number): Promise<DanmakuItem[]> {
    await this.ensureInitialized()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly')
      const objectStore = transaction.objectStore(this.storeName)
      const index = objectStore.index('timestamp')

      const range = IDBKeyRange.bound(startTime, endTime)
      const request = index.getAll(range)

      request.onsuccess = () => {
        const results = request.result as DanmakuRecord[]
        // 移除 savedAt 字段，返回 DanmakuItem
        const danmakuList = results.map(record => {
          const { savedAt, ...danmaku } = record
          return danmaku as DanmakuItem
        })
        resolve(danmakuList)
      }

      request.onerror = () => {
        reject(new Error('Failed to query danmaku'))
      }
    })
  }

  /**
   * 删除过期弹幕
   */
  async deleteExpired(beforeTime: number): Promise<void> {
    await this.ensureInitialized()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite')
      const objectStore = transaction.objectStore(this.storeName)
      const index = objectStore.index('timestamp')

      const range = IDBKeyRange.upperBound(beforeTime)
      const request = index.openCursor(range)

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result
        if (cursor) {
          cursor.delete()
          cursor.continue()
        } else {
          resolve()
        }
      }

      request.onerror = () => {
        reject(new Error('Failed to delete expired danmaku'))
      }
    })
  }

  /**
   * 清空数据库
   */
  async clear(): Promise<void> {
    await this.ensureInitialized()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite')
      const objectStore = transaction.objectStore(this.storeName)

      const request = objectStore.clear()

      request.onsuccess = () => {
        resolve()
      }

      request.onerror = () => {
        reject(new Error('Failed to clear database'))
      }
    })
  }

  /**
   * 获取数据库大小（估算）
   */
  async getSize(): Promise<number> {
    await this.ensureInitialized()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly')
      const objectStore = transaction.objectStore(this.storeName)

      const request = objectStore.count()

      request.onsuccess = () => {
        // 估算：每条弹幕约 500 字节
        const count = request.result
        const estimatedSize = count * 500
        resolve(estimatedSize)
      }

      request.onerror = () => {
        reject(new Error('Failed to get database size'))
      }
    })
  }

  /**
   * 获取弹幕数量
   */
  async getCount(): Promise<number> {
    await this.ensureInitialized()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly')
      const objectStore = transaction.objectStore(this.storeName)

      const request = objectStore.count()

      request.onsuccess = () => {
        resolve(request.result)
      }

      request.onerror = () => {
        reject(new Error('Failed to get count'))
      }
    })
  }

  /**
   * 自动清理过期数据（7 天前）
   */
  async autoCleanup(): Promise<void> {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    await this.deleteExpired(sevenDaysAgo)
  }

  /**
   * 关闭数据库
   */
  close(): void {
    if (this.db) {
      this.db.close()
      this.db = null
      this.initialized = false
    }
  }

  /**
   * 确保数据库已初始化
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized || !this.db) {
      await this.initialize()
    }
  }

  /**
   * 获取统计信息
   */
  async getStats() {
    await this.ensureInitialized()

    const count = await this.getCount()
    const size = await this.getSize()

    return {
      count,
      size,
      initialized: this.initialized
    }
  }
}
