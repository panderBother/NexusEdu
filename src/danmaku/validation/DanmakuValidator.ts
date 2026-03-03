/**
 * 弹幕验证器
 * 负责验证和清理弹幕数据
 */

import type { DanmakuItem } from '../types'
import { DanmakuType, DanmakuSize } from '../types'

/**
 * 验证结果
 */
export interface ValidationResult {
  valid: boolean
  errors: string[]
  sanitized?: DanmakuItem
}

/**
 * 弹幕验证器
 */
export class DanmakuValidator {
  private static readonly MAX_TEXT_LENGTH = 100
  private static readonly COLOR_REGEX = /^(#[0-9A-Fa-f]{6}|rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\))$/

  /**
   * 验证弹幕数据
   */
  static validate(data: any): ValidationResult {
    const errors: string[] = []

    // 验证必需字段
    if (!data || typeof data !== 'object') {
      return {
        valid: false,
        errors: ['Invalid danmaku data: must be an object']
      }
    }

    // 验证文本
    if (!data.text || typeof data.text !== 'string') {
      errors.push('Text is required and must be a string')
    } else if (data.text.length > this.MAX_TEXT_LENGTH) {
      errors.push(`Text length exceeds maximum of ${this.MAX_TEXT_LENGTH} characters`)
    }

    // 验证类型
    if (!data.type || !Object.values(DanmakuType).includes(data.type)) {
      errors.push('Invalid danmaku type')
    }

    // 验证颜色
    if (!data.color || !this.isValidColor(data.color)) {
      errors.push('Invalid color format (must be #RRGGBB or rgb(r,g,b))')
    }

    // 验证大小
    if (!data.size || !Object.values(DanmakuSize).includes(data.size)) {
      errors.push('Invalid danmaku size')
    }

    // 验证优先级
    if (data.priority !== undefined) {
      if (typeof data.priority !== 'number' || data.priority < 0 || data.priority > 10) {
        errors.push('Priority must be a number between 0 and 10')
      }
    }

    // 验证用户 ID
    if (!data.userId || typeof data.userId !== 'string') {
      errors.push('User ID is required and must be a string')
    }

    // 如果有错误，返回验证失败
    if (errors.length > 0) {
      return {
        valid: false,
        errors
      }
    }

    // 清理和标准化数据
    const sanitized = this.sanitize(data)

    return {
      valid: true,
      errors: [],
      sanitized
    }
  }

  /**
   * 清理和标准化弹幕数据
   */
  static sanitize(data: any): DanmakuItem {
    // 过滤 HTML 标签和脚本
    const cleanText = this.filterHTML(data.text)

    // 生成 UUID（如果没有提供）
    const id = data.id || this.generateUUID()

    // 标准化颜色
    const color = this.normalizeColor(data.color)

    return {
      id,
      text: cleanText,
      type: data.type,
      color,
      size: data.size,
      priority: data.priority ?? 5, // 默认优先级为 5
      userId: data.userId,
      timestamp: data.timestamp || Date.now(),
      speed: data.speed,
      position: data.position
    }
  }

  /**
   * 过滤 HTML 标签和脚本
   */
  static filterHTML(text: string): string {
    // 移除所有 HTML 标签
    let cleaned = text.replace(/<[^>]*>/g, '')
    
    // 移除脚本代码
    cleaned = cleaned.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    
    // 转义特殊字符
    cleaned = cleaned
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
    
    return cleaned.trim()
  }

  /**
   * 验证颜色格式
   */
  static isValidColor(color: string): boolean {
    return this.COLOR_REGEX.test(color)
  }

  /**
   * 标准化颜色格式
   */
  static normalizeColor(color: string): string {
    // 如果是 RGB 格式，转换为十六进制
    const rgbMatch = color.match(/rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)/)
    if (rgbMatch) {
      const r = parseInt(rgbMatch[1])
      const g = parseInt(rgbMatch[2])
      const b = parseInt(rgbMatch[3])
      
      // 验证 RGB 值范围
      if (r > 255 || g > 255 || b > 255) {
        return '#FFFFFF' // 默认白色
      }
      
      return `#${this.toHex(r)}${this.toHex(g)}${this.toHex(b)}`
    }

    // 如果是十六进制格式，转换为大写
    if (color.startsWith('#')) {
      return color.toUpperCase()
    }

    return '#FFFFFF' // 默认白色
  }

  /**
   * 转换为十六进制
   */
  private static toHex(value: number): string {
    const hex = value.toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }

  /**
   * 生成 UUID v4
   */
  static generateUUID(): string {
    // 使用浏览器原生 crypto API
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID()
    }
    
    // 降级方案：手动生成 UUID v4
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0
      const v = c === 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
  }

  /**
   * 验证 JSON Schema（简化版）
   */
  static validateSchema(data: any): boolean {
    const requiredFields = ['text', 'type', 'color', 'size', 'userId']
    
    for (const field of requiredFields) {
      if (!(field in data)) {
        return false
      }
    }

    return true
  }

  /**
   * 批量验证
   */
  static validateBatch(dataList: any[]): ValidationResult[] {
    return dataList.map(data => this.validate(data))
  }

  /**
   * 验证并返回有效的弹幕列表
   */
  static validateAndFilter(dataList: any[]): DanmakuItem[] {
    const results = this.validateBatch(dataList)
    return results
      .filter(result => result.valid && result.sanitized)
      .map(result => result.sanitized!)
  }
}
