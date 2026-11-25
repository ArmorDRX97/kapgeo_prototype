import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SignInPage } from './SignInPage'
import { defaultPersona } from '../../entities/session/model/personas'

const signIn = vi.fn()
const navigate = vi.fn()
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigate }))
vi.mock('../../entities/session/model/sessionContext', () => ({ useSession: () => ({ signIn }) }))

describe('SignInPage', () => {
  signIn.mockReturnValue(defaultPersona)
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    localStorage.clear()
    signIn.mockReset()
    signIn.mockReturnValue(defaultPersona)
    navigate.mockClear()
  })

  it('links the app on the first visit and signs in only after six digits', async () => {
    render(<SignInPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Продолжить' }))
    expect(screen.getByRole('heading', { name: 'Подключите приложение' })).toBeInTheDocument()
    expect(signIn).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Имитировать сканирование QR-кода' }))
    expect(screen.getByText('Подключаем приложение…')).toBeInTheDocument()
    await screen.findByRole('heading', { name: 'Подтвердите вход' }, { timeout: 2000 })
    expect(localStorage.getItem('kapgeo.auth.demo-app-bound')).toBe('true')
    for (let i = 1; i <= 5; i++) fireEvent.change(screen.getByLabelText(`Цифра ${i} из 6`), { target: { value: String(i) } })
    expect(signIn).not.toHaveBeenCalled()
    fireEvent.change(screen.getByLabelText('Цифра 6 из 6'), { target: { value: '6' } })
    expect(screen.getByRole('status', { name: 'Проверка кода' })).toBeInTheDocument()
    expect(signIn).not.toHaveBeenCalled()
    await waitFor(() => expect(signIn).toHaveBeenCalledWith({ login: '', password: '' }), { timeout: 2000 })
    expect(navigate).toHaveBeenCalledWith({ to: '/geology/bgd' })
  })

  it('allows a returning visit, pasting a code, and resetting the demo using F8', async () => {
    localStorage.setItem('kapgeo.auth.demo-app-bound', 'true')
    render(<SignInPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Продолжить' }))
    expect(screen.getByRole('heading', { name: 'Подтвердите вход' })).toBeInTheDocument()
    fireEvent.keyDown(window, { code: 'F8', key: 'F8' })
    expect(screen.getByRole('dialog', { name: 'Настройки прототипа' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Сбросить состояние входа' }))
    expect(localStorage.getItem('kapgeo.auth.demo-app-bound')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /Готово/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Продолжить' }))
    expect(screen.getByRole('heading', { name: 'Подключите приложение' })).toBeInTheDocument()
    fireEvent.keyDown(window, { code: 'F8', key: 'F8' })
    fireEvent.click(screen.getByLabelText(/Приложение уже подключено/))
    fireEvent.click(screen.getByRole('button', { name: /Готово/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Продолжить' }))
    fireEvent.paste(screen.getByLabelText('Цифра 1 из 6'), { clipboardData: { getData: () => '123456' } })
    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: '/geology/bgd' }), { timeout: 2000 })
  })

  it('cancels the pending sign-in when the demo state is reset', () => {
    vi.useFakeTimers()
    localStorage.setItem('kapgeo.auth.demo-app-bound', 'true')
    render(<SignInPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Продолжить' }))
    fireEvent.paste(screen.getByLabelText('Цифра 1 из 6'), { clipboardData: { getData: () => '123456' } })
    expect(screen.getByRole('status', { name: 'Проверка кода' })).toBeInTheDocument()
    fireEvent.keyDown(window, { code: 'F8', key: 'F8' })
    fireEvent.click(screen.getByRole('button', { name: 'Сбросить состояние входа' }))
    act(() => { vi.advanceTimersByTime(1500) })
    expect(signIn).not.toHaveBeenCalled()
    expect(navigate).not.toHaveBeenCalled()
  })
})
