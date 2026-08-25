import type {
  ConsumerHandoff,
  GeologyPublicationWorkspace,
  PublicationConsumer,
} from '../../entities/geology-publication/model/types'
import { demoDatabase, type DemoRecord } from './demoDatabase'

const seededAt = '2026-08-24T00:00:00.000Z'
const actor = { id: 'PERSON-R12-APPROVER', type: 'user', name: 'Данияр Ибраев · synthetic' }

function seed(): GeologyPublicationWorkspace {
  return {
    id: 'GEO-PKG-2026-08',
    title: 'Северный · геологическая выдача',
    scope: [
      { id: 'WELL-1042-V13', entityType: 'well', label: 'WELL-1042 · паспорт', version: '13' },
      { id: 'SECTION-A-A-V4', entityType: 'section', label: 'Разрез A–A′', version: '4' },
      { id: 'RESERVE-PR-07-V6', entityType: 'reserve', label: 'Запасы C1 · RESERVE-PR-07', version: '6' },
      { id: 'FIELD-2D-ACCEPTED-V3', entityType: 'model-2d', label: 'Accepted 2D field', version: '3' },
      { id: 'DGM-PR-07-V2', entityType: 'dgm', label: 'DGM Северный', version: '2' },
    ],
    selectedVersionIds: ['WELL-1042-V13', 'SECTION-A-A-V4', 'RESERVE-PR-07-V6', 'FIELD-2D-ACCEPTED-V3', 'DGM-PR-07-V2'],
    consumers: ['technology', 'modeling', 'analytics'],
    limitations: ['Только synthetic-данные', 'Browser-only IndexedDB', 'Не является юридически значимой публикацией'],
    approval: { status: 'draft', reason: '' },
    publication: { status: 'draft' },
    handoffs: [],
    notifications: [],
    exports: [],
    terminology: [
      { id: 'package', labels: { ru: 'Геологическая выдача', kk: 'Геологиялық беру', en: 'Geology package' } },
      { id: 'approved', labels: { ru: 'Утверждено', kk: 'Бекітілді', en: 'Approved' } },
      { id: 'limitation', labels: { ru: 'Ограничение', kk: null, en: 'Limitation' } },
    ],
    performance: { profile: 'small', rows: 250, lod: 'LOD 0', virtualization: false, loadingState: 'idle', demoBudgetMs: 120 },
    policies: [
      { id: 'file-type', label: 'Тип файла .exe', outcome: 'idle', detail: 'Разрешены только synthetic JSON/PDF/DXF.' },
      { id: 'file-size', label: 'Размер 80 МБ', outcome: 'idle', detail: 'Demo-лимит файла — 25 МБ.' },
      { id: 'expression', label: 'Выражение grade * thickness', outcome: 'idle', detail: 'Вычисляется только mock sandbox без eval.' },
      { id: 'sensitive-export', label: 'Чувствительная выдача', outcome: 'idle', detail: 'Требуется geology.well-master.publish.' },
    ],
    browserQa: [
      { width: 390, status: 'pending', note: 'Mobile read-only' },
      { width: 1024, status: 'pending', note: 'Tablet/workbench' },
      { width: 1440, status: 'pending', note: 'Desktop' },
    ],
    regression: {
      id: 'REG-GEO-E12', status: 'not-run',
      steps: [
        { id: 'well', label: 'WELL-1042 exact version', status: 'pending' },
        { id: 'section', label: 'Разрез A–A′', status: 'pending' },
        { id: 'reserve', label: 'ReserveProject', status: 'pending' },
        { id: 'model', label: '2D/DGM accepted model', status: 'pending' },
        { id: 'publication', label: 'Publication + consumer links', status: 'pending' },
        { id: 'reload', label: 'IndexedDB reload persistence', status: 'pending' },
        { id: 'reset', label: 'Global reset restores seed', status: 'pending' },
      ],
    },
    helpVersion: 'HELP-GEO-E12-v1',
    version: 1,
    updatedAt: seededAt,
  }
}

function record<T>(id: string, entityType: string, data: T, status: string, updatedAt: string): DemoRecord<T> {
  return { id, entityType, objectId: 'GEO-PKG-2026-08', scopeId: 'Северный', status, updatedAt, data: structuredClone(data) }
}

export class DemoGeologyPublicationRepository {
  async get(): Promise<GeologyPublicationWorkspace> {
    const stored = await demoDatabase.get<DemoRecord<GeologyPublicationWorkspace>>('records', 'geology-publication:GEO-PKG-2026-08')
    if (stored) return structuredClone(stored.data)
    const value = seed()
    await this.persist(value, 'publication.seeded')
    return value
  }

  async save(current: GeologyPublicationWorkspace, proposed: GeologyPublicationWorkspace, eventType: string): Promise<GeologyPublicationWorkspace> {
    const latest = await this.get()
    if (latest.version !== current.version) throw new Error('VERSION_CONFLICT: пакет изменён в другой вкладке.')
    const timestamp = new Date().toISOString()
    const next = { ...structuredClone(proposed), version: latest.version + 1, updatedAt: timestamp }
    await this.persist(next, eventType)
    return next
  }

  async listHandoffs(consumer: PublicationConsumer): Promise<ConsumerHandoff[]> {
    const records = await demoDatabase.getAll<DemoRecord<ConsumerHandoff>>('records')
    return records.filter((item) => item.entityType === 'geology-handoff' && item.data.consumer === consumer).map((item) => structuredClone(item.data))
  }

  async clearUserArtifacts(current: GeologyPublicationWorkspace): Promise<GeologyPublicationWorkspace> {
    const latest = await this.get()
    if (latest.version !== current.version) throw new Error('VERSION_CONFLICT: обновите историю экспортов.')
    const removable = latest.exports.filter((item) => item.userCreated)
    const next = { ...latest, exports: latest.exports.filter((item) => !item.userCreated), version: latest.version + 1, updatedAt: new Date().toISOString() }
    await demoDatabase.transaction(['records', 'versions', 'artifacts', 'auditEvents'], async (transaction) => {
      for (const item of removable) await transaction.delete('artifacts', item.artifactId)
      await transaction.put('records', record('geology-publication:GEO-PKG-2026-08', 'geology-publication', next, next.publication.status, next.updatedAt))
      await transaction.put('versions', { id: `GEO-PKG-2026-08-V${next.version}`, objectId: next.id, version: next.version, status: next.publication.status, createdAt: next.updatedAt, data: next })
      await transaction.put('auditEvents', { id: `AUD-publication.exports.cleared-V${next.version}`, eventType: 'publication.exports.cleared', entityType: 'geology-publication', entityId: next.id, actor, occurredAt: next.updatedAt, status: 'accepted', payload: { removed: removable.map((item) => item.id), synthetic: true } })
    })
    return structuredClone(next)
  }

  private async persist(value: GeologyPublicationWorkspace, eventType: string): Promise<void> {
    await demoDatabase.transaction(['records', 'versions', 'relations', 'auditEvents', 'artifacts'], async (transaction) => {
      await transaction.put('records', record('geology-publication:GEO-PKG-2026-08', 'geology-publication', value, value.publication.status, value.updatedAt))
      await transaction.put('records', record('approval:GEO-PKG-2026-08', 'approval-decision', value.approval, value.approval.status, value.updatedAt))
      await transaction.put('records', record('publication-state:GEO-PKG-2026-08', 'publication-state', value.publication, value.publication.status, value.updatedAt))
      await transaction.put('records', record('export-history:GEO-PKG-2026-08', 'export-history', value.exports, 'active', value.updatedAt))
      await transaction.put('records', record('terminology:GEO-E12', 'terminology', value.terminology, 'active', value.updatedAt))
      await transaction.put('records', record('performance:GEO-E12', 'performance-result', value.performance, value.performance.loadingState, value.updatedAt))
      await transaction.put('records', record('browser-qa:GEO-E12', 'qa-run', value.browserQa, 'active', value.updatedAt))
      await transaction.put('records', record('regression:GEO-E12', 'regression-run', value.regression, value.regression.status, value.updatedAt))
      await transaction.put('records', record('help-version:GEO-E12', 'help-version', { version: value.helpVersion }, 'published', value.updatedAt))
      for (const policy of value.policies) await transaction.put('records', record(`policy:${policy.id}`, policy.outcome === 'denied' ? 'policy-denial' : 'policy-scenario', policy, policy.outcome, value.updatedAt))
      for (const handoff of value.handoffs) await transaction.put('records', record(`handoff:${handoff.id}`, 'geology-handoff', handoff, handoff.status, handoff.createdAt))
      for (const notification of value.notifications) await transaction.put('records', record(`notification:${notification.id}`, 'publication-notification', notification, 'unread', notification.createdAt))
      for (const reference of value.scope) await transaction.put('relations', { id: `REL-GEO-PKG-${reference.id}`, fromId: value.id, toId: reference.id, type: 'package-exact-version', updatedAt: value.updatedAt })
      for (const handoff of value.handoffs) await transaction.put('relations', { id: `REL-${handoff.id}`, fromId: value.id, toId: handoff.consumer, type: 'consumer-handoff', updatedAt: handoff.createdAt })
      for (const item of value.exports) await transaction.put('artifacts', { id: item.artifactId, kind: `geology-${item.format}`, fileName: item.fileName, checksum: item.checksum, userCreated: item.userCreated, createdAt: item.createdAt, synthetic: true })
      await transaction.put('versions', { id: `GEO-PKG-2026-08-V${value.version}`, objectId: value.id, version: value.version, status: value.publication.status, createdAt: value.updatedAt, data: value })
      await transaction.put('auditEvents', { id: `AUD-${eventType}-V${value.version}`, eventType, entityType: 'geology-publication', entityId: value.id, actor, occurredAt: value.updatedAt, status: 'accepted', payload: { packageVersion: value.version, exactVersionIds: value.selectedVersionIds, synthetic: true } })
    })
  }
}

export const demoGeologyPublicationRepository = new DemoGeologyPublicationRepository()
