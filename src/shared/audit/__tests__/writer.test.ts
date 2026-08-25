import { describe, expect, test } from 'vitest'
import {
  appendDedupAware,
  createInMemoryAuditLog,
} from "../writer";
import { createAuditEvent } from "../writer-contracts";

describe("audit in-memory storage", () => {
  const actor: Parameters<typeof createAuditEvent>[0]["actor"] = { id: "u-1", type: "user", scope: "project:A" };

  test("dedupes by idempotency key", () => {
    const storage = createInMemoryAuditLog();
    const e = createAuditEvent({
      actor,
      eventType: "science.job.created",
      entityType: "science_job",
      entityId: "job-1",
      idempotencyKey: "idem-1",
      occurredAt: "2026-08-21T10:00:00.000Z",
      payload: { metadata: { scope: "science" } },
    });

    const r1 = appendDedupAware(storage, e);
    const r2 = appendDedupAware(storage, e);

    expect(r1.kind).toBe("ok");
    expect(r2.kind).toBe("duplicate");
    expect(storage.count()).toBe(1);
  });

  test("sorts by occurredAt", () => {
    const storage = createInMemoryAuditLog();
    const a = createAuditEvent({
      actor,
      eventType: "science.job.started",
      entityType: "science_job",
      entityId: "job-1",
      occurredAt: "2026-08-21T11:00:00.000Z",
      payload: { metadata: { step: "start" } },
    });
    const b = createAuditEvent({
      actor,
      eventType: "science.job.created",
      entityType: "science_job",
      entityId: "job-1",
      occurredAt: "2026-08-21T10:00:00.000Z",
      payload: { metadata: { step: "create" } },
    });

    storage.append(a);
    storage.append(b);
    const list = storage.query();
    expect(list[0]!.eventType).toBe("science.job.created");
    expect(list[1]!.eventType).toBe("science.job.started");
  });
});


