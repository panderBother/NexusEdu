<template>
  <div class="media-controls">
    <button
      @click="handleToggleAudio"
      :class="['control-btn', { active: audioEnabled }]"
      :title="audioEnabled ? '静音' : '取消静音'"
    >
      <span class="icon">{{ audioEnabled ? '🎤' : '🔇' }}</span>
    </button>

    <button
      @click="handleToggleVideo"
      :class="['control-btn', { active: videoEnabled }]"
      :title="videoEnabled ? '关闭摄像头' : '开启摄像头'"
    >
      <span class="icon">{{ videoEnabled ? '📹' : '📷' }}</span>
    </button>

    <button
      @click="handleHangup"
      class="control-btn hangup-btn"
      title="挂断"
    >
      <span class="icon">📞</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

// Props
interface Props {
  manager: any // VoiceChatManager instance
  initialAudioEnabled?: boolean
  initialVideoEnabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  initialAudioEnabled: true,
  initialVideoEnabled: true
})

// Emits
const emit = defineEmits<{
  audioToggle: [enabled: boolean]
  videoToggle: [enabled: boolean]
  hangup: []
}>()

// State
const audioEnabled = ref(props.initialAudioEnabled)
const videoEnabled = ref(props.initialVideoEnabled)
const isProcessing = ref(false)

// Methods
const handleToggleAudio = async () => {
  if (isProcessing.value) return
  
  isProcessing.value = true
  const startTime = Date.now()
  
  try {
    const newState = !audioEnabled.value
    await props.manager.toggleAudio(newState)
    audioEnabled.value = newState
    emit('audioToggle', newState)
    
    // 确保在 100ms 内响应
    const elapsed = Date.now() - startTime
    if (elapsed > 100) {
      console.warn(`Audio toggle took ${elapsed}ms, exceeds 100ms requirement`)
    }
  } catch (error) {
    console.error('Failed to toggle audio:', error)
  } finally {
    isProcessing.value = false
  }
}

const handleToggleVideo = async () => {
  if (isProcessing.value) return
  
  isProcessing.value = true
  const startTime = Date.now()
  
  try {
    const newState = !videoEnabled.value
    await props.manager.toggleVideo(newState)
    videoEnabled.value = newState
    emit('videoToggle', newState)
    
    // 确保在 100ms 内响应
    const elapsed = Date.now() - startTime
    if (elapsed > 100) {
      console.warn(`Video toggle took ${elapsed}ms, exceeds 100ms requirement`)
    }
  } catch (error) {
    console.error('Failed to toggle video:', error)
  } finally {
    isProcessing.value = false
  }
}

const handleHangup = () => {
  emit('hangup')
}

// Lifecycle
onMounted(() => {
  // 初始化状态
  audioEnabled.value = props.initialAudioEnabled
  videoEnabled.value = props.initialVideoEnabled
})
</script>

<style scoped>
.media-controls {
  display: flex;
  gap: 12px;
  justify-content: center;
  align-items: center;
}

.control-btn {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 2px solid #e9ecef;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.control-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.control-btn.active {
  background: #007bff;
  border-color: #007bff;
}

.control-btn.active .icon {
  filter: brightness(0) invert(1);
}

.hangup-btn {
  background: #dc3545;
  border-color: #dc3545;
}

.hangup-btn .icon {
  filter: brightness(0) invert(1);
  transform: rotate(135deg);
}

.hangup-btn:hover {
  background: #c82333;
  border-color: #c82333;
}

.icon {
  font-size: 24px;
  line-height: 1;
}
</style>
