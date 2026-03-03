/**
 * HLS 上传 Pinia Store
 * 管理上传状态和提供操作接口
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { UploadManager } from '../manager/UploadManager'
import type { UploadTask, UploadConfig, UploadProgress } from '../types'

const DEFAULT_CONFIG: UploadConfig = {
  maxConcurrency: 3,
  timeout: 30000,
  maxRetries: 3,
  uploadEndpoint: '/api/upload',
  autoStart: false
}

export const useUploadStore = defineStore('hls-upload', () => {
  // State
  const activeTasks = ref<Map<string, UploadTask>>(new Map())
  const config = ref<UploadConfig>({ ...DEFAULT_CONFIG })
  const progress = ref<Map<string, UploadProgress>>(new Map())
  const manager = ref<UploadManager | null>(null)
  const initialized = ref(false)

  // Getters
  const getTaskProgress = computed(() => {
    return (taskId: string) => progress.value.get(taskId) || null
  })

  const getTaskStatus = computed(() => {
    return (taskId: string) => {
      const task = activeTasks.value.get(taskId)
      return task?.status || null
    }
  })

  const getAllTasks = computed(() => {
    return Array.from(activeTasks.value.values())
  })

  const hasActiveTasks = computed(() => {
    return activeTasks.value.size > 0
  })

  // Actions
  async function initialize() {
    if (initialized.value) return

    // 从 localStorage 加载配置
    const savedConfig = localStorage.getItem('hls-upload-config')
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig)
        config.value = { ...DEFAULT_CONFIG, ...parsed }
      } catch (error) {
        console.error('Failed to parse saved config:', error)
      }
    }

    // 创建管理器
    manager.value = new UploadManager(config.value)
    await manager.value.initialize()

    initialized.value = true

    // 启动进度更新循环
    startProgressUpdateLoop()
  }

  async function initUpload(m3u8Url: string): Promise<string> {
    if (!manager.value) {
      await initialize()
    }

    const task = await manager.value!.initializeUpload(m3u8Url)
    activeTasks.value.set(task.id, task)

    // 设置完成回调
    manager.value!.onComplete(task.id, () => {
      handleTaskComplete(task.id)
    })

    return task.id
  }

  async function startUpload(taskId: string): Promise<void> {
    if (!manager.value) {
      throw new Error('Manager not initialized')
    }

    await manager.value.startUpload(taskId)

    const task = activeTasks.value.get(taskId)
    if (task) {
      task.status = 'uploading'
      task.updatedAt = Date.now()
    }
  }

  async function pauseUpload(taskId: string): Promise<void> {
    if (!manager.value) {
      throw new Error('Manager not initialized')
    }

    await manager.value.pauseUpload(taskId)

    const task = activeTasks.value.get(taskId)
    if (task) {
      task.status = 'paused'
      task.updatedAt = Date.now()
    }
  }

  async function resumeUpload(taskId: string): Promise<void> {
    if (!manager.value) {
      throw new Error('Manager not initialized')
    }

    await manager.value.resumeUpload(taskId)

    const task = activeTasks.value.get(taskId)
    if (task) {
      task.status = 'uploading'
      task.updatedAt = Date.now()
    }
  }

  async function cancelUpload(taskId: string): Promise<void> {
    if (!manager.value) {
      throw new Error('Manager not initialized')
    }

    await manager.value.cancelUpload(taskId)

    activeTasks.value.delete(taskId)
    progress.value.delete(taskId)
  }

  async function retryFailed(taskId: string): Promise<void> {
    if (!manager.value) {
      throw new Error('Manager not initialized')
    }

    await manager.value.retryFailedSlices(taskId)
  }

  function handleTaskComplete(taskId: string): void {
    const task = activeTasks.value.get(taskId)
    if (task) {
      task.status = 'completed'
      task.updatedAt = Date.now()
    }

    console.log(`Task ${taskId} completed`)
  }

  function startProgressUpdateLoop(): void {
    setInterval(() => {
      if (!manager.value) return

      for (const taskId of activeTasks.value.keys()) {
        const taskProgress = manager.value.getProgress(taskId)
        if (taskProgress) {
          progress.value.set(taskId, taskProgress)
        }
      }
    }, 500) // 每500ms更新一次进度
  }

  function updateConfig(newConfig: Partial<UploadConfig>): void {
    config.value = { ...config.value, ...newConfig }

    // 保存到 localStorage
    localStorage.setItem('hls-upload-config', JSON.stringify(config.value))

    // 如果管理器已初始化，更新配置
    if (manager.value) {
      // 重新创建管理器以应用新配置
      manager.value.destroy()
      manager.value = new UploadManager(config.value)
      manager.value.initialize()
    }
  }

  function destroy(): void {
    if (manager.value) {
      manager.value.destroy()
      manager.value = null
    }
    initialized.value = false
  }

  return {
    // State
    activeTasks,
    config,
    progress,
    initialized,

    // Getters
    getTaskProgress,
    getTaskStatus,
    getAllTasks,
    hasActiveTasks,

    // Actions
    initialize,
    initUpload,
    startUpload,
    pauseUpload,
    resumeUpload,
    cancelUpload,
    retryFailed,
    updateConfig,
    destroy
  }
})
