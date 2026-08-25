export type MasterStatus = 'active' | 'archived'

export type DepositObjectType = 'field' | 'area' | 'custom'

export type DepositOccurrence = {
  id: string
  type: string
  name: string
}

export type Deposit = {
  id: string
  numericId: number
  code: string
  objectType: DepositObjectType
  customType?: string
  name: string
  description: string
  crs: string
  coordinateSystemDescription: string
  isHidden: boolean
  occurrences: DepositOccurrence[]
  status: MasterStatus
  version: number
  createdAt: string
  updatedAt: string
}

export type CreateDepositInput = Pick<Deposit, 'code' | 'name' | 'description' | 'crs'> & Partial<Pick<Deposit, 'numericId' | 'objectType' | 'customType' | 'coordinateSystemDescription' | 'isHidden' | 'occurrences'>>

export type UpdateDepositPatch = Pick<Deposit, 'name' | 'objectType' | 'customType' | 'description' | 'crs' | 'coordinateSystemDescription' | 'isHidden' | 'occurrences'>

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
