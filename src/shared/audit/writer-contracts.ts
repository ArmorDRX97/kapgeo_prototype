import { hashInput, stableEventId, toOccurrenceDate } from "./utils";
import type { AuditEvent, AuditEventWriteOptions, AuditPolicyContext } from "./types";

export function createEventKey(
  entityType: string,
  entityId: string,
  eventType: string,
  key?: string,
): string {
  const identity = key?.trim() ?? "";
  return `${entityType}::${entityId}::${eventType}::${identity}`;
}

export function createAuditEvent(
  options: AuditEventWriteOptions,
  environment?: {
    appVersion?: string;
    route?: string;
    featureFlags?: string[];
  },
): AuditEvent {
  const inputDigest = options.payload?.inputDigest ?? computeInputDigest(options);
  const eventId = options.idempotencyKey
    ? stableEventId(options.idempotencyKey)
    : stableEventId(`${options.eventType}:${options.entityType}:${options.entityId}`);

  return {
    id: eventId,
    eventType: options.eventType,
    entityType: options.entityType,
    entityId: options.entityId,
    actor: options.actor,
    requestId: options.requestId,
    idempotencyKey: options.idempotencyKey,
    traceId: options.traceId,
    sessionId: options.sessionId,
    occurredAt: toOccurrenceDate(options.occurredAt),
    status: options.status ?? "accepted",
    payload: {
      ...options.payload,
      ...(inputDigest ? { inputDigest } : {}),
      environment: {
        ...(options.payload?.environment ?? {}),
        ...(environment ?? {}),
      },
      metadata: {
        ...(options.payload?.metadata || {}),
        ...buildPolicyMeta(options.payload?.metadata, options.policyContext),
        actorScope: options.actor.scope,
        requestId: options.requestId,
      },
    },
    policyContext: attachPolicyContext(options.policyContext),
    version: options.version ?? "1.0.0",
    errorCode: options.errorCode,
    errorMessage: options.errorMessage,
  };
}

function computeInputDigest(options: AuditEventWriteOptions): string | undefined {
  const snapshot = options.payload?.inputSnapshot;
  if (!snapshot) {
    return undefined;
  }
  const raw = snapshot.payload ?? { hash: snapshot.hash };
  return options.payload?.inputDigest ?? hashInput(raw);
}

function attachPolicyContext(policyContext?: AuditPolicyContext) {
  if (!policyContext) {
    return undefined;
  }

  return {
    objectStatus: policyContext.objectStatus,
    readOnly: policyContext.readOnly,
    permission: policyContext.permission,
    scope: policyContext.scope,
  };
}

function buildPolicyMeta(
  existingMetadata?: Record<string, unknown>,
  policyContext?: AuditPolicyContext,
): Record<string, unknown> {
  if (!policyContext) {
    return existingMetadata ? { ...existingMetadata } : {};
  }

  return {
    ...(existingMetadata || {}),
    policy: {
      objectStatus: policyContext.objectStatus,
      readOnly: policyContext.readOnly,
      permission: policyContext.permission,
      scope: policyContext.scope,
    },
  };
}
