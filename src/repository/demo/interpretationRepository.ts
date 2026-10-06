import { z } from 'zod'
import { validateIntervals } from '../../shared/scientific/intervals/engine'
import type { IntervalRecord } from '../../shared/scientific/intervals/types'
import { intervalPolicy } from '../../entities/interpretation/lib/commands'
import type { CoreSegment, InterpretationDocument, InterpretationWell } from '../../entities/interpretation/model/types'
import { sourceIssues, validateMapping } from '../../entities/interpretation/lib/core'

const range = { id: z.string().min(1), from: z.number().finite(), to: z.number().finite() }
const properties = { rock: z.enum(['sand', 'clay', 'silt', 'sandstone', 'limestone', 'unknown']), mineralization: z.string(), minerals: z.array(z.string()).optional(), color: z.enum(['gray', 'brown', 'yellow', 'green', 'white']).optional(), note: z.string() }
const lithology = z.object({ ...range, ...properties })
const schema = z.object({ wellId: z.string(), logLithology: z.array(lithology), compositeLithology: z.array(lithology),
  technology: z.array(z.object({ ...range, kind: z.enum(['permeable', 'impermeable', 'unknown']), source: z.enum(['manual', 'calculation']) })),
  core: z.array(z.object({ ...range, runId: z.string(), reversed: z.boolean(), sourceId: z.string().nullable().optional(), sourceFrom: z.number().finite().optional(), sourceTo: z.number().finite().optional(), kind: z.enum(['core', 'no-core']).optional(), properties: z.object(properties).optional() })),
  samples: z.array(z.object({ id: z.string(), name: z.string(), kind: z.enum(['KP', 'GS', 'LGH', 'TP']).optional(), assay: z.number().finite(), parts: z.array(z.object({ segmentId: z.string(), from: z.number().finite(), to: z.number().finite() })) })).optional(),
  sourceRevision: z.string().optional(),
  calculation: z.object({ curveId: z.string(), from: z.number().finite(), to: z.number().finite(), threshold: z.number().positive(), minThickness: z.number().nonnegative(), method: z.enum(['potential', 'gradient']).optional(), direction: z.enum(['down', 'up']).optional(), rounding: z.number().positive().optional(), minImpermeable: z.number().nonnegative().optional(), continuePermeable: z.boolean().optional() }).nullable(),
  revision: z.number().int().nonnegative(),
})
export const interpretationStorageKey = (wellId: string) => `kapgeo.interpretation.demo.v1:${wellId}`
export function validateInterpretation(well: InterpretationWell, input: unknown): InterpretationDocument {
  const parsed = schema.safeParse(input)
  if (!parsed.success || parsed.data.wellId !== well.id) throw new Error('Не удалось прочитать результат. Сбросьте только набор интерпретации этой скважины.')
  const doc = parsed.data
  for (const rows of [doc.logLithology, doc.compositeLithology, doc.technology]) {
    if (validateIntervals<IntervalRecord>(rows, { ...intervalPolicy(well.depth), minimumThickness: rows === doc.compositeLithology ? 0.000001 : 0.1 }).some(issue => issue.severity === 'error')) throw new Error('Результат содержит некорректные интервалы.')
  }
  validateMapping(well, doc)
  const samples = doc.samples ?? well.samples
  if (new Set(samples.map(s => s.id)).size !== samples.length) throw new Error('Повторяются идентификаторы проб.')
  for (const sample of samples) for (const part of sample.parts) {
    const source = well.core.find(s => s.id === part.segmentId)
    if (!source || part.to <= part.from || part.from < source.from || part.to > source.to) throw new Error('Проба выходит за исходный керновый диапазон.')
  }
  return { ...doc, logLithology: doc.logLithology.map(row => ({ ...row, color: undefined })) }
}
/** Extend v1 bindings with explicit gaps without replacing their saved positions. */
function upgradeLegacyMapping(well: InterpretationWell, doc: InterpretationDocument): InterpretationDocument {
  if (!doc.core.length || doc.core.some(s => s.sourceId !== undefined || s.kind !== undefined)) return doc
  const core: CoreSegment[] = doc.core.map(s => { const raw = well.core.find(x => x.id === s.id)!; return { ...s, kind: 'core', sourceId: s.id, sourceFrom: raw.from, sourceTo: raw.to } })
  for (const run of well.runs) {
    let cursor = run.from
    for (const s of core.filter(x => x.runId === run.id).sort((a, b) => a.from - b.from)) {
      if (s.from > cursor) core.push({ id: `legacy-gap-${run.id}-${cursor}`, runId: run.id, kind: 'no-core', sourceId: null, from: cursor, to: s.from, reversed: false })
      cursor = s.to
    }
    if (cursor < run.to) core.push({ id: `legacy-gap-${run.id}-${cursor}`, runId: run.id, kind: 'no-core', sourceId: null, from: cursor, to: run.to, reversed: false })
  }
  return { ...doc, core: core.sort((a, b) => a.from - b.from) }
}
function read(well: InterpretationWell): InterpretationDocument {
  const data = window.localStorage.getItem(interpretationStorageKey(well.id))
  if (!data) return structuredClone(well.initial)
  try { const parsed = upgradeLegacyMapping(well, validateInterpretation(well, JSON.parse(data))); return { ...parsed, samples: (parsed.samples ?? structuredClone(well.samples)).map(sample => ({ ...sample, name: sample.name.replace(/^DEMO-(КП|ГС|ЛГХ|ТП)-(0\d)$/, '$1-$2') })), sourceRevision: parsed.sourceRevision ?? well.sourceRevision } }
  catch (error) { if (error instanceof SyntaxError) throw new Error('Сохранённый результат повреждён. Можно сбросить только интерпретацию этой скважины.', { cause: error }); throw error }
}
export const interpretationRepository = {
  async load(well: InterpretationWell) { const issues = sourceIssues(well); if (issues.length) throw new Error(issues.join(' ')); return read(well) },
  save(well: InterpretationWell, document: InterpretationDocument, expectedRevision: number) {
    if (well.status !== 'draft') throw new Error('Зафиксированная скважина доступна только для просмотра.')
    if (read(well).revision !== expectedRevision) throw new Error('Результат изменён в другой вкладке. Перезагрузите страницу перед сохранением.')
    const result = validateInterpretation(well, { ...document, revision: expectedRevision + 1 })
    window.localStorage.setItem(interpretationStorageKey(well.id), JSON.stringify(result))
    return result
  },
  reset(well: InterpretationWell) { window.localStorage.removeItem(interpretationStorageKey(well.id)) },
}
