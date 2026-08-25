import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { demoWellPassportRepository } from '../../../repository/demo/wellPassportRepository'
import { primaryWell } from '../../../repository/data/wells'
import { WellPassportWorkspace } from './WellPassportWorkspace'

describe('WellPassportWorkspace version flow', () => {
  afterEach(() => demoWellPassportRepository.reset())

  it('shows impact before save and visible stale records after save', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
    render(
      <QueryClientProvider client={queryClient}>
        <WellPassportWorkspace well={primaryWell} />
      </QueryClientProvider>,
    )

    expect(await screen.findByText(/агрегат WELL-PASSPORT-WELL-1010-FULL · v12/)).toBeInTheDocument()
    const coordinate = screen.getByLabelText('X / Easting, м')
    fireEvent.change(coordinate, { target: { value: String(primaryWell.coordinates.x + 1) } })

    expect(await screen.findByText('Затронуто объектов: 2')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText(/Причина изменения/), { target: { value: 'Уточнение координат по акту сверки' } })
    fireEvent.click(screen.getByRole('button', { name: /Создать новые версии/ }))

    expect(await screen.findByText('Версии сохранены')).toBeInTheDocument()
    expect(await screen.findByText(/Паспорт v13, конструкция v12/)).toBeInTheDocument()
    expect(screen.getByLabelText('Устаревшие зависимости')).toHaveTextContent('Разрез PR-07')
    expect(screen.getByLabelText('Устаревшие зависимости')).toHaveTextContent('Модель Северный')
  })

  it('blocks a coordinate outside the CRS bounds and warns before reinterpreting coordinates in another CRS', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
    render(
      <QueryClientProvider client={queryClient}>
        <WellPassportWorkspace well={primaryWell} />
      </QueryClientProvider>,
    )

    const coordinate = await screen.findByLabelText('X / Easting, м')
    fireEvent.change(coordinate, { target: { value: '0' } })
    expect(screen.getByLabelText('Проверка геометрии устья')).toHaveTextContent('вне допустимого диапазона EPSG:32642')
    expect(screen.getByRole('button', { name: 'Создать новые версии' })).toBeDisabled()

    fireEvent.change(coordinate, { target: { value: String(primaryWell.coordinates.x) } })
    fireEvent.change(screen.getByLabelText('Система координат'), { target: { value: 'LOCAL:SARYTAU' } })
    expect(screen.getByLabelText('Предупреждение о смене CRS')).toHaveTextContent('CRS изменена без пересчёта координат')
  })
})
