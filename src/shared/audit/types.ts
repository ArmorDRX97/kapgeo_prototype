export type AuditStatus = "accepted" | "rejected" | "failed";

export type AuditEntityType =
  | "passport"
  | "well"
  | "version"
  | "science_job"
  | "interpretation"
  | "calculation"
  | "export"
  | "policy"
  | "other";

export type AuditEventType =
  | "passport.import.requested"
  | "passport.import.imported"
  | "passport.import.failed"
  | "version.created"
  | "version.submitted"
  | "version.returned"
  | "version.approved"
  | "version.rejected"
  | "version.published"
  | "science.job.created"
  | "science.job.started"
  | "science.job.progress"
  | "science.job.retry_scheduled"
  | "science.job.cancelled"
  | "science.job.finished"
  | "science.job.failed"
  | "calculation.requested"
  | "calculation.started"
  | "calculation.completed"
  | "calculation.failed"
  | "interpretation.saved"
  | "interpretation.approved"
  | "interpretation.reverted"
  | "export.requested"
  | "export.completed"
  | "export.failed"
  | "policy.blocked.action"
  | "policy.denied.by_scope"
  | "policy.denied.by_status"
  | string;

export interface AuditActor {
  id: string;
  type: "user" | "service" | "system";
  scope?: string;
  name?: string;
}

export interface AuditPolicyContext {
  objectStatus?: string;
  readOnly?: boolean;
  permission?: string;
  scope?: string;
}

export interface AuditResultRef {
  kind: string;
  id: string;
  path?: string;
}

export interface AuditInputSnapshot {
  hash: string;
  payload?: Record<string, unknown>;
}

export interface AuditEventPayload {
  inputDigest?: string;
  inputSnapshot?: AuditInputSnapshot;
  inputDiff?: Record<string, { before?: unknown; after?: unknown }>;
  resultRef?: AuditResultRef;
  progress?: {
    percent?: number;
    message?: string;
  };
  environment?: {
    appVersion?: string;
    featureFlags?: string[];
    route?: string;
  };
  metadata?: Record<string, unknown>;
}

export interface AuditEvent {
  id: string;
  eventType: AuditEventType;
  entityType: AuditEntityType;
  entityId: string;
  actor: AuditActor;
  requestId?: string;
  idempotencyKey?: string;
  traceId?: string;
  sessionId?: string;
  occurredAt: string;
  status: AuditStatus;
  payload?: AuditEventPayload;
  policyContext?: AuditPolicyContext;
  version?: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface AuditEventWriteOptions {
  actor: AuditActor;
  eventType: AuditEventType;
  entityType: AuditEntityType;
  entityId: string;
  status?: AuditStatus;
  payload?: AuditEventPayload;
  requestId?: string;
  idempotencyKey?: string;
  traceId?: string;
  sessionId?: string;
  policyContext?: AuditPolicyContext;
  version?: string;
  errorCode?: string;
  errorMessage?: string;
  occurredAt?: string;
}

export interface AuditFilter {
  eventTypes?: AuditEventType[];
  entityTypes?: AuditEntityType[];
  entityIds?: string[];
  actorIds?: string[];
  status?: AuditStatus[];
  from?: string;
  to?: string;
  requestId?: string;
  idempotencyKey?: string;
}

export interface AuditLogStorage {
  append(event: AuditEvent): void;
  query(filter?: AuditFilter): readonly AuditEvent[];
  getById(id: string): AuditEvent | undefined;
  count(filter?: AuditFilter): number;
}

export type AuditAppendResult =
  | { kind: "ok"; event: AuditEvent }
  | { kind: "duplicate" };
