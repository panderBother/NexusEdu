/**
 * WebRTC 连麦功能工具函数
 */

import type { RetryConfig, NetworkQuality } from '../types'
import { defaultRetryConfig } from '../types'

/**
 * 计算指数退避延迟
 */
export function calculateBackoffDelay(
  attempt: number,
  config: RetryConfig = defaultRetryConfig
): number {
  const delay = config.initialDelay * Math.pow(config.backoffMultiplier, attempt - 1)
  return Math.min(delay, config.maxDelay)
}

/**
 * 延迟函数
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 生成唯一 ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * 计算网络质量等级
 */
export function calculateNetworkQualityLevel(
  packetLoss: number,
  rtt: number,
  jitter: number
): NetworkQuality['level'] {
  // 优秀：丢包 < 1%, RTT < 100ms, 抖动 < 20ms
  if (packetLoss < 0.01 && rtt < 100 && jitter < 20) {
    return 'excellent'
  }
  
  // 良好：丢包 < 5%, RTT < 200ms, 抖动 < 40ms
  if (packetLoss < 0.05 && rtt < 200 && jitter < 40) {
    return 'good'
  }
  
  // 一般：丢包 < 10%, RTT < 300ms, 抖动 < 60ms
  if (packetLoss < 0.1 && rtt < 300 && jitter < 60) {
    return 'fair'
  }
  
  // 差
  return 'poor'
}

/**
 * 从 RTCStatsReport 提取网络统计信息
 */
export async function extractNetworkStats(
  stats: RTCStatsReport
): Promise<{ packetLoss: number; jitter: number; rtt: number }> {
  let packetLoss = 0
  let jitter = 0
  let rtt = 0

  stats.forEach((report) => {
    if (report.type === 'inbound-rtp') {
      // 计算丢包率
      const packetsLost = report.packetsLost || 0
      const packetsReceived = report.packetsReceived || 0
      const totalPackets = packetsLost + packetsReceived
      if (totalPackets > 0) {
        packetLoss = packetsLost / totalPackets
      }
      
      // 抖动
      jitter = report.jitter ? report.jitter * 1000 : 0 // 转换为毫秒
    }
    
    if (report.type === 'candidate-pair' && report.state === 'succeeded') {
      // RTT
      rtt = report.currentRoundTripTime ? report.currentRoundTripTime * 1000 : 0 // 转换为毫秒
    }
  })

  return { packetLoss, jitter, rtt }
}

/**
 * 检查是否支持 WebRTC
 */
export function isWebRTCSupported(): boolean {
  return !!(
    window.RTCPeerConnection &&
    navigator.mediaDevices &&
    navigator.mediaDevices.getUserMedia
  )
}

/**
 * 检查是否支持 WebSocket
 */
export function isWebSocketSupported(): boolean {
  return !!window.WebSocket
}

/**
 * 格式化时间戳
 */
export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

/**
 * 深拷贝对象
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

/**
 * 节流函数
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  let previous = 0

  return function (this: any, ...args: Parameters<T>) {
    const now = Date.now()
    const remaining = wait - (now - previous)

    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout)
        timeout = null
      }
      previous = now
      func.apply(this, args)
    } else if (!timeout) {
      timeout = setTimeout(() => {
        previous = Date.now()
        timeout = null
        func.apply(this, args)
      }, remaining)
    }
  }
}

/**
 * 防抖函数
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return function (this: any, ...args: Parameters<T>) {
    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(() => {
      func.apply(this, args)
    }, wait)
  }
}
