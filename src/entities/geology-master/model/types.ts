export type MasterStatus = 'active' | 'archived'

export type DepositObjectType = 'field' | 'area' | 'custom'

export type BgdLocale = 'ru' | 'kk' | 'en'

export const depositStructureTypes = ['Участок', 'Рудная залежь', 'Площадь'] as const

export type DepositOccurrence = {
  id: string
  legacyIds?: string[]
  status?: MasterStatus
  type: string
  nameRu: string
  nameKk: string
  nameEn: string
}

export type Deposit = {
  id: string
  code: number
  objectType: DepositObjectType
  customType?: string
  nameRu: string
  nameKk: string
  nameEn: string
  descriptionRu: string
  descriptionKk: string
  descriptionEn: string
  coordinateSystem: string
  isHidden: boolean
  occurrences: DepositOccurrence[]
  status: MasterStatus
  createdAt: string
  createdBy: string
  updatedAt: string
  updatedBy: string
}

export type CreateDepositInput = Pick<Deposit, 'code' | 'nameRu' | 'nameKk' | 'nameEn'> & Partial<Pick<Deposit, 'objectType' | 'customType' | 'descriptionRu' | 'descriptionKk' | 'descriptionEn' | 'coordinateSystem' | 'isHidden' | 'occurrences'>> & {
  conditionLimits?: ConditionLimit[]
}

export type UpdateDepositPatch = Pick<Deposit, 'nameRu' | 'nameKk' | 'nameEn' | 'objectType' | 'customType' | 'descriptionRu' | 'descriptionKk' | 'descriptionEn' | 'coordinateSystem' | 'isHidden'> & { occurrences?: DepositOccurrence[] }

export function getDepositName(deposit: Pick<Deposit, 'nameRu' | 'nameKk' | 'nameEn'>, locale: BgdLocale = 'ru'): string {
  return deposit[locale === 'kk' ? 'nameKk' : locale === 'en' ? 'nameEn' : 'nameRu'] || deposit.nameRu || deposit.nameKk || deposit.nameEn
}

export function getDepositDescription(deposit: Pick<Deposit, 'descriptionRu' | 'descriptionKk' | 'descriptionEn'>, locale: BgdLocale = 'ru'): string {
  return deposit[locale === 'kk' ? 'descriptionKk' : locale === 'en' ? 'descriptionEn' : 'descriptionRu'] || deposit.descriptionRu || deposit.descriptionKk || deposit.descriptionEn
}

export function getOccurrenceName(occurrence: Pick<DepositOccurrence, 'nameRu' | 'nameKk' | 'nameEn'>, locale: BgdLocale = 'ru'): string {
  return occurrence[locale === 'kk' ? 'nameKk' : locale === 'en' ? 'nameEn' : 'nameRu'] || occurrence.nameRu || occurrence.nameKk || occurrence.nameEn
}

export type ConditionLimit = {
  id: string
  parameter: string
  value: string
  unit?: string
}

export const unrestrictedConditionLimit = 'Без ограничения'
export const unrestrictedConditionLimitId = 'max-barren-thickness-c2'

const requiredConditionLimitDefaults: ConditionLimit[] = [
  { id: 'uranium-cutoff-percent', parameter: 'Бортовое содержание урана', value: '0,01', unit: '%' },
  { id: 'max-waste-in-ore-interval', parameter: 'Максимальная мощность безрудных зон и некондиционных руд в рудном интервале', value: '1,0', unit: 'м' },
  { id: 'max-barren-thickness-c1', parameter: 'Максимальная мощность безрудных интервалов в подсчётном блоке категории С₁', value: '6,0', unit: 'м' },
  { id: unrestrictedConditionLimitId, parameter: 'Максимальная мощность безрудных интервалов категории С₂', value: unrestrictedConditionLimit, unit: 'м' },
  { id: 'min-area-ore-factor', parameter: 'Минимальный площадной коэффициент рудоносности', value: '0,75' },
  { id: 'min-isolated-block-area-c1', parameter: 'Минимальная площадь изолированного блока С₁', value: '40', unit: 'тыс. м²' },
  { id: 'max-block-area-c1', parameter: 'Максимальная площадь блока С₁', value: '300', unit: 'тыс. м²' },
  { id: 'max-silt-clay-content', parameter: 'Максимальное содержание алеврито-глинистых частиц', value: '30', unit: '%' },
  { id: 'min-filtration-coefficient', parameter: 'Минимальный коэффициент фильтрации', value: '1,0', unit: 'м/сут' },
]

const optionalConditionLimitDefinitions: Omit<ConditionLimit, 'value'>[] = [
  { id: 'section-top', parameter: 'Верхняя высота разрезов по умолчанию', unit: 'м' },
  { id: 'filter-top-addition', parameter: 'Добавлять к фильтру при формировании пересечения сверху', unit: 'м' },
  { id: 'filter-bottom-addition', parameter: 'Добавлять к фильтру при формировании пересечения снизу', unit: 'м' },
  { id: 'filter-top-percent', parameter: 'Добавлять процент мощности фильтра при формировании пересечения сверху', unit: '%' },
  { id: 'filter-bottom-percent', parameter: 'Добавлять процент мощности фильтра при формировании пересечения снизу', unit: '%' },
  { id: 'section-bottom', parameter: 'Нижняя высота разрезов по умолчанию', unit: 'м' },
  { id: 'effective-thickness-addition', parameter: 'Добавка к эффективной мощности ниже зоны оруденения в проницаемых породах', unit: 'м' },
  { id: 'gamma-barren', parameter: 'Значение ГК безрудных прослоев', unit: 'мкР/ч' },
  { id: 'resistivity-impermeable', parameter: 'Значение КС непроницаемых прослоев', unit: 'Ом·м' },
  { id: 'rare-earth-core', parameter: 'Керновые пробы для редкоземельных элементов' },
  { id: 'max-ore-thickness', parameter: 'Максимальная мощность рудного пересечения', unit: 'м' },
  { id: 'min-zenith-angle', parameter: 'Мин. зенитный угол инклинометрии', unit: '°' },
  { id: 'min-barren-thickness', parameter: 'Минимальная мощность безрудного прослоя', unit: 'м' },
  { id: 'min-impermeable-thickness', parameter: 'Минимальная мощность непроницаемого прослоя', unit: 'м' },
  { id: 'min-industrial-linear-reserve', parameter: 'Минимально-промышленный линейный запас урана', unit: 'м%' },
  { id: 'min-core-recovery', parameter: 'Минимальный выход керна при опробовании', unit: '%' },
  { id: 'min-linear-reserve', parameter: 'Минимальный линейный запас', unit: 'м%' },
  { id: 'min-balanced-well-content', parameter: 'Минимальный линейный метропроцент балансовой скважины', unit: 'м%' },
  { id: 'min-balanced-intersection-content', parameter: 'Минимальный линейный метропроцент забалансовой пересечения ТЗБ', unit: 'м%' },
  { id: 'min-offbalance-well-content', parameter: 'Минимальный линейный метропроцент забалансовой скважины', unit: 'м%' },
  { id: 'data-start-year', parameter: 'Начальная дата формирования данных', unit: 'год' },
  { id: 'well-files-folder', parameter: 'Папка файлового хранилища данных по скважинам' },
  { id: 'rock-density', parameter: 'Плотность породы', unit: 'кг/м³' },
  { id: 'true-azimuth-correction', parameter: 'Поправка угла для истинного азимута', unit: '°' },
  { id: 'magnetic-azimuth-correction', parameter: 'Поправка угла для магнитного азимута', unit: '°' },
]

export function isRequiredConditionLimit({ id }: Pick<ConditionLimit, 'id'>) {
  return requiredConditionLimitDefaults.some((limit) => limit.id === id)
}

export function groupConditionLimits(limits: ConditionLimit[]) {
  return [
    { title: 'Обязательные', required: true, limits: limits.filter(isRequiredConditionLimit) },
    { title: 'Необязательные', required: false, limits: limits.filter((limit) => !isRequiredConditionLimit(limit)) },
  ]
}

export function buildConditionLimits(values: readonly ConditionLimit[] = [], useDefaults = true) {
  const byId = new Map(values.map((limit) => [limit.id, limit.value]))
  return [
    ...requiredConditionLimitDefaults.map((limit) => ({
      ...limit,
      value: byId.get(limit.id)?.trim() || (useDefaults ? limit.value : ''),
    })),
    ...optionalConditionLimitDefinitions.map((limit) => ({ ...limit, value: byId.get(limit.id) ?? '' })),
  ]
}

export function isValidConditionLimit({ id, value }: ConditionLimit) {
  if (!isRequiredConditionLimit({ id })) return true
  const text = value.trim()
  return /^\d+(?:[,.]\d+)?$/.test(text) && Number.isFinite(Number(text.replace(',', '.')))
    || (id === unrestrictedConditionLimitId && text === unrestrictedConditionLimit)
}

export type ConditionSet = {
  id: string
  depositId: string
  density: number
  balanceThreshold: number
  offBalanceThreshold: number
  azimuthCorrection: number
  geometryTolerance: number
  limits: ConditionLimit[]
}

export type GeologicalMasterData = {
  deposits: Deposit[]
  conditionSets: ConditionSet[]
}
