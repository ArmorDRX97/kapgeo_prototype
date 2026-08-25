import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { router } from '../../app/router'
import { SessionProvider } from '../../entities/session/model/SessionProvider'
import { demoDatabase } from '../../repository/demo/demoDatabase'

describe('GeologyMethodologyPage', () => {
  beforeEach(() => window.sessionStorage.setItem('kapgeo.persona', 'geo.ivanova'))
  afterEach(async () => { window.sessionStorage.clear(); await demoDatabase.reset() })

  it('renders five contours, four methods and persists a walkthrough question', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
    await router.navigate({ to: '/geology/methodology' })
    render(<QueryClientProvider client={queryClient}><SessionProvider><RouterProvider router={router} /></SessionProvider></QueryClientProvider>)

    expect(await screen.findByRole('heading', { name: 'Методический центр прототипа' })).toBeInTheDocument()
    expect(screen.getAllByText('Не рассмотрено')).toHaveLength(5)
    expect(screen.getAllByRole('tab')).toHaveLength(4)
    expect(screen.getByText('UNVERIFIED DEMO')).toBeInTheDocument()
    expect(screen.getAllByText('Паспорт скважины')).toHaveLength(2)
    expect(screen.getByText('Large synthetic')).toBeInTheDocument()

    fireEvent.click(screen.getAllByRole('button', { name: /Зафиксировать вопрос/ })[0]!)
    expect(await screen.findByText('Есть вопрос')).toBeInTheDocument()
  })
})

