/**
 * 弹幕状态管理 Store
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { DanmakuItem, DanmakuConfig, ActiveDanmaku, ControlSettings } from '@/danmaku/types'
import { DanmakuManager } from '@/danmaku/core/DanmakuManager'
import { ControlManager } from '@/danmaku/control/ControlManager'
import { InteractionManager } from '@/danmaku/interaction/InteractionManager'
import { WebSocketClient, ConnectionState } from '@/danmaku/network/WebSocketClient'
import { IndexedDBStore } from '@/danmaku/storage/IndexedDBStore'
import { HistoryPlayer, PlaybackState } from '@/danmaku/history/HistoryPlayer'

export const useDanmakuStore = defineStore('danmaku', () => {
  // ==================== 状态 ====================
  
  // 管理器实例
  const danmakuManager = ref<DanmakuManager | null>(null)
  const controlManager = ref<ControlManager>(new ControlManager())
  const interactionManager = ref<InteractionManager>(new InteractionManager())
  const wsClient = ref<WebSocketClient>(new WebSocketClient())
  const dbStore = ref<IndexedDBStore>(new IndexedDBStore())
  const historyPlayer = ref<HistoryPlayer | null>(null)

  // 连接状态
  const connected = ref(false)
  const connectionState = ref<ConnectionState>(ConnectionState.DISCONNECTED)

  // 活动弹幕
  const activeDanmaku = ref<ActiveDanmaku[]>([])
  const queueLength = ref(0)
  const fps = ref(60)

  // 设置
  const settings = ref<ControlSettings>(controlManager.value.getSettings())

  // 屏蔽用户
  const blockedUsers = ref<Set<string>>(new Set())
  const keywordFilters = ref<Set<string>>(new Set())

  // 历史回放状态
  const playbackState = ref<PlaybackState>(PlaybackState.STOPPED)

  // ==================== 计算属性 ====================

  const isVisible = computed(() => settings.value.visible)
  const currentOpacity = computed(() => settings.value.opacity)
  const filteredDanmakuCount = computed(() => {
    return blockedUsers.value.size + keywordFilters.value.size
  })

  // ==================== 方法 ====================

  /**
   * 初始化弹幕系统
   */
  async function initialize(canvas: HTMLCanvasElement, config: DanmakuConfig) {
    // 初始化弹幕管理器
    danmakuManager.value = new DanmakuManager()
    danmakuManager.value.initialize(canvas, config)

    // 初始化交互管理器
    interactionManager.value.initialize(canvas)

    // 初始化数据库
    try {
      await dbStore.value.initialize()
      console.log('IndexedDB initialized')
    } catch (error) {
      console.error('Failed to initialize IndexedDB:', error)
    }

    // 初始化历史回放器
    historyPlayer.value = new HistoryPlayer(dbStore.value)

    // 设置交互事件监听
    setupInteractionListeners()

    // 加载设置
    loadSettings()

    console.log('Danmaku system initialized')
  }

  /**
   * 连接 WebSocket 服务器
   */
  async function connect(url: string) {
    try {
      await wsClient.value.connect(url)
      connected.value = true
      connectionState.value = ConnectionState.CONNECTED

      // 监听弹幕消息
      wsClient.value.onDanmaku((danmaku) => {
        handleIncomingDanmaku(danmaku)
      })

      // 监听连接状态变化
      wsClient.value.onConnectionChange((isConnected) => {
        connected.value = isConnected
        connectionState.value = wsClient.value.getState()
      })

      console.log('WebSocket connected')
    } catch (error) {
      console.error('Failed to connect WebSocket:', error)
      throw error
    }
  }

  /**
   * 断开连接
   */
  function disconnect() {
    wsClient.value.disconnect()
    connected.value = false
    connectionState.value = ConnectionState.DISCONNECTED
  }

  /**
   * 添加弹幕
   */
  function addDanmaku(danmaku: DanmakuItem) {
    if (!danmakuManager.value) {
      console.warn('DanmakuManager not initialized')
      return
    }

    // 检查过滤
    if (controlManager.value.shouldFilter(danmaku.text, danmaku.userId)) {
      console.log('Danmaku filtered:', danmaku.text)
      return
    }

    // 添加到管理器
    danmakuManager.value.addDanmaku(danmaku)

    // 保存到数据库
    dbStore.value.saveDanmaku(danmaku).catch(error => {
      console.error('Failed to save danmaku:', error)
    })
  }

  /**
   * 发送弹幕
   */
  function sendDanmaku(danmaku: DanmakuItem) {
    // 发送到服务器
    wsClient.value.sendDanmaku(danmaku)

    // 本地显示
    addDanmaku(danmaku)
  }

  /**
   * 启动渲染
   */
  function start() {
    if (danmakuManager.value) {
      danmakuManager.value.start()
    }
  }

  /**
   * 停止渲染
   */
  function stop() {
    if (danmakuManager.value) {
      danmakuManager.value.stop()
    }
  }

  /**
   * 清除所有弹幕
   */
  function clear() {
    if (danmakuManager.value) {
      danmakuManager.value.clear()
    }
  }

  /**
   * 更新设置
   */
  function updateSettings(partial: Partial<ControlSettings>) {
    controlManager.value.updateSettings(partial)
    settings.value = controlManager.value.getSettings()
    
    // 更新本地集合
    blockedUsers.value = new Set(settings.value.blockedUsers)
    keywordFilters.value = new Set(settings.value.keywordFilters)
  }

  /**
   * 屏蔽用户
   */
  function blockUser(userId: string) {
    controlManager.value.blockUser(userId)
    settings.value = controlManager.value.getSettings()
    blockedUsers.value.add(userId)
  }

  /**
   * 取消屏蔽用户
   */
  function unblockUser(userId: string) {
    controlManager.value.unblockUser(userId)
    settings.value = controlManager.value.getSettings()
    blockedUsers.value.delete(userId)
  }

  /**
   * 添加关键词过滤
   */
  function addKeywordFilter(keyword: string) {
    controlManager.value.addKeywordFilter(keyword)
    settings.value = controlManager.value.getSettings()
    keywordFilters.value.add(keyword)
  }

  /**
   * 移除关键词过滤
   */
  function removeKeywordFilter(keyword: string) {
    controlManager.value.removeKeywordFilter(keyword)
    settings.value = controlManager.value.getSettings()
    keywordFilters.value.delete(keyword)
  }

  /**
   * 加载历史弹幕
   */
  async function loadHistory(startTime: number, endTime: number) {
    if (!historyPlayer.value) {
      throw new Error('HistoryPlayer not initialized')
    }

    await historyPlayer.value.loadHistory(startTime, endTime)

    // 监听回放弹幕
    historyPlayer.value.onDanmaku((danmaku) => {
      addDanmaku(danmaku)
    })

    // 监听回放状态
    historyPlayer.value.onStateChange((state) => {
      playbackState.value = state
    })
  }

  /**
   * 开始回放
   */
  function playHistory() {
    if (historyPlayer.value) {
      historyPlayer.value.play()
    }
  }

  /**
   * 暂停回放
   */
  function pauseHistory() {
    if (historyPlayer.value) {
      historyPlayer.value.pause()
    }
  }

  /**
   * 停止回放
   */
  function stopHistory() {
    if (historyPlayer.value) {
      historyPlayer.value.stop()
    }
  }

  /**
   * 获取统计信息
   */
  function getStats() {
    return {
      activeDanmaku: danmakuManager.value?.getActiveDanmakuCount() || 0,
      queueLength: danmakuManager.value?.getQueueLength() || 0,
      fps: danmakuManager.value?.getFPS() || 0,
      connected: connected.value,
      blockedUsersCount: blockedUsers.value.size,
      keywordFiltersCount: keywordFilters.value.size
    }
  }

  /**
   * 处理接收到的弹幕
   */
  function handleIncomingDanmaku(danmaku: DanmakuItem) {
    addDanmaku(danmaku)
  }

  /**
   * 设置交互事件监听
   */
  function setupInteractionListeners() {
    // 点赞事件
    interactionManager.value.on('like', (event) => {
      console.log('Like danmaku:', event.danmaku.id)
      // 发送点赞请求到服务器
      // TODO: 实现点赞 API 调用
    })

    // 评论事件
    interactionManager.value.on('comment', (event) => {
      console.log('Comment danmaku:', event.danmaku.id)
      // 打开评论对话框
      // TODO: 实现评论 UI
    })

    // 提及事件
    interactionManager.value.on('mention', (event) => {
      console.log('Mention user:', event.data.userId)
      // 在输入框中插入 @ 提及
      // TODO: 实现 @ 提及功能
    })

    // 屏蔽事件
    interactionManager.value.on('block', (event) => {
      blockUser(event.data.userId)
    })

    // 举报事件
    interactionManager.value.on('report', (event) => {
      console.log('Report danmaku:', event.danmaku.id, event.data.reason)
      // 发送举报请求到服务器
      // TODO: 实现举报 API 调用
    })
  }

  /**
   * 加载设置
   */
  function loadSettings() {
    controlManager.value.loadSettings()
    settings.value = controlManager.value.getSettings()
    blockedUsers.value = new Set(settings.value.blockedUsers)
    keywordFilters.value = new Set(settings.value.keywordFilters)
  }

  /**
   * 保存设置
   */
  function saveSettings() {
    controlManager.value.saveSettings()
  }

  // ==================== 返回 ====================

  return {
    // 状态
    connected,
    connectionState,
    activeDanmaku,
    queueLength,
    fps,
    settings,
    blockedUsers,
    keywordFilters,
    playbackState,

    // 计算属性
    isVisible,
    currentOpacity,
    filteredDanmakuCount,

    // 方法
    initialize,
    connect,
    disconnect,
    addDanmaku,
    sendDanmaku,
    start,
    stop,
    clear,
    updateSettings,
    blockUser,
    unblockUser,
    addKeywordFilter,
    removeKeywordFilter,
    loadHistory,
    playHistory,
    pauseHistory,
    stopHistory,
    getStats,
    saveSettings,
    loadSettings,

    // 管理器实例（用于高级操作）
    danmakuManager,
    controlManager,
    interactionManager,
    wsClient,
    dbStore,
    historyPlayer
  }
})
