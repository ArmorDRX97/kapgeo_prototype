import type { Well } from '../../entities/well/model/types'
import type { WellAssignment, WellMasterAggregate, WellMasterAggregateData, WellMasterAggregateKind, WellMasterWorkspace, WellWorkflowStatus } from '../../entities/well-master/model/types'
import { demoDatabase, type DemoRecord, wellRecord } from './demoDatabase'

const aggregateKinds: WellMasterAggregateKind[] = ['description', 'documentation', 'drilling', 'completion', 'geology']

function defaults(well: Well): Record<WellMasterAggregateKind, WellMasterAggregate> {
  const base = { wellId: well.id, version: well.version ?? 1, status: well.version === 1 ? 'draft' as const : 'published' as const, updatedAt: '2026-08-24T00:00:00.000Z' }
  return {
    description: { ...base, id: `WELL-DESCRIPTION-${well.id}-V${base.version}`, kind: 'description', data: { shortName: well.code, purposeNote: well.purpose, contractor: 'ТОО «KAPGEO Synthetic»' } },
    documentation: { ...base, id: `WELL-DOCUMENTS-${well.id}-V${base.version}`, kind: 'documentation', data: { projectNumber: `PRJ-${well.profile}`, permitNumber: 'SYN-2026-042', sourceReference: 'Synthetic project dossier' } },
    drilling: { ...base, id: `WELL-DRILLING-${well.id}-V${base.version}`, kind: 'drilling', data: { startedAt: '2026-06-10', completedAt: '2026-06-24', method: 'Колонковое бурение', fluid: 'Техническая вода' } },
    completion: { ...base, id: `WELL-COMPLETION-${well.id}-V${base.version}`, kind: 'completion', data: { state: 'Освоение завершено', pumpingRate: 18.4, commissionedAt: '2026-07-02' } },
    geology: { ...base, id: `WELL-GEOLOGY-FACTS-${well.id}-V${base.version}`, kind: 'geology', data: { groundwater: 'Водоносный горизонт 76–94 м', permafrost: 'Не выявлена', complications: 'Суффозия 312–318 м · наблюдение' } },
  }
}

function record<T>(id: string, entityType: string, well: Well, data: T, status = 'active'): DemoRecord<T> {
  return { id, entityType, objectId: well.id, scopeId: well.site, status, updatedAt: new Date().toISOString(), data: structuredClone(data) }
}

export class DemoWellMasterRepository {
  async getWorkspace(well: Well): Promise<WellMasterWorkspace> {
    const stored = await demoDatabase.get<DemoRecord<WellMasterWorkspace>>('records', `well-master:${well.id}`)
    if (stored) return structuredClone(stored.data)
    const initial: WellMasterWorkspace = {
      wellId: well.id,
      assignment: { depositId: 'DEP-SARYTAU', siteId: well.site === 'Центральный' ? 'SITE-CENTRAL' : 'SITE-NORTH', lensId: well.profile === 'CN-02' ? 'LENS-CN02' : 'LENS-PR07', projectCode: `PRJ-${well.profile}` },
      aggregates: defaults(well),
      workflow: { status: well.version === 1 ? 'draft' : 'published', version: well.version ?? 1, updatedAt: '2026-08-24T00:00:00.000Z' },
    }
    await this.persist(well, initial, 'well.master.seeded', 'Подготовлен deterministic synthetic well-master.')
    return structuredClone(initial)
  }

  async saveAssignment(well: Well, current: WellMasterWorkspace, assignment: WellAssignment): Promise<WellMasterWorkspace> {
    const latest = await this.getWorkspace(well)
    this.assertEditable(latest)
    if (latest.workflow.version !== current.workflow.version) throw new Error('VERSION_CONFLICT: назначение скважины изменено в другой вкладке.')
    const next = { ...latest, assignment: structuredClone(assignment), workflow: { ...latest.workflow, version: latest.workflow.version + 1, updatedAt: new Date().toISOString() } }
    await this.persist(well, next, 'well.assignment.saved', 'Изменены принадлежность, проект или залежь скважины.')
    return structuredClone(next)
  }

  async createDraft(well: Well, current: WellMasterWorkspace): Promise<WellMasterWorkspace> {
    const latest = await this.getWorkspace(well)
    if (latest.workflow.version !== current.workflow.version) throw new Error('VERSION_CONFLICT: версия скважины изменилась в другой вкладке.')
    if (latest.workflow.status !== 'published') throw new Error('Новый draft создаётся только на основе опубликованной версии.')
    const timestamp = new Date().toISOString()
    const aggregates = Object.fromEntries(aggregateKinds.map((kind) => {
      const previous = latest.aggregates[kind]
      const version = previous.version + 1
      return [kind, { ...previous, id: `${previous.id.split('-V')[0]}-V${version}`, version, status: 'draft' as const, updatedAt: timestamp }]
    })) as WellMasterWorkspace['aggregates']
    const next: WellMasterWorkspace = { ...latest, aggregates, workflow: { status: 'draft', version: latest.workflow.version + 1, updatedAt: timestamp } }
    await this.persist({ ...well, status: 'На проверке', version: next.workflow.version, updatedAt: 'Только что' }, next, 'well.workflow.draft_created', 'Создан новый draft на основе published snapshot.')
    return structuredClone(next)
  }
  async saveAggregate<T extends WellMasterAggregateData>(well: Well, current: WellMasterWorkspace, kind: WellMasterAggregateKind, data: T): Promise<WellMasterWorkspace> {
    const latest = await this.getWorkspace(well)
    this.assertEditable(latest)
    const expected = current.aggregates[kind].version
    const actual = latest.aggregates[kind]
    if (actual.version !== expected) throw new Error('VERSION_CONFLICT: раздел паспорта изменён в другой вкладке.')
    const nextAggregate: WellMasterAggregate<T> = { ...actual, id: `${actual.id.split('-V')[0]}-V${actual.version + 1}`, version: actual.version + 1, status: 'in_review', updatedAt: new Date().toISOString(), data: structuredClone(data) }
    const next: WellMasterWorkspace = { ...latest, aggregates: { ...latest.aggregates, [kind]: nextAggregate }, workflow: { ...latest.workflow, status: 'draft', version: latest.workflow.version + 1, updatedAt: nextAggregate.updatedAt } }
    await this.persist(well, next, `well.${kind}.saved`, `Сохранена независимая версия агрегата ${kind}.`)
    return structuredClone(next)
  }

  async transitionWorkflow(well: Well, current: WellMasterWorkspace, action: 'submit' | 'return' | 'approve' | 'publish' | 'archive', reason?: string): Promise<WellMasterWorkspace> {
    const latest = await this.getWorkspace(well)
    if (latest.workflow.version !== current.workflow.version) throw new Error('VERSION_CONFLICT: workflow скважины изменился в другой вкладке.')
    const transitions: Record<WellWorkflowStatus, Partial<Record<typeof action, WellWorkflowStatus>>> = {
      draft: { submit: 'in_review', archive: 'archived' }, in_review: { return: 'changes_requested', approve: 'approved' }, changes_requested: { submit: 'in_review', archive: 'archived' }, approved: { publish: 'published' }, published: { archive: 'archived' }, archived: {},
    }
    const status = transitions[latest.workflow.status][action]
    if (!status) throw new Error(`Команда «${action}» недоступна для статуса ${latest.workflow.status}.`)
    if ((action === 'return' || action === 'archive') && (reason?.trim().length ?? 0) < 8) throw new Error('Укажите причину не короче 8 символов.')
    const timestamp = new Date().toISOString()
    const next: WellMasterWorkspace = { ...latest, workflow: { status, version: latest.workflow.version + 1, updatedAt: timestamp, reason: reason?.trim() } }
    const updatedWell: Well = { ...well, status: status === 'published' ? 'Работает' : status === 'archived' ? 'Отключена' : 'На проверке', version: next.workflow.version, updatedAt: 'Только что', activeTask: status === 'changes_requested' ? 'Устранить замечания reviewer' : status === 'published' ? undefined : well.activeTask }
    await this.persist(updatedWell, next, `well.workflow.${action}`, `Workflow: ${latest.workflow.status} → ${status}.`)
    return structuredClone(next)
  }

  private assertEditable(workspace: WellMasterWorkspace) {
    if (workspace.workflow.status === 'published' || workspace.workflow.status === 'archived') throw new Error('READ_ONLY: опубликованная или архивная версия редактируется только через новый draft.')
  }

  private async persist(well: Well, workspace: WellMasterWorkspace, eventType: string, note: string): Promise<void> {
    await demoDatabase.transaction(['records', 'versions', 'auditEvents'], async (transaction) => {
      await transaction.put('records', record(`well-master:${well.id}`, 'well-master', well, workspace, workspace.workflow.status))
      await transaction.put('records', wellRecord(well))
      for (const kind of aggregateKinds) {
        const aggregate = workspace.aggregates[kind]
        await transaction.put('records', record(`well-aggregate:${kind}:${well.id}`, `well-${kind}`, well, aggregate, aggregate.status))
        await transaction.put('versions', { id: aggregate.id, objectId: `well-${kind}:${well.id}`, version: aggregate.version, status: aggregate.status, createdAt: aggregate.updatedAt, data: aggregate.data })
      }
      await transaction.put('versions', { id: `WELL-WORKFLOW-${well.id}-V${workspace.workflow.version}`, objectId: `well-workflow:${well.id}`, version: workspace.workflow.version, status: workspace.workflow.status, createdAt: workspace.workflow.updatedAt, data: workspace.workflow })
      await transaction.put('auditEvents', { id: `AUD-${eventType}-${well.id}-${workspace.workflow.version}`, eventType, entityType: 'well', entityId: well.id, actor: { id: 'PERSON-R1-GEOLOGIST', type: 'user', name: 'Айгерим Садыкова · synthetic' }, occurredAt: workspace.workflow.updatedAt, status: 'accepted', payload: { metadata: { note, workflow: workspace.workflow.status } } })
    })
  }
}

export const demoWellMasterRepository = new DemoWellMasterRepository()
