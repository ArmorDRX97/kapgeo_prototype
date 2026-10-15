import { expect, it } from 'vitest'
import { validateSectionSearch } from './search'
import { sectionViews } from '../../../entities/geology-section/model/types'
import { sectionStageValues } from '../../../entities/geology-section/model/stages'
it('accepts all six stages independently of main/auxiliary and retains grouping context',()=>{
  for(const stage of sectionStageValues) expect(validateSectionSearch({stage,kind:'auxiliary',groupBy:'stage'})).toMatchObject({stage,kind:'auxiliary',groupBy:'stage'})
  expect(validateSectionSearch({stage:'technology'}).stage).toBeUndefined()
})
it('retains shareable registry context and rejects incompatible section modes', () => {
  expect(validateSectionSearch({ view: 'ore', mode: 'foundation', year: '2026', kind: 'auxiliary', q: 'профиль', groupBy: 'body', body: 'Залежь 1' })).toMatchObject({ view: 'ore', mode: undefined, year: 2026, kind: 'auxiliary', q: 'профиль', groupBy: 'body', body: 'Залежь 1' })
  expect(validateSectionSearch({ view: 'absent', mode: 'layers', year: 9999, kind: 'absent', selection: 'x'.repeat(501) })).toMatchObject({ view: undefined, mode: undefined, year: undefined, kind: undefined, selection: undefined })
  expect(validateSectionSearch({ view: 'technology', mode: 'rhythm', selection: 'old-roof' })).toMatchObject({ view: 'technology', mode: undefined, selection: undefined })
})

it('opens legacy profile and wells links in the unified section tab without losing registry context', () => {
  for (const view of ['overview', 'profile', 'wells']) {
    expect(validateSectionSearch({ view, mode: 'layers', q: 'Северный', year: 2026, groupBy: 'year', kind: 'main' })).toMatchObject({
      view: 'overview', mode: undefined, q: 'Северный', year: 2026, groupBy: 'year', kind: 'main',
    })
  }
  expect(sectionViews[0]).toEqual({ id: 'overview', label: 'Разрез' })
  expect(sectionViews.some(view => ['profile', 'wells'].includes(view.id))).toBe(false)
})

it('validates block filters, sort options, and new grouping options from the URL', () => {
  expect(validateSectionSearch({ geoBlock: 'Geo A', techBlock: 'Tech B', sortBy: 'title', sortDirection: 'asc', groupBy: 'geoBlock' })).toMatchObject({
    geoBlock: 'Geo A', techBlock: 'Tech B', sortBy: 'title', sortDirection: 'asc', groupBy: 'geoBlock',
  })
  expect(validateSectionSearch({ sortBy: 'bogus', sortDirection: 'sideways', groupBy: 'bogus' })).toMatchObject({
    sortBy: undefined, sortDirection: undefined, groupBy: undefined,
  })
})
