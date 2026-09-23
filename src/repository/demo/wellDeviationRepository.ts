import { calculateDeviationSurvey } from '../../entities/well-deviation/lib/calculation'
import type { DeviationSurvey, WellDeviationWorkspace } from '../../entities/well-deviation/model/types'
import type { Well } from '../../entities/well/model/types'
import { demoDatabase, type DemoRecord, wellRecord } from './demoDatabase'

const seededAt = '2026-08-24T10:20:00.000Z'

function survey(well: Well, suffix: string, input: Omit<DeviationSurvey, 'id' | 'wellId' | 'points' | 'planDistance' | 'zenithTopBottom' | 'bearingTopBottom' | 'calculatedAt' | 'version'> & { points: Array<Pick<DeviationSurvey['points'][number], 'depth' | 'azimuth' | 'zenithAngle'>> }): DeviationSurvey {
  const id = `DEVIATION-${well.id}-${suffix}`
  const calculated = calculateDeviationSurvey({
    correctionAngle: input.correctionAngle,
    minZenithAngle: input.minZenithAngle,
    points: input.points.map((point, index) => ({ ...point, id: `${id}-POINT-${String(index + 1).padStart(2, '0')}` })),
  })
  return { ...input, ...calculated, id, wellId: well.id, calculatedAt: seededAt, version: 1 }
}

function seed(well: Well): WellDeviationWorkspace {
  const depth = Math.max(50, well.depth)
  const marks = [0, .2, .4, .6, .8, 1].map((ratio) => Number((depth * ratio).toFixed(1)))
  return {
    wellId: well.id,
    surveys: [
      survey(well, '01', {
        surveyDate: '2026-08-18T10:30', azimuthKind: 'true', correctionAngle: 10, isPrimary: true,
        operatorId: 'Ирина Иванова · synthetic', device: 'ИЭМ-36 №10', minZenithAngle: 0,
        comment: 'Основной контрольный промер после завершения бурения.',
        points: marks.map((mark, index) => ({ depth: mark, azimuth: [174, 268, 276, 301, 243, 58][index]!, zenithAngle: [1.15, 1, .3, .15, .15, .3][index]! })),
      }),
      survey(well, '02', {
        surveyDate: '2026-07-05T14:15', azimuthKind: 'magnetic', correctionAngle: 5, isPrimary: false,
        operatorId: 'Аскар Аскаров · synthetic', device: 'ИЭМ-36 №15', minZenithAngle: 0,
        comment: 'Промежуточный промер цифровой каротажной станцией.',
        points: marks.slice(0, 4).map((mark, index) => ({ depth: mark, azimuth: [168, 251, 269, 288][index]!, zenithAngle: [.8, 1.1, .7, .5][index]! })),
      }),
    ],
    version: 1,
    updatedAt: seededAt,
  }
}

function record(well: Well, value: WellDeviationWorkspace): DemoRecord<WellDeviationWorkspace> {
  return { id: `well-deviation:${well.id}`, entityType: 'well-deviation-workspace', objectId: well.id, scopeId: well.site, status: 'draft', updatedAt: value.updatedAt, data: structuredClone(value) }
}

export class DemoWellDeviationRepository {
  async get(well: Well) {
    const existing = await demoDatabase.get<DemoRecord<WellDeviationWorkspace>>('records', `well-deviation:${well.id}`)
    if (existing) return structuredClone(existing.data)
    const value = seed(well)
    await this.persist(well, value, 'deviation.seeded')
    return value
  }

  async save(well: Well, current: WellDeviationWorkspace, next: WellDeviationWorkspace, eventType: string) {
    const latest = await this.get(well)
    if (latest.version !== current.version) throw new Error('VERSION_CONFLICT: инклинометрия изменена в другой вкладке.')
    if (next.surveys.filter((item) => item.isPrimary).length > 1) throw new Error('По скважине может быть только один основной промер.')
    const value = { ...structuredClone(next), wellId: well.id, version: latest.version + 1, updatedAt: new Date().toISOString() }
    await this.persist(well, value, eventType, latest)
    return value
  }

  private async persist(well: Well, value: WellDeviationWorkspace, eventType: string, previous?: WellDeviationWorkspace) {
    await demoDatabase.transaction(['records', 'versions', 'relations', 'auditEvents'], async (transaction) => {
      const surveyIds = new Set(value.surveys.map((item) => item.id))
      for (const oldSurvey of previous?.surveys ?? []) {
        if (!surveyIds.has(oldSurvey.id)) {
          await transaction.delete('records', `deviation-survey:${oldSurvey.id}`)
          await transaction.delete('relations', `REL-DEVIATION-WELL-${oldSurvey.id}`)
        }
        const pointIds = new Set(value.surveys.find((item) => item.id === oldSurvey.id)?.points.map((item) => item.id) ?? [])
        for (const point of oldSurvey.points) if (!pointIds.has(point.id)) {
          await transaction.delete('records', `deviation-point:${point.id}`)
          await transaction.delete('relations', `REL-DEVIATION-POINT-${point.id}`)
        }
      }
      await transaction.put('records', record(well, value))
      for (const item of value.surveys) {
        await transaction.put('records', { id: `deviation-survey:${item.id}`, entityType: 'deviation-survey', objectId: item.id, scopeId: well.id, status: item.isPrimary ? 'primary' : 'active', updatedAt: value.updatedAt, data: structuredClone(item) } satisfies DemoRecord<DeviationSurvey>)
        await transaction.put('relations', { id: `REL-DEVIATION-WELL-${item.id}`, fromId: `deviation-survey:${item.id}`, toId: `well:${well.id}`, type: 'deviation-of', updatedAt: value.updatedAt })
        for (const point of item.points) {
          await transaction.put('records', { id: `deviation-point:${point.id}`, entityType: 'deviation-point', objectId: point.id, scopeId: item.id, status: point.dx === null ? 'measured' : 'calculated', updatedAt: value.updatedAt, data: structuredClone(point) })
          await transaction.put('relations', { id: `REL-DEVIATION-POINT-${point.id}`, fromId: `deviation-point:${point.id}`, toId: `deviation-survey:${item.id}`, type: 'point-of', updatedAt: value.updatedAt })
        }
      }
      await transaction.put('versions', { id: `WELL-DEVIATION-${well.id}-V${value.version}`, objectId: `well-deviation:${well.id}`, version: value.version, status: 'draft', createdAt: value.updatedAt, data: value })
      const primary = value.surveys.find((item) => item.isPrimary && item.planDistance !== null && item.bearingTopBottom !== null)
      if (primary && well.bgd && eventType !== 'deviation.seeded') {
        const totalX = primary.points.reduce((sum, point) => sum + (point.dx ?? 0), 0)
        const totalY = primary.points.reduce((sum, point) => sum + (point.dy ?? 0), 0)
        const totalZ = primary.points.reduce((sum, point) => sum + (point.dz ?? 0), 0)
        const geometry = {
          ...well.bgd.geometry,
          bottomOffsetLength: primary.planDistance,
          bottomOffsetAzimuth: primary.bearingTopBottom,
          bottomX: well.bgd.geometry.headX === null ? null : Number((well.bgd.geometry.headX + totalX).toFixed(3)),
          bottomY: well.bgd.geometry.headY === null ? null : Number((well.bgd.geometry.headY + totalY).toFixed(3)),
          bottomZ: well.bgd.geometry.headZ === null ? null : Number((well.bgd.geometry.headZ - totalZ).toFixed(3)),
        }
        const changed = (['bottomOffsetLength', 'bottomOffsetAzimuth', 'bottomX', 'bottomY', 'bottomZ'] as const).some((key) => geometry[key] !== well.bgd!.geometry[key])
        if (changed) {
          const nextWell = { ...structuredClone(well), bgd: { ...structuredClone(well.bgd), geometry }, version: (well.version ?? 1) + 1, updatedAt: 'Только что' }
          await transaction.put('records', wellRecord(nextWell, value.updatedAt))
          await transaction.put('versions', { id: `VERSION:well:${nextWell.id}:${nextWell.version}`, objectId: nextWell.id, version: nextWell.version, status: 'in_review', createdAt: value.updatedAt, data: nextWell })
          await transaction.put('auditEvents', {
            id: `AUD-well.geometry.deviation-${well.id}-V${nextWell.version}`,
            eventType: 'well.geometry.updated-from-deviation',
            entityType: 'well',
            entityId: well.id,
            actor: { id: 'PERSON-R2-GEOPHYSICIST', type: 'user', name: 'Аскар Аскаров · synthetic' },
            occurredAt: value.updatedAt,
            status: 'accepted',
            payload: { metadata: { synthetic: true, deviationSurveyId: primary.id } },
          })
        }
      }
      await transaction.put('auditEvents', {
        id: `AUD-${eventType}-${well.id}-V${value.version}`,
        eventType,
        entityType: 'well-deviation',
        entityId: well.id,
        actor: { id: 'PERSON-R2-GEOPHYSICIST', type: 'user', name: 'Аскар Аскаров · synthetic' },
        occurredAt: value.updatedAt,
        status: 'accepted',
        payload: { metadata: { synthetic: true } },
      })
    })
  }
}

export const demoWellDeviationRepository = new DemoWellDeviationRepository()
