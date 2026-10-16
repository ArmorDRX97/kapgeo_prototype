import { describe, expect, it } from 'vitest'
import { getLogSurveyMetadata, validateBgdWellLogDraft, type BgdWellLogDraft } from './bgdWellLog'
import type { LogRunV2 } from '../../../entities/well-log/model/types'

const validDraft: BgdWellLogDraft = {
  name: 'Комплекс ГК + ПС',
  measuredAt: '2026-09-08',
  operator: 'Марат Омаров',
  instrument: 'РКС-3',
  zone: 'Ствол скважины',
  isPrimary: true,
  isControl: false,
  probe: 'Комплексный',
  instrumentDiameterCm: 3.8,
  boreholeDiameterCm: 15.2,
  comment: 'Детерминированная демонстрационная запись.',
  source: 'LAS',
  from: 0,
  to: 600,
  step: 0.2,
  curveCodes: ['GR', 'SP'],
}

describe('validateBgdWellLogDraft', () => {
  it('accepts a complete survey inside the well depth', () => {
    expect(validateBgdWellLogDraft(validDraft, 612.4)).toEqual([])
  })

  it('rejects an inverted or over-depth interval and missing measurement curves', () => {
    expect(validateBgdWellLogDraft({ ...validDraft, from: 620, to: 615, curveCodes: [] }, 612.4)).toEqual([
      'Интервал должен иметь корректные границы «от» и «до».',
      'Интервал каротажа не может быть глубже скважины.',
      'Выберите хотя бы одну измеряемую кривую.',
    ])
  })

  it('rejects an invalid probe length and non-positive optional diameters', () => {
    expect(validateBgdWellLogDraft({ ...validDraft, probe: 'x'.repeat(256), instrumentDiameterCm: 0, boreholeDiameterCm: -1 }, 612.4)).toEqual([
      'Название зонда не должно превышать 255 символов.',
      'Диаметр прибора должен быть больше нуля.',
      'Диаметр скважины должен быть больше нуля.',
    ])
  })

  it('accepts all optional survey fields, including zero coefficient and text density', () => {
    expect(validateBgdWellLogDraft({
      ...validDraft,
      detectorLengthCm: 12.5,
      ecProbeLengthM: 1.8,
      measurementPointCount: 0,
      drillingFluidDensity: '1,18 г/см³',
      casingStringType: 'Обсадная колонна Ø146 мм',
      coefficient: 0,
    }, 612.4)).toEqual([])
  })

  it('accepts legacy drafts without the new optional fields', () => {
    const { detectorLengthCm, ecProbeLengthM, measurementPointCount, drillingFluidDensity, casingStringType, coefficient, ...legacyDraft } = validDraft
    void [detectorLengthCm, ecProbeLengthM, measurementPointCount, drillingFluidDensity, casingStringType, coefficient]
    expect(validateBgdWellLogDraft(legacyDraft, 612.4)).toEqual([])
  })

  it('defaults missing survey metadata and preserves supplied survey values', () => {
    const legacyRun = { survey: undefined } as unknown as LogRunV2
    expect(getLogSurveyMetadata(legacyRun)).toMatchObject({
      detectorLengthCm: null,
      ecProbeLengthM: null,
      measurementPointCount: null,
      drillingFluidDensity: '',
      casingStringType: '',
      coefficient: null,
    })
    const runWithSurvey = { survey: { ...validDraft, drillingFluidDensity: '1,18', coefficient: 0 } } as unknown as LogRunV2
    expect(getLogSurveyMetadata(runWithSurvey)).toMatchObject({ drillingFluidDensity: '1,18', coefficient: 0 })
  })

  it('rejects invalid optional lengths, counts and non-finite coefficients', () => {
    expect(validateBgdWellLogDraft({ ...validDraft, detectorLengthCm: 0, ecProbeLengthM: -1, measurementPointCount: 1.5, coefficient: Number.POSITIVE_INFINITY }, 612.4)).toEqual([
      'Длина детектора должна быть больше нуля.',
      'Длина зонда ЭК должна быть больше нуля.',
      'Количество точек измерения должно быть неотрицательным целым числом.',
      'Коэффициент должен быть конечным числом.',
    ])
  })
})
