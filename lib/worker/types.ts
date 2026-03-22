/**
 * Worker 离屏渲染相关类型定义
 */

// 消息类型枚举
export enum MessageType {
  // 初始化相关
  INIT = 'init',
  READY = 'ready',
  
  // 弹幕操作
  ADD_BARRAGE = 'add_barrage',
  REMOVE_BARRAGE = 'remove_barrage',
  CLEAR_BARRAGES = 'clear_barrages',
  
  // 控制操作
  PAUSE = 'pause',
  RESUME = 'resume',
  
  // 配置更新
  UPDATE_CONFIG = 'update_config',
  RESIZE = 'resize',
  
  // 错误处理
  ERROR = 'error',
  
  // 状态同步
  SYNC_STATE = 'sync_state',
  STATE_RESPONSE = 'state_response'
}

// 基础消息接口
export interface Message {
  type: MessageType;
  id?: string;
  payload?: any;
  timestamp: number;
}

// 弹幕数据接口
export interface WorkerBarrageData {
  id: string;
  text: string;
  x: number;
  y: number;
  speed: number;
  color: string;
  fontSize: number;
  fontFamily: string;
  opacity: number;
  timestamp: number;
  barrageType: 'scroll' | 'fixed' | 'senior';
  // 滚动弹幕特有属性
  originalLeft?: number;
  originalRight?: number;
  endTime?: number;
  // 固定弹幕特有属性
  duration?: number;
  position?: 'top' | 'bottom';
  // 高级弹幕特有属性
  seniorConfig?: {
    startLocation: { x: number; y: number };
    endLocation: { x: number; y: number };
    totalDuration: number;
    delay: number;
    motionDuration: number;
  };
}

// Worker 配置接口
export interface WorkerConfig {
  canvasWidth: number;
  canvasHeight: number;
  fps: number;
  maxBarrages: number;
  enableOptimization: boolean;
  speed: number;
  opacity: number;
  fontFamily: string;
  fontWeight: string;
  avoidOverlap: boolean;
  minSpace: number;
}

// 错误类型
export enum WorkerErrorType {
  INITIALIZATION_FAILED = 'initialization_failed',
  CANVAS_TRANSFER_FAILED = 'canvas_transfer_failed',
  WORKER_CRASHED = 'worker_crashed',
  COMMUNICATION_ERROR = 'communication_error',
  UNSUPPORTED_BROWSER = 'unsupported_browser',
  RENDER_ERROR = 'render_error'
}

// 错误接口
export interface WorkerError {
  type: WorkerErrorType;
  message: string;
  originalError?: Error;
  timestamp: number;
}

// 状态同步数据
export interface WorkerState {
  barrages: WorkerBarrageData[];
  config: WorkerConfig;
  isPaused: boolean;
  currentTime: number;
}

// 消息载荷类型
export interface InitPayload {
  canvas: OffscreenCanvas;
  config: WorkerConfig;
}

export interface AddBarragePayload {
  barrage: WorkerBarrageData;
}

export interface RemoveBarragePayload {
  id: string;
}

export interface UpdateConfigPayload {
  config: Partial<WorkerConfig>;
}

export interface ResizePayload {
  width: number;
  height: number;
}

export interface ErrorPayload {
  error: WorkerError;
}