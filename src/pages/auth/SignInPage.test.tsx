import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SignInPage } from './SignInPage'

const beginSso = vi.fn()
const navigate = vi.fn()

vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigate }))
vi.mock('../../entities/session/model/sessionContext', () => ({ useSession: () => ({ beginSso }) }))
vi.mock('../../repository/api', () => ({
  fetchPlatformPreferences: async () => ({
    id: 'platform:readiness',
    locale: 'ru',
    density: 'comfortable',
    contrast: false,
    reducedMotion: false,
    performanceProfile: 'small',
    browserWidths: [],
    helpSeen: false,
    minimumMode: true,
    currentDepositId: 'DEP-SARYTAU',
    updatedAt: '2026-08-26T00:00:00.000Z',
  }),
}))

describe('SignInPage minimum mode', () => {
  afterEach(() => {
    cleanup()
    beginSso.mockClear()
    navigate.mockClear()
  })

  it('keeps only the geologist persona and BGD-specific entry context', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={client}><SignInPage /></QueryClientProvider>)

    expect(await screen.findByRole('heading', { name: 'База геологических данных' })).toBeInTheDocument()
    const personaSelect = screen.getByRole('combobox')
    expect(personaSelect).toBeDisabled()
    expect(screen.getAllByRole('option')).toHaveLength(1)
    expect(screen.getByRole('option', { name: 'Геолог · Ирина Иванова' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Войти через корпоративный SSO/ }))
    expect(beginSso).toHaveBeenCalledWith('geo.ivanova')
    expect(navigate).toHaveBeenCalledWith({ to: '/auth/mfa' })
  })
})
