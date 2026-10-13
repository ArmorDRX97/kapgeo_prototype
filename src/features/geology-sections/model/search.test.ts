import { expect, it } from 'vitest'
import { validateSectionSearch } from './search'
import { sectionViews } from '../../../entities/geology-section/model/types'
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
