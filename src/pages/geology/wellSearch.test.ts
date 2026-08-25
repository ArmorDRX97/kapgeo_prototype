import { describe, expect, it } from 'vitest'
import { filtersToWellSearch, searchToWellWorkspace, searchToWellFilters, validateWellSearch } from './wellSearch'

describe('wellSearch shared workspace contract', () => {
  it('валидирует selection и workspace-состояние из search', () => {
    const validated = validateWellSearch({
      q: 'WELL',
      status: 'Работает',
      selectedWellId: 'WELL-1042',
      workspaceFocus: 'map',
      workspaceVersion: 'v3',
      workspaceScenario: 'base',
      unknown: 'ignored',
    })

    expect(validated).toEqual({
      q: 'WELL',
      status: 'Работает',
      type: undefined,
      quality: undefined,
      site: undefined,
      selectedWellId: 'WELL-1042',
      workspaceVersion: 'v3',
      workspaceScenario: 'base',
      workspaceFocus: 'map',
    })
  })

  it('дропает невалидный focus и selectedWellId из search', () => {
    const validated = validateWellSearch({
      selectedWellId: 'bad-id',
      workspaceFocus: 'invalid',
    })

    expect(validated.selectedWellId).toBeUndefined()
    expect(validated.workspaceFocus).toBeUndefined()
  })

  it('конвертирует workspace состояние из search в отдельный контракт', () => {
    const workspace = searchToWellWorkspace({
      selectedWellId: 'WELL-1060',
      workspaceScenario: 'drill',
      workspaceFocus: 'registry',
    })

    expect(workspace).toEqual({
      selectedWellId: 'WELL-1060',
      workspaceVersion: undefined,
      workspaceScenario: 'drill',
      workspaceFocus: 'registry',
    })
  })

  it('переносит workspace в WellSearch из фильтров и selection', () => {
    const withFilters = filtersToWellSearch(
      {
        query: 'PR-07',
        status: 'Работает',
        type: 'Все',
        quality: 'Высокое',
        site: 'Северный',
      },
      {
        selectedWellId: 'WELL-1057',
        workspaceVersion: 'v1',
        workspaceScenario: 'full',
        workspaceFocus: 'inspector',
      },
    )

    const converted = searchToWellWorkspace(withFilters)

    expect(converted).toEqual({
      selectedWellId: 'WELL-1057',
      workspaceVersion: 'v1',
      workspaceScenario: 'full',
      workspaceFocus: 'inspector',
    })

    expect(searchToWellFilters(withFilters)).toEqual({
      query: 'PR-07',
      status: 'Работает',
      type: 'Все',
      quality: 'Высокое',
      site: 'Северный',
    })
  })
})
