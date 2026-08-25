import type {
  MethodologyCenterWorkspace,
  MethodologyContour,
  MethodologyDefinition,
  OutputTemplate,
  SyntheticMethodDefinition,
  SyntheticVolumeProfile,
} from '../../entities/methodology-center/model/types'
import { demoDatabase, type DemoRecord } from './demoDatabase'

const seededAt = '2026-08-24T00:00:00.000Z'
const actor = { id: 'PERSON-R3-RESERVES', type: 'user', name: 'Марат Жумабеков · synthetic' }

const contours: MethodologyContour[] = [
  { id: 'wells', order: 1, title: 'Скважины и первичные данные', purpose: 'Паспорт, траектория, керн, пробы, ГИС и интерпретация.', roles: ['R1 Геолог', 'R2 Геофизик'], operations: ['Создать паспорт', 'Загрузить ГИС', 'Принять интерпретацию', 'Опубликовать версию'], limitations: ['Только synthetic fixtures', 'Внешняя БГД/LIMS не подключена'], decision: 'unreviewed', note: '' },
  { id: 'sections', order: 2, title: 'Геотехнологические разрезы', purpose: 'Трасса, состав скважин, корреляция, горизонты и рудные тела.', roles: ['R1 Геолог', 'R3 Инженер по запасам'], operations: ['Задать трассу', 'Связать интервалы', 'Построить контуры', 'Выпустить чертёж'], limitations: ['Geometry auto-repair — synthetic', 'Нормативные допуски не утверждены'], decision: 'unreviewed', note: '' },
  { id: 'reserves', order: 3, title: 'Подсчёт запасов', purpose: 'Рудные пересечения, блоки, четыре независимых метода и паспорт.', roles: ['R3 Инженер по запасам', 'R12 Согласующий'], operations: ['Зафиксировать snapshot', 'Запустить метод', 'Сравнить результаты', 'Утвердить паспорт'], limitations: ['Формулы unverified', 'Результаты нельзя использовать как производственные'], decision: 'unreviewed', note: '' },
  { id: 'model-2d', order: 4, title: '2D геологическая модель', purpose: 'Область, сетка, точки, вариограмма, интерполяции и accepted field.', roles: ['R4 Моделист', 'R3 Инженер по запасам'], operations: ['Настроить domain/grid', 'Проверить CV', 'Сравнить четыре поля', 'Принять поле'], limitations: ['Детерминированная demo-математика', 'Не scientific validation'], decision: 'unreviewed', note: '' },
  { id: 'model-3d', order: 5, title: '3D модель и DGM', purpose: 'Горизонты, поверхности, призматическая сетка, поля и срезы.', roles: ['R4 Моделист', 'R5 Гидрогеохимик'], operations: ['Собрать горизонты', 'Материализовать mesh', 'Назначить поля', 'Опубликовать DGM'], limitations: ['Lightweight mesh', 'WebGL имеет 2D/table fallback'], decision: 'unreviewed', note: '' },
]

const methods: SyntheticMethodDefinition[] = [
  { id: 'projection', name: 'Проекция блоков / методика ГКЗ', shortName: 'Проекция', status: 'unverified', version: 1, formula: 'Qdemo = A × m × ρ × kore', description: 'Synthetic-приближение для демонстрации осреднения, рудоносности и категорий.', requiredInputs: ['Контур блока', 'Сетевые пересечения', 'ConditionSet', 'Плотность'], variables: [{ symbol: 'A', label: 'Площадь блока', unit: 'м²', demoValue: 12500 }, { symbol: 'm', label: 'Средняя мощность', unit: 'м', demoValue: 4.2 }, { symbol: 'ρ', label: 'Объёмная масса', unit: 'т/м³', demoValue: 1.72 }, { symbol: 'kore', label: 'Demo-коэффициент рудоносности', unit: 'доля', demoValue: 0.64 }], exampleResult: 57792, resultUnit: 'т demo-руды', runCount: 0 },
  { id: 'voronoi', name: 'Ячейки Вороного', shortName: 'Вороной', status: 'unverified', version: 1, formula: 'Qdemo = Σ(Ai × mi × ρi)', description: 'Synthetic-агрегация обрезанных контуром ячеек без нормативного статуса.', requiredInputs: ['Пересечения', 'Контур', 'Voronoi cells'], variables: [{ symbol: 'ΣAi', label: 'Сумма площадей ячеек', unit: 'м²', demoValue: 9800 }, { symbol: 'm̄', label: 'Demo-средняя мощность', unit: 'м', demoValue: 3.8 }, { symbol: 'ρ̄', label: 'Demo-плотность', unit: 'т/м³', demoValue: 1.7 }], exampleResult: 63296, resultUnit: 'т demo-руды', runCount: 0 },
  { id: 'interval-register', name: 'Реестр рудных интервалов', shortName: 'Реестр', status: 'unverified', version: 1, formula: 'Qdemo = Σ(Li × Wdemo × mi × ρdemo)', description: 'Synthetic-разделение балансовых и технологических интервалов.', requiredInputs: ['Исходные интервалы', 'Технологические типы', 'Контур'], variables: [{ symbol: 'ΣLi', label: 'Суммарная длина', unit: 'м', demoValue: 420 }, { symbol: 'Wdemo', label: 'Demo-ширина влияния', unit: 'м', demoValue: 18 }, { symbol: 'm̄', label: 'Мощность', unit: 'м', demoValue: 4.1 }, { symbol: 'ρdemo', label: 'Плотность', unit: 'т/м³', demoValue: 1.68 }], exampleResult: 52073.28, resultUnit: 'т demo-руды', runCount: 0 },
  { id: 'geostatistical', name: 'Геостатистическая модель', shortName: 'Геостатистика', status: 'unverified', version: 1, formula: 'Qdemo = Σ(Acell × meff × ρdemo)', description: 'Synthetic-интегрирование accepted field по ячейкам блока.', requiredInputs: ['Accepted 2D/DGM field', 'Grid cells', 'Контур блока'], variables: [{ symbol: 'ΣAcell', label: 'Площадь принятых ячеек', unit: 'м²', demoValue: 11100 }, { symbol: 'm̄eff', label: 'Эффективная мощность', unit: 'м', demoValue: 4.4 }, { symbol: 'ρdemo', label: 'Плотность', unit: 'т/м³', demoValue: 1.69 }], exampleResult: 82539.6, resultUnit: 'т demo-руды', runCount: 0 },
]

const definitions: MethodologyDefinition[] = [
  { id: 'COND-CUTOFF-U', kind: 'condition', name: 'Минимальное содержание U', owner: 'R3 + методолог', effectiveFrom: '2026-08-01', status: 'unverified', version: 1, value: 0.03, unit: '%', impact: ['Рудные интервалы', 'Пересечения', 'ReserveProject runs'] },
  { id: 'COND-MIN-MP', kind: 'condition', name: 'Минимальный метропроцент', owner: 'R3 + методолог', effectiveFrom: '2026-08-01', status: 'unverified', version: 1, value: 0.12, unit: '%·м', impact: ['Ore composites', 'Block classification', '2D source points'] },
  { id: 'DICT-TECH-TYPE', kind: 'dictionary', name: 'Технологические типы руд', owner: 'R1 + R3', effectiveFrom: '2026-08-01', status: 'unverified', version: 1, value: 4, unit: 'значения', impact: ['Интерпретация', 'Запасы', 'DGM fields'] },
]

const templates: OutputTemplate[] = [
  { id: 'TPL-PASSPORT', kind: 'passport', name: 'Паспорт скважины', status: 'unverified', version: 1, pages: 2, description: 'Реквизиты, координаты, конструкция, версии и подписи workflow.' },
  { id: 'TPL-COLUMN', kind: 'column', name: 'Геологическая колонка', status: 'unverified', version: 1, pages: 3, description: 'Глубинные треки, литология, ГИС, интервалы и легенда.' },
  { id: 'TPL-SECTION', kind: 'section', name: 'Геотехнологический разрез', status: 'unverified', version: 1, pages: 1, description: 'Профиль, скважины, горизонты, рудные тела и штамп.' },
  { id: 'TPL-RESERVE', kind: 'reserve-plan', name: 'План запасов', status: 'unverified', version: 1, pages: 2, description: 'Контуры, блоки, ячейки, подписи и таблица результата.' },
]

const volumeProfiles: SyntheticVolumeProfile[] = [
  { id: 'small', label: 'Small demo', wells: 25, curves: 120, points: 25000, cells: 4000, device: 'Notebook', note: 'Быстрый walkthrough; не SLA.' },
  { id: 'medium', label: 'Medium demo', wells: 250, curves: 1800, points: 500000, cells: 60000, device: 'Office desktop', note: 'Virtualized tables и LOD preview.' },
  { id: 'large', label: 'Large synthetic', wells: 1200, curves: 9600, points: 4000000, cells: 350000, device: 'Workstation profile', note: 'Synthetic stress presentation; не production benchmark.' },
]

function seed(): MethodologyCenterWorkspace {
  return { id: 'GEOX-METHOD-CENTER', contours, methods, definitions, templates, selectedTemplateId: templates[0]!.id, volumeProfiles, selectedVolumeProfileId: 'small', exampleRuns: [], version: 1, updatedAt: seededAt }
}

function record<T>(id: string, entityType: string, data: T, status: string, updatedAt: string): DemoRecord<T> {
  return { id, entityType, objectId: 'GEOX-METHOD-CENTER', scopeId: 'Северный', status, updatedAt, data: structuredClone(data) }
}

export class DemoMethodologyCenterRepository {
  async get(): Promise<MethodologyCenterWorkspace> {
    const stored = await demoDatabase.get<DemoRecord<MethodologyCenterWorkspace>>('records', 'methodology-center:GEOX-METHOD-CENTER')
    if (stored) return structuredClone(stored.data)
    const value = seed()
    await this.persist(value, 'methodology.seeded')
    return value
  }

  async save(current: MethodologyCenterWorkspace, proposed: MethodologyCenterWorkspace, eventType: string): Promise<MethodologyCenterWorkspace> {
    const latest = await this.get()
    if (latest.version !== current.version) throw new Error('VERSION_CONFLICT: методический центр изменён в другой вкладке.')
    const next = { ...structuredClone(proposed), version: latest.version + 1, updatedAt: new Date().toISOString() }
    await this.persist(next, eventType)
    return next
  }

  private async persist(value: MethodologyCenterWorkspace, eventType: string): Promise<void> {
    await demoDatabase.transaction(['records', 'versions', 'relations', 'auditEvents', 'artifacts', 'preferences'], async (transaction) => {
      await transaction.put('records', record('methodology-center:GEOX-METHOD-CENTER', 'methodology-center', value, 'active', value.updatedAt))
      for (const contour of value.contours) await transaction.put('records', record(`walkthrough:${contour.id}`, 'walkthrough-decision', contour, contour.decision, value.updatedAt))
      for (const method of value.methods) {
        await transaction.put('records', record(`method-definition:${method.id}`, 'method-definition', method, method.status, value.updatedAt))
        await transaction.put('versions', { id: `METHOD-${method.id}-V${method.version}`, objectId: method.id, version: method.version, status: method.status, createdAt: value.updatedAt, data: method })
      }
      for (const definition of value.definitions) {
        await transaction.put('records', record(`definition:${definition.id}`, `${definition.kind}-definition`, definition, definition.status, value.updatedAt))
        await transaction.put('versions', { id: `DEFINITION-${definition.id}-V${definition.version}`, objectId: definition.id, version: definition.version, status: definition.status, createdAt: value.updatedAt, data: definition })
        for (const impact of definition.impact) await transaction.put('relations', { id: `REL-${definition.id}-${impact.replace(/\W/g, '-')}`, fromId: definition.id, toId: impact, type: 'definition-impact', updatedAt: value.updatedAt })
      }
      for (const template of value.templates) {
        await transaction.put('records', record(`output-template:${template.id}`, 'output-template', template, template.status, value.updatedAt))
        await transaction.put('versions', { id: `TEMPLATE-${template.id}-V${template.version}`, objectId: template.id, version: template.version, status: template.status, createdAt: value.updatedAt, data: template })
      }
      const profile = value.volumeProfiles.find((item) => item.id === value.selectedVolumeProfileId)!
      await transaction.put('records', record('volume-profile:selected', 'volume-profile', profile, 'synthetic', value.updatedAt))
      await transaction.put('preferences', { id: 'methodology:volume-profile', profileId: profile.id, updatedAt: value.updatedAt })
      for (const run of value.exampleRuns) await transaction.put('artifacts', { id: run.artifactId, kind: 'golden-example', methodId: run.methodId, methodVersion: run.methodVersion, result: run.result, unit: run.unit, status: run.status, createdAt: run.createdAt, synthetic: true })
      await transaction.put('versions', { id: `METHODOLOGY-CENTER-V${value.version}`, objectId: value.id, version: value.version, status: 'active', createdAt: value.updatedAt, data: value })
      await transaction.put('auditEvents', { id: `AUD-${eventType}-V${value.version}`, eventType, entityType: 'methodology-center', entityId: value.id, actor, occurredAt: value.updatedAt, status: 'accepted', payload: { synthetic: true, profileId: value.selectedVolumeProfileId } })
    })
  }
}

export const demoMethodologyCenterRepository = new DemoMethodologyCenterRepository()
