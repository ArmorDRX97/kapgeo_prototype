import type { AuditLogStorage } from '../../shared/audit';
import type { ScientificJob, ScientificJobState } from '../../shared/scientific/jobs';
import {
  emitScienceJobLifecycleEvent,
  type ScienceJobAuditContext,
  type ScienceJobEventPayload,
} from "./auditScienceJobEvents";

const KNOWN_STATES = new Set<ScientificJobState>([
  "queued",
  "running",
  "post_processing",
  "succeeded",
  "failed",
  "cancelled",
]);

function toLifecycleKind(before: ScientificJobState | undefined, after: ScientificJobState): "created" | "started" | "progress" | "retry_scheduled" | "cancelled" | "finished" | "failed" | null {
  if (before == null && after === "queued") return "created";
  if (before === "queued" && after === "running") return "started";
  if (before === "running" && after === "running") return "progress";
  if (before === "running" && after === "post_processing") return "progress";
  if (before === "post_processing" && after === "post_processing") return "progress";
  if (before === "post_processing" && after === "succeeded") return "finished";
  if (before === "running" && after === "succeeded") return "finished";
  if (before !== undefined && (before === "running" || before === "post_processing") && after === "failed") return "failed";
  if (before !== undefined && after === "cancelled") return "cancelled";
  if (before !== undefined && before === after && after === "queued") return "created";
  if (after === "failed" && before !== undefined) return "failed";
  return null;
}

export function emitJobLifecycleAudit({
  storage,
  context,
  before,
  after,
  payload,
}: {
  storage: AuditLogStorage;
  context: ScienceJobAuditContext;
  before: ScientificJob | undefined;
  after: ScientificJob;
  payload?: ScienceJobEventPayload;
}): void {
  const beforeState = before?.state;
  const afterState = after.state;
  const isTransitionKnown = KNOWN_STATES.has(afterState);

  if (!isTransitionKnown) return;

  const kind = toLifecycleKind(beforeState, afterState);
  if (kind === null) return;

  if (kind === "progress" && payload?.progressPercent != null) {
    emitScienceJobLifecycleEvent(storage, { ...context, job: after }, kind, {
      ...payload,
      progressPercent: payload.progressPercent,
      progressMessage: payload.progressMessage,
    });
    return;
  }

  if (kind === "failed" && payload?.errorCode != null) {
    emitScienceJobLifecycleEvent(storage, { ...context, job: after }, kind, {
      ...payload,
      progressMessage: payload.progressMessage,
    });
    return;
  }

  emitScienceJobLifecycleEvent(storage, { ...context, job: after }, kind, payload);
}

export function emitJobRetryScheduledAudit(storage: AuditLogStorage, context: ScienceJobAuditContext): void {
  emitScienceJobLifecycleEvent(storage, context, "retry_scheduled");
}

