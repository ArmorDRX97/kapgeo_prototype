import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { primaryWell } from '../../../repository/data/wells'
import { LithologyWorkspace } from './LithologyWorkspace'

describe('LithologyWorkspace generalized interval flow', () => {
  it('fills a detected gap and restores it through shared undo history', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
    render(
      <QueryClientProvider client={queryClient}>
        <LithologyWorkspace well={primaryWell} />
      </QueryClientProvider>,
    )

    expect(await screen.findByText('Неописанный интервал 320–340 м.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Заполнить пропуск' }))

    expect(screen.queryByText('Неописанный интервал 320–340 м.')).not.toBeInTheDocument()
    expect(screen.getByText('Изменено интервалов: 1')).toBeInTheDocument()
    expect(screen.getByText(/1 добавлено · 0 изменено · 0 удалено/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Отменить действие' }))
    expect(screen.getByText('Неописанный интервал 320–340 м.')).toBeInTheDocument()
    expect(screen.getByText('Изменений пока нет')).toBeInTheDocument()
  })
})
