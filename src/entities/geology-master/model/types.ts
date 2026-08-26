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
  status: 'draft' | 'in_review' | 'approved' | 'published'
  version: number
}

export type GeologicalMasterData = {
  deposits: Deposit[]
  sites: GeologicalSite[]
  lenses: GeologicalLens[]
  conditionSets: ConditionSet[]
}
