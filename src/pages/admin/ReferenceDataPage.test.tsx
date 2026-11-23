import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { userPersonas } from '../../entities/session/model/personas'
import { demoDatabase } from '../../repository/demo/demoDatabase'
import { referenceDataRepository } from '../../repository/demo/referenceDataRepository'
import { ReferenceDataPage } from './ReferenceDataPage'

const state = vi.hoisted(() => ({
  search: {} as { dictionary?: string; entry?: string; tab?: string },
  reader: false,
  listeners: new Set<() => void>(),
}))
vi.mock('@tanstack/react-router', async () => {
  const { useSyncExternalStore } = await import('react')
  const subscribe = (listener: () => void) => {
    state.listeners.add(listener)
    return () => { state.listeners.delete(listener) }
  }
  return {
    useSearch: () => useSyncExternalStore(subscribe, () => state.search),
    useBlocker: () => undefined,
    useNavigate: () => (location: { search: typeof state.search }) => {
      state.search = location.search
      state.listeners.forEach(listener => listener())
    },
    Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
  }
})
vi.mock('../../entities/session/model/sessionContext', () => ({
  useSession: () => ({ persona: userPersonas.find(persona => persona.id === (state.reader ? 'admin.ai' : 'admin.system')) }),
}))

function mount(search: typeof state.search = {}) {
  state.search = search
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(<QueryClientProvider client={client}><ReferenceDataPage /></QueryClientProvider>)
}

describe('ReferenceDataPage', () => {
  beforeEach(async () => { state.reader = false; await demoDatabase.reset() })
  afterEach(async () => { cleanup(); vi.restoreAllMocks(); await demoDatabase.reset() })

  it('starts with lithotypes and switches the current dictionary using catalog search', async () => {
    mount()
    expect(await screen.findByRole('heading', { name: /Справочник литотипов/ })).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Поиск справочника'), { target: { value: 'deposit_type' } })
    const catalog = screen.getByRole('region', { name: 'Перечень справочников' })
    expect(within(catalog).getAllByRole('button')).toHaveLength(1)
    fireEvent.click(within(catalog).getByRole('button', { name: /deposit_type/ }))
    expect(state.search.dictionary).toBe('deposit_type')
    expect(screen.getByRole('heading', { name: 'Типы месторождений' })).toBeInTheDocument()
  })

  it('edits a value from a direct link and records old and new values in history', async () => {
    mount({ dictionary: 'deposit_type', entry: 'REF-DEPOSIT-1' })
    const dialog = await screen.findByRole('dialog', { name: 'Карточка значения' })
    fireEvent.change(within(dialog).getByLabelText(/Наименование на русском/), { target: { value: 'Новое демо-имя' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Сохранить' }))
    expect(await screen.findByText('Изменение значения. Данные сохранены.')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Журнал изменений' }))
    const history = screen.getByRole('dialog', { name: 'Журнал изменений' })
    expect(within(history).getByText('Пластовое')).toBeInTheDocument()
    expect(within(history).getAllByText('Новое демо-имя')).toHaveLength(2)
  })

  it('retains a draft when the user declines to close it', async () => {
    mount({ dictionary: 'deposit_type', entry: 'REF-DEPOSIT-1' })
    const field = await screen.findByLabelText(/Наименование на русском/)
    fireEvent.change(field, { target: { value: 'Несохранённый вариант' } })
    fireEvent.click(screen.getByRole('button', { name: 'Закрыть форму' }))
    fireEvent.click(screen.getByRole('button', { name: 'Продолжить редактирование' }))
    expect(field).toHaveValue('Несохранённый вариант')
    expect(state.search.entry).toBe('REF-DEPOSIT-1')
  })

  it('validates fixed numeric attributes without clearing user input', async () => {
    mount({ dictionary: 'reff_grain_fraction', entry: 'DEMO-reff_grain_fraction-1' })
    const field = await screen.findByRole('spinbutton', { name: /Размер от/ })
    fireEvent.change(field, { target: { value: '10' } })
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }))
    expect(await screen.findByText(/Верхняя граница должна/)).toBeInTheDocument()
    expect(field).toHaveValue(10)
    expect((await referenceDataRepository.get()).changes).toHaveLength(0)
  })

  it('keeps translations while switching languages and permits blank translations', async () => {
    mount({ dictionary: 'deposit_type', entry: 'REF-DEPOSIT-1' })
    await screen.findByLabelText(/Наименование на русском/)
    fireEvent.click(screen.getByRole('radio', { name: 'English' }))
    const english = screen.getByLabelText(/Name in English/)
    fireEvent.change(english, { target: { value: '' } })
    fireEvent.click(screen.getByRole('radio', { name: 'Русский' }))
    expect(english).not.toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }))
    expect(await screen.findByText('Изменение значения. Данные сохранены.')).toBeInTheDocument()
    expect((await referenceDataRepository.get()).entries.find(entry => entry.id === 'REF-DEPOSIT-1')?.values.name_en).toBe('')
  })

  it('filters by status and date and confirms deactivation with an end date', async () => {
    mount({ dictionary: 'deposit_type' })
    const table = await screen.findByRole('table')
    fireEvent.change(screen.getByLabelText('Статус'), { target: { value: 'inactive' } })
    expect(within(table).getAllByRole('row')).toHaveLength(2)
    fireEvent.change(screen.getByLabelText('Действует на дату'), { target: { value: '2026-08-01' } })
    expect(screen.getByText('Значения не найдены')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Сбросить фильтры' }))
    fireEvent.click(screen.getByRole('button', { name: 'Перевести в недействующие «Пластовое»' }))
    const dialog = screen.getByRole('dialog', { name: 'Перевести в недействующие?' })
    fireEvent.change(within(dialog).getByLabelText('Действует по'), { target: { value: '2026-08-01' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Подтвердить' }))
    await screen.findByText('Перевод в недействующие. Данные сохранены.')
    expect((await referenceDataRepository.get()).entries.find(entry => entry.id === 'REF-DEPOSIT-1')).toMatchObject({ active: false, values: { valid_to: '2026-08-01' } })
  })

  it('does not offer the current lithotype or its descendants as parents', async () => {
    mount({ dictionary: 'reff_rock_type', entry: 'DEMO-reff_rock_type-1' })
    const parents = await screen.findByRole('combobox', { name: 'Родительское значение' })
    expect(within(parents).getAllByRole('option')).toHaveLength(1)
  })

  it('shows the impact of updating a color and blocks deletion of a used color', async () => {
    mount({ tab: 'colors' })
    fireEvent.click(await screen.findByRole('button', { name: 'Песочный' }))
    fireEvent.change(screen.getByLabelText(/HEX/), { target: { value: '#112233' } })
    expect(screen.getByText('Изменение цвета коснётся значений: 1')).toBeInTheDocument()
    expect(screen.getByLabelText('R')).toHaveValue('17')
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }))
    await screen.findByText('Цвет сохранён.')
    fireEvent.click(screen.getByRole('button', { name: 'Удалить цвет «Песочный»' }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Удалить' }))
    expect(await screen.findByText('Цвет используется. Удаление невозможно.')).toBeInTheDocument()
  })

  it('enforces distinct view and exchange rights in the interface', async () => {
    state.reader = true
    mount({ dictionary: 'reff_coordinate_system', entry: 'DEMO-reff_coordinate_system-1' })
    expect(await screen.findByLabelText(/Код системы координат/)).toBeDisabled()
    for (const name of ['Сохранить', 'Выгрузить', 'Обмен', 'Добавить значение']) {
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument()
    }
    expect(screen.getByRole('button', { name: 'Цвета' })).toBeInTheDocument()
  })
})
