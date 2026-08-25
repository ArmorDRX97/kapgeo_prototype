import type { DomainVersionStatus } from '../../../shared/domain/versioning'

export type WellMasterAggregateKind = 'description' | 'documentation' | 'drilling' | 'completion' | 'geology'

export type WellDescriptionData = { shortName: string; purposeNote: string; contractor: string }
export type WellDocumentationData = { projectNumber: string; permitNumber: string; sourceReference: string }
export type WellDrillingFactsData = { startedAt: string; completedAt: string; method: string; fluid: string }
export type WellCompletionData = { state: string; pumpingRate: number; commissionedAt: string }
export type WellGeologyFactsData = { groundwater: string; permafrost: string; complications: string }

export type WellMasterAggregateData = WellDescriptionData | WellDocumentationData | WellDrillingFactsData | WellCompletionData | WellGeologyFactsData

export type WellMasterAggregate<T extends WellMasterAggregateData = WellMasterAggregateData> = {
  id: string
  kind: WellMasterAggregateKind
  wellId: string
  version: number
  status: DomainVersionStatus
  updatedAt: string
  data: T
}

export type WellAssignment = { depositId: string; siteId: string; lensId: string; projectCode: string }
export type WellWorkflowStatus = 'draft' | 'in_review' | 'changes_requested' | 'approved' | 'published' | 'archived'

export type WellMasterWorkspace = {
  wellId: string
  assignment: WellAssignment
  aggregates: Record<WellMasterAggregateKind, WellMasterAggregate>
  workflow: { status: WellWorkflowStatus; version: number; updatedAt: string; reason?: string }
}
