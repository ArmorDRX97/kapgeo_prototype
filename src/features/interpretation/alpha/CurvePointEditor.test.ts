import { describe, expect, it } from 'vitest'
import { correctCurvePoint } from './curvePoint'
import { interpretationWells } from '../../../entities/interpretation/model/fixtures'
import { createAlphaDocument } from '../../../entities/interpretation/model/alphaDocument'
import { allAlphaRecords } from '../../../entities/interpretation/model/alphaFixtures'
import { validateAlpha } from '../../../repository/demo/alphaInterpretationRepository'

describe('point correction', () => {
  const well = interpretationWells.find(w => w.id === 'int-demo-01')!
  it('keeps the source immutable and saves a valid derived record', () => {
    const doc = createAlphaDocument(well), source = allAlphaRecords(well, doc)[0]!, old = source.values[1]
    const result = correctCurvePoint(well, doc, source.id, 1, source.depths[1]!, 123)
    expect(doc.derived).toHaveLength(0)
    expect(source.values[1]).toBe(old)
    expect(result.document.derived[0]!.parentId).toBe(source.id)
    expect(validateAlpha(well, result.document).derived[0]!.values[1]).toBe(123)
  })
  it('rejects crossing neighbours and nonfinite values', () => {
    const doc = createAlphaDocument(well), source = allAlphaRecords(well, doc)[0]!
    expect(() => correctCurvePoint(well, doc, source.id, 1, source.depths[0]!, 2)).toThrow(/между соседними/)
    expect(() => correctCurvePoint(well, doc, source.id, 1, source.depths[1]!, NaN)).toThrow()
  })
})
