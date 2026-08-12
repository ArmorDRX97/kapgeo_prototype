import { describe, expect, it } from 'vitest'
import { calculateRecovery, validateDepthIntervals } from './validateDepthIntervals'

describe('validateDepthIntervals', () => {
  it('находит перекрытия и выход за фактическую глубину', () => {
    const issues = validateDepthIntervals([
      { id: 'A', from: 0, to: 120 },
      { id: 'B', from: 110, to: 220 },
      { id: 'C', from: 220, to: 640 },
    ], 612)

    expect(issues.map((issue) => issue.code)).toEqual(['outside-depth', 'overlap'])
    expect(issues.every((issue) => issue.severity === 'error')).toBe(true)
  })

  it('явно показывает неописанные интервалы', () => {
    const issues = validateDepthIntervals([
      { id: 'A', from: 10, to: 100 },
      { id: 'B', from: 120, to: 180 },
    ], 200, true)

    expect(issues.filter((issue) => issue.code === 'gap')).toHaveLength(3)
  })

  it('считает выход керна в допустимом диапазоне', () => {
    expect(calculateRecovery(100, 200, 82)).toBe(82)
    expect(calculateRecovery(100, 200, 140)).toBe(100)
  })
})
