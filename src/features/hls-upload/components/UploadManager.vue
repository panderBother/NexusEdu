<template>
  <div class="upload-manager">
    <div class="upload-header">
      <h2>HLS 切片上传管理</h2>
      <button @click="showInitDialog = true" class="btn-primary">
        新建上传任务
      </button>
    </div>

    <div v-if="uploadStore.getAllTasks.length === 0" class="empty-state">
      <p>暂无上传任务</p>
    </div>

    <div v-else class="task-list">
      <div
        v-for="task in uploadStore.getAllTasks"
        :key="task.id"
        class="task-item"
      >
        <div class="task-info">
          <div class="task-title">
            <span class="task-id">{{ task.id }}</span>
            <span :class="['task-status', `status-${task.status}`]">
              {{ getStatusText(task.status) }}
            </span>
          </div>
          <div class="task-url">{{ task.m3u8Url }}</div>
        </div>

        <div class="task-progress">
          <div class="progress-info">
            <span>进度: {{ getProgressPercentage(task.id) }}%</span>
            <span>速度: {{ getSpeed(task.id) }}</span>
            <span>剩余时间: {{ getETA(task.id) }}</span>
          </div>
          <div class="progress-bar">
            <div
              class="progress-fill"
              :style="{ width: `${getProgressPercentage(task.id)}%` }"
            ></div>
          </div>
          <div class="slice-info">
            <span>切片: {{ getCompletedSlices(task.id) }} / {{ task.slices.length }}</span>
          </div>
        </div>

        <div class="task-actions">
          <button
            v-if="task.status === 'pending' || task.status === 'paused'"
            @click="handleStart(task.id)"
            class="btn-success"
          >
            {{ task.status === 'paused' ? '恢复' : '开始' }}
          </button>
          <button
            v-if="task.status === 'uploading'"
            @click="handlePause(task.id)"
            class="btn-warning"
          >
            暂停
          </button>
          <button
            v-if="hasFailedSlices(task.id)"
            @click="handleRetry(task.id)"
            class="btn-info"
          >
            重试失败
          </button>
          <button
            @click="handleCancel(task.id)"
            class="btn-danger"
          >
            取消
          </button>
        </div>
      </div>
    </div>

    <!-- 初始化对话框 -->
    <div v-if="showInitDialog" class="dialog-overlay" @click="showInitDialog = false">
      <div class="dialog" @click.stop>
        <h3>新建上传任务</h3>
        <div class="form-group">
          <label>M3U8 URL:</label>
          <input
            v-model="m3u8Url"
            type="text"
            placeholder="输入 M3U8 文件 URL"
            class="input"
          />
        </div>
        <div class="dialog-actions">
          <button @click="handleInit" class="btn-primary" :disabled="!m3u8Url">
            创建
          </button>
          <button @click="showInitDialog = false" class="btn-secondary">
            取消
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useUploadStore } from '../stores/uploadStore'

const uploadStore = useUploadStore()
const showInitDialog = ref(false)
const m3u8Url = ref('')

onMounted(async () => {
  await uploadStore.initialize()
})

onUnmounted(() => {
  uploadStore.destroy()
})

function getStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    pending: '待上传',
    uploading: '上传中',
    paused: '已暂停',
    completed: '已完成',
    failed: '失败'
  }
  return statusMap[status] || status
}

function getProgressPercentage(taskId: string): number {
  const progress = uploadStore.getTaskProgress(taskId)
  return progress ? Math.round(progress.percentage) : 0
}

function getSpeed(taskId: string): string {
  const progress = uploadStore.getTaskProgress(taskId)
  if (!progress || progress.speed === 0) return '0 KB/s'

  const speed = progress.speed
  if (speed < 1024) return `${speed.toFixed(0)} B/s`
  if (speed < 1024 * 1024) return `${(speed / 1024).toFixed(2)} KB/s`
  return `${(speed / 1024 / 1024).toFixed(2)} MB/s`
}

function getETA(taskId: string): string {
  const progress = uploadStore.getTaskProgress(taskId)
  if (!progress || progress.eta === 0) return '--'

  const eta = progress.eta
  if (eta < 60) return `${Math.round(eta)}秒`
  if (eta < 3600) return `${Math.round(eta / 60)}分钟`
  return `${Math.round(eta / 3600)}小时`
}

function getCompletedSlices(taskId: string): number {
  const progress = uploadStore.getTaskProgress(taskId)
  return progress ? progress.uploadedSlices : 0
}

function hasFailedSlices(taskId: string): boolean {
  const task = uploadStore.activeTasks.get(taskId)
  if (!task) return false
  return task.slices.some(s => s.status === 'failed')
}

async function handleInit() {
  if (!m3u8Url.value) return

  try {
    const taskId = await uploadStore.initUpload(m3u8Url.value)
    console.log('Task created:', taskId)
    showInitDialog.value = false
    m3u8Url.value = ''
  } catch (error) {
    console.error('Failed to init upload:', error)
    alert('创建任务失败: ' + (error as Error).message)
  }
}

async function handleStart(taskId: string) {
  try {
    await uploadStore.startUpload(taskId)
  } catch (error) {
    console.error('Failed to start upload:', error)
    alert('开始上传失败: ' + (error as Error).message)
  }
}

async function handlePause(taskId: string) {
  try {
    await uploadStore.pauseUpload(taskId)
  } catch (error) {
    console.error('Failed to pause upload:', error)
    alert('暂停上传失败: ' + (error as Error).message)
  }
}

async function handleRetry(taskId: string) {
  try {
    await uploadStore.retryFailed(taskId)
  } catch (error) {
    console.error('Failed to retry:', error)
    alert('重试失败: ' + (error as Error).message)
  }
}

async function handleCancel(taskId: string) {
  if (!confirm('确定要取消此任务吗？')) return

  try {
    await uploadStore.cancelUpload(taskId)
  } catch (error) {
    console.error('Failed to cancel upload:', error)
    alert('取消上传失败: ' + (error as Error).message)
  }
}
</script>

<style scoped>
.upload-manager {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.upload-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.upload-header h2 {
  margin: 0;
  font-size: 24px;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #999;
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.task-item {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 16px;
  background: white;
}

.task-info {
  margin-bottom: 12px;
}

.task-title {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.task-id {
  font-weight: 600;
  font-size: 14px;
}

.task-status {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-pending { background: #e3f2fd; color: #1976d2; }
.status-uploading { background: #e8f5e9; color: #388e3c; }
.status-paused { background: #fff3e0; color: #f57c00; }
.status-completed { background: #f3e5f5; color: #7b1fa2; }
.status-failed { background: #ffebee; color: #c62828; }

.task-url {
  font-size: 12px;
  color: #666;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-progress {
  margin-bottom: 12px;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #666;
  margin-bottom: 8px;
}

.progress-bar {
  height: 8px;
  background: #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #4caf50, #8bc34a);
  transition: width 0.3s ease;
}

.slice-info {
  font-size: 12px;
  color: #666;
}

.task-actions {
  display: flex;
  gap: 8px;
}

button {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: opacity 0.2s;
}

button:hover:not(:disabled) {
  opacity: 0.8;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary { background: #2196f3; color: white; }
.btn-success { background: #4caf50; color: white; }
.btn-warning { background: #ff9800; color: white; }
.btn-info { background: #00bcd4; color: white; }
.btn-danger { background: #f44336; color: white; }
.btn-secondary { background: #9e9e9e; color: white; }

.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog {
  background: white;
  border-radius: 8px;
  padding: 24px;
  width: 90%;
  max-width: 500px;
}

.dialog h3 {
  margin: 0 0 20px 0;
  font-size: 20px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
}

.input {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  box-sizing: border-box;
}

.dialog-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}
</style>
