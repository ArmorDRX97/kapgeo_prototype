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

  it('explains the LAS example before adding it and allows cancelling without changing data', async () => {
    renderLogs()
    await screen.findByRole('table', { name: 'Все каротажи скважины' })
    fireEvent.click(screen.getByRole('button', { name: 'Загрузить LAS' }))
    const dialog = screen.getByRole('dialog', { name: 'Импорт каротажа LAS' })
    expect(within(dialog).getByText(/Исходный LAS-файл не считывается/)).toBeInTheDocument()
    expect((await fetchWellLogWorkspace(primaryWell.id)).runs).toHaveLength(2)
    fireEvent.click(within(dialog).getByRole('button', { name: 'Отмена' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Загрузить LAS' }))
    fireEvent.click(screen.getByRole('button', { name: 'Добавить пример LAS' }))
    expect(await screen.findByText(/Чтение файла и QC в этом действии смоделированы/, {}, { timeout: 5000 })).toBeInTheDocument()
    expect((await fetchWellLogWorkspace(primaryWell.id)).runs).toHaveLength(3)
  })

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
    const row = within(screen.getByRole('table', { name: 'Контрольные каротажи скважины' })).getByText('Гамма-каротаж').closest('tr')!
    for (const value of ['1,25', '0,87', 'QA реквизиты каротажа']) expect(within(row).getByText(value)).toBeInTheDocument()
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
    const savedRow = within(savedTable).getByText('Гамма-каротаж').closest('tr')!
    expect(within(savedRow).getByText('2,5')).toBeInTheDocument()
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
