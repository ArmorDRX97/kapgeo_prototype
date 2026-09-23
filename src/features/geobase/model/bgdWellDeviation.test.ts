import { describe, expect, it } from 'vitest'
import { calculateDeviationSurvey, createDeviationSurveyDraft, validateDeviationSurveyDraft } from './bgdWellDeviation'

describe('BGD well deviation model', () => {
  it('calculates vertical displacement and integral characteristics', () => {
    const draft = createDeviationSurveyDraft()
    draft.points = [
      { id: 'P1', depth: 0, azimuth: 0, zenithAngle: 0 },
      { id: 'P2', depth: 100, azimuth: 0, zenithAngle: 0 },
    ]
    const result = calculateDeviationSurvey(draft)
    expect(result.points[1]).toMatchObject({ dx: 0, dy: 0, dz: 100 })
    expect(result).toMatchObject({ planDistance: 0, zenithTopBottom: 0, bearingTopBottom: 0 })
  })

  it('sorts points and applies correction angle with the average-angle method', () => {
    const draft = createDeviationSurveyDraft({ correctionAngle: 10 })
    draft.points = [
      { id: 'P2', depth: 100, azimuth: 80, zenithAngle: 10 },
      { id: 'P1', depth: 0, azimuth: 80, zenithAngle: 10 },
    ]
    const result = calculateDeviationSurvey(draft)
    expect(result.points.map((point) => point.depth)).toEqual([0, 100])
    expect(result.planDistance).toBeCloseTo(17.365, 3)
    expect(result.bearingTopBottom).toBeCloseTo(90, 3)
  })

  it('validates duplicate depths, ranges and comment length', () => {
    const draft = createDeviationSurveyDraft()
    draft.comment = 'x'.repeat(256)
    draft.points = [
      { id: 'P1', depth: 20, azimuth: -1, zenithAngle: 0 },
      { id: 'P2', depth: 20, azimuth: 10, zenithAngle: -1 },
    ]
    expect(validateDeviationSurveyDraft(draft, 100, new Date('2026-09-23T12:00:00'))).toEqual(expect.arrayContaining([
      expect.stringContaining('255'),
      expect.stringContaining('уже используется'),
      expect.stringContaining('азимут'),
      expect.stringContaining('зенитный'),
    ]))
  })
})

