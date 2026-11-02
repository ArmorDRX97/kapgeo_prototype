import { z } from 'zod'

// Labels follow the supplied AP screen. Unspecified instrument units are not inferred.
export const apParameterFields = [
  ['boreholeDiameter', 'Диаметр скважины, мм', 136],
  ['toolDiameter', 'Диаметр прибора, мм', 64],
  ['detectorLength', 'Длина детектора', 70],
  ['casingThickness', 'Толщина обсадных труб, мм', 0],
  ['mudDensity', 'Плотность раствора', 1.23],
  ['reference', 'Репер', 1],
  ['delta', 'Дельта', 1.3],
  ['probeLength', 'Длина зонда, м', 1],
  ['casingCorrection', 'Поправка за поглощение · остаточная', 0.86288],
  ['tableCorrection', 'Поправка за поглощение · табличная', 0.77],
  ['resCurveShift', 'Смещение кривой КС', 1.2338],
  ['referenceShift', 'Смещение уровня репера', 1.2338],
  ['asymmetryRatio', 'Отношение асимптот к реперу', 0],
  ['boundaryShiftFirst', 'Смещение литологических границ · первое число', null],
  ['boundaryShiftSecond', 'Смещение литологических границ · второе число', null],
  ['spSlope', 'Наклон ПС', null],
  ['spConfidence', 'Достоверность ПС', 1],
  ['spFlag', 'Флаг ПС', null],
  ['spMax', 'Максимум ПС, мВ', 90],
  ['spMin', 'Минимум ПС, мВ', 37],
  ['resAverage', 'Среднее КС по скважине, Ом·м', 15.52559],
  ['resReference', 'Уровень КС по реперной скважине', 15.52559],
  ['referenceStart', 'Начало репера, м', null],
  ['referenceEnd', 'Конец репера, м', null],
] as const
export type ApParameterKey = typeof apParameterFields[number][0]
export type ApParameters = Record<ApParameterKey, number | null>
export const defaultApParameters = Object.fromEntries(apParameterFields.map(([key, , value]) => [key, value])) as ApParameters

export const horizonParameterFields = [
  ['kf', 'Кф, м/сут', 8.2],
  ['waterResistivity', 'Электрическое сопротивление вод, Ом·м', 4.6],
  ['clay', 'Глинистость, %', 12],
  ['carbonate', 'Карбонатность, %', 2.5],
  ['labKf', 'Кф по исследованиям, м/сут', 7.6],
  ['resistivity', 'Электрическое сопротивление, Ом·м', 23.4],
  ['siltClay', 'Глинисто-алевритовые частицы, %', 18],
  ['d50', 'D50, мм', 0.24],
  ['acidCapacity', 'Кислотоёмкость', null],
  ['upperFrom', 'Верхняя зона растекания раствора · от, м', null],
  ['upperTo', 'Верхняя зона растекания раствора · до, м', null],
  ['upperKf', 'Кф верхней зоны, м/сут', null],
  ['lowerFrom', 'Нижняя зона растекания раствора · от, м', null],
  ['lowerTo', 'Нижняя зона растекания раствора · до, м', null],
  ['lowerKf', 'Кф нижней зоны, м/сут', null],
] as const
export type HorizonParameterKey = typeof horizonParameterFields[number][0]
type HorizonParameters = Record<HorizonParameterKey, number | null>

const nullableNumber = z.number().finite().nullable()
const horizonSchema = z.object({
  id: z.string(), horizon: z.string().min(1), from: z.number().finite().nonnegative(), to: z.number().finite(),
  values: z.object(Object.fromEntries(horizonParameterFields.map(([key, , value]) => [key, nullableNumber.default(value)])) as Record<HorizonParameterKey, z.ZodDefault<typeof nullableNumber>>),
})
export type ProductiveHorizon = Omit<z.infer<typeof horizonSchema>, 'values'> & { values: HorizonParameters }
const parametersSchema = z.object(Object.fromEntries(apParameterFields.map(([key, , value]) => [key, nullableNumber.default(value)])) as Record<ApParameterKey, z.ZodDefault<typeof nullableNumber>>)
const rowSchema = z.object({
  id: z.string(), from: z.number().finite().nonnegative(), to: z.number().finite(), horizon: z.string().min(1),
  source: z.string(), permeable: z.boolean(), kf: z.number().finite().nonnegative(), lft: z.number().int().nonnegative(),
  krr: z.number().finite().positive(), uranium: z.number().finite().nonnegative(),
  parameters: parametersSchema.prefault({}), horizons: z.array(horizonSchema).max(200).optional(),
})
export type ReviewInterval = Omit<z.infer<typeof rowSchema>, 'horizons'> & { horizons: ProductiveHorizon[] }

export function createProductiveHorizon(row: Pick<ReviewInterval, 'from' | 'to' | 'horizon' | 'kf'>, id: string = crypto.randomUUID()): ProductiveHorizon {
  return { id, from: row.from, to: row.to, horizon: row.horizon,
    values: { ...Object.fromEntries(horizonParameterFields.map(([key, , value]) => [key, value])) as HorizonParameters, kf: row.kf } }
}
export function createAnomalyRows(depth: number): ReviewInterval[] {
  return [0.67, 0.78, 0.88].map((ratio, i) => {
    const row = { id: `AP-${i + 1}`, from: +(depth * ratio).toFixed(2), to: +(depth * (ratio + .045)).toFixed(2),
      horizon: i < 2 ? 'K₂ · мынкудукский' : 'K₁ · нижний', source: 'Гамма-каротаж', permeable: i !== 1,
      kf: i === 1 ? .03 : 8.2, lft: i === 1 ? 0 : i + 1, krr: 1.05, uranium: .03 + i * .02, parameters: { ...defaultApParameters } }
    return { ...row, horizons: [createProductiveHorizon(row, `${row.id}-H1`)] }
  })
}
export function validateAnomalyRows(rows: ReviewInterval[], depth: number): string {
  if (!z.array(rowSchema).max(200).safeParse(rows).success || rows.some(r => r.to <= r.from || r.to > depth)) return 'Проверьте границы пересечений и численные характеристики.'
  const sorted = [...rows].sort((a, b) => a.from - b.from)
  if (sorted.some((r, i) => i > 0 && r.from < sorted[i - 1]!.to)) return 'Пересечения перекрываются. Уточните границы.'
  if (rows.some(r => r.horizons.some(h => h.to <= h.from || h.from < r.from || h.to > r.to))) return 'Границы продуктивного горизонта должны находиться внутри выбранного пересечения.'
  return ''
}
export function loadAnomalyRows(key: string, depth: number): ReviewInterval[] {
  try {
    const parsed = z.array(rowSchema).max(200).parse(JSON.parse(localStorage.getItem(key) ?? 'null'))
    // Preserve the original storage key and all previously entered AP values.
    const rows = parsed.map(r => ({ ...r, horizons: r.horizons ?? [createProductiveHorizon(r, `${r.id}-H1`)] }))
    return validateAnomalyRows(rows, depth) ? createAnomalyRows(depth) : rows
  } catch { return createAnomalyRows(depth) }
}
