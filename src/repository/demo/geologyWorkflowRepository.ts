import { demoDatabase, type DemoRecord } from './demoDatabase'

export type CompareResolution = 'manual' | 'ai' | 'corrected'

export type InterpretationDecision = {
  resolution?: CompareResolution
  reason: string
  status: 'draft' | 'in_review' | 'approved' | 'returned'
  revision: number
}

export type ReserveDraft = {
  area: number
  thickness: number
  density: number
  grade: number
  submitted: boolean
  revision: number
}

export type DeliveryDraft = {
  selected: string[]
  published: boolean
  revision: number
}

type Workflow = InterpretationDecision | ReserveDraft | DeliveryDraft

const defaults = {
  interpretation: (): InterpretationDecision => ({ reason: '', status: 'draft', revision: 1 }),
  reserves: (): ReserveDraft => ({ area: 1.84, thickness: 8.6, density: 2.71, grade: 1.42, submitted: false, revision: 3 }),
  delivery: (): DeliveryDraft => ({ selected: ['model', 'tech', 'analytics'], published: false, revision: 12 }),
}

export class DemoGeologyWorkflowRepository {
  async getInterpretation(id: string): Promise<InterpretationDecision> { return this.get('interpretation', id, defaults.interpretation) }
  async getReserves(id = 'RESERVE-PR-07'): Promise<ReserveDraft> { return this.get('reserves', id, defaults.reserves) }
  async getDelivery(id = 'GEO-PR07-2026-08'): Promise<DeliveryDraft> { return this.get('delivery', id, defaults.delivery) }

  async saveInterpretation(id: string, current: InterpretationDecision, resolution: CompareResolution, reason: string): Promise<InterpretationDecision> {
    if (reason.trim().length < 8) throw new Error('Укажите предметное основание решения не короче 8 символов.')
    return this.save('interpretation', id, current, { ...current, resolution, reason: reason.trim(), revision: current.revision + 1 }) as Promise<InterpretationDecision>
  }

  async submitInterpretation(id: string, current: InterpretationDecision): Promise<InterpretationDecision> {
    if (!current.resolution) throw new Error('Сначала сохраните экспертное решение.')
    return this.save('interpretation', id, current, { ...current, status: 'in_review', revision: current.revision + 1 }) as Promise<InterpretationDecision>
  }

  async returnInterpretation(id: string, current: InterpretationDecision): Promise<InterpretationDecision> {
    if (current.status !== 'in_review') throw new Error('Вернуть можно только решение, ожидающее проверки.')
    return this.save('interpretation', id, current, { ...current, status: 'returned', revision: current.revision + 1 }) as Promise<InterpretationDecision>
  }

  async approveInterpretation(id: string, current: InterpretationDecision): Promise<InterpretationDecision> {
    if (current.status !== 'in_review') throw new Error('Утвердить можно только решение, ожидающее проверки.')
    return this.save('interpretation', id, current, { ...current, status: 'approved', revision: current.revision + 1 }) as Promise<InterpretationDecision>
  }

  async saveReserves(id: string, current: ReserveDraft, next: Omit<ReserveDraft, 'revision'>): Promise<ReserveDraft> {
    return this.save('reserves', id, current, { ...next, revision: current.revision + 1 }) as Promise<ReserveDraft>
  }

  async saveDelivery(id: string, current: DeliveryDraft, next: Omit<DeliveryDraft, 'revision'>): Promise<DeliveryDraft> {
    return this.save('delivery', id, current, { ...next, revision: current.revision + 1 }) as Promise<DeliveryDraft>
  }

  private async get<T extends Workflow>(type: keyof typeof defaults, objectId: string, seed: () => T): Promise<T> {
    const id = `workflow:${type}:${objectId}`
    const stored = await demoDatabase.get<DemoRecord<T>>('records', id)
    if (stored) return structuredClone(stored.data)
    const initial = seed()
    await demoDatabase.put('records', this.record(type, objectId, initial))
    return initial
  }

  private async save<T extends Workflow>(type: keyof typeof defaults, objectId: string, current: T, next: T): Promise<T> {
    const actual = await this.get(type, objectId, () => current)
    if (actual.revision !== current.revision) throw new Error('VERSION_CONFLICT: состояние изменилось в другой вкладке. Перезагрузите данные.')
    if (type === 'delivery' && (actual as DeliveryDraft).published) throw new Error('PUBLISHED_IMMUTABLE: опубликованную demo-версию нельзя изменить. Создайте новую выдачу.')
    const timestamp = new Date().toISOString()
    await demoDatabase.transaction(['records', 'versions', 'auditEvents'], async (transaction) => {
      await transaction.put('records', this.record(type, objectId, next, timestamp))
      await transaction.put('versions', { id: `VERSION:${type}:${objectId}:${next.revision}`, objectId, version: next.revision, status: 'in_review', createdAt: timestamp, data: next })
      await transaction.put('auditEvents', { id: `AUD:${type}:${objectId}:${next.revision}`, eventType: 'version.created', entityType: type === 'interpretation' ? 'interpretation' : 'other', entityId: objectId, actor: { id: 'PERSON-R1-GEOLOGIST', type: 'user', name: 'Айгерим Садыкова · synthetic' }, occurredAt: timestamp, status: 'accepted', version: String(next.revision) })
    })
    return structuredClone(next)
  }

  private record(type: keyof typeof defaults, objectId: string, data: Workflow, updatedAt = '2026-08-24T00:00:00.000Z'): DemoRecord<Workflow> {
    return { id: `workflow:${type}:${objectId}`, entityType: `workflow-${type}`, objectId, scopeId: 'Северный', status: 'active', updatedAt, data: structuredClone(data) }
  }
}

export const demoGeologyWorkflowRepository = new DemoGeologyWorkflowRepository()
