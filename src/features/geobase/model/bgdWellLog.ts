import type { LogCurveCode, LogRunV2, LogSurveyMetadata } from '../../../entities/well-log/model/types'

export type BgdWellLogDraft = LogSurveyMetadata & {
  name: string
  source: LogRunV2['source']
  from: number
  to: number
  step: number
  curveCodes: LogCurveCode[]
  isControl: boolean
  probe: string
  instrumentDiameterCm: number | null
  boreholeDiameterCm: number | null
}

export function getLogSurveyMetadata(run: LogRunV2): LogSurveyMetadata {
  const defaults: LogSurveyMetadata = {
    measuredAt: '2026-04-18',
    operator: 'Не указан',
    instrument: 'Не указан',
    zone: 'Ствол скважины',
    isPrimary: false,
    comment: 'Комментарий не добавлен.',
    isControl: false,
    probe: '',
    instrumentDiameterCm: null,
    boreholeDiameterCm: null,
    detectorLengthCm: null,
    ecProbeLengthM: null,
    measurementPointCount: null,
    drillingFluidDensity: '',
    casingStringType: '',
    coefficient: null,
  }
  return { ...defaults, ...run.survey }
}

export function validateBgdWellLogDraft(draft: BgdWellLogDraft, wellDepth: number) {
  const errors: string[] = []
  if (!draft.name.trim()) errors.push('Укажите название каротажа.')
  if (!draft.measuredAt) errors.push('Укажите дату каротажа.')
  if (!draft.operator.trim()) errors.push('Укажите оператора.')
  if (!draft.instrument.trim()) errors.push('Укажите прибор.')
  if (draft.from < 0 || draft.to <= draft.from) errors.push('Интервал должен иметь корректные границы «от» и «до».')
  if (wellDepth > 0 && draft.to > wellDepth) errors.push('Интервал каротажа не может быть глубже скважины.')
  if (draft.step <= 0) errors.push('Шаг измерения должен быть больше нуля.')
  if (!draft.curveCodes.length) errors.push('Выберите хотя бы одну измеряемую кривую.')
  if (draft.probe.length > 255) errors.push('Название зонда не должно превышать 255 символов.')
  if (draft.instrumentDiameterCm !== null && (!Number.isFinite(draft.instrumentDiameterCm) || draft.instrumentDiameterCm <= 0)) errors.push('Диаметр прибора должен быть больше нуля.')
  if (draft.boreholeDiameterCm !== null && (!Number.isFinite(draft.boreholeDiameterCm) || draft.boreholeDiameterCm <= 0)) errors.push('Диаметр скважины должен быть больше нуля.')
  if (draft.detectorLengthCm != null && (!Number.isFinite(draft.detectorLengthCm) || draft.detectorLengthCm <= 0)) errors.push('Длина детектора должна быть больше нуля.')
  if (draft.ecProbeLengthM != null && (!Number.isFinite(draft.ecProbeLengthM) || draft.ecProbeLengthM <= 0)) errors.push('Длина зонда ЭК должна быть больше нуля.')
  if (draft.measurementPointCount != null && (!Number.isFinite(draft.measurementPointCount) || !Number.isInteger(draft.measurementPointCount) || draft.measurementPointCount < 0)) errors.push('Количество точек измерения должно быть неотрицательным целым числом.')
  if (draft.coefficient != null && !Number.isFinite(draft.coefficient)) errors.push('Коэффициент должен быть конечным числом.')
  return errors
}
