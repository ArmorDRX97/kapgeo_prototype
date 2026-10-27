import { describe, expect, it } from 'vitest'
import { exampleFacts, factsCsv, parseFactsCsv } from './model'

describe('review CSV interchange', () => {
  it('round-trips Cyrillic identifiers, quotes and decimal values', () => {
    const rows = [{ ...exampleFacts[0]!, well: 'Скважина "А";1' }]
    expect(parseFactsCsv(factsCsv(rows))).toEqual(rows)
  })
  it('rejects invalid geometry and duplicate well numbers before applying a batch', () => {
    expect(() => parseFactsCsv(factsCsv([{ ...exampleFacts[0]!, to: 9999 }]))).toThrow(/Строка 2/)
    expect(() => parseFactsCsv(factsCsv([exampleFacts[0]!, exampleFacts[0]!]))).toThrow(/повторяющиеся/)
    expect(() => parseFactsCsv('well;x\nA;1')).toThrow(/шаблону/)
  })
})
