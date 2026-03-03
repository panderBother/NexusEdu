/**
 * PerformanceOptimizer
 * 性能优化：自适应码率、分辨率调整
 */

import type { NetworkQuality } from '../types'
import {
  LOW_BANDWIDTH_THRESHOLD,
  PACKET_LOSS_THRESHOLD,
  BITRATE_REDUCTION_FACTOR
} from '../constants'

export class PerformanceOptimizer {
  private currentBandwidth: number = 0
  private currentPacketLoss: number = 0
  private currentBitrate: number = 1000000 // 1 Mbps 默认
  private minBitrate: number = 100000 // 100 kbps
  private maxBitrate: number = 2000000 // 2 Mbps

  /**
   * 更新网络统计
   */
  updateNetworkStats(quality: NetworkQuality): void {
    this.currentPacketLoss = quality.packetLoss
  }

  /**
   * 更新带宽
   */
  updateBandwidth(bandwidth: number): void {
    this.currentBandwidth = bandwidth
  }

  /**
   * 自适应调整视频分辨率
   */
  async adjustVideoResolution(
    sender: RTCRtpSender,
    bandwidth: number
  ): Promise<void> {
    if (bandwidth < LOW_BANDWIDTH_THRESHOLD) {
      // 低带宽：降低分辨率
      const parameters = sender.getParameters()
      if (parameters.encodings && parameters.encodings.length > 0) {
        parameters.encodings[0].maxBitrate = 300000 // 300 kbps
        parameters.encodings[0].scaleResolutionDownBy = 2 // 降低分辨率
        await sender.setParameters(parameters)
      }
    } else {
      // 正常带宽：恢复分辨率
      const parameters = sender.getParameters()
      if (parameters.encodings && parameters.encodings.length > 0) {
        parameters.encodings[0].maxBitrate = this.maxBitrate
        parameters.encodings[0].scaleResolutionDownBy = 1
        await sender.setParameters(parameters)
      }
    }
  }

  /**
   * 音频优先策略
   */
  async prioritizeAudio(
    videoSender: RTCRtpSender,
    audioSender: RTCRtpSender
  ): Promise<void> {
    // 降低视频码率
    const videoParams = videoSender.getParameters()
    if (videoParams.encodings && videoParams.encodings.length > 0) {
      const currentBitrate = videoParams.encodings[0].maxBitrate || this.currentBitrate
      videoParams.encodings[0].maxBitrate = currentBitrate * (1 - BITRATE_REDUCTION_FACTOR)
      await videoSender.setParameters(videoParams)
    }

    // 保持音频码率
    const audioParams = audioSender.getParameters()
    if (audioParams.encodings && audioParams.encodings.length > 0) {
      audioParams.encodings[0].maxBitrate = 128000 // 128 kbps
      await audioSender.setParameters(audioParams)
    }
  }

  /**
   * 动态码率调整
   */
  async adjustBitrate(
    sender: RTCRtpSender,
    packetLoss: number
  ): Promise<void> {
    const parameters = sender.getParameters()
    if (!parameters.encodings || parameters.encodings.length === 0) {
      return
    }

    const currentBitrate = parameters.encodings[0].maxBitrate || this.currentBitrate

    if (packetLoss > PACKET_LOSS_THRESHOLD) {
      // 丢包率高：降低码率 25%
      const newBitrate = Math.max(
        currentBitrate * (1 - BITRATE_REDUCTION_FACTOR),
        this.minBitrate
      )
      parameters.encodings[0].maxBitrate = newBitrate
      this.currentBitrate = newBitrate
      await sender.setParameters(parameters)
    } else if (packetLoss < 0.05 && currentBitrate < this.maxBitrate) {
      // 网络质量好：逐步提高码率
      const newBitrate = Math.min(
        currentBitrate * 1.1, // 提高 10%
        this.maxBitrate
      )
      parameters.encodings[0].maxBitrate = newBitrate
      this.currentBitrate = newBitrate
      await sender.setParameters(parameters)
    }
  }

  /**
   * 获取推荐的视频约束
   */
  getRecommendedVideoConstraints(bandwidth: number): MediaTrackConstraints {
    if (bandwidth < 300000) {
      // < 300 kbps: 低分辨率
      return {
        width: { ideal: 320 },
        height: { ideal: 240 },
        frameRate: { ideal: 15 }
      }
    } else if (bandwidth < 500000) {
      // < 500 kbps: 中等分辨率
      return {
        width: { ideal: 480 },
        height: { ideal: 360 },
        frameRate: { ideal: 20 }
      }
    } else {
      // >= 500 kbps: 高分辨率
      return {
        width: { ideal: 640 },
        height: { ideal: 480 },
        frameRate: { ideal: 24 }
      }
    }
  }

  /**
   * 监控并自动调整
   */
  async autoAdjust(
    pc: RTCPeerConnection,
    quality: NetworkQuality
  ): Promise<void> {
    const senders = pc.getSenders()
    
    for (const sender of senders) {
      if (sender.track?.kind === 'video') {
        // 调整视频
        if (this.currentBandwidth < LOW_BANDWIDTH_THRESHOLD) {
          await this.adjustVideoResolution(sender, this.currentBandwidth)
        }
        
        if (quality.packetLoss > PACKET_LOSS_THRESHOLD) {
          await this.adjustBitrate(sender, quality.packetLoss)
        }
      }
    }
  }

  /**
   * 重置为默认设置
   */
  reset(): void {
    this.currentBandwidth = 0
    this.currentPacketLoss = 0
    this.currentBitrate = 1000000
  }
}
