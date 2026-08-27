import type { CreateWellInput, Well, WellBgdData } from '../../../entities/well/model/types'

function blankBgd(depositId: string): WellBgdData {
  const now = new Date().toISOString().slice(0, 16)
  return {
    name: 1064, depositId, lensId: '', profileId: '', geoBlockId: '', techBlockId: '', statusChangedAt: now,
    statusHistory: [{ status: 'На проверке', changedAt: now }], descriptionRu: '', descriptionKk: '', descriptionEn: '', note: '',
    geometry: { headX: null, headY: null, headZ: null, bottomX: null, bottomY: null, bottomZ: null, acceptedDepth: null, bottomOffsetLength: null, bottomOffsetAzimuth: null },
    passport: { documentStartDate: '', documentEndDate: '', date: '', author: '', chiefGeologist: '', chiefGeophysicist: '', drillingManager: '', samplingPerformer: '', interpretationPerformer: '', surveyor: '' },
    drilling: { startedAt: '', completedAt: '', drillingType: '', foreman: '', rigType: '', rigNumber: null, company: '', brigade: '', designDepth: null, drillLogDepth: null, loggingDepth: null, intervals: [] },
    development: { flowRate: null, specificFlowRate: null, works: [] },
    geology: { permafrostDepth: null, groundwaterLevel: null, complications: '', impermeableIntervals: [] },
  }
}

export function createEmptyWellBgdForm(depositId: string): CreateWellInput {
  return { code: '1064', type: 'Универсальная', status: 'На проверке', block: '—', cell: '—', purpose: 'Эксплуатационная', site: 'Не назначен', profile: 'Не назначен', coordinates: { x: 0, y: 0 }, crs: 'EPSG:32642', depth: 0, casingDiameter: 168, depositId, lensId: '', siteId: '', projectCode: '', bgd: blankBgd(depositId) }
}

export function validateWellBgdForm(form: CreateWellInput, wells: Well[], editingId?: string): string[] {
  const bgd = form.bgd!
  const errors: string[] = []
  if (!Number.isInteger(bgd.name) || bgd.name <= 0) errors.push('Название скважины должно быть положительным целым числом.')
  if (!bgd.depositId) errors.push('Выберите месторождение.')
  if (wells.some((well) => well.id !== editingId && Number(well.code.replace(/\D/g, '')) === bgd.name && (well.bgd?.depositId ?? 'DEP-SARYTAU') === bgd.depositId)) errors.push('Скважина с таким названием уже существует в выбранном месторождении.')
  if (!form.type || !form.status) errors.push('Укажите тип и состояние скважины.')
  if (!bgd.statusChangedAt) errors.push('Укажите дату изменения состояния.')
  if (bgd.statusChangedAt && new Date(bgd.statusChangedAt).getTime() > Date.now()) errors.push('Дата изменения состояния не может быть в будущем.')
  if ((bgd.geometry.headX === null) !== (bgd.geometry.headY === null)) errors.push('Координаты X и Y устья заполняются вместе.')
  if (bgd.geometry.bottomOffsetAzimuth !== null && (bgd.geometry.bottomOffsetAzimuth < 0 || bgd.geometry.bottomOffsetAzimuth > 360)) errors.push('Азимут отклонения должен находиться в диапазоне от 0 до 360°.')
  const positiveDepths = [bgd.geometry.acceptedDepth, bgd.drilling.designDepth, bgd.drilling.drillLogDepth, bgd.drilling.loggingDepth]
  if (positiveDepths.some((value) => value !== null && value <= 0)) errors.push('Указанные глубины должны быть больше нуля.')
  const nonNegativeValues = [bgd.geometry.bottomOffsetLength, bgd.development.flowRate, bgd.development.specificFlowRate, bgd.geology.permafrostDepth, bgd.geology.groundwaterLevel]
  if (nonNegativeValues.some((value) => value !== null && value < 0)) errors.push('Отклонение, дебиты и геологические уровни не могут быть отрицательными.')
  if (bgd.passport.documentStartDate && bgd.passport.documentEndDate && bgd.passport.documentStartDate > bgd.passport.documentEndDate) errors.push('Дата начала составления документации должна быть не позже даты окончания.')
  if (bgd.passport.date && new Date(bgd.passport.date).getTime() > Date.now()) errors.push('Дата составления паспорта не может быть в будущем.')
  if (bgd.drilling.startedAt && bgd.drilling.completedAt && bgd.drilling.startedAt > bgd.drilling.completedAt) errors.push('Дата начала проходки должна быть не позже даты окончания.')
  bgd.drilling.intervals.forEach((item, index) => { if (item.drillingDiameter === null || item.drillingDiameter <= 0 || item.depthFrom === null || item.depthTo === null || item.depthFrom >= item.depthTo) errors.push(`Проверьте обязательные значения интервала бурения №${index + 1}.`) })
  bgd.development.works.forEach((item, index) => { if (!item.workType) errors.push(`Укажите вид работ при освоении №${index + 1}.`); if (item.startedAt && item.completedAt && item.startedAt > item.completedAt) errors.push(`В работе по освоению №${index + 1} дата начала позже даты окончания.`) })
  bgd.geology.impermeableIntervals.forEach((item, index) => { if (item.depthFrom === null || item.depthTo === null || item.depthFrom >= item.depthTo) errors.push(`Проверьте непроницаемый интервал №${index + 1}.`) })
  return errors
}
