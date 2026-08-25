export type MasterStatus = 'active' | 'archived'

export type Deposit = {
  id: string
  code: string
  name: string
  description: string
  crs: string
  status: MasterStatus
  version: number
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
