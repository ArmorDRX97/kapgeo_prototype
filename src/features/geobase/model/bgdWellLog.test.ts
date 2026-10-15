import { describe, expect, it } from 'vitest'
import { validateBgdWellLogDraft, type BgdWellLogDraft } from './bgdWellLog'

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
})
