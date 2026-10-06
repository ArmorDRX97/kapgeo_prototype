import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SessionContext } from '../../entities/session/model/sessionContext'
import { defaultPersona, userPersonas } from '../../entities/session/model/personas'
import { demoDatabase } from '../../repository/demo/demoDatabase'
import { primaryWell } from '../../repository/data/wells'
import { WellEditorPage } from './NewWellPage'

const blocker = vi.fn()
vi.mock('@tanstack/react-router', () => ({ useBlocker: (options: unknown) => blocker(options) }))

function renderWorkbench(readOnly = false, wellId?: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const onSaved = vi.fn()
  render(<QueryClientProvider client={client}><SessionContext.Provider value={{ status: 'authenticated', persona: readOnly ? userPersonas.find((item) => item.id === 'admin.ai')! : defaultPersona, signIn: () => defaultPersona, signOut: vi.fn(), switchPersona: vi.fn() }}><WellEditorPage depositId="DEP-SARYTAU" wellId={wellId} onCancel={vi.fn()} onSaved={onSaved} /></SessionContext.Provider></QueryClientProvider>)
  return onSaved
}

describe('BGD object → section → workspace', () => {
  beforeEach(async () => { await demoDatabase.reset(); blocker.mockClear() })
  afterEach(async () => { cleanup(); vi.unstubAllGlobals(); await demoDatabase.reset() })

  it('keeps entered fields across local tabs, passport sections and collapsing the menu, then saves them together', async () => {
    const onSaved = renderWorkbench()
    fireEvent.change(await screen.findByLabelText('Название скважины *'), { target: { value: '2199' } })
    fireEvent.click(screen.getByRole('tab', { name: 'Описание и примечание' }))
    fireEvent.change(screen.getByLabelText('Примечание'), { target: { value: 'Synthetic workbench check' } })
    fireEvent.click(screen.getByRole('button', { name: 'Паспорт' }))
    fireEvent.change(screen.getByLabelText('Паспорт составил'), { target: { value: 'Ирина Иванова' } })
    fireEvent.click(screen.getByRole('button', { name: 'Свернуть разделы скважины' }))
    expect(screen.queryByRole('button', { name: 'Описание' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Развернуть разделы скважины' }))
    fireEvent.click(screen.getByRole('button', { name: 'Документация' }))
    expect(screen.getByLabelText('Дата начала составления документации')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Описание' }))
    expect(screen.getByLabelText('Название скважины *')).toHaveValue(2199)
    expect(blocker.mock.calls.at(-1)?.[0]).toMatchObject({ disabled: false, enableBeforeUnload: true })
    fireEvent.click(screen.getByRole('button', { name: 'Создать скважину' }))
    await waitFor(() => expect(onSaved).toHaveBeenCalled())
    expect(onSaved.mock.calls[0]?.[0].bgd).toMatchObject({ name: 2199, note: 'Synthetic workbench check', passport: { author: 'Ирина Иванова' } })
  })

  it('preserves read-only permissions in the new passport and coordinate sections', async () => {
    renderWorkbench(true)
    expect(await screen.findByLabelText('Название скважины *')).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Паспорт' }))
    expect(screen.getByLabelText('Паспорт составил')).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Координаты и глубина' }))
    expect(screen.getByRole('button', { name: 'Рассчитать координаты забоя' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Создать скважину' })).toBeDisabled()
  })

  it('keeps a scientific draft on Stay and only discards it after explicit confirmation', async () => {
    renderWorkbench(false, primaryWell.id)
    await screen.findByLabelText('Название скважины *')
    fireEvent.click(screen.getByRole('button', { name: 'Литология' }))
    fireEvent.change(await screen.findByLabelText('Порода'), { target: { value: 'Глина' } })
    fireEvent.click(screen.getByRole('button', { name: 'Паспорт' }))
    expect(screen.getByRole('dialog', { name: 'Есть несохранённые изменения' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Остаться' })).toHaveFocus()
    fireEvent.click(screen.getByRole('button', { name: 'Остаться' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Порода')).toHaveValue('Глина')
    fireEvent.click(screen.getByRole('button', { name: 'Паспорт' }))
    fireEvent.click(screen.getByRole('button', { name: 'Отбросить и перейти' }))
    expect(screen.getByLabelText('Паспорт составил')).toBeInTheDocument()
    expect(screen.queryByLabelText('Порода')).not.toBeInTheDocument()
  })

  it('starts with a compact section menu on a phone and keeps the form accessible', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }))
    renderWorkbench()
    expect(await screen.findByLabelText('Название скважины *')).toBeEnabled()
    const expand = screen.getByRole('button', { name: 'Развернуть разделы скважины' })
    expect(expand).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('button', { name: 'Паспорт' })).not.toBeInTheDocument()
    fireEvent.click(expand)
    fireEvent.click(screen.getByRole('button', { name: 'Паспорт' }))
    expect(screen.getByLabelText('Паспорт составил')).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: 'Свернуть разделы скважины' }))
    expect(screen.getByLabelText('Паспорт составил')).toBeEnabled()
  })

  it('adds interval batches, preserves filled rows when removing blanks, and saves all five fields', async () => {
    const onSaved = renderWorkbench()
    fireEvent.change(await screen.findByLabelText('Название скважины *'), { target: { value: '2299' } })
    fireEvent.click(screen.getByRole('button', { name: 'Проходка и освоение' }))
    for (const count of [1, 5, 10, 20]) {
      const before = screen.queryAllByRole('spinbutton', { name: /Интервал .*Диаметр/ }).length
      fireEvent.click(screen.getByRole('button', { name: 'Добавить интервалы' }))
      fireEvent.click(screen.getByRole('menuitem', { name: count === 1 ? '1 интервал' : `${count} интервалов` }))
      expect(screen.getAllByRole('spinbutton', { name: /Интервал .*Диаметр/ })).toHaveLength(before + count)
      expect(screen.getByRole('spinbutton', { name: `Интервал ${before + 1}: Диаметр, мм` })).toHaveFocus()
    }
    fireEvent.change(screen.getByLabelText('Интервал 1: Диаметр, мм'), { target: { value: '190' } })
    fireEvent.change(screen.getByLabelText('Интервал 1: От, м'), { target: { value: '0' } })
    fireEvent.change(screen.getByLabelText('Интервал 1: До, м'), { target: { value: '25' } })
    fireEvent.change(screen.getByLabelText('Интервал 1: Породоразрушающий инструмент'), { target: { value: 'Алмазная коронка' } })
    fireEvent.change(screen.getByLabelText('Интервал 1: Очистной агент'), { target: { value: 'Техническая вода' } })
    fireEvent.change(screen.getByLabelText('Интервал 3: Очистной агент'), { target: { value: 'Сульфанол' } })
    fireEvent.click(screen.getByRole('button', { name: 'Удалить интервал 2' }))
    fireEvent.click(screen.getByRole('button', { name: /Удалить пустые/ }))
    expect(screen.getAllByRole('spinbutton', { name: /Интервал .*Диаметр/ })).toHaveLength(2)
    expect(screen.getByLabelText('Интервал 2: Очистной агент')).toHaveValue('Сульфанол')
    fireEvent.click(screen.getByRole('button', { name: 'Удалить интервал 2' }))
    fireEvent.click(screen.getByRole('button', { name: 'Описание' }))
    fireEvent.click(screen.getByRole('button', { name: 'Проходка и освоение' }))
    expect(screen.getByLabelText('Интервал 1: Диаметр, мм')).toHaveValue(190)
    fireEvent.click(screen.getByRole('button', { name: 'Создать скважину' }))
    await waitFor(() => expect(onSaved).toHaveBeenCalled())
    expect(onSaved.mock.calls[0]?.[0].bgd.drilling.intervals).toEqual([
      expect.objectContaining({ drillingDiameter: 190, depthFrom: 0, depthTo: 25, drillingTool: 'Алмазная коронка', flushingAgent: 'Техническая вода' }),
    ])
  })

  it('supports the batch menu keyboard and disables interval changes without edit permission', async () => {
    renderWorkbench()
    await screen.findByLabelText('Название скважины *')
    fireEvent.click(screen.getByRole('button', { name: 'Проходка и освоение' }))
    const trigger = screen.getByRole('button', { name: 'Добавить интервалы' })
    fireEvent.click(trigger)
    expect(screen.getByRole('menuitem', { name: '1 интервал' })).toHaveFocus()
    fireEvent.keyDown(document.activeElement!, { key: 'End' })
    expect(screen.getByRole('menuitem', { name: '20 интервалов' })).toHaveFocus()
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' })
    expect(trigger).toHaveFocus()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    cleanup()
    renderWorkbench(true, primaryWell.id)
    await screen.findByLabelText('Название скважины *')
    fireEvent.click(screen.getByRole('button', { name: 'Проходка и освоение' }))
    expect(screen.getByRole('button', { name: 'Добавить интервалы' })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Удалить пустые/ })).toBeDisabled()
    expect(screen.getByLabelText('Интервал 1: Диаметр, мм')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Удалить интервал 1' })).toBeDisabled()
  })
})
