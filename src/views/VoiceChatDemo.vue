<template>
  <div class="voice-chat-demo">
    <div class="demo-header">
      <h1>WebRTC 语音连麦演示</h1>
      <div class="role-selector">
        <label>
          <input
            type="radio"
            value="host"
            v-model="selectedRole"
            :disabled="isInitialized"
          />
          主播
        </label>
        <label>
          <input
            type="radio"
            value="audience"
            v-model="selectedRole"
            :disabled="isInitialized"
          />
          观众
        </label>
        <button
          v-if="!isInitialized"
          @click="handleInitialize"
          class="btn btn-primary"
        >
          初始化
        </button>
      </div>
    </div>

    <div v-if="isInitialized" class="demo-content">
      <div class="left-panel">
        <VoiceChatPanel :manager="voiceChatManager" />
        
        <div class="media-section">
          <h3>本地预览</h3>
          <video
            ref="localVideoRef"
            autoplay
            playsinline
            muted
            class="local-video"
          />
          <MediaControls
            :manager="voiceChatManager"
            @audio-toggle="handleAudioToggle"
            @video-toggle="handleVideoToggle"
            @hangup="handleHangup"
          />
        </div>
      </div>

      <div class="right-panel">
        <h3>参与者 ({{ store.participantCount }})</h3>
        <ParticipantGrid
          :participants="store.participantList"
          :remote-streams="store.remoteStreams"
        />
      </div>
    </div>

    <div v-else class="welcome-message">
      <p>请选择角色并点击初始化开始使用</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { VoiceChatManager } from '@/features/voice-chat/services/VoiceChatManager'
import { useVoiceChatStore } from '@/features/voice-chat/stores/voiceChatStore'
import VoiceChatPanel from '@/features/voice-chat/components/VoiceChatPanel.vue'
import MediaControls from '@/features/voice-chat/components/MediaControls.vue'
import ParticipantGrid from '@/features/voice-chat/components/ParticipantGrid.vue'
import type { UserRole } from '@/features/voice-chat/types'

// State
const store = useVoiceChatStore()
const voiceChatManager = ref<VoiceChatManager | null>(null)
const selectedRole = ref<UserRole>('audience')
const isInitialized = ref(false)
const localVideoRef = ref<HTMLVideoElement | null>(null)

// Methods
const handleInitialize = async () => {
  try {
    // 创建 VoiceChatManager 实例
    voiceChatManager.value = new VoiceChatManager()
    
    // 生成用户 ID
    const userId = `user_${Date.now()}`
    
    // 初始化
    await voiceChatManager.value.initialize(userId, selectedRole.value)
    
    // 连接信令服务器（这里使用模拟地址，实际需要替换）
    // await voiceChatManager.value.connectSignaling('ws://localhost:8080', userId)
    
    // 获取本地媒体流
    const stream = await voiceChatManager.value.getLocalStream()
    if (localVideoRef.value) {
      localVideoRef.value.srcObject = stream
    }
    
    isInitialized.value = true
    
    console.log('VoiceChat initialized as', selectedRole.value)
  } catch (error) {
    console.error('Failed to initialize:', error)
    alert('初始化失败: ' + (error as Error).message)
  }
}

const handleAudioToggle = (enabled: boolean) => {
  console.log('Audio toggled:', enabled)
}

const handleVideoToggle = (enabled: boolean) => {
  console.log('Video toggled:', enabled)
}

const handleHangup = async () => {
  if (voiceChatManager.value) {
    await voiceChatManager.value.hangup()
  }
}

// Lifecycle
onMounted(() => {
  console.log('VoiceChatDemo mounted')
})

onUnmounted(() => {
  if (voiceChatManager.value) {
    voiceChatManager.value.hangup()
  }
})
</script>

<style scoped>
.voice-chat-demo {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.demo-header {
  margin-bottom: 24px;
}

.demo-header h1 {
  margin: 0 0 16px 0;
  font-size: 28px;
  font-weight: 600;
}

.role-selector {
  display: flex;
  gap: 16px;
  align-items: center;
}

.role-selector label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.demo-content {
  display: grid;
  grid-template-columns: 400px 1fr;
  gap: 24px;
}

.left-panel {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.media-section {
  background: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.media-section h3 {
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 600;
}

.local-video {
  width: 100%;
  border-radius: 8px;
  background: #000;
  margin-bottom: 12px;
}

.right-panel {
  background: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.right-panel h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
}

.welcome-message {
  text-align: center;
  padding: 48px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.welcome-message p {
  font-size: 16px;
  color: #6c757d;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: #007bff;
  color: white;
}

.btn-primary:hover {
  background: #0056b3;
}

@media (max-width: 1024px) {
  .demo-content {
    grid-template-columns: 1fr;
  }
}
</style>
