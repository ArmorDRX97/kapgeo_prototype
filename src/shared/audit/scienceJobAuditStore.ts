import { createInMemoryAuditLog } from "./writer";

const scienceJobAuditLog = createInMemoryAuditLog();

export function getScienceJobAuditLog() {
  return scienceJobAuditLog;
}
