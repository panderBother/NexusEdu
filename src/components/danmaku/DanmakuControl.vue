<template>
  <div class="danmaku-control">
    <div class="control-section">
      <label class="control-label">
        <input
          type="checkbox"
          v-model="visible"
          @change="onVisibleChange"
        />
        显示弹幕
      </label>
    </div>

    <div class="control-section">
      <label class="control-label">透明度: {{ Math.round(opacity * 100) }}%</label>
      <input
        type="range"
        min="0"
        max="100"
        :value="opacity * 100"
        @input="onOpacityChange"
        class="control-slider"
      />
    </div>

    <div class="control-section">
      <label class="control-label">速度</label>
      <select v-model="speed" @change="onSpeedChange" class="control-select">
        <option :value="SpeedLevel.SLOW">慢速 (8秒)</option>
        <option :value="SpeedLevel.MEDIUM">中速 (6秒)</option>
        <option :value="SpeedLevel.FAST">快速 (4秒)</option>
      </select>
    </div>

    <div class="control-section">
      <label class="control-label">密度</label>
      <select v-model="density" @change="onDensityChange" class="control-select">
        <option :value="DensityLevel.SPARSE">稀疏 (30%)</option>
        <option :value="DensityLevel.NORMAL">正常 (60%)</option>
        <option :value="DensityLevel.DENSE">密集 (90%)</option>
      </select>
    </div>

    <div class="control-section">
      <label class="control-label">关键词过滤</label>
      <div class="filter-input-group">
        <input
          type="text"
          v-model="newKeyword"
          @keyup.enter="addKeyword"
          placeholder="输入关键词后按回车"
          class="control-input"
        />
        <button @click="addKeyword" class="control-button">添加</button>
      </div>
      <div class="filter-tags">
        <span
          v-for="keyword in keywordFilters"
          :key="keyword"
          class="filter-tag"
        >
          {{ keyword }}
          <button @click="removeKeyword(keyword)" class="tag-remove">×</button>
        </span>
      </div>
    </div>

    <div class="control-section">
      <div class="stats">
        <div class="stat-item">
          <span class="stat-label">活动弹幕:</span>
          <span class="stat-value">{{ stats.activeDanmaku }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">队列长度:</span>
          <span class="stat-value">{{ stats.queueLength }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">FPS:</span>
          <span class="stat-value">{{ stats.fps }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">已屏蔽:</span>
          <span class="stat-value">{{ stats.blockedUsersCount }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useDanmakuStore } from '@/stores/danmaku'
import { SpeedLevel, DensityLevel } from '@/danmaku/types'

const danmakuStore = useDanmakuStore()

const visible = ref(danmakuStore.settings.visible)
const opacity = ref(danmakuStore.settings.opacity)
const speed = ref(danmakuStore.settings.speed)
const density = ref(danmakuStore.settings.density)
const newKeyword = ref('')

const keywordFilters = computed(() => Array.from(danmakuStore.keywordFilters))
const stats = computed(() => danmakuStore.getStats())

onMounted(() => {
  // 定期更新统计信息
  setInterval(() => {
    // 触发重新计算
  }, 1000)
})

function onVisibleChange() {
  danmakuStore.updateSettings({ visible: visible.value })
}

function onOpacityChange(event: Event) {
  const value = parseInt((event.target as HTMLInputElement).value) / 100
  opacity.value = value
  danmakuStore.updateSettings({ opacity: value })
}

function onSpeedChange() {
  danmakuStore.updateSettings({ speed: speed.value })
}

function onDensityChange() {
  danmakuStore.updateSettings({ density: density.value })
}

function addKeyword() {
  if (newKeyword.value.trim()) {
    danmakuStore.addKeywordFilter(newKeyword.value.trim())
    newKeyword.value = ''
  }
}

function removeKeyword(keyword: string) {
  danmakuStore.removeKeywordFilter(keyword)
}
</script>

<style scoped>
.danmaku-control {
  padding: 16px;
  background: rgba(0, 0, 0, 0.8);
  border-radius: 8px;
  color: white;
  font-size: 14px;
}

.control-section {
  margin-bottom: 16px;
}

.control-label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
}

.control-slider {
  width: 100%;
  height: 4px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.2);
  outline: none;
  cursor: pointer;
}

.control-select {
  width: 100%;
  padding: 8px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  color: white;
  cursor: pointer;
}

.control-input {
  flex: 1;
  padding: 8px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  color: white;
}

.control-button {
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 4px;
  color: white;
  cursor: pointer;
  transition: background 0.2s;
}

.control-button:hover {
  background: rgba(255, 255, 255, 0.3);
}

.filter-input-group {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.filter-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.filter-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  font-size: 12px;
}

.tag-remove {
  background: none;
  border: none;
  color: white;
  font-size: 16px;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  padding: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}

.stat-label {
  color: rgba(255, 255, 255, 0.7);
}

.stat-value {
  font-weight: 600;
}
</style>
