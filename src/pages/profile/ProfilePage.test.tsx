import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defaultPersona } from '../../entities/session/model/personas'
import { SessionContext } from '../../entities/session/model/sessionContext'
import { ProfilePage } from './ProfilePage'

const mocks = vi.hoisted(() => ({ reset: vi.fn(), navigate: vi.fn(), signOut: vi.fn() }))
vi.mock('../../repository/demo/demoDataControl', () => ({ resetDemoData: mocks.reset }))
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mocks.navigate,
  Link: ({ children, to, ...props }: { children: ReactNode; to: string }) => <a href={to} {...props}>{children}</a>,
}))

function mount() {
  const client = new QueryClient()
  client.setQueryData(['cached-demo-record'], { value: 'edited' })
  render(<QueryClientProvider client={client}><SessionContext.Provider value={{ status: 'authenticated', persona: defaultPersona, signIn: () => defaultPersona, signOut: mocks.signOut, switchPersona: vi.fn() }}><ProfilePage /></SessionContext.Provider></QueryClientProvider>)
  return client
}

describe('Profile demo reset', () => {
  beforeEach(() => { vi.clearAllMocks() })
  afterEach(cleanup)

  it('shows reset directly at the bottom, waits for completion and signs out', async () => {
    let finish!: () => void
    mocks.reset.mockImplementation(() => new Promise<void>((resolve) => { finish = resolve }))
    const client = mount()
    const reset = screen.getByRole('button', { name: 'Сбросить демо-данные' })
    expect(reset.closest('section')).toBe(document.querySelector('.page-stack')?.lastElementChild)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    fireEvent.click(reset)
    await waitFor(() => expect(mocks.reset).toHaveBeenCalledTimes(1))
    expect(screen.getByRole('button', { name: 'Сбрасываем…' })).toBeDisabled()
    expect(mocks.signOut).not.toHaveBeenCalled()
    finish()
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith({ to: '/auth/sign-in', replace: true }))
    expect(mocks.signOut).toHaveBeenCalledTimes(1)
    expect(client.getQueryData(['cached-demo-record'])).toBeUndefined()
  })

  it('keeps the session and cache when reset fails and allows retry', async () => {
    mocks.reset.mockRejectedValueOnce(new Error('Storage unavailable')).mockResolvedValueOnce(undefined)
    const client = mount()
    fireEvent.click(screen.getByRole('button', { name: 'Сбросить демо-данные' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось сбросить данные')
    expect(mocks.signOut).not.toHaveBeenCalled()
    expect(mocks.navigate).not.toHaveBeenCalled()
    expect(client.getQueryData(['cached-demo-record'])).toEqual({ value: 'edited' })
    fireEvent.click(screen.getByRole('button', { name: 'Сбросить демо-данные' }))
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith({ to: '/auth/sign-in', replace: true }))
  })
})
