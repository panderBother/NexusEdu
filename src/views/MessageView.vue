<template>
  <div class="message-page">
    <!-- 顶部导航 -->
    <header class="page-header">
      <h1 class="page-title">消息</h1>
      <button class="add-btn">
        <svg viewBox="0 0 24 24">
          <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
        </svg>
      </button>
    </header>

    <!-- 标签切换 -->
    <div class="tabs-container">
      <button class="tab-btn active">聊天</button>
      <button class="tab-btn">通知</button>
      <button class="tab-btn">系统</button>
    </div>

    <div class="page-content">
      <!-- 聊天列表 -->
      <div class="chat-list">
        <div 
          class="chat-item" 
          v-for="i in 15" 
          :key="i"
          @click="openChat(i)"
        >
          <div class="chat-avatar-wrapper">
            <img :src="`https://i.pravatar.cc/150?img=${i+90}`" alt="Avatar" class="chat-avatar" />
            <div class="online-status" v-if="i % 3 === 0"></div>
            <div class="unread-badge" v-if="i % 2 === 0">{{ Math.floor(Math.random() * 99 + 1) }}</div>
          </div>
          
          <div class="chat-content">
            <div class="chat-header">
              <h3 class="chat-name">用户昵称_{{ i }}</h3>
              <span class="chat-time">{{ getTimeText(i) }}</span>
            </div>
            <div class="chat-preview">
              <span class="last-message">{{ getLastMessage(i) }}</span>
              <div class="message-badge" v-if="i % 4 === 0">
                <svg viewBox="0 0 24 24">
                  <path d="M9 11.75c-.69 0-1.25.56-1.25 1.25s.56 1.25 1.25 1.25 1.25-.56 1.25-1.25-.56-1.25-1.25-1.25zm6 0c-.69 0-1.25.56-1.25 1.25s.56 1.25 1.25 1.25 1.25-.56 1.25-1.25-.56-1.25-1.25-1.25zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8 0-.29.02-.58.05-.86 2.36-1.05 4.23-2.98 5.21-5.37C11.07 8.33 14.05 10 17.42 10c.78 0 1.53-.09 2.25-.26.21.71.33 1.47.33 2.26 0 4.41-3.59 8-8 8z"/>
                </svg>
              </div>
            </div>
          </div>

          <div class="chat-actions">
            <button class="action-dot"></button>
          </div>
        </div>
      </div>
    </div>

    <!-- 聊天弹窗 -->
    <div class="chat-modal" v-if="activeChatId">
      <div class="modal-header">
        <button class="back-btn" @click="closeChat">
          <svg viewBox="0 0 24 24">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
          </svg>
        </button>
        <div class="chat-user-info">
          <img :src="`https://i.pravatar.cc/150?img=${activeChatId+90}`" alt="Avatar" class="user-avatar-small" />
          <div>
            <h3 class="user-name-small">用户昵称_{{ activeChatId }}</h3>
            <p class="user-status">在线</p>
          </div>
        </div>
        <button class="more-btn">
          <svg viewBox="0 0 24 24">
            <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
          </svg>
        </button>
      </div>

      <div class="messages-container">
        <div class="message-item" v-for="j in 10" :key="j" :class="{ sent: j % 3 === 0 }">
          <img v-if="j % 3 !== 0" :src="`https://i.pravatar.cc/150?img=${activeChatId+90}`" alt="Avatar" class="message-avatar" />
          <div class="message-bubble">
            <p class="message-text">{{ j % 3 === 0 ? '这是我发送的消息' : '这是收到的消息，内容可能会很长很长很长' }}</p>
            <span class="message-time">{{ `${(j + 8).toString().padStart(2, '0')}:${(j * 5).toString().padStart(2, '0')}` }}</span>
          </div>
          <img v-if="j % 3 === 0" src="https://i.pravatar.cc/150?img=1" alt="Avatar" class="message-avatar" />
        </div>
      </div>

      <div class="chat-input-bar">
        <button class="input-tool-btn">
          <svg viewBox="0 0 24 24">
            <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM8.5 8c.83 0 1.5.67 1.5 1.5S9.33 11 8.5 11 7 10.33 7 9.5 7.67 8 8.5 8zM12 18c-2.28 0-4.22-1.66-5-4h10c-.78 2.34-2.72 4-5 4zm3.5-7c-.83 0-1.5-.67-1.5-1.5S14.67 8 15.5 8s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
          </svg>
        </button>
        <input type="text" class="message-input" placeholder="发送消息..." />
        <button class="send-btn">
          <svg viewBox="0 0 24 24">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- 底部导航 -->
    <BottomNav v-if="!activeChatId" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import BottomNav from './BottomNav.vue';

const activeChatId = ref<number | null>(null);

const getTimeText = (i: number) => {
  const times = ['刚刚', '5分钟前', '1小时前', '昨天', '2天前'];
  return times[i % times.length];
};

const getLastMessage = (i: number) => {
  const messages = [
    '你好，在吗？',
    '刚才的直播太精彩了！',
    '[图片]',
    '晚上一起开黑吗？',
    '收到，谢谢！',
    '哈哈哈哈',
    '明天见~',
    '好的没问题',
  ];
  return messages[i % messages.length];
};

const openChat = (id: number) => {
  activeChatId.value = id;
};

const closeChat = () => {
  activeChatId.value = null;
};
</script>

<style scoped>
.message-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #0a0e27 0%, #16213e 50%, #0a0e27 100%);
  color: #fff;
  position: relative;
}

/* 顶部导航 */
.page-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(10, 14, 39, 0.95);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(0, 247, 255, 0.2);
  padding: 16px 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.page-title {
  font-size: 24px;
  font-weight: 900;
  background: linear-gradient(135deg, #fff, #00f7ff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.add-btn {
  width: 40px;
  height: 40px;
  background: rgba(0, 247, 255, 0.1);
  border: 1px solid rgba(0, 247, 255, 0.3);
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.add-btn svg {
  width: 24px;
  height: 24px;
  fill: #00f7ff;
}

.add-btn:hover {
  background: rgba(0, 247, 255, 0.2);
  transform: scale(1.05);
}

/* 标签切换 */
.tabs-container {
  display: flex;
  gap: 12px;
  padding: 16px 32px;
  background: rgba(0, 247, 255, 0.05);
  border-bottom: 1px solid rgba(0, 247, 255, 0.1);
}

.tab-btn {
  padding: 10px 24px;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  font-size: 15px;
  font-weight: 600;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.tab-btn:hover {
  color: #00f7ff;
  background: rgba(0, 247, 255, 0.1);
}

.tab-btn.active {
  color: #fff;
  background: linear-gradient(135deg, #00f7ff, #0088ff);
  box-shadow: 0 4px 20px rgba(0, 247, 255, 0.3);
}

/* 页面内容 */
.page-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0;
}

/* 聊天列表 */
.chat-list {
  display: flex;
  flex-direction: column;
}

.chat-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 32px;
  border-bottom: 1px solid rgba(0, 247, 255, 0.1);
  cursor: pointer;
  transition: all 0.3s ease;
}

.chat-item:hover {
  background: rgba(0, 247, 255, 0.05);
}

.chat-avatar-wrapper {
  position: relative;
  flex-shrink: 0;
}

.chat-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid rgba(0, 247, 255, 0.3);
}

.online-status {
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 14px;
  height: 14px;
  background: #0f0;
  border: 2px solid #0a0e27;
  border-radius: 50%;
  box-shadow: 0 0 10px #0f0;
}

.unread-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  background: linear-gradient(135deg, #ff0050, #ff4d4d);
  border-radius: 10px;
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 10px rgba(255, 0, 80, 0.8);
}

.chat-content {
  flex: 1;
  min-width: 0;
}

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.chat-name {
  font-size: 16px;
  font-weight: 700;
  color: #fff;
}

.chat-time {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}

.chat-preview {
  display: flex;
  align-items: center;
  gap: 8px;
}

.last-message {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.message-badge {
  flex-shrink: 0;
}

.message-badge svg {
  width: 18px;
  height: 18px;
  fill: rgba(255, 255, 255, 0.5);
}

.chat-actions {
  flex-shrink: 0;
}

.action-dot {
  width: 32px;
  height: 32px;
  background: none;
  border: none;
  position: relative;
  cursor: pointer;
}

.action-dot::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 4px;
  height: 4px;
  background: rgba(255, 255, 255, 0.4);
  border-radius: 50%;
  box-shadow: 
    -8px 0 0 rgba(255, 255, 255, 0.4),
    8px 0 0 rgba(255, 255, 255, 0.4);
}

/* 聊天弹窗 */
.chat-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, #0a0e27 0%, #16213e 50%, #0a0e27 100%);
  z-index: 200;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 32px;
  background: rgba(10, 14, 39, 0.95);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(0, 247, 255, 0.2);
}

.back-btn {
  width: 40px;
  height: 40px;
  background: rgba(0, 247, 255, 0.1);
  border: 1px solid rgba(0, 247, 255, 0.3);
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.back-btn svg {
  width: 24px;
  height: 24px;
  fill: #00f7ff;
}

.back-btn:hover {
  background: rgba(0, 247, 255, 0.2);
  transform: translateX(-3px);
}

.chat-user-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-avatar-small {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid rgba(0, 247, 255, 0.5);
}

.user-name-small {
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 2px;
}

.user-status {
  font-size: 12px;
  color: #0f0;
}

.more-btn {
  width: 40px;
  height: 40px;
  background: rgba(0, 247, 255, 0.1);
  border: 1px solid rgba(0, 247, 255, 0.3);
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.more-btn svg {
  width: 24px;
  height: 24px;
  fill: #00f7ff;
}

/* 消息容器 */
.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 24px 32px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.message-item {
  display: flex;
  gap: 12px;
  align-items: flex-end;
}

.message-item.sent {
  flex-direction: row-reverse;
}

.message-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid rgba(0, 247, 255, 0.3);
  flex-shrink: 0;
}

.message-bubble {
  max-width: 60%;
  padding: 12px 16px;
  background: rgba(0, 247, 255, 0.1);
  border: 1px solid rgba(0, 247, 255, 0.3);
  border-radius: 16px;
}

.message-item.sent .message-bubble {
  background: linear-gradient(135deg, #00f7ff, #0088ff);
  border-color: #00f7ff;
}

.message-text {
  font-size: 15px;
  line-height: 1.5;
  color: #fff;
  margin-bottom: 6px;
}

.message-time {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
}

/* 输入栏 */
.chat-input-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 32px;
  background: rgba(10, 14, 39, 0.95);
  backdrop-filter: blur(20px);
  border-top: 1px solid rgba(0, 247, 255, 0.2);
}

.input-tool-btn {
  width: 40px;
  height: 40px;
  background: rgba(0, 247, 255, 0.1);
  border: 1px solid rgba(0, 247, 255, 0.3);
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.input-tool-btn svg {
  width: 24px;
  height: 24px;
  fill: #00f7ff;
}

.message-input {
  flex: 1;
  padding: 12px 18px;
  background: rgba(0, 247, 255, 0.1);
  border: 1px solid rgba(0, 247, 255, 0.3);
  border-radius: 20px;
  color: #fff;
  font-size: 15px;
  outline: none;
}

.message-input::placeholder {
  color: rgba(255, 255, 255, 0.4);
}

.send-btn {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #00f7ff, #0088ff);
  border: none;
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.3s ease;
}

.send-btn svg {
  width: 24px;
  height: 24px;
  fill: #fff;
}

.send-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 20px rgba(0, 247, 255, 0.5);
}

/* 响应式 */
@media (max-width: 768px) {
  .tabs-container,
  .chat-item,
  .modal-header,
  .messages-container,
  .chat-input-bar {
    padding-left: 16px;
    padding-right: 16px;
  }
}
</style>
