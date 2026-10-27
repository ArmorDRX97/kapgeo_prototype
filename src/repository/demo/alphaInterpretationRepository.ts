import { defaultAlphaHeader } from '../../entities/interpretation/model/alphaHeader'
import { z } from 'zod'
import type { AlphaDocument } from '../../entities/interpretation/model/alphaTypes'
import type { InterpretationWell } from '../../entities/interpretation/model/types'
import { createAlphaDocument } from '../../entities/interpretation/model/alphaDocument'
import { interpretationRepository, interpretationStorageKey } from './interpretationRepository'
import { createGammaProfile, validateKrrTable } from '../../entities/interpretation/lib/alphaGammaProfile'
import { assertDepth } from '../../entities/interpretation/lib/alphaNumeric'
import { allAlphaRecords, alphaRecords } from '../../entities/interpretation/model/alphaFixtures'

const num = z.number().finite(), depth = z.object({ id: z.string().min(1), from: num, to: num })
const result = <T extends z.ZodType>(row: T) => z.object({ rows: z.array(row).max(10000), fingerprint: z.string(), version: z.enum(['alpha-prototype-1', 'alpha-prototype-2']), note: z.string() })
const record = z.object({ id: z.string(), kind: z.enum(['GR', 'RS', 'SP', 'TK', 'IL', 'TM', 'CAL', 'FLOW']), name: z.string(), unit: z.string(), date: z.string(), instrument: z.string(), operator: z.string(), stage: z.enum(['primary', 'expanded', 'development', 'repeat']), role: z.enum(['main', 'control']), revision: z.number().int().positive(), parentId: z.string().optional(), operations: z.array(z.string()), depths: z.array(num).max(20000), values: z.array(num.nullable()).max(20000) })
const point = z.object({ x: num.nonnegative(), y: num.positive() })
const morphology = z.object({ permeable: num.positive(), impermeable: num.positive(), grayA: num, grayB: num, yellowA: num, yellowB: num })
const gammaProfile = z.object({ thkCorrection: num.nonnegative(), radonFactor: num.positive(), probeDiameter: num.positive(), fluidDensity: num.nonnegative(), fluidAttenuation: num.nonnegative(), casingThickness: num.nonnegative(), casingDensity: num.positive(), casingAttenuation: num.nonnegative(), caliperFrom: num, caliperTo: num, krrImpermeable: num.positive(), dependence: z.enum(['constant', 'thickness', 'radium']), thicknessPermeable: z.array(point).max(100), thicknessImpermeable: z.array(point).max(100), radiumPermeable: z.array(point).max(100), radiumImpermeable: z.array(point).max(100), morphology: z.object({ bag: morphology, upper: morphology, lower: morphology, remnant: morphology }), cutoffMode: z.enum(['fixed', 'regression']), cutoffA: num, cutoffB: num, minimumMetro: num.nonnegative(), technologicalCutoff: num.positive(), impermeableGap: num.nonnegative(), iterations: z.number().int().min(1).max(20) })
const schema = z.object({ schemaVersion: z.literal(1), wellId: z.string(), revision: z.number().int().nonnegative(), derived: z.array(record).max(50), header: z.object({ deposit: z.enum(['demo-north', 'demo-east']), horizon: z.string().trim().min(1).max(80), block: z.string().trim().min(1).max(80), row: z.string().trim().min(1).max(80), kind: z.enum(['exploration', 'production', 'injection', 'observation']), organization: z.string().trim().min(1).max(120), loggedAt: z.iso.date() }).default(defaultAlphaHeader()),
  parameters: z.object({
    electro: z.object({ recordId: z.string(), from: num, to: num, mode: z.enum(['overview', 'detail']), probe: z.enum(['bottom', 'top']), length: num, normalization: num, levels: z.array(num), minThickness: num, permeableKf: num,
      levelMode: z.enum(['absolute', 'percent']).default('absolute'), normalizationMethod: z.enum(['manual', 'clay', 'horizon']).default('manual'), referenceFrom: num.default(112), referenceTo: num.default(116), referenceValue: num.default(12), kfModel: z.enum(['linear', 'power']).default('linear'), kfA: num.default(0.45), kfB: num.default(-5.4) }),
    gamma: z.object({ recordId: z.string(), caliperId: z.string(), from: num, to: num, stage: z.enum(['preliminary', 'final']), algorithm: z.enum(['weighted', 'iterative']), background: num, conversion: num, absorption: num, moisture: num, density: num, krr: num, cutoff: num, balanceCutoff: num, gap: num, minThickness: num, nominalDiameter: num, transform: z.boolean(), useCaliper: z.boolean(), useMorphology: z.boolean(), profile: gammaProfile.optional() }).transform(p => ({ ...p, profile: p.profile ?? createGammaProfile(p.krr) })),
    current: z.object({ recordId: z.string(), from: num, to: num, sumpBottom: num, note: z.string() }),
    thermal: z.object({ recordId: z.string(), inductionId: z.string(), backgroundFrom: num, backgroundTo: num, backgroundTop: num, backgroundBottom: num, autoBackground: z.boolean(), interpretable: z.boolean(), note: z.string() }),
    caliper: z.object({ recordId: z.string(), from: num, to: num, target: num, casingDiameter: num, filterDiameter: num, projectFrom: num, projectTo: num, gravelMode: z.enum(['filter', 'manual']), above: num, below: num, gravelFrom: num, gravelTo: num }),
    flow: z.object({ recordId: z.string(), total: num, totalUnit: z.literal('m3/h').default('m3/h'), mode: z.enum(['injection', 'pumping', 'natural']), step: num, grouping: z.enum(['step', 'lithology', 'sections']) }),
    controls: z.object({ mainId: z.string(), controlId: z.string(), type: z.enum(['production', 'reference', 'barren']), from: num, to: num, controlFrom: num, controlTo: num, referenceArea: num, tolerance: num, depthTolerance: num, thicknessTolerance: num, note: z.string(), pairing: z.enum(['automatic', 'manual']).default('manual'), pairs: z.array(depth.extend({ controlFrom: num, controlTo: num })).max(100).default([]) }),
  }),
  electro: result(depth.extend({ rock: z.enum(['sand', 'clay', 'silt', 'sandstone', 'limestone', 'paleozoic', 'unknown']), resistivity: num.nullable(), normalized: num.nullable(), kf: num.nonnegative(), lft: z.number().int().min(0).max(3), manualKf: z.boolean(), lithologyCode: z.string().max(40).optional(), geochemistryCode: z.string().max(40).optional() })),
  gamma: result(depth.extend({ ra: num.nonnegative(), uranium: num.nonnegative(), metro: num.nonnegative(), category: z.enum(['balance', 'offbalance', 'technological']), morphology: z.enum(['bag', 'upper', 'lower', 'remnant']), krr: num.positive() })),
  current: result(depth), thermal: result(depth), metal: result(z.object({ id: z.string(), depth: num, label: z.string() })),
  caliper: result(depth.extend({ minimum: num.nullable(), mean: num.nullable() })), flow: result(depth.extend({ rate: num.nonnegative(), percent: num.nonnegative() })),
  controls: result(depth.extend({ controlFrom: num, controlTo: num, mainArea: num.nullable(), controlArea: num.nullable(), relative: num.nullable(), depthError: num.nonnegative(), thicknessError: num.nonnegative(), status: z.enum(['pass', 'fail', 'unmatched']), mainThickness: num.nullable().default(null), controlThickness: num.nullable().default(null), mainMetro: num.nullable().default(null), controlMetro: num.nullable().default(null), thicknessRelative: num.nullable().default(null) })),
  sections: z.array(depth), oxidation: z.array(depth), projects: z.array(depth.extend({ kind: z.enum(['filter', 'bentonite']), label: z.string() })),
  filterProposal: z.object({ from: num, to: num }), zadr: z.object({ above: num.nonnegative(), below: num.nonnegative(), includeOffbalance: z.boolean(), includeTechnological: z.boolean().default(false) }),
  passport: z.object({ from: num, to: num, scale: num.positive(), compiledBy: z.string(), note: z.string(), template: z.enum(['ore', 'construction', 'flow']).default('ore') }),
})
export const alphaStorageKey = (wellId: string) => `kapgeo.alpha.interpretation.v1:${wellId}`
export function validateAlpha(well: InterpretationWell, input: unknown): AlphaDocument {
  const parsed = schema.safeParse(input)
  if (!parsed.success) throw new Error('Проверьте заполнение полей и числовые значения интерпретации.')
  if (parsed.data.wellId !== well.id) throw new Error('Документ интерпретации относится к другой скважине.')
  const doc = parsed.data
  for (const p of [doc.parameters.electro, doc.parameters.gamma, doc.parameters.current, doc.parameters.caliper, doc.filterProposal, doc.passport]) assertDepth(p.from, p.to, well.depth)
  assertDepth(doc.parameters.thermal.backgroundFrom, doc.parameters.thermal.backgroundTo, well.depth)
  assertDepth(doc.parameters.caliper.projectFrom, doc.parameters.caliper.projectTo, well.depth)
  if (doc.parameters.caliper.gravelMode === 'manual') assertDepth(doc.parameters.caliper.gravelFrom, doc.parameters.caliper.gravelTo, well.depth)
  const ek = doc.parameters.electro, gk = doc.parameters.gamma, tk = doc.parameters.current, km = doc.parameters.caliper, rm = doc.parameters.flow, control = doc.parameters.controls
  if (ek.normalization <= 0 || ek.length <= 0 || ek.minThickness < 0 || ek.permeableKf <= 0 || ek.permeableKf >= 7 || ek.kfA <= 0 || ek.levels.length < 1 || ek.levels.length > 8 || ek.levels.some((v, i) => v <= 0 || ek.levelMode === 'percent' && v >= 100 || i > 0 && v <= ek.levels[i - 1]!)) throw new Error('Проверьте нормировку, зонд, возрастающие уровни КС и граничный Кф (0…7).')
  if (ek.normalizationMethod !== 'manual') { assertDepth(ek.referenceFrom, ek.referenceTo, well.depth); if (ek.referenceValue <= 0) throw new Error('Стандартный КС должен быть положительным.') }
  if (gk.cutoff <= 0 || gk.balanceCutoff < gk.cutoff || gk.krr <= 0 || gk.conversion <= 0 || gk.absorption <= 0 || gk.moisture < 0 || gk.moisture >= 100 || gk.density <= 0 || gk.nominalDiameter <= 0 || gk.gap < 0 || gk.minThickness < 0) throw new Error('Проверьте кондиции и поправки ГК.')
  if (gk.useCaliper) assertDepth(gk.profile.caliperFrom, gk.profile.caliperTo, well.depth)
  if (gk.profile.probeDiameter >= gk.nominalDiameter) throw new Error('Диаметр прибора должен быть меньше номинального диаметра скважины.')
  if (gk.profile.dependence !== 'constant') { validateKrrTable(gk.profile.thicknessPermeable); validateKrrTable(gk.profile.thicknessImpermeable); validateKrrTable(gk.profile.radiumPermeable); validateKrrTable(gk.profile.radiumImpermeable) }
  if (tk.sumpBottom < tk.to || tk.sumpBottom > well.depth) throw new Error('Подошва отстойника должна быть ниже фильтра и внутри скважины.')
  if (km.target <= 0 || km.filterDiameter <= 0 || km.casingDiameter <= 0 || km.above < 0 || km.below < 0 || rm.total <= 0 || ![0.5, 1].includes(rm.step)) throw new Error('Диаметры и дебит должны быть положительными; шаг расхода — 0,5 или 1 м.')
  for (const p of [{ from: control.from, to: control.to }, { from: control.controlFrom, to: control.controlTo }, ...control.pairs, ...control.pairs.map(r => ({ from: r.controlFrom, to: r.controlTo }))]) assertDepth(p.from, p.to, well.depth)
  if (control.tolerance < 0 || control.depthTolerance < 0 || control.thicknessTolerance < 0) throw new Error('Допуски контроля должны быть неотрицательными.')
  for (const rows of [doc.electro.rows, doc.gamma.rows, doc.current.rows, doc.thermal.rows, doc.caliper.rows, doc.flow.rows, doc.sections, doc.oxidation, doc.projects]) {
    if (new Set(rows.map(r => r.id)).size !== rows.length) throw new Error('Повторяются идентификаторы объектов.')
    for (const row of rows) assertDepth(row.from, row.to, well.depth)
  }
  for (const rows of [doc.electro.rows, doc.gamma.rows, doc.current.rows, doc.thermal.rows, doc.flow.rows, doc.sections]) {
    const sorted = [...rows].sort((a, b) => a.from - b.from)
    if (sorted.some((r, i) => i > 0 && r.from < sorted[i - 1]!.to - 0.00001)) throw new Error('Интервалы одного результата не должны перекрываться.')
  }
  for (const mark of doc.metal.rows) if (mark.depth < 0 || mark.depth > well.depth) throw new Error('Метка металла выходит за глубину скважины.')
  for (const row of doc.controls.rows) { assertDepth(row.from, row.to, well.depth); assertDepth(row.controlFrom, row.controlTo, well.depth) }
  const records = allAlphaRecords(well, doc)
  if (new Set(records.map(r => r.id)).size !== records.length) throw new Error('Повторяются идентификаторы записей ГИС.')
  for (const rec of doc.derived) if (!rec.parentId || !alphaRecords(well).some(r => r.id === rec.parentId && r.kind === rec.kind)) throw new Error('Производная запись должна ссылаться на исходное измерение того же метода.')
  for (const rec of doc.derived) if (rec.depths.length !== rec.values.length || rec.depths.length < 2 || rec.depths.some((d, i) => d < 0 || d > well.depth || i > 0 && d <= rec.depths[i - 1]!)) throw new Error('Производная запись содержит некорректные глубины/значения.')
  return doc
}
function read(well: InterpretationWell): AlphaDocument {
  const raw = localStorage.getItem(alphaStorageKey(well.id))
  if (raw) { try { return validateAlpha(well, JSON.parse(raw)) } catch { throw new Error('Не удалось прочитать сохранение интерпретации. Исходное сохранение оставлено без изменений.') } }
  // Legacy is read independently, never reset or overwritten by this workbench.
  return createAlphaDocument(well)
}
export const alphaRepository = {
  async load(well: InterpretationWell) {
    if (!localStorage.getItem(alphaStorageKey(well.id)) && localStorage.getItem(interpretationStorageKey(well.id))) {
      const legacy = await interpretationRepository.load(well)
      return createAlphaDocument(well, legacy)
    }
    return read(well)
  },
  save(well: InterpretationWell, doc: AlphaDocument, expectedRevision: number) {
    if (well.status !== 'draft') throw new Error('Зафиксированная скважина доступна только для просмотра.')
    const raw = localStorage.getItem(alphaStorageKey(well.id)), revision = raw ? validateAlpha(well, JSON.parse(raw)).revision : 0
    if (revision !== expectedRevision) throw new Error('Сохранение изменено в другой вкладке. Перезагрузите страницу.')
    const saved = validateAlpha(well, { ...doc, revision: revision + 1 }); localStorage.setItem(alphaStorageKey(well.id), JSON.stringify(saved)); return saved
  },
}
