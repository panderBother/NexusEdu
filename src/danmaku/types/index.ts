/**
 * 高性能弹幕系统 - 核心类型定义
 */

// ==================== 枚举类型 ====================

/**
 * 弹幕类型
 */
export enum DanmakuType {
  SCROLL = 'scroll',     // 滚动弹幕
  TOP = 'top',           // 顶部弹幕
  BOTTOM = 'bottom',     // 底部弹幕
  VIP = 'vip',           // VIP 弹幕
  GIFT = 'gift'          // 礼物弹幕
}

/**
 * 弹幕字体大小
 */
export enum DanmakuSize {
  SMALL = 18,
  MEDIUM = 24,
  LARGE = 32
}

/**
 * 速度等级
 */
export enum SpeedLevel {
  SLOW = 8000,      // 8 秒穿越屏幕
  MEDIUM = 6000,    // 6 秒
  FAST = 4000       // 4 秒
}

/**
 * 密度等级
 */
export enum DensityLevel {
  SPARSE = 0.3,     // 30% 轨道占用
  NORMAL = 0.6,     // 60%
  DENSE = 0.9       // 90%
}

/**
 * 轨道类型
 */
export enum TrackType {
  SCROLL = 'scroll',
  TOP = 'top',
  BOTTOM = 'bottom'
}

// ==================== 核心接口 ====================

/**
 * 弹幕项
 */
export interface DanmakuItem {
  id: string                    // 唯一标识符
  text: string                  // 弹幕文本
  type: DanmakuType            // 弹幕类型
  color: string                 // 颜色（RGB 或十六进制）
  size: DanmakuSize            // 字体大小
  priority: number              // 优先级（0-10）
  userId: string                // 发送者 ID
  timestamp: number             // 发送时间戳
  speed?: number                // 自定义速度
  position?: { x: number, y: number }  // 固定位置（顶部/底部弹幕）
}

/**
 * 活动弹幕（包含运行时状态）
 */
export interface ActiveDanmaku extends DanmakuItem {
  x: number                     // 当前 X 坐标
  y: number                     // 当前 Y 坐标
  track: Track                  // 所在轨道
  startTime: number             // 开始显示时间
  duration: number              // 显示时长
  texture?: ImageBitmap         // 预渲染纹理
  paused?: boolean              // 是否暂停
}

/**
 * 弹幕配置
 */
export interface DanmakuConfig {
  width: number                 // Canvas 宽度
  height: number                // Canvas 高度
  maxDanmaku: number           // 最大同时显示弹幕数
  trackHeight: number          // 轨道高度
  trackGap: number             // 轨道间距
  useOffscreen: boolean        // 是否使用离屏渲染
  cacheSize: number            // 缓存大小（MB）
}

/**
 * 轨道
 */
export interface Track {
  id: number                    // 轨道 ID
  y: number                     // Y 坐标
  type: TrackType              // 轨道类型
  occupied: boolean            // 是否被占用
  lastDanmaku: DanmakuItem | null  // 最后一条弹幕
  lastDanmakuEndTime: number   // 最后一条弹幕的结束时间
}

/**
 * 缓存条目
 */
export interface CacheEntry {
  key: string
  texture: ImageBitmap
  size: number                  // 字节大小
  lastAccessed: number          // 最后访问时间
  accessCount: number           // 访问次数
}

/**
 * 控制设置
 */
export interface ControlSettings {
  visible: boolean
  opacity: number               // 0-1
  speed: SpeedLevel
  density: DensityLevel
  keywordFilters: string[]
  userFilters: string[]
  blockedUsers: string[]
}

/**
 * 交互动作
 */
export interface InteractionAction {
  type: 'like' | 'comment' | 'mention' | 'block' | 'report'
  label: string
  icon: string
  handler: () => void
}

/**
 * 交互菜单
 */
export interface InteractionMenu {
  danmaku: ActiveDanmaku
  position: { x: number, y: number }
  visible: boolean
  actions: InteractionAction[]
}

/**
 * WebSocket 消息
 */
export interface WebSocketMessage {
  type: 'danmaku' | 'like' | 'comment' | 'report'
  payload: any
  timestamp: number
}

/**
 * 弹幕记录（用于 IndexedDB）
 */
export interface DanmakuRecord extends DanmakuItem {
  savedAt: number               // 保存时间
}

// ==================== Worker 消息接口 ====================

/**
 * Worker 消息类型
 */
export type WorkerMessageType = 'render' | 'cache' | 'clear'

/**
 * Worker 消息
 */
export interface WorkerMessage {
  type: WorkerMessageType
  payload: any
}

/**
 * 渲染负载
 */
export interface RenderPayload {
  danmakuList: ActiveDanmaku[]
  canvasWidth: number
  canvasHeight: number
}

/**
 * 缓存负载
 */
export interface CachePayload {
  danmaku: DanmakuItem
}

/**
 * Worker 响应类型
 */
export type WorkerResponseType = 'rendered' | 'cached' | 'error'

/**
 * Worker 响应
 */
export interface WorkerResponse {
  type: WorkerResponseType
  payload: any
}

/**
 * 渲染响应负载
 */
export interface RenderedPayload {
  imageBitmap: ImageBitmap
  transferables: Transferable[]
}
