import type { DeviationAzimuthKind, DeviationPoint, DeviationSurvey } from '../../../entities/well-deviation/model/types'
export { calculateDeviationSurvey } from '../../../entities/well-deviation/lib/calculation'

export type DeviationPointDraft = Pick<DeviationPoint, 'id' | 'depth' | 'azimuth' | 'zenithAngle'>

export type DeviationSurveyDraft = Pick<DeviationSurvey,
  'surveyDate' | 'azimuthKind' | 'correctionAngle' | 'isPrimary' | 'operatorId' | 'device' | 'minZenithAngle' | 'comment'
> & { points: DeviationPointDraft[] }

export const azimuthKindLabels: Record<DeviationAzimuthKind, string> = {
  true: 'Истинный',
  magnetic: 'Магнитный',
}

export function deviationSurveyDraft(survey: DeviationSurvey): DeviationSurveyDraft {
  return {
    surveyDate: survey.surveyDate,
    azimuthKind: survey.azimuthKind,
    correctionAngle: survey.correctionAngle,
    isPrimary: survey.isPrimary,
    operatorId: survey.operatorId,
    device: survey.device,
    minZenithAngle: survey.minZenithAngle,
    comment: survey.comment,
    points: survey.points.map(({ id, depth, azimuth, zenithAngle }) => ({ id, depth, azimuth, zenithAngle })),
  }
}

export function createDeviationSurveyDraft(defaults?: Partial<Pick<DeviationSurveyDraft, 'correctionAngle' | 'minZenithAngle'>>): DeviationSurveyDraft {
  return {
    surveyDate: '2026-08-24T09:00',
    azimuthKind: 'true',
    correctionAngle: defaults?.correctionAngle ?? 0,
    isPrimary: false,
    operatorId: '',
    device: '',
    minZenithAngle: defaults?.minZenithAngle ?? 0,
    comment: '',
    points: [
      { id: 'POINT-DRAFT-01', depth: 0, azimuth: 0, zenithAngle: 0 },
      { id: 'POINT-DRAFT-02', depth: 25, azimuth: 0, zenithAngle: 0 },
    ],
  }
}

export function validateDeviationSurveyDraft(draft: DeviationSurveyDraft, wellDepth: number, today = new Date()): string[] {
  const errors: string[] = []
  if (!draft.surveyDate) errors.push('Укажите дату проведения промера.')
  else if (new Date(draft.surveyDate).getTime() > today.getTime()) errors.push('Дата проведения не может быть позже текущей даты.')
  if (!Number.isFinite(draft.correctionAngle)) errors.push('Укажите числовой поправочный угол.')
  if (!Number.isFinite(draft.minZenithAngle) || draft.minZenithAngle < 0) errors.push('Минимальный зенитный угол должен быть не меньше нуля.')
  if (draft.comment.length > 255) errors.push('Комментарий не должен превышать 255 символов.')
  if (draft.points.length < 2) errors.push('Добавьте минимум две точки измерения.')
  const depths = new Set<number>()
  for (const [index, point] of draft.points.entries()) {
    const row = index + 1
    if (!Number.isFinite(point.depth) || point.depth < 0) errors.push(`Строка ${row}: глубина должна быть не меньше нуля.`)
    else if (point.depth > wellDepth) errors.push(`Строка ${row}: глубина превышает глубину скважины ${wellDepth} м.`)
    else if (depths.has(point.depth)) errors.push(`Строка ${row}: глубина ${point.depth} м уже используется.`)
    depths.add(point.depth)
    if (!Number.isFinite(point.azimuth) || point.azimuth < 0 || point.azimuth > 360) errors.push(`Строка ${row}: азимут должен быть от 0 до 360°.`)
    if (!Number.isFinite(point.zenithAngle) || point.zenithAngle < 0) errors.push(`Строка ${row}: зенитный угол должен быть не меньше нуля.`)
  }
  return errors
}
