<template>
  <div class="slice-progress-list">
    <div class="list-header">
      <h3>切片列表 ({{ slices.length }})</h3>
      <div class="filter-buttons">
        <button
          v-for="status in ['all', 'pending', 'uploading', 'completed', 'failed']"
          :key="status"
          :class="['filter-btn', { active: filter === status }]"
          @click="filter = status"
        >
          {{ getFilterLabel(status) }}
        </button>
      </div>
    </div>

    <div class="slice-list">
      <div
        v-for="slice in filteredSlices"
        :key="slice.id"
        class="slice-item"
      >
        <div class="slice-info">
          <span class="slice-index">#{{ slice.index }}</span>
          <span :class="['slice-status', `status-${slice.status}`]">
            {{ getStatusText(slice.status) }}
          </span>
          <span class="slice-size">{{ formatSize(slice.size) }}</span>
        </div>

        <div v-if="slice.status === 'uploading'" class="slice-progress">
          <div class="progress-bar">
            <div
              class="progress-fill"
              :style="{ width: `${getSliceProgress(slice.id)}%` }"
            ></div>
          </div>
          <span class="progress-text">{{ getSliceProgress(slice.id) }}%</span>
        </div>

        <div v-if="slice.status === 'failed'" class="slice-error">
          <span class="error-text">{{ slice.lastError || '上传失败' }}</span>
          <button @click="$emit('retry', slice.id)" class="btn-retry">
            重试
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { SliceMetadata } from '../types'
import { useUploadStore } from '../stores/uploadStore'

interface Props {
  taskId: string
  slices: SliceMetadata[]
}

const props = defineProps<Props>()
defineEmits<{
  retry: [sliceId: string]
}>()

const uploadStore = useUploadStore()
const filter = ref<string>('all')

const filteredSlices = computed(() => {
  if (filter.value === 'all') return props.slices
  return props.slices.filter(s => s.status === filter.value)
})

function getFilterLabel(status: string): string {
  const labels: Record<string, string> = {
    all: '全部',
    pending: '待上传',
    uploading: '上传中',
    completed: '已完成',
    failed: '失败'
  }
  return labels[status] || status
}

function getStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    pending: '待上传',
    uploading: '上传中',
    completed: '已完成',
    failed: '失败'
  }
  return statusMap[status] || status
}

function getSliceProgress(sliceId: string): number {
  const progress = uploadStore.getTaskProgress(props.taskId)
  if (!progress) return 0

  const sliceProgress = progress.sliceProgress.get(sliceId)
  return sliceProgress ? Math.round(sliceProgress.percentage) : 0
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}
</script>

<style scoped>
.slice-progress-list {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 16px;
  background: white;
}

.list-header {
  margin-bottom: 16px;
}

.list-header h3 {
  margin: 0 0 12px 0;
  font-size: 18px;
}

.filter-buttons {
  display: flex;
  gap: 8px;
}

.filter-btn {
  padding: 6px 12px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.filter-btn:hover {
  background: #f5f5f5;
}

.filter-btn.active {
  background: #2196f3;
  color: white;
  border-color: #2196f3;
}

.slice-list {
  max-height: 400px;
  overflow-y: auto;
}

.slice-item {
  padding: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.slice-item:last-child {
  border-bottom: none;
}

.slice-info {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.slice-index {
  font-weight: 600;
  font-size: 14px;
  min-width: 40px;
}

.slice-status {
  padding: 2px 8px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 500;
}

.status-pending { background: #e3f2fd; color: #1976d2; }
.status-uploading { background: #e8f5e9; color: #388e3c; }
.status-completed { background: #f3e5f5; color: #7b1fa2; }
.status-failed { background: #ffebee; color: #c62828; }

.slice-size {
  font-size: 12px;
  color: #666;
  margin-left: auto;
}

.slice-progress {
  display: flex;
  align-items: center;
  gap: 12px;
}

.progress-bar {
  flex: 1;
  height: 6px;
  background: #f0f0f0;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #4caf50;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 12px;
  color: #666;
  min-width: 40px;
  text-align: right;
}

.slice-error {
  display: flex;
  align-items: center;
  gap: 12px;
}

.error-text {
  flex: 1;
  font-size: 12px;
  color: #c62828;
}

.btn-retry {
  padding: 4px 12px;
  background: #00bcd4;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.btn-retry:hover {
  opacity: 0.8;
}
</style>
