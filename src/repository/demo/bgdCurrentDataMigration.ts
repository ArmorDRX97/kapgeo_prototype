import type { DemoTransaction } from './demoDatabase'

const bgdTypes = new Set(['well', 'deposit', 'site', 'lens', 'condition-set', 'well-core-workspace', 'well-deviation-workspace', 'deviation-survey', 'deviation-point', 'well-log-workspace', 'well-geology-workspace', 'well-ore-workspace', 'geological-track', 'dictionary-entry', 'description-override', 'sample', 'lab-result', 'granulometry-run', 'integration-staging', 'log-run', 'log-curve', 'ore-interval', 'differential-ore-interval', 'merged-ore-interval'])

/** Preserve current BGD values while retiring the old record-version mechanism. */
export function currentBgdData<T>(value: T): T {
  if (Array.isArray(value)) return value.map(currentBgdData) as T
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'version' && key !== 'baseVersion' && key !== 'expectedVersion').map(([key, item]) => [key, currentBgdData(item)])) as T
  return value
}

export async function migrateBgdCurrentData(transaction: DemoTransaction) {
  const records = await transaction.getAll<{ id: string; entityType: string; objectId: string; data: unknown }>('records')
  const bgdRecords = records.filter((record) => bgdTypes.has(record.entityType))
  const objectIds = new Set(bgdRecords.flatMap((record) => [record.id, record.objectId]))
  for (const record of bgdRecords) {
    const data = currentBgdData(record.data)
    if (JSON.stringify(data) !== JSON.stringify(record.data)) await transaction.put('records', { ...record, data })
  }
  const snapshots = await transaction.getAll<{ id: string; objectId: string }>('versions')
  for (const snapshot of snapshots) {
    if (objectIds.has(snapshot.objectId) || /^(?:VERSION:(?:well|deposit|site|lens|condition-set):|WELL-(?:CORE|DEVIATION|GEOLOGY|ORE)-|LOG-WORKSPACE-)/.test(snapshot.id)) await transaction.delete('versions', snapshot.id)
  }
  for (const preference of await transaction.getAll<{ id: string }>('preferences')) {
    if (preference.id.startsWith('LAYOUT-')) await transaction.put('preferences', currentBgdData(preference))
  }
  for (const event of await transaction.getAll<{ id: string; eventType: string; entityType: string }>('auditEvents')) {
    if (bgdTypes.has(event.entityType) || /^(?:well\.|deposit\.|site\.|core\.|log\.|deviation\.|geology\.)/.test(event.eventType)) await transaction.put('auditEvents', currentBgdData(event))
  }
}
