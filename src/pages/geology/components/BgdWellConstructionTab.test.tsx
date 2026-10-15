import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { primaryWell } from '../../../repository/data/wells'
import { fetchWell, saveWellConstruction } from '../../../repository/api'
import { demoDatabase } from '../../../repository/demo/demoDatabase'
import { BgdWellConstructionTab } from './BgdWellConstructionTab'

function renderTab(canEdit = true) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(<QueryClientProvider client={client}><BgdWellConstructionTab well={{ ...primaryWell, construction: [] }} canEdit={canEdit} onDirtyChange={() => {}} /></QueryClientProvider>)
}

describe('BGD well construction', () => {
  beforeEach(async () => { await demoDatabase.reset() })
  afterEach(async () => { cleanup(); await demoDatabase.reset() })

  it('adds a construction interval and persists its dimensions and note', async () => {
    renderTab()
    fireEvent.click(screen.getByRole('button', { name: 'Добавить' }))
    fireEvent.change(screen.getByLabelText('Начальная глубина, м'), { target: { value: '0' } })
    fireEvent.change(screen.getByLabelText('Конечная глубина, м'), { target: { value: '120' } })
    fireEvent.change(screen.getByLabelText('Внешний диаметр, мм'), { target: { value: '160' } })
    fireEvent.change(screen.getByLabelText('Внутренний диаметр, мм'), { target: { value: '124' } })
    fireEvent.change(screen.getByLabelText('Примечание'), { target: { value: 'Обсадная секция' } })
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить конструкцию' }))
    await waitFor(async () => expect((await fetchWell(primaryWell.id)).construction).toMatchObject([{ from: 0, to: 120, diameter: 160, innerDiameter: 124, note: 'Обсадная секция' }]))
    expect(within(screen.getByRole('table')).getByText('120')).toBeInTheDocument()
  })

  it('exposes a read-only construction table without mutation controls', () => {
    renderTab(false)
    expect(screen.getByText('Конструктивные элементы пока не добавлены.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Добавить' })).not.toBeInTheDocument()
  })

  it('blocks saving an invalid depth interval', () => {
    renderTab()
    fireEvent.click(screen.getByRole('button', { name: 'Добавить' }))
    fireEvent.change(screen.getByLabelText('Конечная глубина, м'), { target: { value: '0' } })
    expect(screen.getByRole('alert')).toHaveTextContent('Конечная глубина должна быть больше начальной.')
    expect(screen.getByRole('button', { name: 'Сохранить конструкцию' })).toBeDisabled()
  })

  it('keeps invalid rows blocked after selecting another row', () => {
    renderTab()
    fireEvent.click(screen.getByRole('button', { name: 'Добавить' }))
    fireEvent.change(screen.getByLabelText('Конечная глубина, м'), { target: { value: '0' } })
    fireEvent.click(screen.getByRole('button', { name: 'Добавить' }))
    expect(screen.getByRole('button', { name: 'Сохранить конструкцию' })).toBeDisabled()
  })

  it('seeds the existing demo well and preserves explicit clearing', async () => {
    const well = await fetchWell('WELL-1010-FULL')
    expect(well.construction).toHaveLength(8)
    await saveWellConstruction(well.id, [])
    expect((await fetchWell(well.id)).construction).toEqual([])
  })
})
