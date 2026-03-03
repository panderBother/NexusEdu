/**
 * HLS 切片录播上传系统 - 核心类型定义
 */

// ==================== 切片状态 ====================
export type SliceStatus = 'pending' | 'uploading' | 'completed' | 'failed'

// ==================== 切片元数据 ====================
export interface SliceMetadata {
  id: string
  taskId: string
  index: number
  duration: number
  size: number
  localUrl: string
  remoteUrl?: string
  status: SliceStatus
  retryCount: number
  lastError?: string
  lastErrorTime?: number
  uploadedAt?: number
}

// ==================== 上传任务 ====================
export interface UploadTask {
  id: string
  m3u8Url: string
  slices: SliceMetadata[]
  status: 'pending' | 'uploading' | 'paused' | 'completed' | 'failed'
  createdAt: number
  updatedAt: number
  config?: UploadConfig
}

// ==================== 上传配置 ====================
export interface UploadConfig {
  maxConcurrency: number
  timeout: number
  maxRetries: number
  uploadEndpoint: string
  autoStart: boolean
}

// ==================== 上传进度 ====================
export interface UploadProgress {
  taskId: string
  uploadedBytes: number
  totalBytes: number
  uploadedSlices: number
  totalSlices: number
  percentage: number
  speed: number // bytes per second
  eta: number // seconds
  sliceProgress: Map<string, SliceProgress>
}

export interface SliceProgress {
  sliceId: string
  loaded: number
  total: number
  percentage: number
  status: SliceStatus
}

// ==================== 队列状态 ====================
export interface QueueStatus {
  pending: number
  uploading: number
  completed: number
  failed: number
  total: number
}

// ==================== M3U8 相关 ====================
export interface M3U8Playlist {
  version: number
  targetDuration: number
  mediaSequence: number
  segments: M3U8Segment[]
  endList: boolean
}

export interface M3U8Segment {
  duration: number
  uri: string
  index: number
}

// ==================== Worker 消息类型 ====================
export type WorkerMessage = 
  | { type: 'UPLOAD_SLICE'; payload: UploadSlicePayload }
  | { type: 'PAUSE_UPLOAD'; payload: { taskId: string } }
  | { type: 'CANCEL_UPLOAD'; payload: { taskId: string } }
  | { type: 'UPDATE_CONFIG'; payload: WorkerConfig }

export type WorkerResponse =
  | { type: 'UPLOAD_PROGRESS'; payload: UploadProgressPayload }
  | { type: 'UPLOAD_SUCCESS'; payload: UploadSuccessPayload }
  | { type: 'UPLOAD_FAILURE'; payload: UploadFailurePayload }
  | { type: 'WORKER_ERROR'; payload: { error: string } }

export interface UploadSlicePayload {
  taskId: string
  sliceId: string
  sliceUrl: string
  uploadUrl: string
  index: number
}

export interface UploadProgressPayload {
  taskId: string
  sliceId: string
  loaded: number
  total: number
  percentage: number
}

export interface UploadSuccessPayload {
  taskId: string
  sliceId: string
  remoteUrl: string
  duration: number
}

export interface UploadFailurePayload {
  taskId: string
  sliceId: string
  error: string
  retryable: boolean
}

export interface WorkerConfig {
  maxConcurrency: number
  timeout: number
  chunkSize: number
}

// ==================== 错误处理 ====================
export interface UploadError {
  type: 'network' | 'server' | 'client'
  sliceId: string
  statusCode?: number
  message: string
  timestamp: number
  retryable: boolean
}

export interface ErrorHandlingDecision {
  shouldRetry: boolean
  retryDelay?: number
  fallbackAction?: 'skip' | 'manual' | 'abort'
}

export interface WorkerError {
  message: string
  stack?: string
  timestamp: number
}

export interface StorageError {
  type: 'quota_exceeded' | 'access_denied' | 'unknown'
  message: string
  timestamp: number
}

// ==================== IndexedDB 记录 ====================
export interface UploadTaskRecord {
  id: string
  m3u8Url: string
  status: 'pending' | 'uploading' | 'paused' | 'completed' | 'failed'
  totalSize: number
  uploadedSize: number
  totalSlices: number
  completedSlices: number
  createdAt: number
  updatedAt: number
  config: UploadConfig
}

export interface SliceMetadataRecord {
  id: string
  taskId: string
  index: number
  duration: number
  size: number
  localUrl: string
  remoteUrl?: string
  status: SliceStatus
  retryCount: number
  lastError?: string
  lastErrorTime?: number
  uploadedAt?: number
}

export interface SliceStatusUpdate {
  taskId: string
  sliceId: string
  status: SliceStatus
  remoteUrl?: string
  error?: string
}
