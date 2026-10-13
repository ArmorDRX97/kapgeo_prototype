import { describe, expect, it } from 'vitest'
import { createSection } from '../model/fixtures'
import { joinProfile } from './joinProfile'
describe('joining an independent profile segment', () => {
  const section = () => ({ ...createSection('j', 'Профиль'), profile: [{ x: 0, y: 0 }, { x: 100, y: 0 }] })
  it('orients by nearest endpoint, explicitly bridges a gap and preserves original vertices', () => {
    const s = section(), result = joinProfile(s, [{ x: 200, y: 20 }, { x: 120, y: 20 }], 'end')
    expect(result.issues).toEqual([]); expect(result.gap).toBeCloseTo(Math.hypot(20, 20))
    expect(result.profile).toEqual([...s.profile, { x: 120, y: 20 }, { x: 200, y: 20 }])
    expect(s.profile).toHaveLength(2)
  })
  it('joins at the start and deduplicates a common endpoint', () => {
    expect(joinProfile(section(), [{ x: -50, y: 0 }, { x: 0, y: 0 }], 'start').profile).toEqual([{ x: -50, y: 0 }, { x: 0, y: 0 }, { x: 100, y: 0 }])
  })
  it('rejects zero length, crossing and reversal along an existing segment', () => {
    expect(joinProfile(section(), [{ x: 0, y: 0 }, { x: 0, y: 0 }], 'end').issues.join()).toContain('Нулевой')
    expect(joinProfile(section(), [{ x: 50, y: 0 }, { x: 200, y: 0 }], 'end').issues.join()).toContain('обратно')
    const s = { ...section(), profile: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }] }
    expect(joinProfile(s, [{ x: -20, y: -20 }, { x: 50, y: 50 }], 'end').issues.join()).toContain('пересекает')
  })
  it('validates dependent geometry and invalid coordinates without modifying the original', () => {
    const s = section(); s.graphics = [{ id: 'bad', name: 'Область', type: 'lithology', rock: 'sand', closed: true, reversed: false, smooth: false, points: [{ x: 500, z: 0 }, { x: 550, z: 0 }, { x: 500, z: -10 }] }]
    expect(joinProfile(s, [{ x: 110, y: 0 }, { x: 150, y: 0 }], 'end').issues.join()).toContain('Область')
    expect(joinProfile(section(), [{ x: NaN, y: 0 }, { x: 150, y: 0 }], 'end').issues.join()).toContain('конечными')
  })
})
