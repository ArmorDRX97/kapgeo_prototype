import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defaultPersona } from '../../entities/session/model/personas'
import type { UserPersona } from '../../entities/session/model/types'
import { SessionContext } from '../../entities/session/model/sessionContext'
import { demoDatabase } from '../../repository/demo/demoDatabase'
import { fetchPlatformPreferences } from '../../repository/api'
import { primaryWell } from '../../repository/data/wells'
import { GeologyNavigator } from './GeologyNavigator'

const route = vi.hoisted(() => ({ navigate: vi.fn(), location: { pathname: '/geology/bgd/DEP-SARYTAU/wells/WELL-1019', search: { tab: 'lithology', view: 'composite' } } }))
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => route.navigate, useRouterState: () => route.location }))

function mount(readOnly = false) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const persona: UserPersona = readOnly ? { ...defaultPersona, roles: ['R3'] } : defaultPersona
  render(<QueryClientProvider client={client}><SessionContext.Provider value={{ status: 'authenticated', persona, signIn: () => persona, signOut: vi.fn(), switchPersona: vi.fn() }}><GeologyNavigator mobileOpen={false} onClose={vi.fn()} onToggle={vi.fn()} /></SessionContext.Provider></QueryClientProvider>)
}

describe('BGD deposit menu', () => {
  beforeEach(async () => { route.navigate.mockReset(); await demoDatabase.reset() })
  afterEach(async () => { cleanup(); await demoDatabase.reset() })

  it('keeps sections inside the dropdown and supports keyboard navigation, dismissal and real section links', async () => {
    mount()
    const trigger = await screen.findByRole('button', { name: 'Меню месторождения Сарытау' })
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(screen.queryByText('Основные сведения')).not.toBeInTheDocument()
    fireEvent.keyDown(trigger, { key: 'ArrowDown' })
    const overview = screen.getByRole('menuitem', { name: 'Основные сведения' })
    expect(overview).toHaveFocus()
    fireEvent.keyDown(overview, { key: 'ArrowDown' })
    expect(screen.getByRole('menuitem', { name: /Участки и залежи/ })).toHaveFocus()
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' })
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
    fireEvent.click(trigger)
    fireEvent.click(screen.getByRole('menuitem', { name: /Кондиционные лимиты/ }))
    expect(route.navigate).toHaveBeenCalledWith({ to: '/geology/bgd/$depositId', params: { depositId: 'DEP-SARYTAU' }, search: { section: 'conditions' } })
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('switches deposits from the same dropdown, saves the preference and preserves the well view', async () => {
    mount()
    fireEvent.click(await screen.findByRole('button', { name: 'Меню месторождения Сарытау' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Сменить месторождение' }))
    expect(screen.getByRole('menuitemradio', { name: /Сарытау/ })).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(screen.getByRole('menuitemradio', { name: /Северное/ }))
    expect(route.navigate).toHaveBeenCalledWith({ to: '/geology/bgd/$depositId', params: { depositId: 'DEP-SEVERNOE' } })
    await waitFor(async () => expect((await fetchPlatformPreferences()).currentDepositId).toBe('DEP-SEVERNOE'))
    fireEvent.click(await screen.findByRole('button', { name: /^WELL-1010/ }))
    expect(route.navigate).toHaveBeenLastCalledWith({ to: '/geology/bgd/$depositId/wells/$wellId', params: { depositId: 'DEP-SARYTAU', wellId: primaryWell.id }, search: { tab: 'lithology', view: 'composite' }, resetScroll: false })
  })

  it('closes on an outside click and omits editing for a read-only user', async () => {
    mount(true)
    fireEvent.click(await screen.findByRole('button', { name: 'Меню месторождения Сарытау' }))
    expect(screen.queryByRole('menuitem', { name: 'Редактирование' })).not.toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Сменить месторождение' })).toBeInTheDocument()
    fireEvent.pointerDown(document.body)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(await screen.findByLabelText('Поиск по скважинам')).toBeEnabled()
  })
})
