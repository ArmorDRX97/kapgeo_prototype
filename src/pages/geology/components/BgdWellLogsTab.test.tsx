import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { primaryWell } from '../../../repository/data/wells'
import { demoDatabase } from '../../../repository/demo/demoDatabase'
import { fetchWellLogWorkspace } from '../../../repository/api'
import { BgdWellLogsTab } from './BgdWellLogsTab'

function renderLogs(canEdit = true) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(<QueryClientProvider client={client}><BgdWellLogsTab well={primaryWell} canEdit={canEdit} /></QueryClientProvider>)
}

describe('BGD well log tables', () => {
  beforeEach(async () => { await demoDatabase.reset() })
  afterEach(async () => { cleanup(); await demoDatabase.reset() })

  it('shows all and control logs in separate tables and keeps plotted curves hidden', async () => {
    renderLogs()
    const allTable = await screen.findByRole('table', { name: 'Все каротажи скважины' })
    expect(within(allTable).getAllByRole('row')).toHaveLength(3)
    expect(within(allTable).getByText('Комплекс ГК + ПС + КС')).toBeInTheDocument()
    expect(within(allTable).getByText('Контрольный гамма-каротаж')).toBeInTheDocument()
    expect(within(allTable).getByText('Комплексный')).toBeInTheDocument()
    expect(within(allTable).queryByText('Канал')).not.toBeInTheDocument()
    const measurementsTable = screen.getByRole('table', { name: 'Измерения каротажа Комплекс ГК + ПС + КС' })
    expect(within(measurementsTable).getAllByRole('row')).toHaveLength(9)
    expect(screen.getByText('Графическое отображение кривых временно скрыто.')).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: /крив/ })).not.toBeInTheDocument()

    fireEvent.change(within(measurementsTable).getByLabelText('GR, строка 1'), { target: { value: '99.4' } })
    expect(screen.getByRole('tab', { name: /Контрольные каротажи/ })).toBeDisabled()
    const controlRow = within(screen.getByRole('table', { name: 'Все каротажи скважины' })).getByText('Контрольный гамма-каротаж').closest('tr')
    expect(controlRow).toHaveAttribute('tabindex', '-1')
    fireEvent.click(screen.getByRole('button', { name: 'Добавить строку' }))
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить значения' }))
    await waitFor(async () => expect((await fetchWellLogWorkspace(primaryWell.id)).runs[0]?.measurements).toHaveLength(9))
    expect((await fetchWellLogWorkspace(primaryWell.id)).runs[0]?.measurements?.[0]?.values['CURVE-GR-01']).toBe(99.4)

    fireEvent.click(screen.getByRole('tab', { name: /Контрольные каротажи/ }))
    const controlTable = screen.getByRole('table', { name: 'Контрольные каротажи скважины' })
    expect(within(controlTable).getAllByRole('row')).toHaveLength(2)
    expect(within(controlTable).getByText('Контрольный гамма-каротаж')).toBeInTheDocument()
    expect(within(controlTable).queryByText('Комплекс ГК + ПС + КС')).not.toBeInTheDocument()
  })

  it('creates, displays and edits survey attributes without losing them on remount', async () => {
    const view = renderLogs()
    await screen.findByRole('table', { name: 'Все каротажи скважины' })
    fireEvent.click(screen.getByRole('button', { name: 'Добавить' }))
    const dialog = await screen.findByRole('dialog', { name: 'Добавить каротаж' })
    fireEvent.change(within(dialog).getByLabelText('Оператор *'), { target: { value: 'Марат Омаров' } })
    fireEvent.change(within(dialog).getByLabelText('Прибор *'), { target: { value: 'РКС-3' } })
    fireEvent.change(within(dialog).getByLabelText('Зонд'), { target: { value: 'ГК-38' } })
    fireEvent.change(within(dialog).getByLabelText('Глубина до, м *'), { target: { value: '120' } })
    fireEvent.change(within(dialog).getByLabelText('Шаг, м *'), { target: { value: '0.5' } })
    fireEvent.change(within(dialog).getByLabelText('Диаметр прибора, см'), { target: { value: '3.8' } })
    fireEvent.change(within(dialog).getByLabelText('Диаметр скважины, см'), { target: { value: '15.2' } })
    const newFields = { 'Длина детектора, см': '12.5', 'Длина зонда ЭК, м': '0.6', 'Количество точек замера': '241', 'Плотность бурового раствора, г/см³': '1,12 ± 0,02', 'Вид обсадной колонны': 'ПВХ QA', 'Коэффициент': '0.87', 'Комментарий': 'QA реквизиты каротажа' }
    for (const [label, value] of Object.entries(newFields)) fireEvent.change(within(dialog).getByLabelText(label), { target: { value } })
    fireEvent.click(within(dialog).getByLabelText(/Контрольный каротаж/))
    fireEvent.click(within(dialog).getByRole('button', { name: /Сохранить/ }))

    await waitFor(async () => {
      const workspace = await fetchWellLogWorkspace(primaryWell.id)
      const created = workspace.runs.find((run) => run.name === 'Гамма-каротаж')
      expect(created?.survey).toMatchObject({ isControl: true, probe: 'ГК-38', instrumentDiameterCm: 3.8, boreholeDiameterCm: 15.2 })
      expect(created?.survey).toMatchObject({ detectorLengthCm: 12.5, ecProbeLengthM: 0.6, measurementPointCount: 241, drillingFluidDensity: '1,12 ± 0,02', casingStringType: 'ПВХ QA', coefficient: 0.87, comment: 'QA реквизиты каротажа' })
      expect(created?.to).toBe(120)
      expect(created?.step).toBe(0.5)
      expect(created?.measurements?.length).toBeGreaterThan(0)
    })
    fireEvent.click(screen.getByRole('tab', { name: /Контрольные каротажи/ }))
    const row = within(screen.getByRole('table', { name: 'Контрольные каротажи скважины' })).getByText('Гамма-каротаж').closest('tr')!
    for (const value of ['12,5', '0,6', '241', '1,12 ± 0,02', 'ПВХ QA', '0,87', 'QA реквизиты каротажа']) expect(within(row).getByText(value)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Изменить' }))
    const editDialog = await screen.findByRole('dialog', { name: 'Редактировать каротаж' })
    expect(within(editDialog).getByLabelText('Количество точек замера')).toHaveValue(241)
    fireEvent.change(within(editDialog).getByLabelText('Коэффициент'), { target: { value: '0' } })
    fireEvent.change(within(editDialog).getByLabelText('Плотность бурового раствора, г/см³'), { target: { value: 'н/о' } })
    fireEvent.click(within(editDialog).getByRole('button', { name: /Сохранить/ }))
    await waitFor(async () => expect((await fetchWellLogWorkspace(primaryWell.id)).runs.find((run) => run.name === 'Гамма-каротаж')?.survey).toMatchObject({ coefficient: 0, drillingFluidDensity: 'н/о', detectorLengthCm: 12.5, ecProbeLengthM: 0.6, measurementPointCount: 241, casingStringType: 'ПВХ QA' }))
    view.unmount()
    renderLogs()
    const savedTable = await screen.findByRole('table', { name: 'Все каротажи скважины' })
    const savedRow = within(savedTable).getByText('Гамма-каротаж').closest('tr')!
    expect(within(savedRow).getByText('н/о')).toBeInTheDocument()
    expect(within(savedRow).getByText('0')).toBeInTheDocument()
  })

  it('keeps the table read-only when the caller denies edit access', async () => {
    renderLogs(false)
    await screen.findByRole('table', { name: 'Все каротажи скважины' })
    expect(screen.getByRole('button', { name: 'Добавить' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Добавить строку' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Изменить' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('GR, строка 1')).not.toBeInTheDocument()
  })
})
