import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defaultPersona } from '../../entities/session/model/personas'
import type { UserPersona } from '../../entities/session/model/types'
import { SessionContext } from '../../entities/session/model/sessionContext'
import { demoDatabase } from '../../repository/demo/demoDatabase'
import { primaryWell } from '../../repository/data/wells'
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
  afterEach(async () => { cleanup(); await demoDatabase.reset() })

  it('marks only the selected well and groups actions above the full-width search', async () => {
    mount()
    const well = await screen.findByRole('button', { name: /^WELL-1010/ })
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
    expect(add).toHaveTextContent('Добавить')
    const filter = screen.getByRole('button', { name: 'Фильтр' })
    expect(add.parentElement).toBe(filter.parentElement)
    expect(filter.closest('header')).toContainElement(screen.getByLabelText('Количество скважин'))
    expect(filter.closest('header')).not.toContainElement(screen.getByLabelText('Поиск по скважинам'))
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
    expect(await screen.findByRole('button', { name: /^WELL-1042$/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^WELL-1010$/ })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Сбросить фильтры' }))
    expect(await screen.findByRole('button', { name: /^WELL-1010$/ })).toBeInTheDocument()
    expect(select).toHaveValue('all')
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(button).toHaveFocus()
  })

  it('opens the unified deposit overview directly from the collapse-button row', async () => {
    mount()
    const trigger = await screen.findByRole('button', { name: 'Открыть месторождение Сарытау' })
    const collapse = screen.getByRole('button', { name: 'Свернуть список скважин' })
    expect(trigger.closest('header')).toBe(collapse.closest('header'))
    expect(trigger).not.toHaveAttribute('aria-haspopup')
    fireEvent.click(trigger)
    expect(route.navigate).toHaveBeenCalledWith({ to: '/geology/bgd/$depositId', params: { depositId: 'DEP-SARYTAU' }, search: {} })
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Сменить месторождение' })).not.toBeInTheDocument()
  })

  it('preserves the selected well section and view', async () => {
    mount()
    fireEvent.click(await screen.findByRole('button', { name: /^WELL-1010/ }))
    expect(route.navigate).toHaveBeenLastCalledWith({ to: '/geology/bgd/$depositId/wells/$wellId', params: { depositId: 'DEP-SARYTAU', wellId: primaryWell.id }, search: { tab: 'lithology', view: 'composite' }, resetScroll: false })
  })

  it('keeps deposit viewing and search available for a read-only user', async () => {
    mount(true)
    expect(await screen.findByRole('button', { name: 'Открыть месторождение Сарытау' })).toBeEnabled()
    expect(screen.queryByRole('button', { name: 'Редактировать' })).not.toBeInTheDocument()
    expect(screen.getByLabelText('Поиск по скважинам')).toBeEnabled()
    expect(screen.queryByRole('button', { name: 'Добавить скважину' })).not.toBeInTheDocument()
  })
})
