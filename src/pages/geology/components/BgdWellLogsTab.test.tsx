import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AnchorHTMLAttributes } from 'react'
import { primaryWell } from '../../../repository/data/wells'
import { demoDatabase } from '../../../repository/demo/demoDatabase'
import { fetchWellLogWorkspace } from '../../../repository/api'
import { BgdWellLogsTab } from './BgdWellLogsTab'

vi.mock('@tanstack/react-router', () => ({ Link: ({ to, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }) => <a {...props} href={to} /> }))

function renderLogs(canEdit = true) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(<QueryClientProvider client={client}><BgdWellLogsTab well={primaryWell} canEdit={canEdit} /></QueryClientProvider>)
}

describe('BGD well log tables', () => {
  beforeEach(async () => { await demoDatabase.reset() })
  afterEach(async () => { cleanup(); await demoDatabase.reset() })

  it('keeps the LAS import button inactive without changing data', async () => {
    renderLogs()
    await screen.findByRole('table', { name: 'Все каротажи скважины' })
    fireEvent.click(screen.getByRole('button', { name: 'Загрузить LAS' }))
    expect((await fetchWellLogWorkspace(primaryWell.id)).runs).toHaveLength(2)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows all and control logs in separate tables and keeps plotted curves hidden', async () => {
    renderLogs()
    const allTable = await screen.findByRole('table', { name: 'Все каротажи скважины' })
    expect(within(allTable).getAllByRole('row')).toHaveLength(3)
    expect(within(allTable).getByText('Комплекс ГК + ПС + КС')).toBeInTheDocument()
    expect(within(allTable).getByText('Контрольный гамма-каротаж')).toBeInTheDocument()
    expect(within(allTable).getByLabelText('Зонд Комплекс ГК + ПС + КС')).toHaveValue('Комплексный')
    expect(within(allTable).getAllByRole('columnheader').map(x => x.textContent)).toEqual(['Каротаж','Дата','Оператор','Прибор','Зонд','Основной','Данные','Глубина, м'])
    expect(within(allTable).queryByText('Канал')).not.toBeInTheDocument()
    const measurementsTable = screen.getByRole('table', { name: 'Измерения каротажа Комплекс ГК + ПС + КС' })
    expect(within(measurementsTable).getAllByRole('row')).toHaveLength(9)
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
    const removedFields = ['Диаметр прибора, см', 'Диаметр скважины, см', 'Длина детектора, см', 'Длина зонда ЭК, м', 'Количество точек замера', 'Плотность бурового раствора, г/см³', 'Вид обсадной колонны']
    for (const label of removedFields) expect(within(dialog).queryByLabelText(label)).not.toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: /Диаметр|Длина детектора|Длина зонда|Количество точек|Плотность бурового|Вид обсадной/ })).not.toBeInTheDocument()
    const newFields = { 'Множитель значения': '1.25', 'Коэффициент': '0.87', 'Комментарий': 'QA реквизиты каротажа' }
    for (const [label, value] of Object.entries(newFields)) fireEvent.change(within(dialog).getByLabelText(label), { target: { value } })
    fireEvent.click(within(dialog).getByLabelText(/Контрольный каротаж/))
    fireEvent.click(within(dialog).getByRole('button', { name: /Сохранить/ }))

    await waitFor(async () => {
      const workspace = await fetchWellLogWorkspace(primaryWell.id)
      const created = workspace.runs.find((run) => run.name === 'Гамма-каротаж')
      expect(created?.survey).toMatchObject({ isControl: true, probe: 'ГК-38', valueMultiplier: 1.25 })
      expect(created?.survey).toMatchObject({ coefficient: 0.87, comment: 'QA реквизиты каротажа' })
      expect(created?.to).toBe(120)
      expect(created?.step).toBe(0.5)
      expect(created?.measurements?.length).toBeGreaterThan(0)
    })
    fireEvent.click(screen.getByRole('tab', { name: /Контрольные каротажи/ }))
    const row = within(screen.getByRole('table', { name: 'Контрольные каротажи скважины' })).getByLabelText('Вид каротажа Гамма-каротаж').closest('tr')!
    expect(within(row).getByLabelText('Зонд Гамма-каротаж')).toHaveValue('ГК-38')
    fireEvent.click(screen.getByRole('button', { name: 'Изменить' }))
    const editDialog = await screen.findByRole('dialog', { name: 'Редактировать каротаж' })
    expect(within(editDialog).getByLabelText('Множитель значения')).toHaveValue(1.25)
    fireEvent.change(within(editDialog).getByLabelText('Коэффициент'), { target: { value: '0' } })
    fireEvent.change(within(editDialog).getByLabelText('Множитель значения'), { target: { value: '2.5' } })
    fireEvent.click(within(editDialog).getByRole('button', { name: /Сохранить/ }))
    await waitFor(async () => expect((await fetchWellLogWorkspace(primaryWell.id)).runs.find((run) => run.name === 'Гамма-каротаж')?.survey).toMatchObject({ coefficient: 0, valueMultiplier: 2.5 }))
    view.unmount()
    renderLogs()
    const savedTable = await screen.findByRole('table', { name: 'Все каротажи скважины' })
    const savedRow = within(savedTable).getByLabelText('Вид каротажа Гамма-каротаж').closest('tr')!
    fireEvent.click(within(savedRow).getByRole('button', { name: 'Реквизиты каротажа Гамма-каротаж' }))
    const restored = await screen.findByRole('dialog', { name: 'Редактировать каротаж' })
    expect(within(restored).getByLabelText('Множитель значения')).toHaveValue(2.5)
    expect(within(restored).getByLabelText('Коэффициент')).toHaveValue(0)
  })

  it('offers the reference methods with units and preserves the existing measurements when a type change is cancelled', async () => {
    renderLogs()
    const registry = await screen.findByRole('table', { name: 'Все каротажи скважины' })
    const method = within(registry).getByLabelText('Вид каротажа Комплекс ГК + ПС + КС')
    for (const label of ['ГК в обсадке, мкР/ч', 'ГК содержание Ra, %', 'Гамма-каротаж, мкР/ч', 'Индукционный каротаж, мСм/м', 'КС-каротаж, Ом·м', 'Кавернометрия, мм', 'ПС-каротаж, мВ', 'Термометрия, °C', 'Токовый каротаж, мА']) expect(within(method).getByRole('option', { name: label })).toBeInTheDocument()
    const before = await fetchWellLogWorkspace(primaryWell.id)
    fireEvent.change(method, { target: { value: 'TEMP' } })
    const editor = await screen.findByRole('dialog', { name: 'Редактировать каротаж' })
    expect(within(editor).getByLabelText('Вид каротажа')).toHaveValue('TEMP')
    fireEvent.click(within(editor).getByRole('button', { name: 'Отмена' }))
    expect((await fetchWellLogWorkspace(primaryWell.id)).runs).toEqual(before.runs)

    fireEvent.click(screen.getByRole('button', { name: 'Добавить' }))
    const add = await screen.findByRole('dialog', { name: 'Добавить каротаж' })
    fireEvent.change(within(add).getByLabelText('Вид каротажа'), { target: { value: 'TEMP' } })
    fireEvent.change(within(add).getByLabelText('Оператор *'), { target: { value: 'Азамат Сейтов' } })
    fireEvent.change(within(add).getByLabelText('Прибор *'), { target: { value: 'Термозонд' } })
    fireEvent.click(within(add).getByRole('button', { name: /Сохранить/ }))
    await waitFor(async () => {
      const created = (await fetchWellLogWorkspace(primaryWell.id)).runs.find(run => run.name === 'Термометрия')
      expect(created?.curves[0]).toMatchObject({ code: 'TEMP', unit: '°C' })
      expect(created?.measurements?.[0]?.values[created.curves[0]!.id]).toBe(22)
    })
    expect(screen.getByRole('table', { name: 'Измерения каротажа Термометрия' })).toBeInTheDocument()
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
