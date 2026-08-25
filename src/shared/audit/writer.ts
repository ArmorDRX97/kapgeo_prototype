import {
  createAuditEvent,
  createEventKey,
} from "./writer-contracts";
import type {
  AuditEvent,
  AuditEventWriteOptions,
  AuditFilter,
  AuditLogStorage,
  AuditAppendResult,
} from "./types";

export function createInMemoryAuditLog(opts?: { initialEvents?: AuditEvent[] }): AuditLogStorage {
  const events = [...(opts?.initialEvents ?? [])].sort(compareByTime);
  const dedupeIndex = new Set<string>(events.map((event) =>
    createEventKey(event.entityType, event.entityId, event.eventType, event.idempotencyKey ?? event.id),
  ));

  return {
    append(event: AuditEvent) {
      const key = createEventKey(event.entityType, event.entityId, event.eventType, event.idempotencyKey ?? event.id);
      if (dedupeIndex.has(key)) return;
      dedupeIndex.add(key);
      events.push(event);
      events.sort(compareByTime);
    },
    query(filter?: AuditFilter) {
      return events.filter((event) => isMatch(event, filter));
    },
    getById(id: string) {
      return events.find((event) => event.id === id);
    },
    count(filter?: AuditFilter) {
      return this.query(filter).length;
    },
  };

  function isMatch(event: AuditEvent, filter?: AuditFilter): boolean {
    if (!filter) return true;
    if (filter.eventTypes?.length && !filter.eventTypes.includes(event.eventType)) return false;
    if (filter.entityTypes?.length && !filter.entityTypes.includes(event.entityType)) return false;
    if (filter.entityIds?.length && !filter.entityIds.includes(event.entityId)) return false;
    if (filter.actorIds?.length && !filter.actorIds.includes(event.actor.id)) return false;
    if (filter.status?.length && !filter.status.includes(event.status)) return false;
    if (filter.requestId && event.requestId !== filter.requestId) return false;
    if (filter.idempotencyKey && event.idempotencyKey !== filter.idempotencyKey) return false;
    if (filter.from && event.occurredAt < filter.from) return false;
    if (filter.to && event.occurredAt > filter.to) return false;
    return true;
  }

  function compareByTime(a: AuditEvent, b: AuditEvent): number {
    return a.occurredAt.localeCompare(b.occurredAt);
  }
}

export function appendDedupAware(storage: AuditLogStorage, event: AuditEvent): AuditAppendResult {
  const key = createEventKey(event.entityType, event.entityId, event.eventType, event.idempotencyKey ?? event.id);
  const hasExisting = storage.query().some(
    (item) => createEventKey(item.entityType, item.entityId, item.eventType, item.idempotencyKey ?? item.id) === key,
  );
  if (hasExisting) return { kind: "duplicate" };

  storage.append(event);
  return { kind: "ok", event };
}

export function createAuditEventFromOptions(event: AuditEventWriteOptions, route?: string): AuditEvent {
  return createAuditEvent(event, {
    route,
    appVersion: "0.0.0-audit",
    featureFlags: [],
  });
}
