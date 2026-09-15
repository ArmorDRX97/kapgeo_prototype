import { describe, expect, it } from 'vitest'
import type { WellOreWorkspace } from '../../../entities/well-ore/model/types'
import { areContinuousDifferentials, createOreInterval, mergeOreGroups, mergedSummaries, validateOreInterval } from './bgdWellOreIntervals'

const workspace: WellOreWorkspace = {
  wellId: 'W-1', useDifferentialLogging: true, selectedSource: 'Гамма-каротаж', selectedElement: 'Уран', version: 1, updatedAt: '2026-09-15',
  oreIntervals: [
    { id: 'O1', source: 'Гамма-каротаж', element: 'Уран', from: 10, to: 11, content: .02, meterPercent: .02, permeability: 'Проницаемый', differentialIds: [] },
    { id: 'O2', source: 'Гамма-каротаж', element: 'Уран', from: 12, to: 14, content: .01, meterPercent: .02, permeability: 'Непроницаемый', differentialIds: [] },
  ],
  mergedIntervals: [{ id: 'G1', oreIntervalIds: ['O1'] }, { id: 'G2', oreIntervalIds: ['O2'] }],
  differentialIntervals: [
    { id: 'D1', source: 'Гамма-каротаж', element: 'Уран', from: 20, to: 20.1, content: .01, permeability: 'Проницаемый' },
    { id: 'D2', source: 'Гамма-каротаж', element: 'Уран', from: 20.1, to: 20.2, content: .02, permeability: 'Непроницаемый' },
  ],
}

describe('BGD ore interval rules', () => {
  it('calculates the complementary demo value and rejects overlap within source and element', () => {
    const interval = createOreInterval('O3', { source: 'Гамма-каротаж', element: 'Уран', from: 10.5, to: 11.5, basis: 'content', value: .03, permeability: 'Проницаемый' })
    expect(interval.meterPercent).toBe(.03)
    expect(validateOreInterval(interval, workspace)).toContain('Интервал пересекается с 10–11 м в том же источнике.')
  })

  it('merges only sequential ORIs and recalculates their summary', () => {
    const merged = mergeOreGroups(['G1', 'G2'], workspace)
    const summary = mergedSummaries(merged)[0]
    expect(merged.mergedIntervals).toHaveLength(1)
    expect(summary).toMatchObject({ from: 10, to: 14, thickness: 3, meterPercent: .04, permeability: 'Проницаемый' })
  })

  it('accepts only a continuous sequence of free differential intervals', () => {
    expect(areContinuousDifferentials(['D1', 'D2'], workspace)).toBe(true)
    expect(areContinuousDifferentials(['D1'], { ...workspace, differentialIntervals: [{ ...workspace.differentialIntervals[0]!, oreIntervalId: 'O1' }] })).toBe(false)
  })
})
