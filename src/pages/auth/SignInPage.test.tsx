import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SignInPage } from './SignInPage'

const signIn = vi.fn()
const navigate = vi.fn()

vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigate }))
vi.mock('../../entities/session/model/sessionContext', () => ({ useSession: () => ({ signIn }) }))
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
    signIn.mockReset()
    navigate.mockClear()
  })

  it('opens BGD without requiring demo credentials or an MFA step', async () => {
    signIn.mockReturnValue({
      id: 'geo.ivanova',
      name: 'Ирина Иванова',
      initials: 'ИИ',
      position: 'Геолог',
      roles: ['R1'],
      scope: 'Сарытау',
      homeRoute: '/geology',
    })
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={client}><SignInPage /></QueryClientProvider>)

    expect(await screen.findByRole('heading', { name: 'База геологических данных' })).toBeInTheDocument()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    expect(screen.queryByText(/MFA|второй фактор|SSO/i)).not.toBeInTheDocument()
    expect(screen.getByPlaceholderText('name.surname@company.kz')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Войти' }))

    expect(signIn).toHaveBeenCalledWith({ login: '', password: '', personaId: 'geo.ivanova' })
    expect(navigate).toHaveBeenCalledWith({ to: '/geology/bgd' })
  })
})
