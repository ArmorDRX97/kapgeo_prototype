import { describe, expect, it } from 'vitest'
import { validateWellTabSearch } from './wellTabSearch'

describe('validateWellTabSearch', () => {
  it('сохраняет workspace и q/status с card workflow', () => {
    const search = validateWellTabSearch({
      q: 'WELL',
      status: 'На проверке',
      selectedWellId: 'WELL-1042',
      workspaceFocus: 'map',
      tab: 'passport',
    })

    expect(search).toMatchObject({
      q: 'WELL',
      status: 'На проверке',
      selectedWellId: 'WELL-1042',
      workspaceFocus: 'map',
      tab: 'passport',
    })
  })

  it('дропает невалидный tab и фокус карты при открытии карточки', () => {
    const search = validateWellTabSearch({
      workspaceFocus: 'registry',
      workspaceScenario: 'reserves',
      selectedWellId: 'WELL-1060',
      tab: 'invalid',
    })

    expect(search).toMatchObject({
      selectedWellId: 'WELL-1060',
      workspaceFocus: 'registry',
      workspaceScenario: 'reserves',
      tab: undefined,
    })
  })
})
