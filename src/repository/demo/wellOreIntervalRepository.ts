import type { DifferentialOreInterval, OreInterval, WellOreWorkspace } from '../../entities/well-ore/model/types'
import type { Well } from '../../entities/well/model/types'
import { demoDatabase, type DemoRecord } from './demoDatabase'

const now = () => new Date().toISOString()
const round = (value: number) => Number(value.toFixed(4))

function seed(well: Well): WellOreWorkspace {
  const base = well.depth > 605 ? 588.75 : round(Math.max(10, well.depth * .62))
  const raw = [[0, .1, .014, 'Непроницаемый'], [1.1, 2, .017, 'Непроницаемый'], [4, 4.4, .014, 'Проницаемый'], [5.4, 5.7, .042, 'Проницаемый'], [6.4, 7.4, .027, 'Непроницаемый']] as const
  const oreIntervals: OreInterval[] = raw.map((item, index) => ({ id: `ORE-${well.id}-${index + 1}`, source: index < 3 ? 'Гамма-каротаж' : 'Керн и опробование', element: 'Уран', from: round(base + item[0]), to: round(base + item[1]), content: item[2], meterPercent: round((item[1] - item[0]) * item[2]), permeability: item[3], differentialIds: index === 0 ? [`DIFF-${well.id}-1`, `DIFF-${well.id}-2`] : [] }))
  const contents = [.014, .012, .009, .017, .02, .011, .006, .018]
  const differentialIntervals: DifferentialOreInterval[] = Array.from({ length: 8 }, (_, index) => ({ id: `DIFF-${well.id}-${index + 1}`, source: 'Гамма-каротаж', element: 'Уран', from: round(base + index * .1), to: round(base + (index + 1) * .1), content: round(contents[index] ?? 0), permeability: index > 4 ? 'Проницаемый' : 'Непроницаемый', oreIntervalId: index < 2 ? `ORE-${well.id}-1` : undefined }))
  return { wellId: well.id, useDifferentialLogging: false, selectedSource: 'Гамма-каротаж', selectedElement: 'Уран', oreIntervals, mergedIntervals: oreIntervals.map((item, index) => ({ id: `ORI-${well.id}-${index + 1}`, oreIntervalIds: [item.id] })), differentialIntervals, version: 1, updatedAt: '2026-09-15T00:00:00.000Z' }
}

const record = (well: Well, value: WellOreWorkspace): DemoRecord<WellOreWorkspace> => ({ id: `well-ore:${well.id}`, entityType: 'well-ore-workspace', objectId: well.id, scopeId: well.site, status: 'draft', updatedAt: value.updatedAt, data: structuredClone(value) })

export class DemoWellOreIntervalRepository {
  async get(well: Well) {
    const stored = await demoDatabase.get<DemoRecord<WellOreWorkspace>>('records', `well-ore:${well.id}`)
    if (stored) return structuredClone(stored.data)
    const value = seed(well)
    await this.persist(well, value, 'ore.seeded')
    return value
  }

  async save(well: Well, current: WellOreWorkspace, next: WellOreWorkspace, eventType: string) {
    const latest = await this.get(well)
    if (latest.version !== current.version) throw new Error('VERSION_CONFLICT: рудные интервалы изменены в другой вкладке.')
    const value = { ...structuredClone(next), version: latest.version + 1, updatedAt: now() }
    await this.persist(well, value, eventType)
    return value
  }

  private async persist(well: Well, value: WellOreWorkspace, eventType: string) {
    await demoDatabase.transaction(['records', 'versions', 'relations', 'auditEvents'], async (tx) => {
      await tx.put('records', record(well, value))
      for (const interval of value.oreIntervals) await tx.put('records', { id: `ore-interval:${interval.id}`, entityType: 'ore-interval', objectId: well.id, scopeId: well.site, status: 'draft', updatedAt: value.updatedAt, data: interval })
      for (const group of value.mergedIntervals) {
        await tx.put('records', { id: `merged-ore:${group.id}`, entityType: 'merged-ore-interval', objectId: well.id, scopeId: well.site, status: 'calculated', updatedAt: value.updatedAt, data: group })
        for (const childId of group.oreIntervalIds) await tx.put('relations', { id: `REL-ORI-${group.id}-${childId}`, fromId: `merged-ore:${group.id}`, toId: `ore-interval:${childId}`, type: 'merged-ore-contains', updatedAt: value.updatedAt })
      }
      for (const interval of value.differentialIntervals) {
        await tx.put('records', { id: `differential-ore:${interval.id}`, entityType: 'differential-ore-interval', objectId: well.id, scopeId: well.site, status: interval.oreIntervalId ? 'assigned' : 'free', updatedAt: value.updatedAt, data: interval })
        if (interval.oreIntervalId) await tx.put('relations', { id: `REL-DIFF-${interval.id}`, fromId: `differential-ore:${interval.id}`, toId: `ore-interval:${interval.oreIntervalId}`, type: 'differential-member-of', updatedAt: value.updatedAt })
      }
      await tx.put('versions', { id: `WELL-ORE-${well.id}-V${value.version}`, objectId: `well-ore:${well.id}`, version: value.version, status: 'draft', createdAt: value.updatedAt, data: value })
      await tx.put('auditEvents', { id: `AUD-${eventType}-${well.id}-V${value.version}`, eventType, entityType: 'well-ore-workspace', entityId: well.id, actor: { id: 'PERSON-R1-GEOLOGIST', type: 'user', name: 'Айгерим Садыкова · synthetic' }, occurredAt: value.updatedAt, status: 'accepted', payload: { metadata: { synthetic: true } } })
    })
  }
}

export const demoWellOreIntervalRepository = new DemoWellOreIntervalRepository()
