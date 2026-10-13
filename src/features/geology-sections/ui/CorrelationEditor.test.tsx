import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { initialSections } from '../../../entities/geology-section/model/fixtures'
import { layerAnchors } from '../../../entities/geology-section/lib/correlation'
import { CorrelationEditor } from './CorrelationEditor'
import { SectionSvg } from './SectionCanvas'
import { referenceSection } from '../../../entities/geology-section/model/referenceSection'
vi.mock('./SharedAuxiliaryEditor', () => ({ SharedAuxiliaryEditor: () => null }))

afterEach(() => { cleanup(); vi.unstubAllGlobals(); localStorage.clear() })
describe('direct correlation handles', () => {
  it('explains connected reference sides and enables numeric pinch editing after disconnecting', () => {
    const section = referenceSection(), selection = 'GTR-W2/technology/REF-T-U', change = vi.fn()
    const props = { layer: 'technology' as const, selection, disabled: false, onChange: change, onSelect: vi.fn(), onPending: vi.fn() }
    const view = render(<CorrelationEditor section={section} {...props} />)
    expect(screen.getByText('Граница соединена с соседним интервалом. Изменяйте вспомогательные точки дуги или разъедините связь.')).toBeInTheDocument()
    expect(screen.getByLabelText('Сторона')).toBeEnabled()
    expect(screen.getByLabelText('X вдоль профиля, м')).toBeDisabled()
    expect(screen.getByLabelText('Абсолютная высота Z, м')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Переместить точку' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Восстановить выклинивание' })).toBeDisabled()
    const unlinked = { ...section, links: { ...section.links, technology: section.links.technology.filter(link => link.a !== selection && link.b !== selection) }, arcEdits: { ...section.arcEdits, technology: [] } }
    view.rerender(<CorrelationEditor section={unlinked} {...props} />)
    expect(screen.queryByText('Граница соединена с соседним интервалом. Изменяйте вспомогательные точки дуги или разъедините связь.')).not.toBeInTheDocument()
    expect(screen.getByLabelText('X вдоль профиля, м')).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Переместить точку' })).toBeEnabled()
    expect(change).not.toHaveBeenCalled()
  })
  it('captures a boundary gesture outside the plot and cancels it with Escape', () => {
    vi.stubGlobal('PointerEvent', MouseEvent)
    vi.stubGlobal('DOMPoint', class { constructor(public x: number, public y: number) {} matrixTransform() { return this } })
    const change = vi.fn()
    render(<SectionSvg section={initialSections()[0]!} handles={[{ id: 'edge', label: 'Граница', point: { x: 0, z: 0 } }]} onHandleDrag={change} />)
    const svg = screen.getByRole('group', { name: 'Разрез: расстояние вдоль профиля и абсолютные высоты' }), handle = screen.getByRole('button', { name: 'Граница' })
    Object.defineProperty(svg, 'getScreenCTM', { value: () => ({ inverse: () => ({}) }) })
    Object.defineProperty(svg, 'setPointerCapture', { value: vi.fn() })
    fireEvent.pointerDown(handle, { button: 0, clientX: 42, clientY: 100 })
    fireEvent.pointerMove(svg, { clientX: 20, clientY: 200 })
    expect(change).toHaveBeenLastCalledWith('edge', expect.objectContaining({ x: 0 }), 'move')
    fireEvent.keyDown(handle, { key: 'Escape' })
    expect(change).toHaveBeenLastCalledWith('edge', expect.any(Object), 'cancel')
    fireEvent.pointerUp(svg, { clientX: 20, clientY: 200 })
    expect(change.mock.calls.some(call => call[2] === 'end')).toBe(false)
  })
  it('moves a selected point by keyboard as one command and keeps measured contacts fixed', () => {
    const section = initialSections()[0]!, anchor = layerAnchors(section, 'technology')[0]!, change = vi.fn(), pending = vi.fn()
    render(<CorrelationEditor section={section} layer="technology" selection={anchor.id} disabled={false} onChange={change} onSelect={vi.fn()} onPending={pending} />)
    const handle = screen.getByRole('button', { name: 'Слева: точка выклинивания' })
    fireEvent.keyDown(handle, { key: 'ArrowUp', shiftKey: true })
    expect(change).toHaveBeenCalledTimes(1)
    const next = change.mock.calls[0]![0]
    expect(next.contourEdits.technology[0].z).toBeCloseTo((anchor.top.z + anchor.bottom.z) / 2 + 1)
    expect(layerAnchors(next, 'technology')).toEqual(layerAnchors(section, 'technology'))
    expect(pending).toHaveBeenLastCalledWith(false)
  })
  it('does not commit a keyboard edit that inverts a boundary interval', () => {
    const section = initialSections()[0]!, anchor = layerAnchors(section, 'technology')[0]!, change = vi.fn()
    section.contourEdits = { technology: [{ anchorId: anchor.id, side: 'left', x: 0, z: -4.05, boundary: true, boundaryTop: -4, boundaryBottom: -4.1 }] }
    render(<CorrelationEditor section={section} layer="technology" selection={anchor.id} disabled={false} onChange={change} onSelect={vi.fn()} onPending={vi.fn()} />)
    fireEvent.keyDown(screen.getByRole('button', { name: 'Слева: верх граничного интервала' }), { key: 'ArrowDown', shiftKey: true })
    expect(change).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent('положительную мощность')
  })
  it('has no movement handles in read-only or clean drawing output', () => {
    const section = initialSections()[0]!, anchor = layerAnchors(section, 'technology')[0]!, change = vi.fn()
    const view = render(<CorrelationEditor section={section} layer="technology" selection={anchor.id} disabled onChange={change} onSelect={vi.fn()} onPending={vi.fn()} />)
    expect(screen.queryByRole('button', { name: 'Слева: точка выклинивания' })).not.toBeInTheDocument()
    view.unmount()
    render(<SectionSvg section={section} clean handles={[{ id: 'x', label: 'Не печатать', point: { x: 20, z: 0 } }]} onHandleDrag={change} />)
    expect(screen.queryByRole('button', { name: 'Не печатать' })).not.toBeInTheDocument()
  })
})
