import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { primaryWell } from '../../../repository/data/wells'
import { demoDatabase } from '../../../repository/demo/demoDatabase'
import { BgdWellDeviationTab } from './BgdWellDeviationTab'

describe('BgdWellDeviationTab', () => {
  beforeEach(async () => { await demoDatabase.reset() })
  afterEach(async () => { cleanup(); vi.restoreAllMocks(); await demoDatabase.reset() })

  it('shows surveys, calculates the selected survey and applies the demo import', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
    render(<QueryClientProvider client={queryClient}><BgdWellDeviationTab well={primaryWell} canEdit canAdminister defaults={{ trueCorrection: 10, magneticCorrection: 5, minZenithAngle: 4 }} /></QueryClientProvider>)

    expect(await screen.findByRole('heading', { name: 'Промеры' })).toBeInTheDocument()
    expect(screen.getAllByText('Рассчитан').length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole('button', { name: /Рассчитать/ }))
    expect(await screen.findByText(/рассчитан методом среднего угла/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Открыть импорт' }))
    expect(screen.getByRole('dialog', { name: 'Импорт инклинометрии по скважине' })).toBeInTheDocument()
    const importButton = screen.getByRole('button', { name: 'Импортировать' })
    expect(importButton).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Выбрать демо-файл' }))
    expect(importButton).toBeEnabled()
    fireEvent.click(importButton)
    expect(await screen.findByText(/распознан и импортирован/)).toBeInTheDocument()
  })

  it('allows an editor without administrative permission to choose the primary survey', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
    render(<QueryClientProvider client={queryClient}><BgdWellDeviationTab well={primaryWell} canEdit canAdminister={false} defaults={{ trueCorrection: 10, magneticCorrection: 5, minZenithAngle: 4 }} /></QueryClientProvider>)

    expect(await screen.findByRole('heading', { name: 'Промеры' })).toBeInTheDocument()
    const secondarySurvey = screen.getByText('Магнитный азимут · ИЭМ-36 №15').closest('button')
    expect(secondarySurvey).not.toBeNull()
    fireEvent.click(secondarySurvey!)
    fireEvent.click(screen.getByRole('button', { name: 'Сделать основным' }))

    expect(await screen.findByText(/Основной промер изменён/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Сделать основным' })).not.toBeInTheDocument()
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    fireEvent.click(screen.getByRole('button', { name: 'Удалить выбранный промер' }))

    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('по скважине не останется основного набора данных инклинометрии'))
    expect(await screen.findByText(/Основной промер, его описание и результаты измерений удалены/)).toBeInTheDocument()
    expect(screen.getByText('Не выбран')).toBeInTheDocument()
  })
})
