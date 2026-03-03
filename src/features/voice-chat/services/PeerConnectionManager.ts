/**
 * PeerConnectionManager
 * 管理多个 RTCPeerConnection 实例
 */

import type { NetworkQuality } from '../types'

export class PeerConnectionManager {
  private connections: Map<string, RTCPeerConnection> = new Map()
  private config: RTCConfiguration
  private stateCallbacks: Map<string, (state: RTCPeerConnectionState) => void> = new Map()
  private qualityCallbacks: Map<string, (quality: NetworkQuality) => void> = new Map()
  private qualityMonitorIntervals: Map<string, NodeJS.Timeout> = new Map()

  constructor(config?: RTCConfiguration) {
    this.config = config || {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ],
      iceTransportPolicy: 'all',
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require'
    }
  }

  /**
   * 创建连接
   */
  createConnection(participantId: string): RTCPeerConnection {
    // 如果已存在，先关闭
    if (this.connections.has(participantId)) {
      this.removeConnection(participantId)
    }

    const pc = new RTCPeerConnection(this.config)
    this.connections.set(participantId, pc)

    // 监听连接状态变化
    pc.onconnectionstatechange = () => {
      const callback = this.stateCallbacks.get(participantId)
      if (callback) {
        callback(pc.connectionState)
      }
    }

    // 监听 ICE 连接状态
    pc.oniceconnectionstatechange = () => {
      console.log(`[${participantId}] ICE connection state:`, pc.iceConnectionState)
    }

    return pc
  }

  /**
   * 获取连接
   */
  getConnection(participantId: string): RTCPeerConnection | undefined {
    return this.connections.get(participantId)
  }

  /**
   * 移除连接
   */
  removeConnection(participantId: string): void {
    const pc = this.connections.get(participantId)
    if (pc) {
      try {
        pc.close()
      } catch (error) {
        console.error(`Failed to close connection for ${participantId}:`, error)
      }
      this.connections.delete(participantId)
    }

    // 清理回调
    this.stateCallbacks.delete(participantId)
    this.qualityCallbacks.delete(participantId)

    // 停止网络质量监控
    const interval = this.qualityMonitorIntervals.get(participantId)
    if (interval) {
      clearInterval(interval)
      this.qualityMonitorIntervals.delete(participantId)
    }
  }

  /**
   * 获取所有连接
   */
  getAllConnections(): Map<string, RTCPeerConnection> {
    return new Map(this.connections)
  }

  /**
   * 关闭所有连接
   */
  closeAllConnections(): void {
    const participantIds = Array.from(this.connections.keys())
    participantIds.forEach(id => this.removeConnection(id))
  }

  /**
   * 监控连接状态
   */
  monitorConnectionState(
    participantId: string,
    callback: (state: RTCPeerConnectionState) => void
  ): void {
    this.stateCallbacks.set(participantId, callback)
  }

  /**
   * 监控网络质量
   */
  monitorNetworkQuality(
    participantId: string,
    callback: (quality: NetworkQuality) => void
  ): void {
    this.qualityCallbacks.set(participantId, callback)

    // 每 2 秒收集一次统计数据
    const interval = setInterval(async () => {
      const pc = this.connections.get(participantId)
      if (!pc) {
        clearInterval(interval)
        this.qualityMonitorIntervals.delete(participantId)
        return
      }

      try {
        const quality = await this.calculateNetworkQuality(pc)
        callback(quality)
      } catch (error) {
        console.error(`Failed to calculate network quality for ${participantId}:`, error)
      }
    }, 2000)

    this.qualityMonitorIntervals.set(participantId, interval)
  }

  /**
   * 计算网络质量
   */
  private async calculateNetworkQuality(pc: RTCPeerConnection): Promise<NetworkQuality> {
    const stats = await pc.getStats()
    let packetLoss = 0
    let jitter = 0
    let rtt = 0

    stats.forEach((report) => {
      if (report.type === 'inbound-rtp') {
        // 计算丢包率
        const packetsLost = (report as any).packetsLost || 0
        const packetsReceived = (report as any).packetsReceived || 0
        if (packetsReceived > 0) {
          packetLoss = packetsLost / (packetsLost + packetsReceived)
        }

        // 获取抖动
        jitter = (report as any).jitter || 0
      }

      if (report.type === 'candidate-pair' && (report as any).state === 'succeeded') {
        // 获取 RTT
        rtt = (report as any).currentRoundTripTime * 1000 || 0
      }
    })

    // 计算质量等级
    let level: NetworkQuality['level'] = 'excellent'
    if (packetLoss > 0.1 || rtt > 300) {
      level = 'poor'
    } else if (packetLoss > 0.05 || rtt > 200) {
      level = 'fair'
    } else if (packetLoss > 0.02 || rtt > 100) {
      level = 'good'
    }

    return {
      level,
      packetLoss,
      jitter,
      rtt
    }
  }

  /**
   * 获取连接数量
   */
  getConnectionCount(): number {
    return this.connections.size
  }
}
