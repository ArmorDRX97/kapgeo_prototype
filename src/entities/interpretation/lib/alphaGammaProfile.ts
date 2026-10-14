import type { AlphaDocument, DepthInterval, GammaProfile, KrrPoint, OreInterval } from '../model/alphaTypes'
import { overlap } from './alphaNumeric'

export function createGammaProfile(krr = 0.8): GammaProfile {
  const morphology = (factor: number) => ({ permeable: krr * factor, impermeable: krr * factor, grayA: 0, grayB: 0, yellowA: 0, yellowB: 0 })
  return { thkCorrection: 0, radonFactor: 1, probeDiameter: 60, fluidDensity: 1.12, fluidAttenuation: 0, casingThickness: 0, casingDensity: 7.85, casingAttenuation: 0,
    caliperFrom: 112, caliperTo: 140, krrImpermeable: krr, dependence: 'constant',
    thicknessPermeable: [{ x: 0.1, y: krr }, { x: 5, y: krr }], thicknessImpermeable: [{ x: 0.1, y: krr }, { x: 5, y: krr }],
    radiumPermeable: [{ x: 0.001, y: krr }, { x: 0.5, y: krr }], radiumImpermeable: [{ x: 0.001, y: krr }, { x: 0.5, y: krr }],
    morphology: { bag: morphology(1), upper: morphology(0.9), lower: morphology(1.05), remnant: morphology(1.1) },
    cutoffMode: 'fixed', cutoffA: 0, cutoffB: 0, minimumMetro: 0, technologicalCutoff: 0.015, impermeableGap: 0.2, iterations: 8 }
}
export function validateKrrTable(points: KrrPoint[]) {
  if (points.length < 2 || points.some((p, i) => !Number.isFinite(p.x) || !Number.isFinite(p.y) || p.x < 0 || p.y <= 0 || i > 0 && p.x <= points[i - 1]!.x)) throw new Error('Зависимость Крр: минимум две точки, X строго возрастают, Y положительны.')
}
export function interpolateKrr(points: KrrPoint[], value: number) {
  validateKrrTable(points)
  if (value <= points[0]!.x) return points[0]!.y
  for (let i = 1; i < points.length; i++) { const a = points[i - 1]!, b = points[i]!; if (value <= b.x) return a.y + (b.y - a.y) * (value - a.x) / (b.x - a.x) }
  return points.at(-1)!.y
}
export function isImpermeable(doc: AlphaDocument, row: DepthInterval) {
  return doc.electro.rows.filter(r => r.rock !== 'unknown' && r.kf < doc.parameters.electro.permeableKf).reduce((s, r) => s + overlap(r, row), 0) > (row.to - row.from) / 2
}
export function gammaKrr(doc: AlphaDocument, row: DepthInterval, ra: number, morphology: OreInterval['morphology']) {
  const p = doc.parameters.gamma, profile = p.profile, impermeable = isImpermeable(doc, row), basic = impermeable ? profile.krrImpermeable : p.krr
  const morph = profile.morphology[morphology], selected = p.stage === 'final' && p.useMorphology ? impermeable ? morph.impermeable : morph.permeable : basic
  if (p.stage === 'preliminary' || profile.dependence === 'constant') return selected
  const x = profile.dependence === 'thickness' ? row.to - row.from : ra, table = profile.dependence === 'thickness' ? impermeable ? profile.thicknessImpermeable : profile.thicknessPermeable : impermeable ? profile.radiumImpermeable : profile.radiumPermeable
  return selected * interpolateKrr(table, x) / basic
}
export function minimumGammaKrr(doc: AlphaDocument) {
  const p = doc.parameters.gamma, profile = p.profile
  const values = [false, true].flatMap(impermeable => {
    const basic = impermeable ? profile.krrImpermeable : p.krr
    const selected = p.stage === 'final' && p.useMorphology ? Object.values(profile.morphology).map(m => impermeable ? m.impermeable : m.permeable) : [basic]
    if (p.stage === 'preliminary' || profile.dependence === 'constant') return selected
    const table = profile.dependence === 'thickness' ? impermeable ? profile.thicknessImpermeable : profile.thicknessPermeable : impermeable ? profile.radiumImpermeable : profile.radiumPermeable
    const minimum = Math.min(...table.map(point => point.y))
    return selected.map(value => value * minimum / basic)
  })
  return Math.min(...values)
}
export function gammaCutoff(doc: AlphaDocument, row: DepthInterval, ra: number, krr: number, morphology: OreInterval['morphology']) {
  const p = doc.parameters.gamma, profile = p.profile
  const minimum = (p.stage === 'final' && isImpermeable(doc, row) ? profile.technologicalCutoff : p.cutoff) * krr
  if (p.stage === 'preliminary' || profile.cutoffMode === 'fixed') return minimum
  const m = profile.morphology[morphology], yellow = doc.oxidation.some(z => overlap(z, row) > 0)
  const a = p.useMorphology ? yellow ? m.yellowA : m.grayA : profile.cutoffA, b = p.useMorphology ? yellow ? m.yellowB : m.grayB : profile.cutoffB
  return Math.max(minimum, a * ra + b)
}
export function gammaRowStatistics(row: OreInterval, density: number) {
  return { ...row, thickness: row.to - row.from, raMetro: row.ra * (row.to - row.from), linearStock: row.metro * density * 10 }
}
