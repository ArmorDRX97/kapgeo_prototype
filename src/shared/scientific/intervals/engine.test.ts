import { describe, expect, it } from 'vitest'
import { applyIntervalCommand, createIntervalEditorState, diffIntervals, executeIntervalCommand, redoIntervalCommand, undoIntervalCommand, validateIntervals } from './engine'
import type { IntervalPolicy, IntervalRecord } from './types'

type TestInterval = IntervalRecord & { category: string; note: string }

const policy: IntervalPolicy<TestInterval> = {
  coverage: { from: 0, to: 100 },
  overlap: 'forbidden',
  gap: 'warning',
  minimumThickness: 1,
  snapResolution: 0.1,
  canMerge: (first, second) => first.category === second.category,
  mergeAttributes: (first, second) => ({ ...first, note: `${first.note} ${second.note}`.trim() }),
}

const intervals: TestInterval[] = [
  { id: 'A', from: 0, to: 40, category: 'sand', note: 'A' },
  { id: 'B', from: 40, to: 80, category: 'sand', note: 'B' },
]

describe('generalized interval engine', () => {
  it('supports split, merge, stretch, shift, copy and snap', () => {
    const split = executeIntervalCommand(intervals, { type: 'split', id: 'A', at: 20.04, newIds: ['A1', 'A2'] }, policy)
    expect(split.slice(0, 2)).toMatchObject([{ id: 'A1', to: 20 }, { id: 'A2', from: 20 }])

    const merged = executeIntervalCommand(intervals, { type: 'merge', firstId: 'A', secondId: 'B', newId: 'AB' }, policy)
    expect(merged[0]).toMatchObject({ id: 'AB', from: 0, to: 80, note: 'A B' })

    const stretched = executeIntervalCommand(intervals, { type: 'stretch', id: 'B', edge: 'to', to: 90.04 }, policy)
    expect(stretched[1]?.to).toBe(90)

    const shifted = executeIntervalCommand(intervals, { type: 'shift', id: 'B', delta: 5.04 }, policy)
    expect(shifted[1]).toMatchObject({ from: 45, to: 85 })

    const copied = executeIntervalCommand(intervals, { type: 'copy', id: 'A', newId: 'A-COPY', offset: 80 }, policy)
    expect(copied.at(-1)).toMatchObject({ id: 'A-COPY', from: 80, to: 120 })
  })

  it('validates coverage, gaps, overlaps and minimum thickness according to policy', () => {
    const issues = validateIntervals([
      { id: 'A', from: 5, to: 30, category: 'sand', note: '' },
      { id: 'B', from: 29, to: 29.5, category: 'sand', note: '' },
      { id: 'C', from: 40, to: 110, category: 'clay', note: '' },
    ], policy)

    expect(issues.map((issue) => issue.code)).toEqual(expect.arrayContaining(['outside-coverage', 'minimum-thickness', 'overlap', 'gap']))
  })

  it('provides deterministic diff and undo/redo history', () => {
    const initial = createIntervalEditorState(intervals)
    const changed = applyIntervalCommand(initial, { type: 'update', id: 'A', patch: { note: 'updated' } }, policy)
    const undone = undoIntervalCommand(changed)
    const redone = redoIntervalCommand(undone)

    expect(undone.present).toEqual(initial.present)
    expect(redone.present[0]?.note).toBe('updated')
    expect(diffIntervals(initial.present, redone.present)).toEqual([
      expect.objectContaining({ id: 'A', type: 'modified', changedFields: ['note'] }),
    ])
  })
})
