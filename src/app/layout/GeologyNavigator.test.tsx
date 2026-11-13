import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defaultPersona } from '../../entities/session/model/personas'
import type { UserPersona } from '../../entities/session/model/types'
import { SessionContext } from '../../entities/session/model/sessionContext'
import { demoDatabase } from '../../repository/demo/demoDatabase'
import { bgdFieldWells } from '../../features/geobase/model/bgdField'
import { primaryWell } from '../../repository/data/wells'
import * as api from '../../repository/api'
import { setUiLocale } from '../../shared/lib/useUiLocale'
import { GeologyNavigator } from './GeologyNavigator'

const route = vi.hoisted(() => ({ navigate: vi.fn(), location: { pathname: '/geology/bgd/DEP-SARYTAU/wells/WELL-1019', search: { tab: 'lithology', view: 'composite' } } }))
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => route.navigate, useRouterState: () => route.location }))

function mount(readOnly = false) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const persona: UserPersona = readOnly ? { ...defaultPersona, roles: ['R3'] } : defaultPersona
  render(<QueryClientProvider client={client}><SessionContext.Provider value={{ status: 'authenticated', persona, signIn: () => persona, signOut: vi.fn(), switchPersona: vi.fn() }}><GeologyNavigator mobileOpen={false} onClose={vi.fn()} onToggle={vi.fn()} /></SessionContext.Provider></QueryClientProvider>)
}

describe('BGD deposit navigation', () => {
  beforeEach(async () => { route.navigate.mockReset(); await demoDatabase.reset() })
  afterEach(async () => { cleanup(); vi.restoreAllMocks(); setUiLocale('ru'); await demoDatabase.reset() })

  it('marks only the selected well and places icon actions to the right of search', async () => {
    mount()
    await screen.findByRole('button', { name: 'WELL-1019' }, { timeout: 3000 })
    fireEvent.change(screen.getByLabelText('Поиск по скважинам'), { target: { value: '1010' } })
    const well = await screen.findByRole('button', { name: /^WELL-1010/ })
    expect(screen.getByTitle('Всего скважин')).toHaveTextContent('8 215')
    expect(well).toHaveTextContent(/^WELL-1010$/)
    expect(well.querySelector('svg, i')).toBeNull()
    expect(well.querySelector('.well-navigator__selected')).toBeNull()
    const selected = screen.getByRole('button', { name: /^WELL-1019$/ })
    expect(selected).toHaveAttribute('aria-current', 'page')
    expect(selected.querySelector('.well-navigator__selected')).toHaveAttribute('aria-hidden', 'true')
    expect(screen.queryByRole('button', { name: /избранн/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Все' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Требуют внимания' })).not.toBeInTheDocument()
    const add = screen.getByRole('button', { name: 'Добавить скважину' })
    const filter = screen.getByRole('button', { name: 'Фильтр' })
    expect(add.textContent).toBe('')
    expect(filter.textContent).toBe('')
    const search = screen.getByLabelText('Поиск по скважинам')
    const row = search.closest('.well-navigator__search-row')!
    expect(row).toContainElement(add)
    expect(row).toContainElement(filter)
    expect(search.compareDocumentPosition(add) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(add.compareDocumentPosition(filter) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    fireEvent.click(add)
    expect(route.navigate).toHaveBeenCalledWith({ to: '/geology/bgd/$depositId/wells/new', params: { depositId: 'DEP-SARYTAU' } })
  })

  it('opens a side filter panel, filters wells, and restores them with reset', async () => {
    mount()
    const button = screen.getByRole('button', { name: 'Фильтр' })
    expect(button).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'true')
    const dialog = screen.getByRole('dialog', { name: 'Фильтры скважин' })
    expect(screen.getByRole('complementary', { name: 'Навигация модуля БГД' })).not.toContainElement(dialog)
    const select = screen.getByRole('combobox', { name: 'Статус скважины' })
    fireEvent.change(select, { target: { value: 'Требует внимания' } })
    expect(await screen.findByText(bgdFieldWells.find(w => w.status === 'Требует внимания')!.name)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^WELL-1010$/ })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Сбросить фильтры' }))
    expect(await screen.findByText(bgdFieldWells[0]!.name)).toBeInTheDocument()
    expect(select).toHaveValue('all')
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(button).toHaveFocus()
  })

  it('opens the map directly from the icon row and the details from the information dropdown', async () => {
    mount()
    await screen.findByText('Сарытау')
    const trigger = screen.getByRole('button', { name: 'Карта' })
    const info = screen.getByRole('button', { name: 'Информация' })
    const collapse = screen.getByRole('button', { name: 'Свернуть список скважин' })
    expect(trigger.closest('header')).toBe(collapse.closest('header'))
    expect(trigger.closest('header')).toBe(info.closest('header'))
    fireEvent.click(trigger)
    expect(route.navigate).toHaveBeenCalledWith({ to: '/geology/bgd/$depositId', params: { depositId: 'DEP-SARYTAU' }, search: {} })
    expect(screen.queryByRole('button', { name: 'Сменить месторождение' })).not.toBeInTheDocument()
    fireEvent.pointerEnter(info, { pointerType: 'mouse' })
    expect(info).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Сведения о месторождении' }))
    expect(route.navigate).toHaveBeenLastCalledWith({ to: '/geology/bgd/$depositId/conditions', params: { depositId: 'DEP-SARYTAU' } })
    expect(info).toHaveAttribute('aria-expanded', 'false')
  })

  it('shows the localized deposit name and description in the navigation', async () => {
    mount()
    await screen.findByText('Сарытау')
    act(() => setUiLocale('en'))
    expect(screen.getByText('Sarytau')).toBeVisible()
    const description = screen.getByRole('button', { name: 'Описание месторождения' })
    fireEvent.pointerEnter(description, { pointerType: 'mouse' })
    const panel = screen.getByRole('region', { name: 'Описание месторождения' })
    expect(panel).toHaveTextContent('Sarytau uranium deposit.')
    fireEvent.keyDown(panel, { key: 'Escape' })
    expect(description).toHaveAttribute('aria-expanded', 'false')
    expect(panel).not.toBeInTheDocument()
  })

  it('switches deposits from the information dropdown and saves the preference', async () => {
    mount()
    await screen.findByText('Сарытау')
    fireEvent.click(screen.getByRole('button', { name: 'Информация' }))
    fireEvent.click(screen.getByRole('button', { name: 'Сменить месторождение' }))
    const dialog = screen.getByRole('dialog', { name: 'Сменить месторождение' })
    expect(within(dialog).queryByRole('button', { name: /Восточная/ })).not.toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: /Северное/ }))
    await waitFor(() => expect(route.navigate).toHaveBeenCalledWith({ to: '/geology/bgd/$depositId', params: { depositId: 'DEP-SEVERNOE' }, search: {} }))
    expect((await api.fetchPlatformPreferences()).currentDepositId).toBe('DEP-SEVERNOE')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('keeps the current deposit and shows a switching failure without navigation', async () => {
    vi.spyOn(api, 'savePlatformPreferences').mockRejectedValueOnce(new Error('Настройки не сохранены.'))
    mount()
    await screen.findByText('Сарытау')
    fireEvent.click(screen.getByRole('button', { name: 'Информация' }))
    fireEvent.click(screen.getByRole('button', { name: 'Сменить месторождение' }))
    const dialog = screen.getByRole('dialog', { name: 'Сменить месторождение' })
    fireEvent.click(within(dialog).getByRole('button', { name: /Северное/ }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Настройки не сохранены.')
    expect(route.navigate).not.toHaveBeenCalled()
    expect((await api.fetchPlatformPreferences()).currentDepositId).toBe('DEP-SARYTAU')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Отменить' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Информация' })).toHaveFocus()
  })

  it('preserves the selected well section and view', async () => {
    mount()
    await screen.findByText('Сарытау')
    fireEvent.change(screen.getByLabelText('Поиск по скважинам'), { target: { value: '1010' } })
    fireEvent.click(await screen.findByRole('button', { name: /^WELL-1010/ }))
    expect(route.navigate).toHaveBeenLastCalledWith({ to: '/geology/bgd/$depositId/wells/$wellId', params: { depositId: 'DEP-SARYTAU', wellId: primaryWell.id }, search: { tab: 'lithology', view: 'composite' }, resetScroll: false })
  })

  it('keeps deposit viewing and search available for a read-only user', async () => {
    mount(true)
    await screen.findByText('Сарытау')
    expect(screen.getByRole('button', { name: 'Карта' })).toBeEnabled()
    expect(screen.queryByRole('button', { name: 'Редактировать' })).not.toBeInTheDocument()
    expect(screen.getByLabelText('Поиск по скважинам')).toBeEnabled()
    expect(screen.queryByRole('button', { name: 'Добавить скважину' })).not.toBeInTheDocument()
  })
  it('loads the catalogue in batches of 80 and searches beyond the loaded batch', async () => {
    mount()
    await screen.findByText('Сарытау')
    const catalogueRows = () => screen.getAllByRole('button', { name: /^\d/ })
    expect(catalogueRows()).toHaveLength(80)
    fireEvent.click(screen.getByRole('button', { name: 'Показать ещё 80' }))
    expect(catalogueRows()).toHaveLength(160)
    fireEvent.change(screen.getByLabelText('Поиск по скважинам'), { target: { value: bgdFieldWells[8000]!.name } })
    expect(await screen.findByText(bgdFieldWells[8000]!.name)).toBeInTheDocument()
    expect(catalogueRows().length).toBeLessThan(80)
  })
})
