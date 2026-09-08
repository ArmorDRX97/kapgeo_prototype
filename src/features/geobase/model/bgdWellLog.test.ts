import { describe, expect, it } from 'vitest'
import { validateBgdWellLogDraft, type BgdWellLogDraft } from './bgdWellLog'

const validDraft: BgdWellLogDraft = {
  name: 'Комплекс ГК + ПС',
  measuredAt: '2026-09-08',
  operator: 'Марат Омаров',
  instrument: 'РКС-3',
  zone: 'Ствол скважины',
  isPrimary: true,
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

  it('rejects an inverted or over-depth interval and empty channels', () => {
    expect(validateBgdWellLogDraft({ ...validDraft, from: 620, to: 615, curveCodes: [] }, 612.4)).toEqual([
      'Интервал должен иметь корректные границы «от» и «до».',
      'Интервал каротажа не может быть глубже скважины.',
      'Выберите хотя бы один канал данных.',
    ])
  })
})
