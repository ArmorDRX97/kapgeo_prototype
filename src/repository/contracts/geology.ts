import type { WellConstructionData, WellConstructionVersion } from '../../entities/well-construction/model/types'
import type { WellPassportData, WellPassportVersion } from '../../entities/well-passport/model/types'
import type { Well } from '../../entities/well/model/types'
import type { AuditEvent, DependencyRef, StalenessRecord } from '../../shared/domain/versioning'

export type DependencyImpact = {
  dependency: DependencyRef
  changedFields: string[]
  severity: 'warning'
  consequence: string
}

export type WellPassportWorkspace = {
  passport: WellPassportVersion
  construction: WellConstructionVersion
  dependencies: DependencyRef[]
  staleness: StalenessRecord[]
}

export type SaveWellPassportCommand = {
  wellId: string
  passport: WellPassportData
  construction: WellConstructionData
  expectedPassportVersion: number
  expectedConstructionVersion: number
  idempotencyKey: string
  reason?: string
}

export type SaveWellPassportResult = {
  well: Well
  workspace: WellPassportWorkspace
  impact: DependencyImpact[]
  auditEvents: AuditEvent[]
  requestId: string
}

export type VersionHistory = {
  passport: WellPassportVersion[]
  construction: WellConstructionVersion[]
}

export type GeologyProblemCode = 'VERSION_CONFLICT' | 'VALIDATION_ERROR' | 'NO_CHANGES' | 'NOT_FOUND'

export class GeologyRepositoryError extends Error {
  constructor(
    public readonly code: GeologyProblemCode,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message)
    this.name = 'GeologyRepositoryError'
  }
}

export interface WellPassportRepository {
  getWorkspace(wellId: string): Promise<WellPassportWorkspace>
  previewImpact(wellId: string, passport: WellPassportData, construction: WellConstructionData): Promise<DependencyImpact[]>
  save(command: SaveWellPassportCommand): Promise<SaveWellPassportResult>
  getHistory(wellId: string): Promise<VersionHistory>
}
