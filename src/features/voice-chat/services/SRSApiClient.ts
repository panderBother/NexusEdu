/**
 * SRS API Client
 * 与 SRS 服务器进行 HTTP API 交互
 */

import type { PublishParams, PublishResponse, PlayParams, PlayResponse } from '../types'
import { SRS_SERVER_URL, MAX_RETRY_ATTEMPTS } from '../constants'

export class SRSApiClient {
  private baseUrl: string

  constructor(baseUrl: string = SRS_SERVER_URL) {
    this.baseUrl = baseUrl.replace(/\/+$/, '')
  }

  /**
   * 发布流
   */
  async publish(params: PublishParams): Promise<PublishResponse> {
    const url = `${this.baseUrl}/rtc/v1/publish/`
    return this.request<PublishResponse>(url, {
      method: 'POST',
      body: JSON.stringify({
        sdp: params.sdp,
        streamurl: `webrtc://${this.baseUrl.replace(/^https?:\/\//, '')}/${params.app}/${params.stream}`,
        api: url
      })
    })
  }

  /**
   * 播放流
   */
  async play(params: PlayParams): Promise<PlayResponse> {
    const url = `${this.baseUrl}/rtc/v1/play/`
    return this.request<PlayResponse>(url, {
      method: 'POST',
      body: JSON.stringify({
        sdp: params.sdp,
        streamurl: `webrtc://${this.baseUrl.replace(/^https?:\/\//, '')}/${params.app}/${params.stream}`,
        api: url
      })
    })
  }

  /**
   * 停止发布
   */
  async unpublish(streamId: string): Promise<void> {
    // SRS 通过关闭 PeerConnection 来停止发布
    // 这里不需要额外的 API 调用
  }

  /**
   * 停止播放
   */
  async stop(streamId: string): Promise<void> {
    // SRS 通过关闭 PeerConnection 来停止播放
    // 这里不需要额外的 API 调用
  }

  /**
   * 发送 HTTP 请求（带重试）
   */
  private async request<T>(url: string, options: RequestInit, retryCount = 0): Promise<T> {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        signal: AbortSignal.timeout(5000)
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      if (!data || data.code !== 0) {
        throw new Error(`SRS API error: ${data?.msg || 'Unknown error'}`)
      }

      return data as T
    } catch (error) {
      // 重试逻辑
      if (retryCount < MAX_RETRY_ATTEMPTS) {
        const delay = 1000 * Math.pow(2, retryCount)
        await new Promise(resolve => setTimeout(resolve, delay))
        return this.request<T>(url, options, retryCount + 1)
      }

      throw error
    }
  }

  /**
   * 检查服务器是否可达
   */
  async checkServerHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/versions`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000)
      })
      return response.ok
    } catch (error) {
      return false
    }
  }
}
