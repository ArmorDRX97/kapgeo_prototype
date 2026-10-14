import { describe, expect, it } from 'vitest'
import { interpretationWells } from '../model/fixtures'
import { createAlphaDocument } from '../model/alphaDocument'
import { allAlphaRecords, alphaRecords } from '../model/alphaFixtures'
import { applyCurveOperation } from './alphaCurveOperations'
import { alphaStale, calculateElectro, calculateFlow, calculateGamma } from './alphaCalculations'
import { validateAlpha } from '../../../repository/demo/alphaInterpretationRepository'
const well = interpretationWells[0]!
describe('Alpha numerical curve editor', () => {
  it('implements add/multiply/replace while keeping the original immutable', () => {
    const doc = createAlphaDocument(well), source = alphaRecords(well)[0]!, before = JSON.stringify(source)
    const added = applyCurveOperation(well, doc, source.id, { operation: 'add', from: 120, to: 121, value: 5 }), first = added.document.derived[0]!
    expect(first.values[1200]).toBe(source.values[1200]! + 5); expect(first.values[1190]).toBe(source.values[1190])
    const multiplied = applyCurveOperation(well, added.document, first.id, { operation: 'multiply', from: 120, to: 121, value: 2 })
    expect(multiplied.recordId).toBe(first.id); expect(multiplied.document.derived[0]!.values[1200]).toBe(first.values[1200]! * 2)
    const replaced = applyCurveOperation(well, multiplied.document, first.id, { operation: 'replace', from: 120, to: 121, value: 123 })
    expect(replaced.document.derived[0]!.values[1200]).toBe(123); expect(replaced.document.derived[0]!.operations.at(-1)).toContain('123')
    expect(JSON.stringify(source)).toBe(before); expect(validateAlpha(well, replaced.document)).toEqual(replaced.document)
  })
  it('creates distinct branches from an original and increasing revisions for updates', () => {
    const doc = createAlphaDocument(well), one = applyCurveOperation(well, doc, 'alpha-gr', { operation: 'shift', from: NaN, to: NaN, value: 0.1 })
    const two = applyCurveOperation(well, one.document, 'alpha-gr', { operation: 'shift', from: NaN, to: NaN, value: -0.1 })
    expect(two.recordId).not.toBe(one.recordId); expect(two.document.derived).toHaveLength(2)
    const updated = applyCurveOperation(well, two.document, one.recordId, { operation: 'shift', from: NaN, to: NaN, value: 0.1 })
    const curve = updated.document.derived.find(r => r.id === one.recordId)!
    expect(curve.depths[0]).toBe(0.2); expect(curve.revision).toBe(4); expect(curve.parentId).toBe('alpha-gr')
    expect(curve.operator).toBe(alphaRecords(well)[0]!.operator)
  })
  it('masks gaps without joining across them and clips without claiming uncovered resistivity', () => {
    const doc = createAlphaDocument(well), masked = applyCurveOperation(well, doc, 'alpha-rs', { operation: 'mask', from: 120, to: 121, value: NaN })
    expect(masked.document.derived[0]!.values[1205]).toBeNull()
    const clipped = applyCurveOperation(well, doc, 'alpha-rs', { operation: 'clip', from: 120, to: 121, value: NaN })
    clipped.document.parameters.electro.recordId = clipped.recordId
    const calculated = calculateElectro(well, clipped.document)
    expect(calculated.rows.filter(r => r.rock !== 'unknown').every(r => r.from >= 120 && r.to <= 121)).toBe(true)
  })
  it('invalidates calculations using an updated derived record and rejects an entirely masked GK', () => {
    const base = createAlphaDocument(well), one = applyCurveOperation(well, base, 'alpha-gr', { operation: 'add', from: 112, to: 140, value: 1 })
    one.document.parameters.gamma.recordId = one.recordId; one.document.gamma = calculateGamma(well, one.document)
    expect(alphaStale(well, one.document, 'gamma')).toBe(false)
    const changed = applyCurveOperation(well, one.document, one.recordId, { operation: 'add', from: 112, to: 140, value: 1 })
    expect(alphaStale(well, changed.document, 'gamma')).toBe(true)
    const empty = applyCurveOperation(well, base, 'alpha-gr', { operation: 'mask', from: 0, to: well.depth, value: NaN }); empty.document.parameters.gamma.recordId = empty.recordId
    expect(() => calculateGamma(well, empty.document)).toThrow('нет пригодных')
    expect(() => applyCurveOperation(well, base, 'alpha-gr', { operation: 'shift', from: 0, to: 1, value: 0 })).toThrow('не меняет')
  })
  it('supports a distinct repeat flow source, explicit total unit and conserved Q', () => {
    const doc = createAlphaDocument(well); doc.parameters.flow.recordId = 'alpha-flow-repeat'
    expect(allAlphaRecords(well, doc).find(r => r.id === 'alpha-flow-repeat')).toMatchObject({ role: 'control', stage: 'repeat', unit: 'имп/мин' })
    expect(doc.parameters.flow.totalUnit).toBe('m3/h')
    expect(calculateFlow(well, doc).rows.reduce((s, r) => s + r.rate, 0)).toBeCloseTo(10)
  })
})
