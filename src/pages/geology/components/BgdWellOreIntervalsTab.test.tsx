import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { primaryWell } from '../../../repository/data/wells'
import { demoDatabase } from '../../../repository/demo/demoDatabase'
import { BgdWellOreIntervalsTab } from './BgdWellOreIntervalsTab'

describe('BgdWellOreIntervalsTab', () => {
  beforeEach(async () => { await demoDatabase.reset() })
  afterEach(async () => { cleanup(); await demoDatabase.reset() })

  it('shows mandatory provenance fields and enables the differential workflow', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
    render(<QueryClientProvider client={queryClient}><BgdWellOreIntervalsTab well={primaryWell} canManageAll canManageGeophysics={false} /></QueryClientProvider>)

    expect(await screen.findByLabelText('Источник выделения')).toBeRequired()
    expect(screen.getByLabelText('Элемент')).toBeRequired()
    expect(screen.getByText('Источник / элемент')).toBeInTheDocument()
    const toggle = screen.getByRole('checkbox', { name: /Использовать дифференциальный каротаж/ })
    fireEvent.click(toggle)
    expect(screen.getByRole('tab', { name: /Дифференциальный каротаж/ })).toBeInTheDocument()
    const save = screen.getByRole('button', { name: /Сохранить черновик/ })
    expect(save).toBeEnabled()
    fireEvent.click(save)
    expect(await screen.findByText('Рудные интервалы сохранены')).toBeInTheDocument()
  })
})
