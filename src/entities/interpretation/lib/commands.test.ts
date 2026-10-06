import { describe, expect, it } from 'vitest'
import { interpretationWells } from '../model/fixtures'
import { calculateTechnology, mappedCore, mappedSamples, moveContact, overwriteInterval, sameLithology, splitRow, transformCore } from './commands'
import { validateInterpretation } from '../../../repository/demo/interpretationRepository'
import { historyReducer, sameDocument } from '../../../features/interpretation/model/history'

const well = interpretationWells[0]!
describe('independent interpretation demo commands', () => {
  it('uses deterministic numerical samples and recovered lithology consistent with each run', () => {
    expect(well.curves[0]!.data.depths.length).toBe(1601)
    for (const run of well.runs) {
      const source = well.core.find(s => s.runId === run.id)!
      expect(source.lithology.reduce((sum, r) => sum + r.to - r.from, 0)).toBe(run.recovered)
    }
    expect(validateInterpretation(well, well.initial)).toMatchObject({ wellId: 'int-demo-01' })
  })
  it('overwrites only the requested range and retains both halves of a cut interval', () => {
    const source = well.initial.logLithology
    const next = { ...source[2]!, id: 'insert', from: 120, to: 122, rock: 'clay' as const }
    const output = overwriteInterval(source, next, well.depth, sameLithology)
    expect(output.filter(r => r.from >= 117.4 && r.to <= 124).map(r => [r.from, r.to, r.rock])).toEqual([[117.4, 120, 'sand'], [120, 122, 'clay'], [122, 124, 'sand']])
    expect(source).toEqual(well.initial.logLithology)
    expect(new Set(output.map(r => r.id)).size).toBe(output.length)
  })
  it('merges neighbours only when their complete properties match', () => {
    const base = well.initial.logLithology[1]!
    const result = overwriteInterval([{ ...base, from: 112, to: 114 }], { ...base, id: 'new', from: 114, to: 116 }, 160, sameLithology)
    expect(result).toHaveLength(1)
    expect(overwriteInterval([{ ...base, from: 112, to: 114 }], { ...base, id: 'new', from: 114, to: 116, mineralization: 'пирит' }, 160, sameLithology)).toHaveLength(2)
  })
  it('moves a shared contact and rejects crossing the next contact', () => {
    const result = moveContact(well.initial.logLithology, 'lit-2', 'to', 118.2, 160)
    expect(result[1]!.to).toBe(118.2); expect(result[2]!.from).toBe(118.2)
    expect(result[0]).toEqual(well.initial.logLithology[0])
    expect(() => moveContact(result, 'lit-2', 'to', 125, 160)).toThrow()
    expect(splitRow(result, 'lit-2', 115, 160)).toHaveLength(result.length + 1)
  })
  it('changes calculation output with the threshold and explicitly preserves the gap', () => {
    const params = { curveId: 'rs-main', from: 112, to: 136, threshold: 25, minThickness: 0.3 }
    const a = calculateTechnology(well, params), b = calculateTechnology(well, { ...params, threshold: 45 })
    const permeable = (rows: typeof a) => rows.filter(r => r.kind === 'permeable').reduce((n, r) => n + r.to - r.from, 0)
    expect(permeable(a)).toBeGreaterThan(permeable(b))
    expect(a.some(r => r.kind === 'unknown' && r.from <= 128.4 && r.to >= 129.1)).toBe(true)
    expect(a[0]!.from).toBe(112); expect(a.at(-1)!.to).toBe(136)
    expect(a.reduce((sum, r) => sum + r.to - r.from, 0)).toBeCloseTo(24)
    expect(validateInterpretation(well, { ...well.initial, technology: a })).toBeTruthy()
  })
  it('rejects missing sources and invalid numeric inputs', () => {
    const params = { curveId: 'missing', from: 112, to: 136, threshold: 25, minThickness: 0.3 }
    expect(() => calculateTechnology(well, params)).toThrow()
    expect(() => calculateTechnology(well, { ...params, curveId: 'rs-main', threshold: Number.NaN })).toThrow()
    expect(() => overwriteInterval(well.initial.logLithology, { ...well.initial.logLithology[0]!, to: -1 }, 160, sameLithology)).toThrow()
  })
  it('moves and reverses linked lithology and every part of a sample, preserving assays', () => {
    const shifted = transformCore(well, well.initial, 'seg-1', 113, false)
    expect(mappedSamples(well, shifted)[0]).toMatchObject({ from: 114, to: 115.5, assay: 0.024, sourceFrom: 113 })
    expect(mappedCore(well, shifted).find(r => r.rock === 'clay')).toMatchObject({ from: 113, to: 117, rock: 'clay' })
    const reversed = transformCore(well, shifted, 'seg-1', 113, true)
    expect(mappedSamples(well, reversed)[0]).toMatchObject({ from: 116.5, to: 118, assay: 0.024 })
    const multiple = mappedSamples(well, transformCore(well, well.initial, 'seg-2', 121, true)).filter(s => s.name === 'DEMO-КП-02')
    expect(multiple).toHaveLength(2); expect(multiple.every(s => s.assay === 0.041)).toBe(true)
    expect(validateInterpretation(well, reversed)).toBeTruthy()
    expect(() => transformCore(well, well.initial, 'seg-1', 116, false)).toThrow()
  })
  it('undoes the complete related result atomically and compares saved data regardless of object key order', () => {
    const next = transformCore(well, well.initial, 'seg-1', 113, true)
    const state = historyReducer({ past: [], present: well.initial, future: [] }, { type: 'commit', document: next })
    const undone = historyReducer(state, { type: 'undo' })
    expect(undone.present).toEqual(well.initial)
    expect(historyReducer(undone, { type: 'redo' }).present).toEqual(next)
    expect(sameDocument(next, validateInterpretation(well, { ...next, revision: 4 }))).toBe(true)
  })
})
