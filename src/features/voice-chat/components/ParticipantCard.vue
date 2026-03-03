<template>
  <div class="participant-card" :class="{ speaking: isSpeaking }">
    <video
      ref="videoRef"
      autoplay
      playsinline
      :muted="false"
      class="video-element"
    />
    
    <div class="participant-info">
      <div class="participant-name">{{ participant.name }}</div>
      
      <div class="status-icons">
        <span v-if="!participant.audioEnabled" class="icon" title="已静音">🔇</span>
        <span v-if="!participant.videoEnabled" class="icon" title="摄像头关闭">📷</span>
        <span
          v-if="networkQualityIcon"
          class="icon network-quality"
          :title="`网络质量: ${participant.networkQuality.level}`"
        >
          {{ networkQualityIcon }}
        </span>
      </div>
    </div>

    <div v-if="showWarning" class="warning-indicator">
      ⚠️ 网络不佳
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import type { Participant } from '../types'

// Props
interface Props {
  participant: Participant
  stream?: MediaStream
  isSpeaking?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isSpeaking: false
})

// Refs
const videoRef = ref<HTMLVideoElement | null>(null)

// Computed
const networkQualityIcon = computed(() => {
  switch (props.participant.networkQuality.level) {
    case 'excellent':
      return '📶'
    case 'good':
      return '📶'
    case 'fair':
      return '📶'
    case 'poor':
      return '📵'
    default:
      return ''
  }
})

const showWarning = computed(() => {
  const quality = props.participant.networkQuality
  return quality.level === 'poor' || quality.packetLoss > 0.1 || quality.rtt > 300
})

// Watch stream changes
watch(() => props.stream, (newStream) => {
  if (videoRef.value && newStream) {
    videoRef.value.srcObject = newStream
  }
}, { immediate: true })

// Lifecycle
onMounted(() => {
  if (videoRef.value && props.stream) {
    videoRef.value.srcObject = props.stream
  }
})
</script>

<style scoped>
.participant-card {
  position: relative;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
  aspect-ratio: 16 / 9;
  transition: all 0.3s;
}

.participant-card.speaking {
  box-shadow: 0 0 0 3px #007bff;
  transform: scale(1.02);
}

.video-element {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.participant-info {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.7), transparent);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.participant-name {
  color: white;
  font-size: 14px;
  font-weight: 500;
}

.status-icons {
  display: flex;
  gap: 8px;
}

.icon {
  font-size: 16px;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.5));
}

.network-quality {
  opacity: 0.8;
}

.warning-indicator {
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 4px 8px;
  background: rgba(220, 53, 69, 0.9);
  color: white;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}
</style>
