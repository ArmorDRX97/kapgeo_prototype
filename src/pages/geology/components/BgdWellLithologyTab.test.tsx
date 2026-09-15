import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { primaryWell } from '../../../repository/data/wells'
import { demoDatabase } from '../../../repository/demo/demoDatabase'
import { BgdWellLithologyTab } from './BgdWellLithologyTab'

describe('BgdWellLithologyTab', () => {
  beforeEach(async () => { await demoDatabase.reset() })
  afterEach(async () => { cleanup(); await demoDatabase.reset() })

  it('switches between the three BGD lithology views and edits the active draft', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
    render(<QueryClientProvider client={queryClient}><BgdWellLithologyTab well={primaryWell} canEdit /></QueryClientProvider>)

    expect(await screen.findByRole('button', { name: /По керну/ })).toHaveAttribute('aria-pressed', 'true')
    const logView = screen.getByRole('button', { name: /По каротажу/ })
    fireEvent.click(logView)
    expect(logView).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText(/По каротажу · ГИС/)).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Порода'), { target: { value: 'Глина' } })
    expect(screen.getByText('Изменено интервалов: 1')).toBeInTheDocument()
    const save = screen.getByRole('button', { name: /Сохранить черновик/ })
    expect(save).toBeEnabled()
    fireEvent.click(save)
    expect(await screen.findByText('Литология сохранена')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /По каротажу/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText(/По каротажу · ГИС · версия 2/)).toBeInTheDocument()
  })
})
