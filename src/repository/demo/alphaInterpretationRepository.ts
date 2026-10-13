import { z } from 'zod'
import type { AlphaDocument } from '../../entities/interpretation/model/alphaTypes'
import type { InterpretationWell } from '../../entities/interpretation/model/types'
import { createAlphaDocument } from '../../entities/interpretation/model/alphaDocument'
import { interpretationRepository, interpretationStorageKey } from './interpretationRepository'
import { assertDepth } from '../../entities/interpretation/lib/alphaNumeric'

const num = z.number().finite(), depth = z.object({ id: z.string().min(1), from: num, to: num })
const result = <T extends z.ZodType>(row: T) => z.object({ rows: z.array(row).max(10000), fingerprint: z.string(), version: z.literal('alpha-prototype-1'), note: z.string() })
const record = z.object({ id: z.string(), kind: z.enum(['GR', 'RS', 'SP', 'TK', 'IL', 'TM', 'CAL', 'FLOW']), name: z.string(), unit: z.string(), date: z.string(), instrument: z.string(), operator: z.string(), stage: z.enum(['primary', 'expanded', 'development', 'repeat']), role: z.enum(['main', 'control']), revision: z.number().int().positive(), parentId: z.string().optional(), operations: z.array(z.string()), depths: z.array(num).max(20000), values: z.array(num.nullable()).max(20000) })
const schema = z.object({ schemaVersion: z.literal(1), wellId: z.string(), revision: z.number().int().nonnegative(), derived: z.array(record).max(50),
  parameters: z.object({
    electro: z.object({ recordId: z.string(), from: num, to: num, mode: z.enum(['overview', 'detail']), probe: z.enum(['bottom', 'top']), length: num, normalization: num, levels: z.array(num), minThickness: num, permeableKf: num }),
    gamma: z.object({ recordId: z.string(), caliperId: z.string(), from: num, to: num, stage: z.enum(['preliminary', 'final']), algorithm: z.enum(['weighted', 'iterative']), background: num, conversion: num, absorption: num, moisture: num, density: num, krr: num, cutoff: num, balanceCutoff: num, gap: num, minThickness: num, nominalDiameter: num, transform: z.boolean(), useCaliper: z.boolean(), useMorphology: z.boolean() }),
    current: z.object({ recordId: z.string(), from: num, to: num, sumpBottom: num, note: z.string() }),
    thermal: z.object({ recordId: z.string(), inductionId: z.string(), backgroundFrom: num, backgroundTo: num, backgroundTop: num, backgroundBottom: num, autoBackground: z.boolean(), interpretable: z.boolean(), note: z.string() }),
    caliper: z.object({ recordId: z.string(), from: num, to: num, target: num, casingDiameter: num, filterDiameter: num, projectFrom: num, projectTo: num, gravelMode: z.enum(['filter', 'manual']), above: num, below: num, gravelFrom: num, gravelTo: num }),
    flow: z.object({ recordId: z.string(), total: num, mode: z.enum(['injection', 'pumping', 'natural']), step: num, grouping: z.enum(['step', 'lithology', 'sections']) }),
    controls: z.object({ mainId: z.string(), controlId: z.string(), type: z.enum(['production', 'reference', 'barren']), from: num, to: num, controlFrom: num, controlTo: num, referenceArea: num, tolerance: num, depthTolerance: num, thicknessTolerance: num, note: z.string() }),
  }),
  electro: result(depth.extend({ rock: z.enum(['sand', 'clay', 'silt', 'sandstone', 'limestone', 'unknown']), resistivity: num.nullable(), normalized: num.nullable(), kf: num.nonnegative(), lft: z.number().int().min(0).max(3), manualKf: z.boolean() })),
  gamma: result(depth.extend({ ra: num.nonnegative(), uranium: num.nonnegative(), metro: num.nonnegative(), category: z.enum(['balance', 'offbalance', 'technological']), morphology: z.enum(['bag', 'upper', 'lower', 'remnant']), krr: num.positive() })),
  current: result(depth), thermal: result(depth), metal: result(z.object({ id: z.string(), depth: num, label: z.string() })),
  caliper: result(depth.extend({ minimum: num.nullable(), mean: num.nullable() })), flow: result(depth.extend({ rate: num.nonnegative(), percent: num.nonnegative() })),
  controls: result(depth.extend({ controlFrom: num, controlTo: num, mainArea: num.nullable(), controlArea: num.nullable(), relative: num.nullable(), depthError: num.nonnegative(), thicknessError: num.nonnegative(), status: z.enum(['pass', 'fail', 'unmatched']) })),
  sections: z.array(depth), oxidation: z.array(depth), projects: z.array(depth.extend({ kind: z.enum(['filter', 'bentonite']), label: z.string() })),
  filterProposal: z.object({ from: num, to: num }), zadr: z.object({ above: num.nonnegative(), below: num.nonnegative(), includeOffbalance: z.boolean() }),
  passport: z.object({ from: num, to: num, scale: num.positive(), compiledBy: z.string(), note: z.string() }),
})
export const alphaStorageKey = (wellId: string) => `kapgeo.alpha.interpretation.v1:${wellId}`
export function validateAlpha(well: InterpretationWell, input: unknown): AlphaDocument {
  const parsed = schema.safeParse(input)
  if (!parsed.success || parsed.data.wellId !== well.id) throw new Error('Сохранение интерпретации повреждено или относится к другой скважине.')
  const doc = parsed.data
  for (const rows of [doc.electro.rows, doc.gamma.rows, doc.current.rows, doc.thermal.rows, doc.caliper.rows, doc.flow.rows, doc.sections, doc.oxidation, doc.projects]) {
    if (new Set(rows.map(r => r.id)).size !== rows.length) throw new Error('Повторяются идентификаторы объектов.')
    for (const row of rows) assertDepth(row.from, row.to, well.depth)
  }
  for (const rows of [doc.electro.rows, doc.gamma.rows, doc.current.rows, doc.thermal.rows, doc.flow.rows, doc.sections]) {
    const sorted = [...rows].sort((a, b) => a.from - b.from)
    if (sorted.some((r, i) => i > 0 && r.from < sorted[i - 1]!.to - 0.00001)) throw new Error('Интервалы одного результата не должны перекрываться.')
  }
  for (const mark of doc.metal.rows) if (mark.depth < 0 || mark.depth > well.depth) throw new Error('Метка металла выходит за глубину скважины.')
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
