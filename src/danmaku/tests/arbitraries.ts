/**
 * fast-check 测试数据生成器
 */

import * as fc from 'fast-check'
import type { DanmakuItem, DanmakuType, DanmakuSize, Track, TrackType, DanmakuConfig, SpeedLevel, DensityLevel } from '../types'
import { DanmakuType as DanmakuTypeEnum, DanmakuSize as DanmakuSizeEnum, TrackType as TrackTypeEnum, SpeedLevel as SpeedLevelEnum, DensityLevel as DensityLevelEnum } from '../types'

/**
 * 生成有效的颜色值
 */
export const colorArbitrary = fc.oneof(
  // 十六进制格式
  fc.hexaString({ minLength: 6, maxLength: 6 }).map((s: string) => `#${s}`),
  // RGB 格式
  fc.tuple(fc.nat(255), fc.nat(255), fc.nat(255))
    .map(([r, g, b]) => `rgb(${r},${g},${b})`)
)

/**
 * 生成弹幕项
 */
export const danmakuArbitrary: fc.Arbitrary<DanmakuItem> = fc.record({
  id: fc.uuid(),
  text: fc.string({ minLength: 1, maxLength: 100 }),
  type: fc.constantFrom(
    DanmakuTypeEnum.SCROLL,
    DanmakuTypeEnum.TOP,
    DanmakuTypeEnum.BOTTOM,
    DanmakuTypeEnum.VIP,
    DanmakuTypeEnum.GIFT
  ),
  color: colorArbitrary,
  size: fc.constantFrom(DanmakuSizeEnum.SMALL, DanmakuSizeEnum.MEDIUM, DanmakuSizeEnum.LARGE),
  priority: fc.integer({ min: 0, max: 10 }),
  userId: fc.uuid(),
  timestamp: fc.date().map(d => d.getTime()),
  speed: fc.option(fc.integer({ min: 3000, max: 10000 })),
  position: fc.option(fc.record({
    x: fc.nat(),
    y: fc.nat()
  }))
})

/**
 * 生成轨道
 */
export const trackArbitrary: fc.Arbitrary<Track> = fc.record({
  id: fc.nat(),
  y: fc.nat(),
  type: fc.constantFrom(TrackTypeEnum.SCROLL, TrackTypeEnum.TOP, TrackTypeEnum.BOTTOM),
  occupied: fc.boolean(),
  lastDanmaku: fc.option(danmakuArbitrary),
  lastDanmakuEndTime: fc.nat()
})

/**
 * 生成弹幕配置
 */
export const configArbitrary: fc.Arbitrary<DanmakuConfig> = fc.record({
  width: fc.integer({ min: 800, max: 3840 }),
  height: fc.integer({ min: 600, max: 2160 }),
  maxDanmaku: fc.integer({ min: 50, max: 500 }),
  trackHeight: fc.integer({ min: 20, max: 50 }),
  trackGap: fc.integer({ min: 5, max: 20 }),
  useOffscreen: fc.boolean(),
  cacheSize: fc.integer({ min: 50, max: 200 })
})

/**
 * 生成速度等级
 */
export const speedLevelArbitrary = fc.constantFrom(
  SpeedLevelEnum.SLOW,
  SpeedLevelEnum.MEDIUM,
  SpeedLevelEnum.FAST
)

/**
 * 生成密度等级
 */
export const densityLevelArbitrary = fc.constantFrom(
  DensityLevelEnum.SPARSE,
  DensityLevelEnum.NORMAL,
  DensityLevelEnum.DENSE
)

/**
 * 生成透明度值（0-1）
 */
export const opacityArbitrary = fc.double({ min: 0, max: 1 })

/**
 * 生成关键词列表
 */
export const keywordsArbitrary = fc.array(
  fc.string({ minLength: 1, maxLength: 20 }),
  { minLength: 0, maxLength: 10 }
)

/**
 * 生成用户 ID 列表
 */
export const userIdsArbitrary = fc.array(
  fc.uuid(),
  { minLength: 0, maxLength: 20 }
)

/**
 * 生成时间戳范围
 */
export const timeRangeArbitrary = fc.tuple(
  fc.date().map(d => d.getTime()),
  fc.date().map(d => d.getTime())
).map(([t1, t2]) => {
  const start = Math.min(t1, t2)
  const end = Math.max(t1, t2)
  return { start, end }
})
