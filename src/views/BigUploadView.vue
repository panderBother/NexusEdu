<template>
  <div class="big-upload-page">
    <section class="upload-panel">
      <div class="upload-row">
        <label class="file-select">
          选择视频文件
          <input type="file" accept="video/*" @change="onFileChange" />
        </label>
      </div>

     
      <div class="upload-controls" v-if="file">
        <button
          @click="startUpload"
          :disabled="!file || isHashing || isUploading"
          class="cyber-btn secondary"
        >
          开始上传
        </button>
        <button @click="pauseUpload" :disabled="!isUploading" class="cyber-btn danger">暂停</button>
        <button @click="cancelUpload" :disabled="!file" class="cyber-btn" style="border-color:#ff6ec7;color:#ff6ec7;">取消</button>
      </div>

      <div class="progress-panel" v-if="file">
        <div class="progress-block">
          <div class="progress-title">哈希计算</div>
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: hashPercentage + '%' }"></div>
          </div>
          <div class="progress-meta">{{ hashStatusText }}</div>
        </div>

        <div class="progress-block">
          <div class="progress-title">上传进度</div>
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: uploadPercentage + '%' }"></div>
          </div>
          <div class="progress-meta">{{ uploadStatusText }}</div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import {
  initUpload,
  uploadSlice,
  finalizeUpload,
  clearUploadSession,
} from '../features/big-upload/services/bigUploadService'

const file = ref<File | null>(null)
const chunkSize = ref(4 * 1024 * 1024)
const fileHash = ref('')
const chunkHashes = ref<string[]>([])
const processedChunks = ref(0)
const totalChunks = ref(0)
const uploadedChunks = ref<number[]>([])
const isHashing = ref(false)
const isUploading = ref(false)
const currentTaskId = ref('')
const uploadUrl = ref('/api/upload/chunk')
const concurrency = 3
const activeControllers = new Map<number, AbortController>()
const worker = new Worker(new URL('../features/big-upload/workers/hash.worker.ts', import.meta.url), { type: 'module' })

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

const chunkCount = computed(() => {
  if (!file.value) return 0
  return Math.ceil(file.value.size / chunkSize.value)
})

const hashPercentage = computed(() => {
  if (!totalChunks.value) return 0
  return Math.round((processedChunks.value / totalChunks.value) * 100)
})

const uploadPercentage = computed(() => {
  if (!chunkCount.value) return 0
  return Math.round((uploadedChunks.value.length / chunkCount.value) * 100)
})

const hashStatusText = computed(() => {
  if (isHashing.value) return `已处理 ${processedChunks.value} / ${totalChunks.value} 个分片`
  if (fileHash.value) return '哈希已计算完成'
  return '等待计算'
})

const uploadStatusText = computed(() => {
  if (isUploading.value) return `已上传 ${uploadedChunks.value.length} / ${chunkCount.value} 个分片`
  if (uploadedChunks.value.length === chunkCount.value && chunkCount.value > 0) return '上传完成'
  if (uploadedChunks.value.length > 0) return '已上传部分分片，支持断点续传'
  return '等待上传'
})

function onFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  const selected = target.files?.[0] ?? null
  if (!selected) return
  file.value = selected
  fileHash.value = ''
  chunkHashes.value = []
  processedChunks.value = 0
  totalChunks.value = 0
  uploadedChunks.value = []
  currentTaskId.value = ''
}

worker.onmessage = (event: MessageEvent<any>) => {
  const { type, payload } = event.data

  if (type === 'HASH_PROGRESS') {
    processedChunks.value = payload.processedChunks
    totalChunks.value = payload.totalChunks
  }

  if (type === 'HASH_COMPLETE') {
    fileHash.value = payload.fileHash
    chunkHashes.value = payload.chunkHashes
    isHashing.value = false
  }

  if (type === 'HASH_ERROR') {
    isHashing.value = false
  }
}

async function computeHash() {
  if (!file.value) return

  // 在 Worker 中计算分片 hash，并由分片 hash 生成整个文件 hash
  // 这个方法比直接按字节连续计算整个文件更快，尤其适合大文件
  isHashing.value = true
  processedChunks.value = 0
  totalChunks.value = 0
  fileHash.value = ''
  chunkHashes.value = []

  worker.postMessage({
    type: 'COMPUTE_HASH',
    payload: {
      file: file.value,
      chunkSize: chunkSize.value,
    },
  })
}

async function startUpload() {
  if (!file.value || !fileHash.value || isUploading.value) {
    return
  }

  isUploading.value = true

  try {
    // 初始化上传任务；如果服务端不可用，则使用本地断点续传信息继续上传。
    const result = await initUpload(file.value, fileHash.value, chunkHashes.value, chunkSize.value)
    currentTaskId.value = result.taskId
    uploadUrl.value = result.uploadUrl
    uploadedChunks.value = result.uploadedChunks ?? []

    const allChunks = Array.from({ length: chunkCount.value }, (_, index) => index)
    const pendingChunks = allChunks.filter((index) => !uploadedChunks.value.includes(index))

    if (pendingChunks.length === 0) {
      await finalizeUpload(fileHash.value)
      return
    }

    const queue = [...pendingChunks]
    const activePromises: Promise<void>[] = []

    const uploadNext = async () => {
      if (!queue.length || !file.value) return
      const chunkIndex = queue.shift()!
      const start = chunkIndex * chunkSize.value
      const end = Math.min(file.value.size, start + chunkSize.value)
      const slice = file.value.slice(start, end)
      const chunkHash = chunkHashes.value[chunkIndex]
      const controller = new AbortController()
      activeControllers.set(chunkIndex, controller)

      try {
        await uploadSlice(fileHash.value, currentTaskId.value, chunkIndex, slice, chunkHash, uploadUrl.value, controller.signal)
        if (!uploadedChunks.value.includes(chunkIndex)) {
          uploadedChunks.value.push(chunkIndex)
        }
      } catch {
        queue.push(chunkIndex)
      } finally {
        activeControllers.delete(chunkIndex)
      }

      if (isUploading.value) {
        await uploadNext()
      }
    }

    for (let i = 0; i < concurrency; i += 1) {
      activePromises.push(uploadNext())
    }

    await Promise.all(activePromises)

    if (uploadedChunks.value.length === chunkCount.value) {
      await finalizeUpload(fileHash.value)
    }
  } finally {
    isUploading.value = false
  }
}

function pauseUpload() {
  if (!isUploading.value) return
  // 暂停当前活跃的分片上传请求，保留已完成状态以便之后继续上传
  isUploading.value = false
  activeControllers.forEach((controller) => controller.abort())
  activeControllers.clear()
}

function cancelUpload() {
  // 取消当前上传任务，并删除本地续传记录
  isUploading.value = false
  activeControllers.forEach((controller) => controller.abort())
  activeControllers.clear()
  if (fileHash.value) {
    clearUploadSession(fileHash.value)
  }
  uploadedChunks.value = []
  currentTaskId.value = ''
}

onUnmounted(() => {
  worker.terminate()
})
</script>

<style scoped>
.big-upload-page {
  padding: 32px;
  max-width: 1000px;
  margin: 0 auto;
  color: #e6f7ff;
}

.upload-panel {
  background: rgba(2, 18, 38, 0.92);
  border: 1px solid rgba(0, 255, 255, 0.16);
  border-radius: 20px;
  padding: 28px;
  box-shadow: 0 0 40px rgba(0, 255, 255, 0.08);
}

.upload-panel h1 {
  margin-bottom: 12px;
  color: #00e5ff;
}

.upload-panel p {
  margin-bottom: 24px;
  color: #99d6ff;
  line-height: 1.8;
}

.upload-row,
.upload-controls,
.progress-panel {
  margin-top: 20px;
}

.file-select {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 240px;
  height: 56px;
  border: 2px dashed rgba(0, 255, 255, 0.35);
  border-radius: 16px;
  background: rgba(0, 20, 40, 0.65);
  color: #a8f9ff;
  cursor: pointer;
  transition: border-color 0.2s ease;
}

.file-select:hover {
  border-color: rgba(0, 255, 255, 0.8);
}

.file-select input {
  display: none;
}

.upload-info {
  display: grid;
  gap: 10px;
  color: #d4efff;
}

.upload-info div {
  font-size: 14px;
}

.upload-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.cyber-btn {
  border: 1px solid rgba(0, 255, 255, 0.25);
  border-radius: 16px;
  padding: 12px 24px;
  background: rgba(0, 32, 64, 0.95);
  color: #e0ffff;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
}

.cyber-btn.primary {
  background: linear-gradient(135deg, #00b0ff, #00e5ff);
  color: #061b2c;
}

.cyber-btn.secondary {
  background: linear-gradient(135deg, #8f6dff, #4b9fff);
}

.cyber-btn.danger {
  background: linear-gradient(135deg, #ff4d6d, #ff82b8);
}

.cyber-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.cyber-btn:not(:disabled):hover {
  transform: translateY(-1px);
}

.progress-block {
  margin-bottom: 18px;
}

.progress-title {
  font-size: 14px;
  color: #a5f4ff;
  margin-bottom: 8px;
}

.progress-bar {
  height: 18px;
  border-radius: 12px;
  background: rgba(0, 255, 255, 0.1);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #00e5ff, #00ffea);
  transition: width 0.25s ease;
}

.progress-meta {
  margin-top: 8px;
  color: #c6f7ff;
}
</style>

