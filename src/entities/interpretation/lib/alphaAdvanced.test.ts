import { describe, expect, it } from 'vitest'
import { interpretationWells } from '../model/fixtures'
import { createAlphaDocument } from '../model/alphaDocument'
import { alphaRecords } from '../model/alphaFixtures'
import { alphaStale, calculateControls, calculateCurrent, calculateElectro, calculateFlow, electroMetrics } from './alphaCalculations'
import { changeAlphaContact, editAlphaInterval, fitFilterSections, mergeAlphaInterval, regenerateSections, removeAlphaInterval, setPaleozoic, splitAlphaInterval } from './alphaCommands'
import { calculateNormalization, electroLevels, filtrationClass, kfFor } from './alphaElectro'
import { controlRows, controlSummary } from './alphaControls'
import { validateAlpha } from '../../../repository/demo/alphaInterpretationRepository'

const well = interpretationWells[0]!
describe('Alpha method editing and control profiles', () => {
  it('uses the displayed windows in automatic area control and retains inactive manual pairs for later', () => {
    const doc = createAlphaDocument(well), p = doc.parameters.controls, records = alphaRecords(well)
    p.pairs = [{ id: 'old-pair', from: 118, to: 120, controlFrom: 118.1, controlTo: 120.1 }]
    for (const kind of ['GR', 'RS']) for (const type of ['reference', 'barren'] as const) {
      p.type = type; p.pairing = 'automatic'
      const main = records.find(r => r.kind === kind && r.role === 'main')!, control = records.find(r => r.kind === kind && r.role === 'control')!
      const rows = controlRows(main, control, doc, false)
      expect(rows).toHaveLength(1); expect(rows[0]).toMatchObject({ from: p.from, to: p.to, controlFrom: p.controlFrom, controlTo: p.controlTo })
      p.pairing = 'manual'
      expect(controlRows(main, control, doc, false)[0]).toMatchObject({ from: 118, to: 120, controlFrom: 118.1, controlTo: 120.1 })
    }
    expect(p.pairs).toHaveLength(1)
  })
  it('resolves percentages, calibrates an explicit reference interval and keeps 7/12 boundaries defined', () => {
    const doc = createAlphaDocument(well), p = doc.parameters.electro
    const maximum = Math.max(...alphaRecords(well).find(r => r.id === p.recordId)!.values.filter((v, i): v is number => v !== null && i / 10 >= p.from && i / 10 <= p.to))
    expect(electroLevels(well, doc)[0]).toBeCloseTo(maximum * 0.2)
    p.normalization = calculateNormalization(well, doc)
    expect(electroMetrics(well, doc, { id: 'reference', from: p.referenceFrom, to: p.referenceTo }).normalized).toBeCloseTo(12)
    expect([0.9, 1, 6.99, 7, 12, 12.01].map(v => filtrationClass(v))).toEqual([0, 1, 1, 2, 2, 3])
    p.kfModel = 'linear'; p.kfA = 2; p.kfB = -3
    expect(kfFor(doc, 10)).toBe(17); expect(kfFor(doc, 1)).toBe(0)
  })
  it('preserves outside lithology when applying a second interpretation range', () => {
    const doc = createAlphaDocument(well), bottom = doc.electro.rows.at(-1)!
    doc.parameters.electro.to = 125; doc.parameters.electro.mode = 'overview'
    const result = calculateElectro(well, doc)
    expect(result.rows[0]!.from).toBe(112); expect(result.rows.at(-1)!.to).toBe(bottom.to)
    expect(result.rows.some(r => r.from === 125)).toBe(true)
    expect(result.rows.every((r, i) => i === 0 || r.from >= result.rows[i - 1]!.to)).toBe(true)
  })
  it('splits, merges, moves a shared contact and recalculates the associated mean and Kf', () => {
    const doc = createAlphaDocument(well)
    let edited = editAlphaInterval(well, doc, 'electro', { id: 'manual', from: 119, to: 122, rock: 'sand', manualKf: true, kf: 8 })
    edited = splitAlphaInterval(well, edited, 'electro', 'manual', 120)
    edited = changeAlphaContact(well, edited, 'electro', 'manual', 'to', 120.5)
    expect(edited.electro.rows.find(r => r.id === 'manual')!.to).toBe(120.5)
    expect(edited.electro.rows.find(r => r.id === 'manual-split-120')!.from).toBe(120.5)
    expect(edited.electro.rows.find(r => r.id === 'manual')!.kf).toBe(8)
    edited = mergeAlphaInterval(well, edited, 'electro', 'manual', 'below')
    expect(edited.electro.rows.find(r => r.id === 'manual')).toMatchObject({ from: 119, to: 122, lft: 2 })
    expect(alphaStale(well, edited, 'electro')).toBe(false); expect(alphaStale(well, edited, 'gamma')).toBe(true)
    expect(validateAlpha(well, edited)).toEqual(edited)
  })
  it('assigns a distinct paleozoic interval and recomputes manual caliper metrics', () => {
    const doc = createAlphaDocument(well), paleozoic = setPaleozoic(well, doc, 137)
    expect(paleozoic.electro.rows.at(-1)).toMatchObject({ from: 137, to: well.depth, rock: 'paleozoic', kf: 0 })
    expect(paleozoic.electro.rows.filter(r => r.from >= 137)).toHaveLength(1)
    const caliper = editAlphaInterval(well, doc, 'caliper', { id: 'manual-cavity', from: 120, to: 121 })
    expect(caliper.caliper.rows.find(r => r.id === 'manual-cavity')!.mean).toBeGreaterThan(320)
    expect(validateAlpha(well, paleozoic)).toEqual(paleozoic)
  })
  it('marks downstream results stale even before the upstream result has been reapplied', () => {
    const doc = createAlphaDocument(well); doc.parameters.electro.normalization = 1.1
    expect(alphaStale(well, doc, 'gamma')).toBe(true)
    doc.parameters.current.from = 118
    expect(alphaStale(well, doc, 'flow')).toBe(true); expect(alphaStale(well, doc, 'caliper')).toBe(true)
  })
  it('keeps sections on the filter, merges deleted coverage and refuses uncovered flow', () => {
    let doc = createAlphaDocument(well); doc = regenerateSections(doc, 4)
    doc = removeAlphaInterval(well, doc, 'sections', doc.sections[1]!.id)
    expect(doc.sections).toHaveLength(3); expect(calculateFlow(well, { ...doc, parameters: { ...doc.parameters, flow: { ...doc.parameters.flow, grouping: 'sections' } } }).rows.reduce((s, r) => s + r.rate, 0)).toBeCloseTo(10)
    expect(() => changeAlphaContact(well, doc, 'sections', doc.sections[0]!.id, 'from', 118)).toThrow('Крайние')
    doc.parameters.current.from = 120; doc.parameters.current.to = 133; doc.current = calculateCurrent(well, doc); doc = fitFilterSections(doc)
    expect(doc.sections[0]!.from).toBe(120); expect(doc.sections.at(-1)!.to).toBe(133)
    doc.parameters.flow.grouping = 'sections'; doc.sections[0]!.from += 1
    expect(() => calculateFlow(well, doc)).toThrow('весь фактический')
  })
  it('compares production gamma per ore interval with m and mc instead of one whole-window area', () => {
    const doc = createAlphaDocument(well), result = calculateControls(well, doc)
    expect(result.rows.length).toBeGreaterThan(1)
    expect(result.rows.every(r => r.mainMetro !== null && r.controlMetro !== null)).toBe(true)
    expect(result.rows[0]!.relative).toBeCloseTo(100 * (result.rows[0]!.controlMetro! - result.rows[0]!.mainMetro!) / result.rows[0]!.mainMetro!)
    expect(controlSummary(result.rows).matched).toBe(result.rows.length)
  })
  it('retains unmatched anomalies and makes the aggregate incomplete', () => {
    const doc = createAlphaDocument(well), base = alphaRecords(well)[0]!
    const main = { ...base, depths: [116, 117, 118, 119, 120, 121, 122, 123, 124], values: [0, 0.05, 0.1, 0, 0, 0, 0.1, 0.05, 0] }
    const control = { ...main, id: 'control', values: [0, 0.05, 0.1, 0, 0, 0, 0, 0, 0] }
    const rows = controlRows(main, control, doc, true)
    expect(rows).toHaveLength(2); expect(rows[1]!.status).toBe('unmatched'); expect(controlSummary(rows).status).toBe('unmatched')
  })
  it('migrates earlier saved profiles and rejects physically invalid saved parameters', () => {
    const doc = createAlphaDocument(well), old = structuredClone(doc) as unknown as { parameters: { electro: Record<string, unknown>; controls: Record<string, unknown> } }
    delete old.parameters.electro.levelMode; delete old.parameters.controls.pairing; delete old.parameters.controls.pairs
    expect(validateAlpha(well, old).parameters.controls.pairing).toBe('manual')
    doc.parameters.gamma.moisture = 100
    expect(() => validateAlpha(well, doc)).toThrow('поправки ГК')
  })
})
