export type DomainVersionStatus = 'draft' | 'in_review' | 'approved' | 'published' | 'superseded' | 'withdrawn'

export type ActorRef = {
  id: string
  name: string
}

export type QualitySummary = {
  state: 'valid' | 'warning' | 'invalid'
  issueCount: number
}

export type DependencyRef = {
  id: string
  upstreamObjectId: string
  upstreamVersionId: string
  downstreamObjectId: string
  downstreamVersionId: string
  downstreamType: 'section' | 'model' | 'column'
  label: string
  route: string
  triggerFields: string[]
}

export type DomainVersion<T> = {
  id: string
  objectId: string
  version: number
  status: DomainVersionStatus
  basedOnVersionId?: string
  effectiveFrom?: string
  createdAt: string
  createdBy: ActorRef
  reason?: string
  data: T
  quality: QualitySummary
  dependencies: DependencyRef[]
  contentHash: string
}

export type StalenessRecord = {
  id: string
  upstreamVersionId: string
  replacedVersionId: string
  downstreamObjectId: string
  downstreamVersionId: string
  downstreamType: DependencyRef['downstreamType']
  label: string
  route: string
  reason: string
  createdAt: string
  state: 'open' | 'acknowledged' | 'resolved'
}

export type AuditEvent = {
  id: string
  objectId: string
  action: string
  actor: ActorRef
  occurredAt: string
  requestId: string
  beforeHash?: string
  afterHash?: string
  reason?: string
}

function normalizeForHash(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizeForHash)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, normalizeForHash(item)]),
    )
  }
  return value
}

export function scientificContentHash(value: unknown): string {
  const serialized = JSON.stringify(normalizeForHash(value))
  let hash = 0x811c9dc5
  for (let index = 0; index < serialized.length; index += 1) {
    hash ^= serialized.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, '0')}`
}

export function cloneDomainVersion<T>(version: DomainVersion<T>): DomainVersion<T> {
  return structuredClone(version)
}
