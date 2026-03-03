/**
 * 弹幕系统测试设置
 */

import { beforeAll, afterEach } from 'vitest'

// fast-check 配置
export const fcConfig = {
  numRuns: 100,        // 每个属性测试运行 100 次
  verbose: true,       // 显示详细输出
  seed: Date.now()     // 使用时间戳作为随机种子
}

// 模拟 Canvas API
beforeAll(() => {
  if (typeof HTMLCanvasElement !== 'undefined') {
    HTMLCanvasElement.prototype.getContext = function (contextType: string) {
      if (contextType === '2d') {
        return {
          fillStyle: '',
          strokeStyle: '',
          lineWidth: 1,
          font: '',
          textAlign: 'left',
          textBaseline: 'top',
          globalAlpha: 1,
          fillRect: () => {},
          clearRect: () => {},
          fillText: () => {},
          strokeText: () => {},
          measureText: (text: string) => ({ width: text.length * 10 }),
          save: () => {},
          restore: () => {},
          translate: () => {},
          scale: () => {},
          rotate: () => {},
          drawImage: () => {},
          createImageData: () => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 }),
          getImageData: () => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 }),
          putImageData: () => {}
        } as any
      }
      return null
    }
  }

  // 模拟 OffscreenCanvas（如果不存在）
  if (typeof OffscreenCanvas === 'undefined') {
    (global as any).OffscreenCanvas = class OffscreenCanvas {
      width: number
      height: number
      
      constructor(width: number, height: number) {
        this.width = width
        this.height = height
      }
      
      getContext(contextType: string) {
        if (contextType === '2d') {
          return HTMLCanvasElement.prototype.getContext!.call(this, contextType)
        }
        return null
      }
      
      transferToImageBitmap() {
        return {} as ImageBitmap
      }
    }
  }

  // 模拟 ImageBitmap（如果不存在）
  if (typeof ImageBitmap === 'undefined') {
    (global as any).ImageBitmap = class ImageBitmap {
      width: number = 100
      height: number = 100
    }
  }

  // 模拟 Worker（如果不存在）
  if (typeof Worker === 'undefined') {
    (global as any).Worker = class Worker {
      onmessage: ((event: MessageEvent) => void) | null = null
      onerror: ((event: ErrorEvent) => void) | null = null
      
      constructor(scriptURL: string | URL) {
        // Mock worker
      }
      
      postMessage(message: any) {
        // Mock post message
      }
      
      terminate() {
        // Mock terminate
      }
    }
  }
})

// 清理
afterEach(() => {
  // 清理测试数据
})
