/**
 * 交互管理器
 * 处理用户与弹幕的交互
 */

import type { ActiveDanmaku, InteractionMenu, InteractionAction } from '../types'

/**
 * 交互事件类型
 */
export type InteractionEventType = 'like' | 'comment' | 'mention' | 'block' | 'report'

/**
 * 交互事件
 */
export interface InteractionEvent {
  type: InteractionEventType
  danmaku: ActiveDanmaku
  data?: any
}

/**
 * 交互管理器接口
 */
export interface IInteractionManager {
  initialize(canvas: HTMLCanvasElement): void
  handleClick(x: number, y: number): void
  showMenu(danmaku: ActiveDanmaku, x: number, y: number): void
  hideMenu(): void
  likeDanmaku(danmakuId: string): void
  commentDanmaku(danmakuId: string): void
  blockUser(userId: string): void
  reportDanmaku(danmakuId: string, reason: string): void
}

/**
 * 交互管理器实现
 */
export class InteractionManager implements IInteractionManager {
  private canvas: HTMLCanvasElement | null = null
  private activeDanmaku: ActiveDanmaku[] = []
  private currentMenu: InteractionMenu | null = null
  private eventCallbacks: Map<InteractionEventType, Array<(event: InteractionEvent) => void>> = new Map()

  /**
   * 初始化交互
   */
  initialize(canvas: HTMLCanvasElement): void {
    this.canvas = canvas

    // 添加点击事件监听
    canvas.addEventListener('click', this.onCanvasClick)
    
    // 添加鼠标移动事件监听（用于悬停效果）
    canvas.addEventListener('mousemove', this.onCanvasMouseMove)
  }

  /**
   * 设置活动弹幕列表
   */
  setActiveDanmaku(danmakuList: ActiveDanmaku[]): void {
    this.activeDanmaku = danmakuList
  }

  /**
   * 处理点击事件
   */
  handleClick(x: number, y: number): void {
    // 查找被点击的弹幕
    const clickedDanmaku = this.findDanmakuAtPosition(x, y)

    if (clickedDanmaku) {
      // 暂停弹幕移动
      clickedDanmaku.paused = true

      // 显示交互菜单
      this.showMenu(clickedDanmaku, x, y)
    } else {
      // 点击空白区域，隐藏菜单
      this.hideMenu()
    }
  }

  /**
   * 显示交互菜单
   */
  showMenu(danmaku: ActiveDanmaku, x: number, y: number): void {
    const actions: InteractionAction[] = [
      {
        type: 'like',
        label: '点赞',
        icon: '👍',
        handler: () => this.likeDanmaku(danmaku.id)
      },
      {
        type: 'comment',
        label: '评论',
        icon: '💬',
        handler: () => this.commentDanmaku(danmaku.id)
      },
      {
        type: 'mention',
        label: '@提及',
        icon: '@',
        handler: () => this.mentionUser(danmaku.userId)
      },
      {
        type: 'block',
        label: '屏蔽用户',
        icon: '🚫',
        handler: () => this.blockUser(danmaku.userId)
      },
      {
        type: 'report',
        label: '举报',
        icon: '⚠️',
        handler: () => this.reportDanmaku(danmaku.id, 'inappropriate')
      }
    ]

    this.currentMenu = {
      danmaku,
      position: { x, y },
      visible: true,
      actions
    }

    // 触发菜单显示事件
    this.emitMenuEvent('show', danmaku)
  }

  /**
   * 隐藏交互菜单
   */
  hideMenu(): void {
    if (this.currentMenu) {
      // 恢复弹幕移动
      if (this.currentMenu.danmaku) {
        this.currentMenu.danmaku.paused = false
      }

      this.currentMenu = null

      // 触发菜单隐藏事件
      this.emitMenuEvent('hide', null)
    }
  }

  /**
   * 获取当前菜单
   */
  getCurrentMenu(): InteractionMenu | null {
    return this.currentMenu
  }

  /**
   * 点赞弹幕
   */
  likeDanmaku(danmakuId: string): void {
    const danmaku = this.findDanmakuById(danmakuId)
    if (!danmaku) {
      return
    }

    // 触发点赞事件
    this.emitEvent('like', {
      type: 'like',
      danmaku
    })

    // 显示点赞动画
    this.showLikeAnimation(danmaku)

    // 隐藏菜单
    this.hideMenu()
  }

  /**
   * 评论弹幕
   */
  commentDanmaku(danmakuId: string): void {
    const danmaku = this.findDanmakuById(danmakuId)
    if (!danmaku) {
      return
    }

    // 触发评论事件
    this.emitEvent('comment', {
      type: 'comment',
      danmaku,
      data: {
        quote: danmaku.text
      }
    })

    // 隐藏菜单
    this.hideMenu()
  }

  /**
   * @ 提及用户
   */
  mentionUser(userId: string): void {
    // 触发提及事件
    this.emitEvent('mention', {
      type: 'mention',
      danmaku: this.currentMenu!.danmaku,
      data: {
        userId
      }
    })

    // 隐藏菜单
    this.hideMenu()
  }

  /**
   * 屏蔽用户
   */
  blockUser(userId: string): void {
    // 触发屏蔽事件
    this.emitEvent('block', {
      type: 'block',
      danmaku: this.currentMenu!.danmaku,
      data: {
        userId
      }
    })

    // 隐藏菜单
    this.hideMenu()
  }

  /**
   * 举报弹幕
   */
  reportDanmaku(danmakuId: string, reason: string): void {
    const danmaku = this.findDanmakuById(danmakuId)
    if (!danmaku) {
      return
    }

    // 触发举报事件
    this.emitEvent('report', {
      type: 'report',
      danmaku,
      data: {
        reason
      }
    })

    // 隐藏菜单
    this.hideMenu()
  }

  /**
   * 监听交互事件
   */
  on(type: InteractionEventType, callback: (event: InteractionEvent) => void): void {
    if (!this.eventCallbacks.has(type)) {
      this.eventCallbacks.set(type, [])
    }
    this.eventCallbacks.get(type)!.push(callback)
  }

  /**
   * 移除事件监听
   */
  off(type: InteractionEventType, callback: (event: InteractionEvent) => void): void {
    const callbacks = this.eventCallbacks.get(type)
    if (callbacks) {
      const index = callbacks.indexOf(callback)
      if (index !== -1) {
        callbacks.splice(index, 1)
      }
    }
  }

  /**
   * 销毁交互管理器
   */
  destroy(): void {
    if (this.canvas) {
      this.canvas.removeEventListener('click', this.onCanvasClick)
      this.canvas.removeEventListener('mousemove', this.onCanvasMouseMove)
      this.canvas = null
    }

    this.hideMenu()
    this.eventCallbacks.clear()
  }

  /**
   * Canvas 点击事件处理
   */
  private onCanvasClick = (event: MouseEvent): void => {
    if (!this.canvas) {
      return
    }

    const rect = this.canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    this.handleClick(x, y)
  }

  /**
   * Canvas 鼠标移动事件处理
   */
  private onCanvasMouseMove = (event: MouseEvent): void => {
    if (!this.canvas) {
      return
    }

    const rect = this.canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    // 检查是否悬停在弹幕上
    const hoveredDanmaku = this.findDanmakuAtPosition(x, y)
    
    if (hoveredDanmaku) {
      this.canvas.style.cursor = 'pointer'
    } else {
      this.canvas.style.cursor = 'default'
    }
  }

  /**
   * 查找指定位置的弹幕
   */
  private findDanmakuAtPosition(x: number, y: number): ActiveDanmaku | null {
    // 从后向前查找（最上层的弹幕优先）
    for (let i = this.activeDanmaku.length - 1; i >= 0; i--) {
      const danmaku = this.activeDanmaku[i]
      
      // 估算弹幕边界
      const width = this.estimateTextWidth(danmaku.text, danmaku.size)
      const height = danmaku.size

      if (x >= danmaku.x && x <= danmaku.x + width &&
          y >= danmaku.y && y <= danmaku.y + height) {
        return danmaku
      }
    }

    return null
  }

  /**
   * 根据 ID 查找弹幕
   */
  private findDanmakuById(id: string): ActiveDanmaku | null {
    return this.activeDanmaku.find(d => d.id === id) || null
  }

  /**
   * 估算文本宽度
   */
  private estimateTextWidth(text: string, size: number): number {
    return text.length * size * 0.6
  }

  /**
   * 显示点赞动画
   */
  private showLikeAnimation(danmaku: ActiveDanmaku): void {
    // 简化实现：触发动画事件
    console.log('Like animation for danmaku:', danmaku.id)
  }

  /**
   * 触发交互事件
   */
  private emitEvent(type: InteractionEventType, event: InteractionEvent): void {
    const callbacks = this.eventCallbacks.get(type)
    if (callbacks) {
      for (const callback of callbacks) {
        try {
          callback(event)
        } catch (error) {
          console.error('Interaction event callback error:', error)
        }
      }
    }
  }

  /**
   * 触发菜单事件
   */
  private emitMenuEvent(action: 'show' | 'hide', danmaku: ActiveDanmaku | null): void {
    // 可以添加菜单事件监听
    console.log(`Menu ${action}`, danmaku?.id)
  }
}
