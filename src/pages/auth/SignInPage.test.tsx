import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SignInPage } from './SignInPage'

const signIn = vi.fn()
const navigate = vi.fn()

vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigate }))
vi.mock('../../entities/session/model/sessionContext', () => ({ useSession: () => ({ signIn }) }))

describe('SignInPage', () => {
  afterEach(() => {
    cleanup()
    signIn.mockReset()
    navigate.mockClear()
  })

  it('opens BGD without requiring demo credentials or an MFA step', () => {
    render(<SignInPage />)

    expect(screen.getByRole('heading', { name: 'База геологических данных' })).toBeInTheDocument()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    expect(screen.queryByText(/MFA|второй фактор|SSO/i)).not.toBeInTheDocument()
    expect(screen.getByPlaceholderText('name.surname@company.kz')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Войти' }))

    expect(signIn).toHaveBeenCalledWith({ login: '', password: '' })
    expect(navigate).toHaveBeenCalledWith({ to: '/geology/bgd' })
  })
})
