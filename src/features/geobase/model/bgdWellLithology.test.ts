import { describe, expect, it } from 'vitest'
import type { GeologicalInterval } from '../../../entities/well/model/types'
import type { WellGeologyWorkspace } from '../../../entities/well-geology/model/types'
import { findFirstLithologyGap, prepareBgdLithologySave } from './bgdWellLithology'

const intervals: GeologicalInterval[] = [
  { id: 'A', from: 0, to: 10, lithology: 'Песчаник', stratigraphy: 'K2', description: '', source: 'Керн' },
  { id: 'B', from: 14, to: 20, lithology: 'Глина', stratigraphy: 'K2', description: '', source: 'Керн' },
]

function workspace(): WellGeologyWorkspace {
  return { wellId: 'WELL-DEMO', tracks: [{ id: 'CORE', kind: 'core', label: 'По керну', source: 'Керн', intervals, version: 2, status: 'draft' }], dictionaries: [], overrides: [], samples: [], labResults: [], granulometry: [], lims: [], version: 3, updatedAt: '2026-09-15T00:00:00.000Z' }
}

describe('BGD lithology helpers', () => {
  it('finds the first uncovered depth interval', () => {
    expect(findFirstLithologyGap(intervals, 30)).toEqual({ from: 10, to: 14 })
    expect(findFirstLithologyGap([{ ...intervals[0]!, to: 30 }], 30)).toBeNull()
  })

  it('increments only a changed source track version before save', () => {
    const current = workspace()
    const draft = structuredClone(current)
    draft.tracks[0]!.intervals[0]!.description = 'Уточнённое описание'
    expect(prepareBgdLithologySave(current, draft).tracks[0]!.version).toBe(3)
    expect(current.tracks[0]!.version).toBe(2)
  })
})
