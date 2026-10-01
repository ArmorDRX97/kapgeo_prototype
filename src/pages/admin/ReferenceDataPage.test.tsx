import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { userPersonas } from '../../entities/session/model/personas'
import { demoDatabase } from '../../repository/demo/demoDatabase'
import { referenceDataRepository } from '../../repository/demo/referenceDataRepository'
import { ReferenceDataPage } from './ReferenceDataPage'

const state = vi.hoisted(() => ({ search: {} as { dictionary?: string; entry?: string }, reader: false, navigate: vi.fn() }))
vi.mock('@tanstack/react-router', () => ({ useSearch: () => state.search, useNavigate: () => state.navigate, Link: ({ children }: { children: ReactNode }) => <a>{children}</a> }))
vi.mock('../../entities/session/model/sessionContext', () => ({ useSession: () => ({ persona: userPersonas.find((persona) => persona.id === (state.reader ? 'admin.ai' : 'admin.system')) }) }))

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(<QueryClientProvider client={client}><ReferenceDataPage /></QueryClientProvider>)
}

describe('ReferenceDataPage workbench', () => {
  beforeEach(async () => { state.search = {}; state.reader = false; state.navigate.mockReset().mockImplementation((location: { search: typeof state.search }) => { state.search = location.search }); await demoDatabase.reset() })
  afterEach(async () => { cleanup(); await demoDatabase.reset() })

  it('keeps the empty inspector and filters the card list using three keyboard-accessible tabs', async () => {
    mount()
    expect(await screen.findByText('Выберите справочник')).toBeInTheDocument()
    expect(screen.getAllByRole('tab')).toHaveLength(3)
    fireEvent.click(screen.getByRole('tab', { name: /Reff справочники/ }))
    expect(screen.queryByRole('button', { name: /Типы месторождений deposit_type/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Справочник цветов reff_colour/ })).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Поиск справочника'), { target: { value: 'reff_quantity' } })
    fireEvent.click(screen.getByRole('button', { name: /reff_quantity/ }))
    expect(state.navigate).toHaveBeenCalledWith({ to: '/admin/references', search: { dictionary: 'reff_quantity' } })
  })

  it('edits ordinary values inline, cancels drafts, saves and displays history without an editor modal', async () => {
    state.search = { dictionary: 'deposit_type' }
    mount()
    const field = await screen.findByLabelText(/Наименование на русском/)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    fireEvent.change(field, { target: { value: 'Новая демо-запись' } })
    fireEvent.click(screen.getByRole('button', { name: 'Отменить' }))
    expect(screen.getByLabelText(/Наименование на русском/)).not.toHaveValue('Новая демо-запись')
    fireEvent.change(screen.getByLabelText(/Наименование на русском/), { target: { value: 'Новое демо-имя' } })
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }))
    expect(await screen.findByText('Изменение выполнено. Данные сохранены.')).toBeInTheDocument()
    expect((await referenceDataRepository.get()).entries.find((entry) => entry.id === 'REF-DEPOSIT-1')?.values.name_ru).toBe('Новое демо-имя')
    fireEvent.click(screen.getByRole('button', { name: 'История' }))
    expect(screen.getByRole('heading', { name: 'История изменений' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Закрыть историю' })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.queryByRole('button', { name: 'Экспорт' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Запись' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Сохранить' })).not.toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: 'Запись справочника' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Закрыть историю' }))
    expect(screen.getByRole('button', { name: 'Экспорт' })).toBeInTheDocument()
    expect(screen.getByLabelText(/Наименование на русском/)).toHaveValue('Новое демо-имя')
  })

  it('uses fixed numeric reff fields and rejects an invalid range in the side panel', async () => {
    state.search = { dictionary: 'reff_grain_fraction' }
    mount()
    const field = await screen.findByRole('spinbutton', { name: /Размер от/ })
    fireEvent.change(field, { target: { value: '10' } })
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }))
    expect(await screen.findByText(/Верхняя граница должна/)).toBeInTheDocument()
    expect(field).toHaveValue(10)
    expect((await referenceDataRepository.get()).changes).toHaveLength(0)
  })

  it('preserves an unsaved draft when switching to history and back', async () => {
    state.search = { dictionary: 'deposit_type' }
    mount()
    const field = await screen.findByLabelText(/Наименование на русском/)
    fireEvent.change(field, { target: { value: 'Несохранённый черновик' } })
    fireEvent.click(screen.getByRole('button', { name: 'История' }))
    expect(field).not.toBeVisible()
    expect(screen.getByText('Изменений пока нет.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Закрыть историю' }))
    expect(field).toBeVisible()
    expect(field).toHaveValue('Несохранённый черновик')
  })

  it('renders fields as read-only and hides all write actions for the reader permission', async () => {
    state.search = { dictionary: 'reff_coordinate_system' }; state.reader = true
    mount()
    await waitFor(() => expect(screen.getByLabelText(/Код системы координат/)).toBeDisabled())
    expect(screen.queryByRole('button', { name: 'Сохранить' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Удалить' })).not.toBeInTheDocument()
    expect(screen.getByText('Только просмотр')).toBeInTheDocument()
  })
})
