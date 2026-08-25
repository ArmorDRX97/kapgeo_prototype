import {
  appendDedupAware,
  createAuditEvent,
  createEventKey,
  type AuditActor,
  type AuditEvent,
  type AuditEventType,
  type AuditLogStorage,
} from '../../shared/audit'
import type { ScientificJob } from '../../shared/scientific/jobs';

type ScienceJobLifecycleKind =
  | "created"
  | "started"
  | "progress"
  | "retry_scheduled"
  | "cancelled"
  | "finished"
  | "failed";

const EVENT_BY_KIND: Record<ScienceJobLifecycleKind, AuditEventType> = {
  created: "science.job.created",
  started: "science.job.started",
  progress: "science.job.progress",
  retry_scheduled: "science.job.retry_scheduled",
  cancelled: "science.job.cancelled",
  finished: "science.job.finished",
  failed: "science.job.failed",
};

export interface ScienceJobAuditContext {
  actor: AuditActor;
  job: ScientificJob;
  requestId?: string;
  traceId?: string;
  idempotencyKey?: string;
  sessionId?: string;
  route?: string;
}

export interface ScienceJobEventPayload {
  progressPercent?: number;
  progressMessage?: string;
  errorCode?: string;
  errorMessage?: string;
  route?: string;
}

export function emitScienceJobLifecycleEvent(
  storage: AuditLogStorage,
  context: ScienceJobAuditContext,
  kind: ScienceJobLifecycleKind,
  payload?: ScienceJobEventPayload,
): void {
  const event = createAuditEvent(buildOptions(context, kind, payload));
  appendDedupAware(storage, event);
}

export function emitScienceJobProgressEvent(
  storage: AuditLogStorage,
  context: ScienceJobAuditContext,
  payload?: Pick<ScienceJobEventPayload, "progressPercent" | "progressMessage">,
): void {
  const percent = payload?.progressPercent;
  const message = payload?.progressMessage;
  emitScienceJobLifecycleEvent(storage, context, "progress", {
    ...payload,
    progressPercent: percent,
    progressMessage: message,
  });
}

export function emitScienceJobTransition(
  storage: AuditLogStorage,
  context: ScienceJobAuditContext,
  from: string,
  to: string,
): void {
  const transitionKind = toLifecycleKind(from, to, context.job.state);
  if (!transitionKind) return;
  emitScienceJobLifecycleEvent(storage, context, transitionKind);
}

export function dedupeEventKey(event: AuditEvent): string {
  return createEventKey(event.entityType, event.entityId, event.eventType, event.idempotencyKey ?? event.id);
}

function buildOptions(context: ScienceJobAuditContext, kind: ScienceJobLifecycleKind, payload?: ScienceJobEventPayload) {
  const actor: AuditActor = context.actor;
  const eventType = EVENT_BY_KIND[kind];
  const [resultRef] = context.job.resultRefs;
  const hasResultRefs = resultRef != null;
  const hasProgress = payload?.progressPercent != null || payload?.progressMessage != null;

  return {
    actor,
    eventType,
    entityType: "science_job" as const,
    entityId: context.job.id,
    requestId: context.requestId,
    idempotencyKey: context.idempotencyKey,
    traceId: context.traceId,
    sessionId: context.sessionId,
    version: context.job.component.version,
    occurredAt: new Date().toISOString(),
    status: kind === "failed" ? ("failed" as const) : ("accepted" as const),
    errorCode: payload?.errorCode,
    errorMessage: payload?.errorMessage,
    payload: {
      progress: hasProgress
        ? {
            percent: payload?.progressPercent,
            message: payload?.progressMessage,
          }
        : undefined,
      resultRef: hasResultRefs
        ? {
            kind: resultRef.type,
            id: resultRef.id,
            path: resultRef.route,
          }
        : undefined,
      environment: {
        route: payload?.route ?? context.route,
      },
      metadata: {
        stage: context.job.stage,
        component: context.job.component.id,
        state: context.job.state,
        attempt: context.job.attempt,
      },
    },
    policyContext: {
      permission: "science.jobs.execute",
      scope: context.actor.scope,
      readOnly: context.job.state === "succeeded" || context.job.state === "failed",
    },
  };
}

function toLifecycleKind(from: string, to: string, finalState: string): ScienceJobLifecycleKind | null {
  if (to === "queued") return "created";
  if (to === "running" && from === "queued") return "started";
  if (to === "running" && from === "running") return "progress";
  if (to === "post_processing") return "progress";
  if ((to === "succeeded" && (from === "running" || from === "post_processing")) || to === "succeeded") return "finished";
  if ((to === "failed" && (from === "running" || from === "post_processing")) || to === "failed") return "failed";
  if ((to === "cancelled" && from === "running") || to === "cancelled") return "cancelled";
  if (to === finalState && finalState === "succeeded") return "finished";
  return null;
}





