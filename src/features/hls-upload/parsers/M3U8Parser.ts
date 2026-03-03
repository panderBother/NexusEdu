/**
 * M3U8 解析器
 * 负责解析和生成 M3U8 播放列表文件
 */

import type { M3U8Playlist, M3U8Segment } from '../types'

export class M3U8Parser {
  /**
   * 解析 M3U8 文本内容
   * @param m3u8Content M3U8 文件内容
   * @param baseUrl 基础 URL，用于解析相对路径
   * @returns 解析后的播放列表对象
   */
  parse(m3u8Content: string, baseUrl: string): M3U8Playlist {
    const lines = m3u8Content.split('\n').map(line => line.trim()).filter(line => line)
    
    if (!lines[0] || lines[0] !== '#EXTM3U') {
      throw new Error('Invalid M3U8 file: missing #EXTM3U header')
    }

    const playlist: M3U8Playlist = {
      version: 3,
      targetDuration: 0,
      mediaSequence: 0,
      segments: [],
      endList: false
    }

    let currentSegmentDuration = 0
    let segmentIndex = 0

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]

      // 解析版本
      if (line.startsWith('#EXT-X-VERSION:')) {
        playlist.version = parseInt(line.split(':')[1], 10)
      }
      // 解析目标时长
      else if (line.startsWith('#EXT-X-TARGETDURATION:')) {
        playlist.targetDuration = parseInt(line.split(':')[1], 10)
      }
      // 解析媒体序列号
      else if (line.startsWith('#EXT-X-MEDIA-SEQUENCE:')) {
        playlist.mediaSequence = parseInt(line.split(':')[1], 10)
      }
      // 解析切片时长
      else if (line.startsWith('#EXTINF:')) {
        const match = line.match(/#EXTINF:([\d.]+)/)
        if (match) {
          currentSegmentDuration = parseFloat(match[1])
        }
      }
      // 解析结束标记
      else if (line === '#EXT-X-ENDLIST') {
        playlist.endList = true
      }
      // 解析切片 URI
      else if (!line.startsWith('#')) {
        const uri = this.resolveUrl(line, baseUrl)
        playlist.segments.push({
          duration: currentSegmentDuration,
          uri,
          index: segmentIndex++
        })
        currentSegmentDuration = 0
      }
    }

    return playlist
  }

  /**
   * 生成 M3U8 文本内容
   * @param playlist 播放列表对象
   * @returns M3U8 文件内容
   */
  generate(playlist: M3U8Playlist): string {
    const lines: string[] = []

    // 添加头部
    lines.push('#EXTM3U')
    lines.push(`#EXT-X-VERSION:${playlist.version}`)
    lines.push(`#EXT-X-TARGETDURATION:${playlist.targetDuration}`)
    lines.push(`#EXT-X-MEDIA-SEQUENCE:${playlist.mediaSequence}`)

    // 添加切片
    for (const segment of playlist.segments) {
      lines.push(`#EXTINF:${segment.duration.toFixed(3)},`)
      lines.push(segment.uri)
    }

    // 添加结束标记
    if (playlist.endList) {
      lines.push('#EXT-X-ENDLIST')
    }

    return lines.join('\n')
  }

  /**
   * 解析 URL（处理相对路径和绝对路径）
   * @param url 原始 URL
   * @param baseUrl 基础 URL
   * @returns 解析后的完整 URL
   */
  private resolveUrl(url: string, baseUrl: string): string {
    // 如果是绝对 URL，直接返回
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url
    }

    // 处理相对路径
    try {
      const base = new URL(baseUrl)
      const resolved = new URL(url, base)
      return resolved.href
    } catch (error) {
      // 如果解析失败，返回原始 URL
      return url
    }
  }
}
