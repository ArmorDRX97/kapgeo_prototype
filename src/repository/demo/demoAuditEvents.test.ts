import { afterEach, describe, expect, it } from 'vitest'
import { fetchDemoAuditEvents } from '../api'
import { demoDatabase } from './demoDatabase'

describe('demo audit event query', () => {
  afterEach(async () => { await demoDatabase.reset() })

  it('returns IndexedDB audit events in reverse chronological order', async () => {
    await demoDatabase.put('auditEvents', {
      id: 'AUD-OLDER', eventType: 'science.job.created', entityType: 'science_job', entityId: 'JOB-1',
      actor: { id: 'PERSON-DEMO', type: 'user' }, occurredAt: '2026-08-24T10:00:00.000Z', status: 'accepted',
    })
    await demoDatabase.put('auditEvents', {
      id: 'AUD-NEWER', eventType: 'science.job.finished', entityType: 'science_job', entityId: 'JOB-1',
      actor: { id: 'PERSON-DEMO', type: 'user' }, occurredAt: '2026-08-24T11:00:00.000Z', status: 'accepted',
    })

    await expect(fetchDemoAuditEvents()).resolves.toMatchObject([{ id: 'AUD-NEWER' }, { id: 'AUD-OLDER' }])
  })
})