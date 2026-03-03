/**
 * 控制管理器
 * 处理弹幕显示设置和过滤
 */

import type { ControlSettings } from '../types'
import { SpeedLevel, DensityLevel } from '../types'

/**
 * 控制管理器接口
 */
export interface IControlManager {
  setVisible(visible: boolean): void
  setOpacity(opacity: number): void
  setSpeed(speed: SpeedLevel): void
  setDensity(density: DensityLevel): void
  addKeywordFilter(keyword: string): void
  removeKeywordFilter(keyword: string): void
  addUserFilter(userId: string): void
  removeUserFilter(userId: string): void
  getSettings(): ControlSettings
  saveSettings(): void
  loadSettings(): void
}

/**
 * 控制管理器实现
 */
export class ControlManager implements IControlManager {
  private settings: ControlSettings
  private readonly storageKey: string = 'danmaku_settings'
  private changeCallbacks: Array<(settings: ControlSettings) => void> = []

  constructor() {
    // 默认设置
    this.settings = {
      visible: true,
      opacity: 1.0,
      speed: SpeedLevel.MEDIUM,
      density: DensityLevel.NORMAL,
      keywordFilters: [],
      userFilters: [],
      blockedUsers: []
    }

    // 加载保存的设置
    this.loadSettings()
  }

  /**
   * 设置弹幕可见性
   */
  setVisible(visible: boolean): void {
    this.settings.visible = visible
    this.notifyChange()
  }

  /**
   * 设置透明度
   */
  setOpacity(opacity: number): void {
    // 限制范围 0-1
    this.settings.opacity = Math.max(0, Math.min(1, opacity))
    this.notifyChange()
  }

  /**
   * 设置速度
   */
  setSpeed(speed: SpeedLevel): void {
    this.settings.speed = speed
    this.notifyChange()
  }

  /**
   * 设置密度
   */
  setDensity(density: DensityLevel): void {
    this.settings.density = density
    this.notifyChange()
  }

  /**
   * 添加关键词过滤
   */
  addKeywordFilter(keyword: string): void {
    if (!this.settings.keywordFilters.includes(keyword)) {
      this.settings.keywordFilters.push(keyword)
      this.notifyChange()
    }
  }

  /**
   * 移除关键词过滤
   */
  removeKeywordFilter(keyword: string): void {
    const index = this.settings.keywordFilters.indexOf(keyword)
    if (index !== -1) {
      this.settings.keywordFilters.splice(index, 1)
      this.notifyChange()
    }
  }

  /**
   * 添加用户过滤
   */
  addUserFilter(userId: string): void {
    if (!this.settings.userFilters.includes(userId)) {
      this.settings.userFilters.push(userId)
      this.notifyChange()
    }
  }

  /**
   * 移除用户过滤
   */
  removeUserFilter(userId: string): void {
    const index = this.settings.userFilters.indexOf(userId)
    if (index !== -1) {
      this.settings.userFilters.splice(index, 1)
      this.notifyChange()
    }
  }

  /**
   * 屏蔽用户
   */
  blockUser(userId: string): void {
    if (!this.settings.blockedUsers.includes(userId)) {
      this.settings.blockedUsers.push(userId)
      this.addUserFilter(userId)
      this.notifyChange()
    }
  }

  /**
   * 取消屏蔽用户
   */
  unblockUser(userId: string): void {
    const index = this.settings.blockedUsers.indexOf(userId)
    if (index !== -1) {
      this.settings.blockedUsers.splice(index, 1)
      this.removeUserFilter(userId)
      this.notifyChange()
    }
  }

  /**
   * 检查用户是否被屏蔽
   */
  isUserBlocked(userId: string): boolean {
    return this.settings.blockedUsers.includes(userId)
  }

  /**
   * 检查文本是否包含过滤关键词
   */
  containsFilteredKeyword(text: string): boolean {
    const lowerText = text.toLowerCase()
    return this.settings.keywordFilters.some(keyword => 
      lowerText.includes(keyword.toLowerCase())
    )
  }

  /**
   * 检查弹幕是否应该被过滤
   */
  shouldFilter(text: string, userId: string): boolean {
    // 检查用户过滤
    if (this.settings.userFilters.includes(userId)) {
      return true
    }

    // 检查关键词过滤
    if (this.containsFilteredKeyword(text)) {
      return true
    }

    return false
  }

  /**
   * 获取当前设置
   */
  getSettings(): ControlSettings {
    return { ...this.settings }
  }

  /**
   * 批量更新设置
   */
  updateSettings(partial: Partial<ControlSettings>): void {
    this.settings = {
      ...this.settings,
      ...partial
    }
    this.notifyChange()
  }

  /**
   * 保存设置到 localStorage
   */
  saveSettings(): void {
    try {
      const json = JSON.stringify(this.settings)
      localStorage.setItem(this.storageKey, json)
    } catch (error) {
      console.error('Failed to save settings:', error)
    }
  }

  /**
   * 从 localStorage 加载设置
   */
  loadSettings(): void {
    try {
      const json = localStorage.getItem(this.storageKey)
      if (json) {
        const loaded = JSON.parse(json)
        this.settings = {
          ...this.settings,
          ...loaded
        }
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
  }

  /**
   * 重置为默认设置
   */
  resetSettings(): void {
    this.settings = {
      visible: true,
      opacity: 1.0,
      speed: SpeedLevel.MEDIUM,
      density: DensityLevel.NORMAL,
      keywordFilters: [],
      userFilters: [],
      blockedUsers: []
    }
    this.notifyChange()
    this.saveSettings()
  }

  /**
   * 监听设置变化
   */
  onChange(callback: (settings: ControlSettings) => void): void {
    this.changeCallbacks.push(callback)
  }

  /**
   * 移除监听器
   */
  offChange(callback: (settings: ControlSettings) => void): void {
    const index = this.changeCallbacks.indexOf(callback)
    if (index !== -1) {
      this.changeCallbacks.splice(index, 1)
    }
  }

  /**
   * 通知设置变化
   */
  private notifyChange(): void {
    // 自动保存
    this.saveSettings()

    // 通知监听器
    for (const callback of this.changeCallbacks) {
      try {
        callback(this.getSettings())
      } catch (error) {
        console.error('Settings change callback error:', error)
      }
    }
  }

  /**
   * 获取过滤统计
   */
  getFilterStats() {
    return {
      keywordFiltersCount: this.settings.keywordFilters.length,
      userFiltersCount: this.settings.userFilters.length,
      blockedUsersCount: this.settings.blockedUsers.length
    }
  }

  /**
   * 清除所有过滤
   */
  clearAllFilters(): void {
    this.settings.keywordFilters = []
    this.settings.userFilters = []
    this.settings.blockedUsers = []
    this.notifyChange()
  }

  /**
   * 导出设置
   */
  exportSettings(): string {
    return JSON.stringify(this.settings, null, 2)
  }

  /**
   * 导入设置
   */
  importSettings(json: string): boolean {
    try {
      const imported = JSON.parse(json)
      this.settings = {
        ...this.settings,
        ...imported
      }
      this.notifyChange()
      return true
    } catch (error) {
      console.error('Failed to import settings:', error)
      return false
    }
  }
}
