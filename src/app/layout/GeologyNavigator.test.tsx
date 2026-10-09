import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
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

  it('shows compact well titles with accessible statuses and opens well creation', async () => {
    mount()
    const well = await screen.findByRole('button', { name: /^WELL-1010/ })
    expect(well).toHaveTextContent(/^WELL-1010$/)
    expect(within(well).getByRole('img', { name: primaryWell.status })).toBeInTheDocument()
    const add = screen.getByRole('button', { name: 'Добавить скважину' })
    expect(add).toHaveTextContent('Добавить')
    fireEvent.click(add)
    expect(route.navigate).toHaveBeenCalledWith({ to: '/geology/bgd/$depositId/wells/new', params: { depositId: 'DEP-SARYTAU' } })
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
