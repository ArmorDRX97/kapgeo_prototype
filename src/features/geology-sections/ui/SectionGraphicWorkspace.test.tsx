import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defaultPersona } from '../../../entities/session/model/personas'
import { SessionContext } from '../../../entities/session/model/sessionContext'
import { initialSections } from '../../../entities/geology-section/model/fixtures'
import { SectionGraphicWorkspace } from './SectionGraphicWorkspace'
import { SectionCanvas } from './SectionCanvas'
import { GraphicEditor } from './GraphicEditor'
import { ProfileMap } from './ProfileMap'
import { CorrelationEditor } from './CorrelationEditor'

afterEach(() => { cleanup(); localStorage.clear(); vi.unstubAllGlobals() })
describe('graph and tools composition', () => {
  it('keeps camera controls above the plot and display options in the inspector', () => {
    const { container } = render(<SectionGraphicWorkspace title="Разрез"><SectionCanvas section={initialSections()[0]!} /></SectionGraphicWorkspace>)
    const tools = screen.getByRole('complementary', { name: 'Инструменты разреза' })
    fireEvent.click(within(tools).getByRole('button', { name: 'Отображение' }))
    expect(container.querySelector('.section-graph-camera')?.contains(screen.getByRole('button', { name: 'Увеличить разрез' }))).toBe(true)
    expect(within(tools).getByRole('checkbox', { name: 'Сетка' })).toBeTruthy()
    expect(within(tools).queryByLabelText('Графическая область, прокрутка разреза')).toBeNull()
    expect(container.querySelector('.section-graph-stage')?.contains(screen.getByLabelText('Графическая область, прокрутка разреза'))).toBe(true)
  })
  it('places section-map tools in the right panel while keeping the map in the main surface', () => {
    const { container } = render(<SectionGraphicWorkspace title="Карта"><ProfileMap section={initialSections()[0]!} disabled={false} onChange={vi.fn()} onPending={vi.fn()} /></SectionGraphicWorkspace>)
    const tools = screen.getByRole('complementary', { name: 'Инструменты разреза' })
    const map = screen.getByRole('group', { name: 'Карта скважин и линий сегмента' })
    const mapTools = within(tools).getByRole('group', { name: 'Инструменты карты профиля' })
    const pan = within(mapTools).getByRole('button', { name: 'Переместить карту' })
    expect(pan).toHaveClass('section-icon-tool')
    expect(pan).not.toHaveAttribute('title')
    expect(pan.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    expect(within(mapTools).getByRole('button', { name: 'Независимый сегмент' })).toBeInTheDocument()
    expect(container.querySelector('.section-graph-stage')?.contains(map)).toBe(true)
    expect(tools.contains(map)).toBe(false)
  })
  it('keeps correlation editing tools compact while preserving their accessible names', () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={client}><SessionContext.Provider value={{ status: 'authenticated', persona: defaultPersona, signIn: () => defaultPersona, signOut: vi.fn(), switchPersona: vi.fn() }}><SectionGraphicWorkspace title="Технологический горизонт"><CorrelationEditor section={initialSections()[0]!} layer="technology" disabled={false} onChange={vi.fn()} onSelect={vi.fn()} onPending={vi.fn()} /></SectionGraphicWorkspace></SessionContext.Provider></QueryClientProvider>)
    const group = screen.getByRole('group', { name: 'Команды графического редактирования' })
    const unlink = within(group).getByRole('button', { name: 'Разъединить на графике' })
    expect(unlink).toHaveClass('section-icon-tool')
    expect(unlink).toHaveAttribute('title', 'Разъединить на графике')
  })
  it('preserves an uncommitted geometry draft and its plot when the tools are collapsed', () => {
    function Harness() {
      const [selection, setSelection] = useState('')
      return <SectionGraphicWorkspace title="Окисление"><GraphicEditor section={initialSections()[0]!} mode="oxidation" disabled={false} selection={selection} onSelect={setSelection} onChange={vi.fn()} onPending={vi.fn()} /></SectionGraphicWorkspace>
    }
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Добавить: Зона окисления' }))
    fireEvent.click(screen.getByRole('button', { name: 'Координаты точек' }))
    fireEvent.change(screen.getByLabelText('Точка 1, X'), { target: { value: '123' } })
    const plot = screen.getByLabelText('Графическая область, прокрутка разреза')
    fireEvent.click(screen.getByRole('button', { name: 'Скрыть инструменты' }))
    expect(plot).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Показать инструменты' }))
    expect(screen.getByLabelText('Точка 1, X')).toHaveValue(123)
    expect(screen.getByRole('button', { name: 'Применить геометрию' })).toBeEnabled()
  })
  it('collapses groups without resetting the draft and keeps Apply available outside their bodies', () => {
    render(<SectionGraphicWorkspace title="Окисление"><GraphicEditor section={initialSections()[0]!} mode="oxidation" disabled={false} onSelect={vi.fn()} onChange={vi.fn()} onPending={vi.fn()} /></SectionGraphicWorkspace>)
    fireEvent.click(screen.getByRole('button', { name: 'Добавить: Зона окисления' }))
    fireEvent.change(screen.getByLabelText('Название'), { target: { value: 'Сохранённый ввод' } })
    fireEvent.click(screen.getByRole('button', { name: 'Координаты точек' }))
    expect(screen.getByRole('button', { name: 'Работа с объектами' })).toHaveAttribute('aria-expanded', 'false')
    fireEvent.change(screen.getByLabelText('Точка 1, X'), { target: { value: '125' } })
    fireEvent.click(screen.getByRole('button', { name: 'Координаты точек' }))
    expect(screen.getByRole('button', { name: 'Применить геометрию' })).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Работа с объектами' }))
    expect(screen.getByLabelText('Название')).toHaveValue('Сохранённый ввод')
    fireEvent.click(screen.getByRole('button', { name: 'Координаты точек' }))
    expect(screen.getByLabelText('Точка 1, X')).toHaveValue(125)
  })
  it('opens the point coordinates when a graph vertex drag starts', () => {
    vi.stubGlobal('PointerEvent', MouseEvent)
    render(<SectionGraphicWorkspace title="Окисление"><GraphicEditor section={initialSections()[0]!} mode="oxidation" disabled={false} onSelect={vi.fn()} onChange={vi.fn()} onPending={vi.fn()} /></SectionGraphicWorkspace>)
    fireEvent.click(screen.getByRole('button', { name: 'Добавить: Зона окисления' }))
    const handle = screen.getByRole('button', { name: 'Зона окисления 1: переместить точку 1' })
    const svg = screen.getByRole('group', { name: 'Разрез: расстояние вдоль профиля и абсолютные высоты' })
    Object.defineProperty(svg, 'setPointerCapture', { value: vi.fn() })
    fireEvent.pointerDown(handle, { button: 0 })
    expect(screen.getByRole('button', { name: 'Координаты точек' })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByLabelText('Точка 1, X')).toBeVisible()
    fireEvent.pointerCancel(svg)
  })
  it('moves usage instructions into a shared dialog while leaving tools uncluttered', () => {
    render(<SectionGraphicWorkspace title="Разрез"><SectionCanvas section={initialSections()[0]!} /></SectionGraphicWorkspace>)
    expect(screen.queryByText(/ЛКМ \+ перетаскивание — перемещение/)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Как работать' }))
    const dialog = screen.getByRole('dialog', { name: 'Управление графикой' })
    expect(within(dialog).getByText(/ЛКМ \+ перетаскивание — перемещение/)).toBeTruthy()
    expect(within(dialog).getByText(/Shift\+F10/)).toBeTruthy()
    fireEvent(dialog, new Event('cancel', { bubbles: true, cancelable: true }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.queryByText(/ЛКМ \+ перетаскивание — перемещение/)).toBeNull()
  })
})
