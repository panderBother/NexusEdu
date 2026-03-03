<template>
  <div class="danmaku-input">
    <div class="input-row">
      <input
        type="text"
        v-model="text"
        @keyup.enter="send"
        :placeholder="placeholder"
        :maxlength="maxLength"
        class="text-input"
      />
      
      <input
        type="color"
        v-model="color"
        class="color-input"
        title="选择颜色"
      />
      
      <select v-model="size" class="size-select">
        <option :value="DanmakuSize.SMALL">小</option>
        <option :value="DanmakuSize.MEDIUM">中</option>
        <option :value="DanmakuSize.LARGE">大</option>
      </select>
      
      <button @click="send" :disabled="!canSend" class="send-button">
        发送
      </button>
    </div>
    
    <div class="input-info">
      <span class="char-count" :class="{ warning: text.length > maxLength * 0.8 }">
        {{ text.length }} / {{ maxLength }}
      </span>
      <span v-if="error" class="error-message">{{ error }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useDanmakuStore } from '@/stores/danmaku'
import { DanmakuType, DanmakuSize } from '@/danmaku/types'
import type { DanmakuItem } from '@/danmaku/types'

const props = withDefaults(defineProps<{
  placeholder?: string
  maxLength?: number
  userId?: string
}>(), {
  placeholder: '输入弹幕内容...',
  maxLength: 100,
  userId: 'anonymous'
})

const emit = defineEmits<{
  send: [danmaku: DanmakuItem]
}>()

const danmakuStore = useDanmakuStore()

const text = ref('')
const color = ref('#FFFFFF')
const size = ref(DanmakuSize.MEDIUM)
const error = ref('')

const canSend = computed(() => {
  return text.value.trim().length > 0 && 
         text.value.length <= props.maxLength &&
         danmakuStore.connected
})

function send() {
  if (!canSend.value) {
    if (!danmakuStore.connected) {
      error.value = '未连接到服务器'
    } else if (text.value.trim().length === 0) {
      error.value = '弹幕内容不能为空'
    } else if (text.value.length > props.maxLength) {
      error.value = `弹幕长度不能超过 ${props.maxLength} 个字符`
    }
    return
  }

  // 清除错误
  error.value = ''

  // 创建弹幕对象
  const danmaku: DanmakuItem = {
    id: '', // 将由验证器生成
    text: text.value.trim(),
    type: DanmakuType.SCROLL,
    color: color.value,
    size: size.value,
    priority: 5,
    userId: props.userId,
    timestamp: Date.now()
  }

  // 发送弹幕
  try {
    danmakuStore.sendDanmaku(danmaku)
    emit('send', danmaku)
    
    // 清空输入
    text.value = ''
  } catch (err) {
    error.value = '发送失败，请重试'
    console.error('Failed to send danmaku:', err)
  }
}

// 清除错误消息
function clearError() {
  error.value = ''
}

// 监听输入变化，清除错误
watch(() => text.value, clearError)
</script>

<style scoped>
.danmaku-input {
  padding: 12px;
  background: rgba(0, 0, 0, 0.8);
  border-radius: 8px;
}

.input-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.text-input {
  flex: 1;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  color: white;
  font-size: 14px;
}

.text-input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.text-input:focus {
  outline: none;
  border-color: rgba(255, 255, 255, 0.4);
}

.color-input {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  background: transparent;
}

.size-select {
  padding: 10px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  color: white;
  cursor: pointer;
}

.send-button {
  padding: 10px 20px;
  background: #409eff;
  border: none;
  border-radius: 4px;
  color: white;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.send-button:hover:not(:disabled) {
  background: #66b1ff;
}

.send-button:disabled {
  background: rgba(255, 255, 255, 0.2);
  cursor: not-allowed;
}

.input-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}

.char-count {
  color: rgba(255, 255, 255, 0.6);
}

.char-count.warning {
  color: #f56c6c;
}

.error-message {
  color: #f56c6c;
}
</style>
