import { describe, expect, it } from 'vitest'
import { interpretationWells } from '../model/fixtures'
import { calculateTechnology, meanResistivity } from './calculation'
import { deleteIntervals, mineralsOf, sameLithology } from './commands'
import { deleteCore, derivedRuns, flipRun, insertNoCore, mappedMeasurements, mappedSamples, mergeCore, moveCore, moveRun, removeSamplePart, resetCoreMapping, resizeCore, restoreCore, sourceIssues, splitCore, syncCore, updateSample, validateMapping } from './core'
import { validateInterpretation } from '../../../repository/demo/interpretationRepository'
import { historyReducer } from '../../../features/interpretation/model/history'

const well = interpretationWells[0]!
const synthetic = (values: number[]) => ({ ...well, depth: values.length - 1, curves: [{ ...well.curves[0]!, data: { depths: values.map((_, i) => i), values } }] })
const params = { curveId: 'rs-main', from: 0, to: 8, threshold: 25, minThickness: 0, minImpermeable: 0, rounding: 0.1 }
describe('RP 1.24–1.26 next slice', () => {
  it('uses mineral sets independent of order and includes core colour in equality', () => {
    const a = { ...well.initial.logLithology[0]!, mineralization: 'пирит, гематит', minerals: ['пирит', 'гематит'] }
    const b = { ...a, mineralization: 'гематит; пирит', minerals: ['гематит', 'пирит'] }
    expect(mineralsOf(a)).toEqual(['гематит', 'пирит']); expect(sameLithology(a, b)).toBe(true)
    expect(sameLithology(a, { ...b, color: 'green' })).toBe(false)
  })
  it('deletes only wholly-contained lithology and lets the upper technological interval fill the deletion', () => {
    expect(deleteIntervals(well.initial.logLithology, 113, 130).map(r => r.id)).not.toContain('lit-3')
    expect(deleteIntervals(well.initial.logLithology, 113, 130).map(r => r.id)).toContain('lit-2')
    const result = deleteIntervals(well.initial.technology, 117.4, 124, true)
    expect(result[0]).toMatchObject({ from: 112, to: 130.5, kind: 'impermeable', source: 'manual' })
  })
  it('places gradient contacts at extrema, distinct from threshold crossings', () => {
    const input = synthetic([10, 5, 10, 40, 60, 40, 10, 5, 10])
    const gradient = calculateTechnology(input, { ...params, method: 'gradient' })
    expect(gradient.map(r => [r.from, r.to, r.kind])).toEqual([[0, 1, 'impermeable'], [1, 4, 'permeable'], [4, 7, 'impermeable'], [7, 8, 'permeable']])
    expect(calculateTechnology(input, params).map(r => r.to)).toEqual([2.5, 5.5, 8])
  })
  it('uses direction, distinct minimum thicknesses, rounding and gradient continuation', () => {
    const input = synthetic([10, 5, 10, 40, 60, 40, 10, 5, 10])
    const down = calculateTechnology(input, { ...params, to: 4, minThickness: 2 })
    const up = calculateTechnology(input, { ...params, to: 4, minThickness: 2, direction: 'up' })
    expect(down).toHaveLength(1); expect(up).toHaveLength(2)
    expect(calculateTechnology(input, { ...params, rounding: 1 }).map(r => r.to)).toEqual([3, 6, 8])
    expect(calculateTechnology(input, { ...params, method: 'gradient', to: 3, continuePermeable: true }).at(-1)!.to).toBe(7)
    expect(calculateTechnology(input, { ...params, method: 'gradient', to: 3 }).at(-1)!.to).toBe(3)
  })
  it('preserves gaps in both algorithms and computes a weighted mean without inventing missing RS', () => {
    const input = synthetic([10, 30, Number.NaN, 20, 40])
    for (const method of ['potential', 'gradient'] as const) expect(calculateTechnology(input, { ...params, to: 4, method }).find(r => r.kind === 'unknown')).toMatchObject({ from: 1, to: 3 })
    expect(meanResistivity(input, 0, 4)).toEqual({ mean: 25, coverage: 0.5 })
    expect(meanResistivity(input, 1, 3).mean).toBeUndefined()
  })
  it('splits a core sample into linked parts and preserves its assay and original source', () => {
    const next = splitCore(well, well.initial, 'seg-1', 114)
    const parts = mappedSamples(well, next).filter(s => s.sampleId === 'sample-1')
    expect(parts.map(p => [p.from, p.to])).toEqual([[113, 114], [114, 114.5]])
    expect(parts.every(p => p.assay === 0.024)).toBe(true)
    expect(mappedMeasurements(well, next).filter(p => p.id === 'm-1')).toHaveLength(1)
    expect(() => mergeCore(well, next, 'seg-1', 'below')).toThrow(/промера/)
    validateMapping(well, next)
  })
  it('merges compatible source-adjacent measured pieces and restores source lithology', () => {
    const split = splitCore(well, well.initial, 'seg-1', 116)
    const merged = mergeCore(well, split, 'seg-1', 'below')
    expect(merged.core.find(s => s.id === 'seg-1')).toMatchObject({ from: 112, to: 118, sourceFrom: 112, sourceTo: 118 })
    expect(mappedSamples(well, merged).filter(s => s.sampleId === 'sample-1')).toHaveLength(1)
  })
  it('assigns shared-contact measurements once and retains the original bottom measurement', () => {
    const input = { ...well, core: well.core.map(s => s.id === 'seg-1' ? { ...s, measurements: [...s.measurements, { id: 'bottom', depth: s.to, value: 25 }] } : s) }
    const split = splitCore(input, input.initial, 'seg-1', 114)
    expect(mappedMeasurements(input, split).filter(p => p.id === 'm-1')).toHaveLength(1)
    expect(mappedMeasurements(input, split).find(p => p.id === 'bottom')).toMatchObject({ depth: 118 })
  })
  it('preserves the original no-core range across split, merge, deletion and restoration', () => {
    const gap = well.initial.core.find(s => s.kind === 'no-core')!
    const split = splitCore(well, well.initial, gap.id, 119)
    const merged = mergeCore(well, split, gap.id, 'below')
    expect(merged.core.find(s => s.id === gap.id)).toMatchObject({ sourceFrom: 118, sourceTo: 120 })
    expect(restoreCore(well, deleteCore(well, merged, gap.id), gap.id).core.find(s => s.id === gap.id)).toMatchObject({ from: 118, to: 120 })
  })
  it('inserts unreferenced no-core and removes it completely with a reversible command', () => {
    const inserted = insertNoCore(well, well.initial, 'seg-1', 1)
    const gap = inserted.core.find(s => s.id.startsWith('inserted-gap'))!
    expect(gap.sourceFrom).toBeUndefined(); expect(gap.from).toBe(118)
    expect(mappedSamples(well, inserted).find(s => s.sampleId === 'sample-2')!.from).toBe(122)
    const deleted = deleteCore(well, inserted, gap.id)
    expect(deleted.core).not.toContainEqual(gap)
    expect(mappedSamples(well, deleted).find(s => s.sampleId === 'sample-2')!.from).toBe(121)
    expect(validateInterpretation(well, inserted)).toBeTruthy()
  })
  it('keeps removed source as a zero-width recoverable object and restores all linked data', () => {
    const removed = deleteCore(well, well.initial, 'seg-1')
    expect(removed.core.find(s => s.id === 'seg-1')).toMatchObject({ from: 112, to: 112 })
    expect(mappedSamples(well, removed).some(s => s.sampleId === 'sample-1')).toBe(false)
    const restored = restoreCore(well, removed, 'seg-1')
    expect(mappedSamples(well, restored)).toEqual(mappedSamples(well, well.initial))
    expect(derivedRuns(well, restored)[0]!.percent).toBe(75)
  })
  it('restricts measured thickness and allows stretching an unmeasured split piece', () => {
    expect(() => resizeCore(well, well.initial, 'seg-1', 2, 'top')).toThrow(/промером/)
    const compressed = resizeCore(well, well.initial, 'seg-1', 0.1, 'top')
    expect(validateInterpretation(well, compressed)).toBeTruthy()
    expect(mappedSamples(well, compressed).find(s => s.sampleId === 'sample-1')!.assay).toBe(0.024)
    const split = splitCore(well, well.initial, 'seg-1', 114)
    expect(resizeCore(well, split, 'seg-1', 3, 'bottom').core.find(s => s.id === 'seg-1')!.from).toBe(111)
  })
  it('reorders segments and complete runs, flips all linked members and recalculates run output', () => {
    const moved = moveCore(well, well.initial, 'seg-1', 'below')
    expect(moved.core.find(s => s.id === 'seg-1')!.from).toBe(114)
    expect(mappedSamples(well, flipRun(well, well.initial, 'run-1')).find(s => s.sampleId === 'sample-1')).toMatchObject({ from: 117.5, to: 119, assay: 0.024 })
    const swapped = moveRun(well, well.initial, 'run-1', 'below')
    expect(derivedRuns(well, swapped).find(r => r.id === 'run-1')!.from).toBe(120)
    expect(mappedSamples(well, swapped).find(s => s.sampleId === 'sample-1')!.from).toBe(121)
  })
  it('creates each material with inverse depth calculation; edits one part without losing the other', () => {
    let doc = well.initial
    for (const kind of ['KP', 'GS', 'LGH', 'TP'] as const) doc = updateSample(well, doc, { id: `new-${kind}`, name: `DEMO-${kind}`, kind, from: 116.5, to: 117.5 })
    expect(mappedSamples(well, doc).filter(s => s.sampleId.startsWith('new-'))).toHaveLength(4)
    const changed = updateSample(well, well.initial, { id: 'sample-2', name: 'DEMO-КП-02-EDIT', kind: 'KP', from: 121.5, to: 122.5, replacePart: { segmentId: 'seg-2', from: 121, to: 122 } })
    expect(changed.samples!.find(s => s.id === 'sample-2')).toMatchObject({ assay: 0.041, parts: [{ segmentId: 'seg-2', from: 124, to: 125 }, { segmentId: 'seg-2', from: 121.5, to: 122.5 }] })
    const reversed = syncCore(well, { ...well.initial, core: well.initial.core.map(s => s.id === 'seg-1' ? { ...s, reversed: true } : s) })
    const sample = updateSample(well, reversed, { id: 'inverse', name: 'DEMO-INV', kind: 'TP', from: 114, to: 115 }).samples!.find(s => s.id === 'inverse')!
    expect(sample.parts).toEqual([{ segmentId: 'seg-1', from: 115, to: 116 }])
    expect(() => updateSample(well, doc, { id: 'bad', name: 'BAD', kind: 'KP', from: 118.5, to: 119.5 })).toThrow(/керновом/)
    expect(removeSamplePart(well, changed, 'sample-2', { segmentId: 'seg-2', from: 121.5, to: 122.5 }).samples!.find(s => s.id === 'sample-2')!.parts).toHaveLength(1)
  })
  it('validates source output/colour/samples and makes reset irreversible through undo', () => {
    expect(sourceIssues(well)).toEqual([])
    expect(sourceIssues({ ...well, runs: [{ ...well.runs[0]!, recovered: 1 }] }).length).toBeGreaterThan(0)
    expect(sourceIssues({ ...well, core: well.core.map(s => ({ ...s, lithology: s.lithology.map(r => ({ ...r, color: undefined })) })) }).length).toBeGreaterThan(0)
    const edited = deleteCore(well, well.initial, 'seg-1'), restored = resetCoreMapping(well, edited)
    const state = historyReducer({ past: [well.initial], present: edited, future: [] }, { type: 'reset', document: restored })
    expect(historyReducer(state, { type: 'undo' }).present).toEqual(restored)
    expect(restored.sourceRevision).toBe(well.sourceRevision)
  })
})
