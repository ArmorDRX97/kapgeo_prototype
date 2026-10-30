import { z } from 'zod'

export const permeabilityClasses = ['permeable', 'impermeable', 'unknown'] as const
export const permeabilityLabels = { permeable: 'Проницаемые', impermeable: 'Непроницаемые', unknown: 'Нет данных' }
export const permeabilitySources = ['По каротажу', 'По керну', 'По расходометрии', 'Ручное описание', 'Не указан'] as const
export const permeabilityRocks = ['Песок', 'Песчаник', 'Алевролит', 'Глина', 'Суглинок', 'Не определена'] as const

const intervalSchema = z.object({
  id: z.string().min(1), from: z.number().finite().nonnegative(), to: z.number().finite().positive(),
  kind: z.enum(permeabilityClasses), rock: z.enum(permeabilityRocks), source: z.enum(permeabilitySources),
  kf: z.number().finite().nonnegative().nullable(), lft: z.number().int().nonnegative().nullable(),
  note: z.string().max(500),
})
export type PermeabilityInterval = z.infer<typeof intervalSchema>
export const permeabilityStorageKey = (wellId: string) => `kapgeo.bgd.permeability.v1.${wellId}`

/** Independent well-log examples. Classification is explicit, never inferred from missing data or a made-up threshold. */
export function createPermeabilityExample(depth: number): PermeabilityInterval[] {
  if (!Number.isFinite(depth) || depth <= 0) return []
  const boundaries = [0, .2, .66, .7, .755, .8, .88, 1].map(r => Number((depth * r).toFixed(3)))
  const properties: Array<Pick<PermeabilityInterval, 'kind' | 'rock' | 'kf' | 'lft'>> = [
    { kind: 'impermeable', rock: 'Глина', kf: null, lft: null },
    { kind: 'impermeable', rock: 'Алевролит', kf: .06, lft: 0 },
    { kind: 'permeable', rock: 'Песок', kf: 6.8, lft: 1 },
    { kind: 'permeable', rock: 'Песок', kf: 8.4, lft: 2 },
    { kind: 'impermeable', rock: 'Глина', kf: .03, lft: 0 },
    { kind: 'permeable', rock: 'Песчаник', kf: 12.1, lft: 3 },
    { kind: 'unknown', rock: 'Не определена', kf: null, lft: null },
  ]
  return properties.map((p, i): PermeabilityInterval => ({ id: `PERM-${i + 1}`, from: boundaries[i]!, to: boundaries[i + 1]!, ...p,
    source: p.kind === 'unknown' ? 'Не указан' : 'По каротажу', note: '' }))
    .filter(r => r.to > r.from)
}

export function validatePermeabilityIntervals(rows: PermeabilityInterval[], depth: number): string {
  if (!Number.isFinite(depth) || depth <= 0) return 'Укажите положительную глубину скважины в разделе «Координаты и глубина».'
  const parsed = z.array(intervalSchema).max(1000).safeParse(rows)
  if (!parsed.success || rows.some(r => r.to <= r.from || r.to > depth)) return 'Проверьте границы в пределах ствола, Кф ≥ 0 и целый ЛФТ ≥ 0. Неизвестные Кф и ЛФТ можно оставить пустыми.'
  if (new Set(rows.map(r => r.id)).size !== rows.length) return 'Повторяются идентификаторы интервалов.'
  const sorted = [...rows].sort((a, b) => a.from - b.from)
  if (sorted.some((r, i) => i > 0 && r.from < sorted[i - 1]!.to)) return 'Интервалы в этом списке перекрываются. Уточните границы.'
  return ''
}

export function loadPermeabilityIntervals(wellId: string, depth: number): PermeabilityInterval[] {
  try {
    const rows = z.array(intervalSchema).max(1000).parse(JSON.parse(localStorage.getItem(permeabilityStorageKey(wellId)) ?? 'null'))
    if (!validatePermeabilityIntervals(rows, depth)) return rows.map(row => ({ ...row, note: ['Проницаемость не определена в демонстрационном примере.', 'Подготовленный пример интервала пород.'].includes(row.note) ? '' : row.note }))
  } catch { /* Missing or invalid local examples fall back to the permeability dataset. Old AP keys are left untouched. */ }
  return createPermeabilityExample(depth)
}

export function firstPermeabilityGap(rows: PermeabilityInterval[], depth: number) {
  let cursor = 0
  for (const r of [...rows].sort((a, b) => a.from - b.from)) {
    if (r.from > cursor) return { from: cursor, to: r.from }
    cursor = Math.max(cursor, r.to)
  }
  return cursor < depth ? { from: cursor, to: depth } : null
}

export function permeabilityTotals(rows: PermeabilityInterval[], depth: number) {
  const groups = Object.fromEntries(permeabilityClasses.map(kind => [kind, {
    count: rows.filter(r => r.kind === kind).length,
    thickness: rows.filter(r => r.kind === kind).reduce((sum, r) => sum + r.to - r.from, 0),
  }])) as Record<PermeabilityInterval['kind'], { count: number; thickness: number }>
  return { groups, undescribed: Math.max(0, depth - rows.reduce((sum, r) => sum + r.to - r.from, 0)) }
}

export function permeabilityCsv(rows: PermeabilityInterval[]) {
  const cell = (v: string | number | null) => {
    const text = v === null ? '' : typeof v === 'string' && /^[=+\-@]/.test(v) ? `'${v}` : String(v)
    return `"${text.replaceAll('"', '""')}"`
  }
  return '\ufeff' + [['От, м', 'До, м', 'Мощность, м', 'Проницаемость', 'Порода', 'Кф, м/сут', 'ЛФТ', 'Источник', 'Примечание'],
    ...rows.map(r => [r.from, r.to, Number((r.to - r.from).toFixed(3)), permeabilityLabels[r.kind], r.rock, r.kf, r.lft, r.source, r.note])]
    .map(r => r.map(cell).join(';')).join('\r\n')
}
