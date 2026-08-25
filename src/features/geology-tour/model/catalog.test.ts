import { describe, expect, it } from 'vitest'
import { geologyTourCoveredRoutes, geologyTourDefinitions } from './catalog'

const requiredRoutes = [
  '/geology',
  '/geology/master',
  '/geology/methodology',
  '/geology/map',
  '/geology/wells',
  '/geology/wells/new',
  '/objects/wells/WELL-1042',
  '/objects/wells/WELL-1042?tab=passport',
  '/objects/wells/WELL-1042?tab=drilling',
  '/objects/wells/WELL-1042?tab=lithology',
  '/objects/wells/WELL-1042?tab=logs',
  '/objects/wells/WELL-1042?tab=samples',
  '/objects/wells/WELL-1042?tab=technology',
  '/objects/wells/WELL-1042?tab=equipment',
  '/objects/wells/WELL-1042?tab=model',
  '/objects/wells/WELL-1042?tab=documents',
  '/objects/wells/WELL-1042?tab=audit',
  '/geology/interpretations/INT-WELL-1042-07/compare',
  '/geology/correlation',
  '/geology/reserves',
  '/geology/delivery',
]

describe('geology tour catalog', () => {
  it('covers every current geology route and every well tab', () => {
    expect(geologyTourCoveredRoutes).toEqual(expect.arrayContaining(requiredRoutes))
  })

  it('keeps definitions and step identifiers unique and actionable', () => {
    const tourIds = geologyTourDefinitions.map((tour) => tour.id)
    expect(new Set(tourIds).size).toBe(tourIds.length)
    for (const tour of geologyTourDefinitions) {
      expect(tour.steps.length).toBeGreaterThan(0)
      expect(new Set(tour.steps.map((step) => step.id)).size).toBe(tour.steps.length)
      for (const step of tour.steps) {
        expect(step.route).toMatch(/^\//)
        expect(step.target.selector).not.toBe('')
        expect(step.title).not.toBe('')
        expect(step.description.length).toBeGreaterThan(20)
      }
    }
  })

  it('offers a complete route plus shorter thematic routes', () => {
    const complete = geologyTourDefinitions.find((tour) => tour.id === 'geology-complete')!
    expect(complete.steps.length).toBeGreaterThan(60)
    expect(geologyTourDefinitions.length).toBeGreaterThanOrEqual(6)
    expect(geologyTourDefinitions.every((tour) => tour.estimatedMinutes > 0)).toBe(true)
  })
})
