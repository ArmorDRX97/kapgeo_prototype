export type MasterStatus = 'active' | 'archived'

export type DepositObjectType = 'field' | 'area' | 'custom'

export type BgdLocale = 'ru' | 'kk' | 'en'

export type DepositOccurrence = {
  id: string
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
  version: number
  createdAt: string
  createdBy: string
  updatedAt: string
  updatedBy: string
}

export type CreateDepositInput = Pick<Deposit, 'code' | 'nameRu' | 'nameKk' | 'nameEn'> & Partial<Pick<Deposit, 'objectType' | 'customType' | 'descriptionRu' | 'descriptionKk' | 'descriptionEn' | 'coordinateSystem' | 'isHidden' | 'occurrences'>>

export type UpdateDepositPatch = Pick<Deposit, 'nameRu' | 'nameKk' | 'nameEn' | 'objectType' | 'customType' | 'descriptionRu' | 'descriptionKk' | 'descriptionEn' | 'coordinateSystem' | 'isHidden' | 'occurrences'>

export function getDepositName(deposit: Pick<Deposit, 'nameRu' | 'nameKk' | 'nameEn'>, locale: BgdLocale = 'ru'): string {
  return deposit[locale === 'kk' ? 'nameKk' : locale === 'en' ? 'nameEn' : 'nameRu'] || deposit.nameRu || deposit.nameKk || deposit.nameEn
}

export function getDepositDescription(deposit: Pick<Deposit, 'descriptionRu' | 'descriptionKk' | 'descriptionEn'>, locale: BgdLocale = 'ru'): string {
  return deposit[locale === 'kk' ? 'descriptionKk' : locale === 'en' ? 'descriptionEn' : 'descriptionRu'] || deposit.descriptionRu || deposit.descriptionKk || deposit.descriptionEn
}

export function getOccurrenceName(occurrence: Pick<DepositOccurrence, 'nameRu' | 'nameKk' | 'nameEn'>, locale: BgdLocale = 'ru'): string {
  return occurrence[locale === 'kk' ? 'nameKk' : locale === 'en' ? 'nameEn' : 'nameRu'] || occurrence.nameRu || occurrence.nameKk || occurrence.nameEn
}

export type GeologicalSite = {
  id: string
  depositId: string
  code: string
  name: string
  status: MasterStatus
  version: number
}

export type GeologicalLens = {
  id: string
  siteId: string
  code: string
  name: string
  status: MasterStatus
  version: number
}

export type ConditionLimit = {
  id: string
  parameter: string
  value: string
  unit?: string
}

type ConditionLimitDefinition = {
  id: string
  parameter: string
  unit?: string
}

export const conditionLimitDefinitions: ConditionLimitDefinition[] = [
  { id: 'section-top', parameter: 'Верхняя высота разрезов по умолчанию', unit: 'м' },
  { id: 'filter-top-addition', parameter: 'Добавлять к фильтру при формировании пересечения сверху', unit: 'м' },
  { id: 'filter-bottom-addition', parameter: 'Добавлять к фильтру при формировании пересечения снизу', unit: 'м' },
  { id: 'filter-top-percent', parameter: 'Добавлять процент мощности фильтра при формировании пересечения сверху', unit: '%' },
  { id: 'filter-bottom-percent', parameter: 'Добавлять процент мощности фильтра при формировании пересечения снизу', unit: '%' },
  { id: 'section-bottom', parameter: 'Нижняя высота разрезов по умолчанию', unit: 'м' },
  { id: 'uranium-cutoff', parameter: 'Бортовое содержание урана', unit: 'м%' },
  { id: 'permafrost-boundary', parameter: 'Граница вечной мерзлоты' },
  { id: 'effective-thickness-addition', parameter: 'Добавка к эффективной мощности ниже зоны оруденения в проницаемых породах', unit: 'м' },
  { id: 'gamma-barren', parameter: 'Значение ГК безрудных прослоев', unit: 'мкР/ч' },
  { id: 'resistivity-impermeable', parameter: 'Значение КС непроницаемых прослоев', unit: 'Ом·м' },
  { id: 'rare-earth-core', parameter: 'Керновые пробы для редкоземельных элементов' },
  { id: 'max-waste-thickness', parameter: 'Максимальная мощность пустых пород и некондиционных руд, включаемых в рудное пересечение', unit: 'м' },
  { id: 'max-ore-thickness', parameter: 'Максимальная мощность рудного пересечения', unit: 'м' },
  { id: 'min-zenith-angle', parameter: 'Мин. зенитный угол инклинометрии', unit: '°' },
  { id: 'min-barren-thickness', parameter: 'Минимальная мощность безрудного прослоя', unit: 'м' },
  { id: 'min-impermeable-thickness', parameter: 'Минимальная мощность непроницаемого прослоя', unit: 'м' },
  { id: 'min-industrial-linear-reserve', parameter: 'Минимально-промышленный линейный запас урана', unit: 'м%' },
  { id: 'min-core-recovery', parameter: 'Минимальный выход керна при опробовании', unit: '%' },
  { id: 'min-area-ore-factor', parameter: 'Минимальный коэффициент площадной рудоносности' },
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

export function buildConditionLimits(initial = '', values: Partial<Record<string, string>> = {}) {
  return conditionLimitDefinitions.map(({ id, parameter, unit }) => ({
    id,
    parameter,
    value: values[id] ?? initial,
    unit,
  }))
}

export type ConditionSet = {
  id: string
  siteId: string
  code: string
  effectiveFrom: string
  density: number
  balanceThreshold: number
  offBalanceThreshold: number
  azimuthCorrection: number
  geometryTolerance: number
  limits?: ConditionLimit[]
  status: 'draft' | 'in_review' | 'approved' | 'published'
  version: number
}

export type GeologicalMasterData = {
  deposits: Deposit[]
  sites: GeologicalSite[]
  lenses: GeologicalLens[]
  conditionSets: ConditionSet[]
}
