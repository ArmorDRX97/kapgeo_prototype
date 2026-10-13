import { describe, expect, it } from 'vitest'
import { interpretationWells } from '../model/fixtures'
import { createAlphaDocument } from '../model/alphaDocument'
import { alphaRecords } from '../model/alphaFixtures'
import { alphaStale, calculateCaliper, calculateControls, calculateElectro, calculateFlow, calculateGamma, calculateThermal, gravelSummary } from './alphaCalculations'
import { integrate, thresholdIntervals } from './alphaNumeric'
import { validateAlpha } from '../../../repository/demo/alphaInterpretationRepository'

const well = interpretationWells[0]!
describe('Alpha interpretation working slice', () => {
  it('provides valid independent documents for all four existing contexts', () => {
    for (const subject of interpretationWells) { const doc = createAlphaDocument(subject); expect(validateAlpha(subject, doc)).toEqual(doc) }
    const doc = createAlphaDocument(well)
    expect(doc.gamma.rows.length).toBeGreaterThan(1); expect(doc.electro.rows.length).toBeGreaterThan(3)
    expect(doc.metal.rows.length).toBe(4); expect(doc.thermal.rows.length).toBeGreaterThan(0)
  })
  it('integrates a known linear signal and never bridges missing samples', () => {
    const record = { ...alphaRecords(well)[0]!, depths: [0, 1, 2, 3, 4], values: [0, 2, null, 6, 8] }
    expect(integrate(record, 0, 4)).toMatchObject({ area: 8, covered: 2, mean: 4 })
    expect(thresholdIntervals(record, 0, 4, 1)).toEqual([{ id: 'span-0', from: 0.5, to: 1 }, { id: 'span-1', from: 3, to: 4 }])
  })
  it('conserves total flow under both sample steps and section grouping', () => {
    const doc = createAlphaDocument(well)
    for (const grouping of ['step', 'sections', 'lithology'] as const) {
      doc.parameters.flow.grouping = grouping
      const result = calculateFlow(well, doc)
      expect(result.rows.reduce((s, r) => s + r.rate, 0)).toBeCloseTo(10, 9)
      expect(result.rows.reduce((s, r) => s + r.percent, 0)).toBeCloseTo(100, 9)
    }
  })
  it('invalidates downstream outputs after a manual lithology or filter change', () => {
    const doc = createAlphaDocument(well)
    expect(alphaStale(well, doc, 'gamma')).toBe(false)
    doc.electro.rows[0]!.kf = 7
    expect(alphaStale(well, doc, 'gamma')).toBe(true)
    doc.parameters.current.from += 1
    expect(() => calculateGamma(well, doc)).toThrow('актуальные')
    expect(() => calculateFlow(well, doc)).toThrow('актуальный')
  })
  it('rejects expanded caliper as the gamma correction source', () => {
    const doc = createAlphaDocument(well); doc.parameters.gamma.caliperId = 'alpha-kmr'
    expect(() => calculateGamma(well, doc)).toThrow('КМр')
  })
  it('produces distinct supported gamma approximations and probe-dependent contacts', () => {
    const doc = createAlphaDocument(well), weighted = calculateGamma(well, doc)
    doc.parameters.gamma.algorithm = 'iterative'
    expect(calculateGamma(well, doc).rows).not.toEqual(weighted.rows)
    const bottom = calculateElectro(well, doc); doc.parameters.electro.probe = 'top'
    expect(calculateElectro(well, doc).rows).not.toEqual(bottom.rows)
  })
  it('rejects reversed levels and records an explicit uninterpretable thermal result', () => {
    const doc = createAlphaDocument(well); doc.parameters.electro.levels = [20, 10, 30]
    expect(() => calculateElectro(well, doc)).toThrow('возрастать')
    doc.parameters.thermal.interpretable = false
    expect(calculateThermal(well, doc)).toMatchObject({ rows: [], note: 'Запись не поддаётся интерпретации.' })
  })
  it('calculates annular volume and enforces caliper acquisition stage', () => {
    const doc = createAlphaDocument(well), summary = gravelSummary(well, doc)
    expect(summary.volume).toBeGreaterThan(0); expect(summary.covered).toBeCloseTo(summary.to - summary.from)
    doc.parameters.caliper.recordId = 'alpha-km'
    expect(() => calculateCaliper(well, doc)).toThrow('КМр')
  })
  it('compares separate recordings and reports missing coverage without success', () => {
    const doc = createAlphaDocument(well)
    expect(calculateControls(well, doc).rows[0]!.status).toBe('pass')
    doc.parameters.controls.mainId = 'alpha-rs'; doc.parameters.controls.controlId = 'alpha-rs-control'
    expect(calculateControls(well, doc).rows[0]!.status).toBe('unmatched')
    doc.parameters.controls.controlId = 'alpha-rs'
    expect(() => calculateControls(well, doc)).toThrow('разные')
  })
})
