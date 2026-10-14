import { describe, expect, it } from 'vitest'
import { interpretationWells } from '../model/fixtures'
import { createAlphaDocument } from '../model/alphaDocument'
import { gammaCorrections, gammaCurve, oreMetrics, refineOreInterval } from './alphaGamma'
import { gammaCutoff, gammaKrr, gammaRowStatistics, interpolateKrr } from './alphaGammaProfile'
import { proposeFilter, stocksByLft, totalsByCategory, zadrSummary, zoneSummary } from './alphaGammaReports'
import { cutAlphaInterval, editAlphaInterval } from './alphaCommands'
import { validateAlpha } from '../../../repository/demo/alphaInterpretationRepository'
import { alphaStale, calculateControls, calculateGamma } from './alphaCalculations'

const well = interpretationWells[0]!
describe('Alpha gamma profile, editing and dependent summaries', () => {
  it('calculates an explicit physical layer correction and rejects expanded KM', () => {
    const doc = createAlphaDocument(well), p = doc.parameters.gamma; p.useCaliper = false; p.profile.fluidAttenuation = 0.02; p.profile.casingThickness = 4; p.profile.casingAttenuation = 0.01
    const correction = gammaCorrections(well, doc), fluid = (161 - 60) / 20 * 1.12, casing = 0.4 * 7.85
    expect(correction.fluidMass).toBeCloseTo(fluid); expect(correction.casingMass).toBeCloseTo(casing)
    expect(correction.factor).toBeCloseTo(1.1 * Math.exp(0.02 * fluid + 0.01 * casing) / 0.82)
    p.useCaliper = true; p.caliperId = 'alpha-kmr'; expect(() => gammaCorrections(well, doc)).toThrow('КМр')
  })
  it('applies the explicit equivalent Th/K correction without changing input measurements', () => {
    const doc = createAlphaDocument(well), before = gammaCurve(well, doc)
    doc.parameters.gamma.profile.thkCorrection = 0.001
    expect(gammaCurve(well, doc).values[1200]!).toBeCloseTo(before.values[1200]! - 0.001)
    expect(doc.derived).toHaveLength(0)
  })
  it('interpolates separate thickness/Ra profiles and combines morphology explicitly', () => {
    const doc = createAlphaDocument(well), p = doc.parameters.gamma, row = { id: 'test', from: 119, to: 121 }
    p.profile.dependence = 'thickness'; p.profile.thicknessPermeable = [{ x: 1, y: 0.6 }, { x: 3, y: 1 }]
    expect(gammaKrr(doc, row, 0.1, 'bag')).toBeCloseTo(0.8)
    p.useMorphology = true; p.profile.morphology.bag.permeable = 1.2
    expect(gammaKrr(doc, row, 0.1, 'bag')).toBeCloseTo(1.2)
    p.useMorphology = false; p.profile.dependence = 'radium'; p.profile.radiumPermeable = [{ x: 0, y: 0.4 }, { x: 0.2, y: 0.8 }]
    expect(gammaKrr(doc, row, 0.1, 'bag')).toBeCloseTo(0.6)
    p.stage = 'preliminary'; expect(gammaKrr(doc, row, 0.1, 'upper')).toBe(0.8)
    expect(interpolateKrr(p.profile.radiumPermeable, 3)).toBe(0.8)
    expect(() => interpolateKrr([{ x: 2, y: 1 }, { x: 1, y: 1 }], 1)).toThrow('возрастают')
  })
  it('uses morphology/geochemistry regression only in the final stage', () => {
    const doc = createAlphaDocument(well), p = doc.parameters.gamma, row = { id: 'test', from: 100, to: 102 }
    p.profile.cutoffMode = 'regression'; p.profile.cutoffA = 0.5
    expect(gammaCutoff(doc, row, 0.2, 0.8, 'upper')).toBeCloseTo(0.1)
    doc.oxidation = [row]; p.useMorphology = true; p.profile.morphology.upper.yellowA = 0.6; p.profile.morphology.upper.yellowB = 0.01
    expect(gammaCutoff(doc, row, 0.2, 0.8, 'upper')).toBeCloseTo(0.13)
    p.stage = 'preliminary'; expect(gammaCutoff(doc, row, 0.2, 0.8, 'upper')).toBeCloseTo(0.012)
  })
  it('expands the initial candidate window when a dependency lowers Krr and reports an iteration limit', () => {
    const doc = createAlphaDocument(well), before = calculateGamma(well, doc), p = doc.parameters.gamma
    p.profile.dependence = 'thickness'; p.profile.thicknessPermeable = [{ x: 0.1, y: 0.4 }, { x: 5, y: 0.4 }]
    const after = calculateGamma(well, doc)
    expect(after.rows.reduce((s, r) => s + r.to - r.from, 0)).toBeGreaterThan(before.rows.reduce((s, r) => s + r.to - r.from, 0))
    p.profile.iterations = 1; p.profile.cutoffMode = 'regression'; p.profile.cutoffA = 0.3
    expect(calculateGamma(well, doc).note).toContain('предел')
  })
  it('refines manual boundaries under the new morphology and cuts internal ore without losing the outer pieces', () => {
    const doc = createAlphaDocument(well), first = doc.gamma.rows[0]!, p = doc.parameters.gamma
    p.useMorphology = true; p.profile.morphology.upper.permeable = 1.4; p.profile.morphology.upper.impermeable = 1.4
    const refined = refineOreInterval(well, doc, first, 'upper')
    expect(refined.reduce((s, r) => s + r.to - r.from, 0)).toBeLessThan(first.to - first.from)
    expect(refined.every(r => r.krr === 1.4 && r.from >= first.from && r.to <= first.to)).toBe(true)
    const edited = editAlphaInterval(well, doc, 'gamma', { id: 'manual', from: 118, to: 122 })
    const cut = cutAlphaInterval(well, edited, 'gamma', 'manual', 119, 120)
    expect(cut.gamma.rows.find(r => r.id === 'manual')).toMatchObject({ from: 118, to: 119 })
    expect(cut.gamma.rows.find(r => r.id === 'manual-cut-120')).toMatchObject({ from: 120, to: 122 })
    expect(validateAlpha(well, cut)).toEqual(cut)
  })
  it('keeps preliminary ore free of final technological classification and enforces minimum balance mc', () => {
    const doc = createAlphaDocument(well), p = doc.parameters.gamma, row = { id: 'ore', from: 119, to: 121 }
    doc.electro.rows = [{ id: 'clay', from: 112, to: 140, rock: 'clay', kf: 0, lft: 0, resistivity: 1, normalized: 1, manualKf: true }]
    expect(oreMetrics(well, doc, row).category).toBe('technological')
    p.stage = 'preliminary'; expect(oreMetrics(well, doc, row).category).not.toBe('technological')
    p.profile.minimumMetro = 100; expect(oreMetrics(well, doc, row).category).toBe('offbalance')
  })
  it('calculates density-dependent stock and conserves totals across LFT allocations', () => {
    const doc = createAlphaDocument(well), row = { id: 'ore', from: 10, to: 13, ra: 0.08, uranium: 0.1, metro: 0.3, krr: 0.8, morphology: 'bag' as const, category: 'balance' as const }
    doc.gamma.rows = [row]; doc.electro.rows = [{ id: 'a', from: 10, to: 11, rock: 'sand', kf: 2, lft: 1, resistivity: 10, normalized: 10, manualKf: true }, { id: 'b', from: 11, to: 13, rock: 'sand', kf: 10, lft: 2, resistivity: 30, normalized: 30, manualKf: true }]
    expect(gammaRowStatistics(row, 1.65).linearStock).toBeCloseTo(4.95)
    const lft = stocksByLft(doc), categories = totalsByCategory(doc)
    expect(lft.reduce((s, r) => s + r.metro, 0)).toBeCloseTo(0.3); expect(lft.reduce((s, r) => s + r.thickness, 0)).toBe(3)
    expect(categories[0]!.raMetro).toBeCloseTo(0.24); expect(categories[0]!.linearStock).toBeCloseTo(4.95)
  })
  it('clips ZADR by known water barriers and well bounds while preserving unknown lithology coverage', () => {
    const doc = createAlphaDocument(well); doc.current.rows = [{ id: 'actual-filter', from: 10, to: 20 }]; doc.zadr.above = 5; doc.zadr.below = 10
    const lith = { rock: 'clay' as const, kf: 0, lft: 0, resistivity: 1, normalized: 1, manualKf: true }
    doc.electro.rows = [{ ...lith, id: 'top', from: 6, to: 8 }, { ...lith, id: 'unknown', from: 8, to: 10, rock: 'unknown' }, { ...lith, id: 'sand', from: 10, to: 24, rock: 'sand', kf: 5, lft: 1 }, { ...lith, id: 'bottom', from: 24, to: 26 }]
    const zone = zadrSummary(doc, 22)!
    expect(zone).toMatchObject({ from: 8, to: 22, length: 14, lithologyCoverage: 12 })
    expect(zone.coverage).toBeGreaterThanOrEqual(0); expect(zone.coverage).toBeLessThanOrEqual(1)
  })
  it('optimizes the fixed-length proposal by coverage without changing actual TK', () => {
    const doc = createAlphaDocument(well), source = doc.gamma.rows[0]!
    doc.gamma.rows = [{ ...source, id: 'small', from: 10, to: 12, uranium: 0.1, metro: 0.2, category: 'balance' }, { ...source, id: 'large', from: 18, to: 22, uranium: 0.2, metro: 0.8, category: 'balance' }]
    const actual = JSON.stringify(doc.current), proposal = proposeFilter(doc, 4, well.depth)
    expect(proposal).toEqual({ from: 18, to: 22 }); expect(zoneSummary(doc, proposal).coverage).toBe(1); expect(JSON.stringify(doc.current)).toBe(actual)
  })
  it('adds a compatible profile to earlier saves using their existing Krr', () => {
    const doc = createAlphaDocument(well), old = JSON.parse(JSON.stringify(doc)); old.parameters.gamma.krr = 0.9; delete old.parameters.gamma.profile
    const migrated = validateAlpha(well, old)
    expect(migrated.parameters.gamma.profile.krrImpermeable).toBe(0.9)
    expect(migrated.parameters.gamma.profile.morphology.bag.permeable).toBe(0.9)
  })
  it('retains earlier calculation results and flags their older fingerprint for explicit recalculation', () => {
    const doc = createAlphaDocument(well), original = structuredClone(doc.gamma.rows)
    doc.gamma.version = 'alpha-prototype-1'; doc.gamma.fingerprint = 'earlier-profile-fingerprint'
    const loaded = validateAlpha(well, doc)
    expect(loaded.gamma.rows).toEqual(original); expect(loaded.gamma.version).toBe('alpha-prototype-1')
    expect(alphaStale(well, loaded, 'gamma')).toBe(true)
    expect(calculateGamma(well, loaded).version).toBe('alpha-prototype-2')
  })
  it('uses the same variable Krr and morphology for production control mc', () => {
    const doc = createAlphaDocument(well), p = doc.parameters.gamma
    p.useMorphology = true; p.profile.dependence = 'thickness'; p.profile.thicknessPermeable = [{ x: 0.1, y: 0.65 }, { x: 5, y: 0.85 }]
    const gamma = calculateGamma(well, doc), controls = calculateControls(well, doc)
    expect(controls.rows).toHaveLength(gamma.rows.length)
    for (const pair of controls.rows) {
      const ore = gamma.rows.find(r => Math.abs(r.from - pair.from) < 0.001 && Math.abs(r.to - pair.to) < 0.001)!
      expect(ore).toBeDefined(); expect(pair.mainMetro!).toBeCloseTo(ore.metro, 4)
    }
  })
})
