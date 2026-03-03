/**
 * 示例属性测试
 * 验证 fast-check 配置正确
 */

import { describe, it, expect } from 'vitest'
import fc from 'fast-check'

describe('Fast-check Configuration', () => {
  it('should run property-based tests with fast-check', () => {
    fc.assert(
      fc.property(
        fc.integer(),
        fc.integer(),
        (a, b) => {
          // 交换律：a + b = b + a
          return a + b === b + a
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should generate complex objects', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          name: fc.string(),
          enabled: fc.boolean()
        }),
        (obj) => {
          // 验证生成的对象结构正确
          expect(obj).toHaveProperty('id')
          expect(obj).toHaveProperty('name')
          expect(obj).toHaveProperty('enabled')
          expect(typeof obj.id).toBe('string')
          expect(typeof obj.name).toBe('string')
          expect(typeof obj.enabled).toBe('boolean')
          return true
        }
      ),
      { numRuns: 100 }
    )
  })
})
