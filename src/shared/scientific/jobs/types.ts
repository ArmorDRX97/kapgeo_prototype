import type { ActorRef } from '../../domain/versioning'

export type ScientificJobType =
  | 'file_import'
  | 'curve_processing'
  | 'trajectory_calculation'
  | 'interpretation'
  | 'rendering'
  | 'reserve_calculation'
  | 'mesh_generation'
  | 'statistical_analysis'
  | 'field_materialization'
  | 'export'

export type ScientificJobState = 'queued' | 'running' | 'post_processing' | 'succeeded' | 'failed' | 'cancelled'
export type ScientificJobProgressMode = 'determinate' | 'stage_only'

export type ScientificJobProgress = {
  completed: number
  total: number
  unit: string
}

export type JobDiagnostic = {
  id: string
  severity: 'info' | 'warning' | 'error'
  code: string
  message: string
  stage: string
  objectRef?: { type: string; id: string }
}

export type ArtifactRef = {
  id: string
  type: 'log_run' | 'dataset' | 'report' | 'image' | 'vector' | 'protocol' | 'other'
  label: string
  route?: string
  checksum?: string
}

export type ScientificJobProblem = {
  code: string
  title: string
  detail: string
  retriable: boolean
}

export type JobHistoryEntry = {
  state: ScientificJobState
  stage: string
  occurredAt: string
  message?: string
}

export type ScientificJob = {
  id: string
  type: ScientificJobType
  label: string
  state: ScientificJobState
  stage: string
  progressMode: ScientificJobProgressMode
  progress?: ScientificJobProgress
  inputSnapshotId: string
  component: { id: string; version: string }
  createdBy: ActorRef
  createdAt: string
  updatedAt: string
  attempt: number
  parentJobId?: string
  resultRefs: ArtifactRef[]
  diagnostics: JobDiagnostic[]
  problem?: ScientificJobProblem
  history: JobHistoryEntry[]
}

export type CreateScientificJobInput = {
  type: ScientificJobType
  label: string
  progressMode: ScientificJobProgressMode
  total?: number
  unit?: string
  inputSnapshotId: string
  component: ScientificJob['component']
  createdBy: ActorRef
}

export type ScientificJobCommand =
  | { type: 'start'; stage: string }
  | { type: 'report_progress'; stage: string; completed?: number; diagnostics?: JobDiagnostic[] }
  | { type: 'begin_post_processing'; stage: string; diagnostics?: JobDiagnostic[] }
  | { type: 'succeed'; stage: string; resultRefs?: ArtifactRef[]; diagnostics?: JobDiagnostic[] }
  | { type: 'fail'; stage: string; problem: ScientificJobProblem; diagnostics?: JobDiagnostic[] }
  | { type: 'cancel'; reason?: string }

export type ScientificJobErrorCode = 'INVALID_DEFINITION' | 'INVALID_TRANSITION' | 'INVALID_PROGRESS' | 'RETRY_NOT_ALLOWED'

export class ScientificJobError extends Error {
  constructor(public readonly code: ScientificJobErrorCode, message: string) {
    super(message)
    this.name = 'ScientificJobError'
  }
}
