<template>
  <div class="voice-chat-panel">
    <div class="panel-header">
      <h3>语音连麦</h3>
      <div class="status-badge" :class="statusClass">
        {{ statusText }}
      </div>
    </div>

    <div class="panel-body">
      <!-- 参与者数量 -->
      <div class="participant-count">
        <span class="icon">👥</span>
        <span>{{ participantCount }} / {{ maxParticipants }} 人</span>
      </div>

      <!-- 控制按钮 -->
      <div class="control-buttons">
        <button
          v-if="!isConnected && role === 'audience'"
          @click="handleJoinRequest"
          :disabled="isRequesting"
          class="btn btn-primary"
        >
          {{ isRequesting ? '请求中...' : '申请连麦' }}
        </button>

        <button
          v-if="isConnected"
          @click="handleHangup"
          class="btn btn-danger"
        >
          挂断
        </button>

        <button
          v-if="isHost && isConnected"
          @click="handleEndSession"
          class="btn btn-danger"
        >
          结束连麦
        </button>
      </div>

      <!-- 连麦请求列表（主播端） -->
      <div v-if="isHost && pendingRequests.length > 0" class="request-list">
        <h4>连麦请求 ({{ pendingRequests.length }})</h4>
        <div
          v-for="request in pendingRequests"
          :key="request.id"
          class="request-item"
        >
          <span class="requester-name">{{ request.userName }}</span>
          <div class="request-actions">
            <button
              @click="handleAcceptRequest(request.id)"
              class="btn btn-sm btn-success"
            >
              接受
            </button>
            <button
              @click="handleRejectRequest(request.id)"
              class="btn btn-sm btn-danger"
            >
              拒绝
            </button>
          </div>
        </div>
      </div>

      <!-- 错误提示 -->
      <div v-if="error" class="error-message">
        {{ error.message }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useVoiceChatStore } from '../stores/voiceChatStore'
import { MAX_PARTICIPANTS } from '../constants'

const store = useVoiceChatStore()

// Props
interface Props {
  manager: any // VoiceChatManager instance
}

const props = defineProps<Props>()

// Computed
const isConnected = computed(() => store.isConnected)
const isHost = computed(() => store.isHost)
const role = computed(() => store.currentUser?.role)
const participantCount = computed(() => store.participantCount)
const maxParticipants = computed(() => MAX_PARTICIPANTS)
const isRequesting = computed(() => store.connectionState === 'requesting' || store.connectionState === 'waiting')
const error = computed(() => store.error)

const pendingRequests = computed(() => 
  store.requestQueue.filter(r => r.status === 'pending')
)

const statusText = computed(() => {
  switch (store.connectionState) {
    case 'idle':
      return '未连接'
    case 'requesting':
      return '请求中'
    case 'waiting':
      return '等待审批'
    case 'connecting':
      return '连接中'
    case 'connected':
      return '已连接'
    case 'disconnecting':
      return '断开中'
    default:
      return '未知'
  }
})

const statusClass = computed(() => {
  switch (store.connectionState) {
    case 'connected':
      return 'status-success'
    case 'connecting':
    case 'requesting':
    case 'waiting':
      return 'status-warning'
    case 'failed':
      return 'status-error'
    default:
      return 'status-default'
  }
})

// Methods
const handleJoinRequest = async () => {
  try {
    await props.manager.requestJoin()
  } catch (error: any) {
    store.setError(error)
  }
}

const handleHangup = async () => {
  try {
    await props.manager.hangup()
  } catch (error: any) {
    store.setError(error)
  }
}

const handleEndSession = async () => {
  try {
    await props.manager.hangup()
  } catch (error: any) {
    store.setError(error)
  }
}

const handleAcceptRequest = async (requestId: string) => {
  try {
    await props.manager.acceptRequest(requestId)
  } catch (error: any) {
    store.setError(error)
  }
}

const handleRejectRequest = async (requestId: string) => {
  try {
    await props.manager.rejectRequest(requestId)
  } catch (error: any) {
    store.setError(error)
  }
}
</script>

<style scoped>
.voice-chat-panel {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 16px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.panel-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-success {
  background: #d4edda;
  color: #155724;
}

.status-warning {
  background: #fff3cd;
  color: #856404;
}

.status-error {
  background: #f8d7da;
  color: #721c24;
}

.status-default {
  background: #e9ecef;
  color: #495057;
}

.panel-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.participant-count {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.icon {
  font-size: 20px;
}

.control-buttons {
  display: flex;
  gap: 8px;
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

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: #007bff;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #0056b3;
}

.btn-danger {
  background: #dc3545;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: #c82333;
}

.btn-success {
  background: #28a745;
  color: white;
}

.btn-success:hover:not(:disabled) {
  background: #218838;
}

.btn-sm {
  padding: 4px 8px;
  font-size: 12px;
}

.request-list {
  border-top: 1px solid #e9ecef;
  padding-top: 16px;
}

.request-list h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
}

.request-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  background: #f8f9fa;
  border-radius: 4px;
  margin-bottom: 8px;
}

.requester-name {
  font-size: 14px;
}

.request-actions {
  display: flex;
  gap: 8px;
}

.error-message {
  padding: 12px;
  background: #f8d7da;
  color: #721c24;
  border-radius: 4px;
  font-size: 14px;
}
</style>
