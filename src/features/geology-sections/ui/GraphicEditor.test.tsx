import { fireEvent, render, screen, cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { initialSections } from '../../../entities/geology-section/model/fixtures'
import { GraphicEditor } from './GraphicEditor'
import type { GeologySection, SectionGraphic } from '../../../entities/geology-section/model/types'
import { graphicIssues } from '../../../entities/geology-section/lib/geometry'
import { layerAnchors } from '../../../entities/geology-section/lib/correlation'
afterEach(() => { cleanup(); vi.restoreAllMocks() })
describe('manual section geometry', () => {
  it('adds a manual fault without displacing intervals or changing correlations', () => {
    const section = initialSections()[0]!, change = vi.fn()
    render(<GraphicEditor section={section} mode="foundation" disabled={false} onChange={change} onPending={vi.fn()} onSelect={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Добавить: Разлом' }))
    fireEvent.click(screen.getByRole('button', { name: 'Применить геометрию' }))
    expect(change.mock.calls[0]![0]).toMatchObject({ graphics: [expect.objectContaining({ type: 'fault', closed: false })], links: section.links, participation: section.participation, profile: section.profile })
    expect(layerAnchors(change.mock.calls[0]![0], 'technology')).toEqual(layerAnchors(section, 'technology'))
  })
  it('reports unfinished geometry and applies a valid oxidation line atomically', () => {
    const change = vi.fn(), pending = vi.fn()
    render(<GraphicEditor section={initialSections()[0]!} mode="oxidation" disabled={false} onChange={change} onPending={pending} onSelect={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Добавить: Зона окисления' }))
    expect(pending).toHaveBeenLastCalledWith(true)
    fireEvent.click(screen.getByRole('button', { name: 'Применить геометрию' }))
    expect(change).toHaveBeenCalledTimes(1)
    expect(change.mock.calls[0]![0].graphics[0].type).toBe('oxidation')
    expect(pending).toHaveBeenLastCalledWith(false)
  })
  it('keeps invalid coordinates in the draft and permits Escape to cancel', () => {
    const change = vi.fn(), pending = vi.fn()
    render(<GraphicEditor section={initialSections()[0]!} mode="oxidation" disabled={false} onChange={change} onPending={pending} onSelect={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Добавить: Зона окисления' }))
    fireEvent.change(screen.getByLabelText('Точка 1, X'), { target: { value: -5 } })
    fireEvent.click(screen.getByRole('button', { name: 'Применить геометрию' }))
    expect(change).not.toHaveBeenCalled(); expect(screen.getByRole('alert')).toHaveTextContent('рабочих высот')
    expect(screen.getByLabelText('Точка 1, X')).toHaveValue(-5)
    fireEvent.keyDown(screen.getByLabelText('Точка 1, X'), { key: 'Escape' })
    expect(pending).toHaveBeenLastCalledWith(false)
  })
  it('does not expose mutation commands to a viewer', () => {
    render(<GraphicEditor section={initialSections()[0]!} mode="oxidation" disabled onChange={vi.fn()} onPending={vi.fn()} onSelect={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Добавить: Зона окисления' })).toBeDisabled()
  })
  it('translates every oxidation point in a draft and rejects moving outside working bounds', () => {
    const section = initialSections()[0]!, change = vi.fn()
    section.graphics = [{ id: 'o', type: 'oxidation', name: 'Линия', points: [{ x: 10, z: 0 }, { x: 20, z: -5 }], closed: false, reversed: true, smooth: false }]
    render(<GraphicEditor section={section} mode="oxidation" selection="o" disabled={false} onChange={change} onPending={vi.fn()} onSelect={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Смещение X, м'), { target: { value: 5 } })
    fireEvent.change(screen.getByLabelText('Смещение Z, м'), { target: { value: -2 } })
    fireEvent.click(screen.getByRole('button', { name: 'Перенести линию' }))
    expect(change).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Точка 1, X')).toHaveValue(15)
    expect(screen.getByLabelText('Точка 2, Z')).toHaveValue(-7)
    fireEvent.click(screen.getByRole('button', { name: 'Применить геометрию' }))
    expect(change.mock.calls[0]![0].graphics[0]).toMatchObject({ reversed: true, points: [{ x: 15, z: -2 }, { x: 25, z: -7 }] })
    expect(section.graphics[0]!.points[0]!.x).toBe(10)
    fireEvent.change(screen.getByLabelText('Смещение Z, м'), { target: { value: 100 } })
    fireEvent.click(screen.getByRole('button', { name: 'Перенести линию' }))
    fireEvent.click(screen.getByRole('button', { name: 'Применить геометрию' }))
    expect(change).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('alert')).toHaveTextContent('рабочих высот')
  })
  it('creates a closed rock region and a valid inner exclusion, preserving both through atomic edits', () => {
    let section = initialSections()[0]!, selection: string | undefined
    const pending = vi.fn(), change = vi.fn((next: GeologySection) => { section = next }), select = vi.fn((id: string) => { selection = id })
    const props = () => ({ section, selection, mode: 'lithology' as const, disabled: false, onChange: change, onPending: pending, onSelect: select })
    const rendered = render(<GraphicEditor {...props()} />)
    expect(screen.getByRole('status')).toHaveTextContent('областей пока нет')
    expect(screen.queryByRole('checkbox', { name: 'Обратная сторона штрихов' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Добавить: Литологическая область' }))
    fireEvent.change(screen.getByRole('combobox', { name: 'Порода' }), { target: { value: 'clay' } })
    fireEvent.click(screen.getByRole('button', { name: 'Применить геометрию' }))
    expect(section.graphics[0]).toMatchObject({ type: 'lithology', closed: true, rock: 'clay' })
    rendered.rerender(<GraphicEditor {...props()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Внутреннее исключение' }))
    expect(screen.queryByRole('combobox', { name: 'Порода' })).not.toBeInTheDocument()
    expect(pending).toHaveBeenLastCalledWith(true)
    fireEvent.click(screen.getByRole('button', { name: 'Применить геометрию' }))
    expect(section.graphics).toHaveLength(2)
    expect(section.graphics[1]).toMatchObject({ parentId: section.graphics[0]!.id, closed: true })
    expect(graphicIssues(section.graphics[1]!, section)).toEqual([])
    rendered.rerender(<GraphicEditor {...props()} />)
    fireEvent.change(screen.getByLabelText('Точка 1, X'), { target: { value: 0 } })
    fireEvent.click(screen.getByRole('button', { name: 'Применить геометрию' }))
    expect(change).toHaveBeenCalledTimes(2)
    expect(screen.getByRole('alert')).toHaveTextContent('внутри родительской области')
    fireEvent.click(screen.getByRole('button', { name: 'Отменить правки геометрии' }))
    expect(section.graphics[1]!.points[0]!.x).toBeGreaterThan(0)
    expect(pending).toHaveBeenLastCalledWith(false)
    selection = section.graphics[0]!.id
    rendered.rerender(<GraphicEditor {...props()} />)
    fireEvent.change(screen.getByLabelText('Точка 1, X'), { target: { value: 400 } })
    fireEvent.click(screen.getByRole('button', { name: 'Применить геометрию' }))
    expect(change).toHaveBeenCalledTimes(2)
    expect(screen.getByRole('alert')).toHaveTextContent('внутри родительской области')
  })
  it('confirms deleting a region with holes and removes them together without touching other lines', () => {
    const section = initialSections()[0]!, change = vi.fn()
    const parent: SectionGraphic = { id: 'p', type: 'lithology', name: 'Область', rock: 'sand', points: [{ x: 10, z: 0 }, { x: 100, z: 0 }, { x: 50, z: -30 }], closed: true, reversed: false, smooth: false }
    section.graphics = [parent, { ...parent, id: 'h', parentId: parent.id, name: 'Исключение', points: [{ x: 45, z: -5 }, { x: 55, z: -5 }, { x: 50, z: -10 }] }, { ...parent, id: 'o', type: 'oxidation', closed: false }]
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<GraphicEditor section={section} selection="p" mode="lithology" disabled={false} onChange={change} onPending={vi.fn()} onSelect={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Удалить объект' }))
    expect(change).not.toHaveBeenCalled()
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('исключениями (1)'))
    confirm.mockReturnValue(true)
    fireEvent.click(screen.getByRole('button', { name: 'Удалить объект' }))
    expect(change.mock.calls[0]![0].graphics.map((g: SectionGraphic) => g.id)).toEqual(['o'])
  })
  it('keeps a selection from another graphics mode out of the lithology editor', () => {
    const section = initialSections()[0]!
    section.graphics = [{ id: 'o', name: 'Окисление', type: 'oxidation', closed: false, reversed: false, smooth: false, points: [{ x: 10, z: 0 }, { x: 20, z: -10 }] }]
    render(<GraphicEditor section={section} selection="o" mode="lithology" disabled={false} onChange={vi.fn()} onPending={vi.fn()} onSelect={vi.fn()} />)
    expect(screen.queryByRole('button', { name: 'Удалить объект' })).not.toBeInTheDocument()
    expect(screen.getByText('Выбранный объект недоступен в этом режиме. Выберите объект в списке.')).toBeInTheDocument()
  })
})
