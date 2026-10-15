import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { initialSections } from '../../../entities/geology-section/model/fixtures'
import type { SectionGraphic } from '../../../entities/geology-section/model/types'
import { profileLength } from '../../../entities/geology-section/lib/profile'
import { GraphicEditor } from './GraphicEditor'

beforeEach(() => {
  localStorage.clear(); vi.stubGlobal('PointerEvent', MouseEvent)
  vi.stubGlobal('DOMPoint', class { constructor(public x: number, public y: number) {} matrixTransform() { return this } })
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
function setup(type: 'oxidation' | 'lithology', fullWidth = false) {
  const section = initialSections()[0]!, graphic: SectionGraphic = { id: 'g', type, name: 'Геометрия', closed: type === 'lithology', reversed: false, smooth: false, rock: 'sand', points: [{ x: fullWidth ? 0 : 120, z: -8 }, { x: fullWidth ? profileLength(section.profile) : 300, z: -8 }, ...(type === 'lithology' ? [{ x: 210, z: -30 }] : [])] }
  section.graphics = [graphic]
  const change = vi.fn(), pending = vi.fn()
  render(<GraphicEditor section={section} mode={type} selection="g" disabled={false} onChange={change} onSelect={vi.fn()} onPending={pending} />)
  fireEvent.click(screen.getByRole('checkbox', { name: 'Привязка к литоконтактам' }))
  const svg = screen.getByRole('group', { name: 'Разрез: расстояние вдоль профиля и абсолютные высоты' })
  Object.defineProperty(svg, 'getScreenCTM', { value: () => ({ inverse: () => ({}) }) })
  Object.defineProperty(svg, 'setPointerCapture', { value: vi.fn() })
  const handle = screen.getByRole('button', { name: 'Геометрия: переместить точку 1' })
  return { section, change, pending, svg, handle }
}
describe('manual point gestures', () => {
  it('moves a full-width oxidation line uniformly while keeping it inside the section frame', () => {
    const { svg, change, section } = setup('oxidation', true)
    fireEvent.click(screen.getByRole('button', { name: 'Перетащить всю линию' }))
    const handle = screen.getByRole('button', { name: 'Переместить всю линию' })
    const x = Number(handle.getAttribute('cx')), y = Number(handle.getAttribute('cy'))
    fireEvent.pointerDown(handle, { button: 0, clientX: x, clientY: y })
    fireEvent.pointerMove(svg, { clientX: x + 20, clientY: y + 10 })
    fireEvent.pointerUp(svg, { clientX: x + 20, clientY: y + 10 })
    expect(screen.getByLabelText('Точка 1, X')).toHaveValue(0)
    expect(screen.getByLabelText('Точка 2, X')).toHaveValue(profileLength(section.profile))
    const firstZ = (screen.getByLabelText('Точка 1, Z') as HTMLInputElement).valueAsNumber
    expect(firstZ).not.toBe(-8)
    expect(screen.getByLabelText('Точка 2, Z')).toHaveValue(firstZ)
    expect(change).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Применить геометрию' }))
    expect(change).toHaveBeenCalledTimes(1)
    expect(section.graphics[0]!.points[0]!.z).toBe(-8)
  })
  for (const type of ['oxidation', 'lithology'] as const) it(`previews ${type} drag in the table and commits only on Apply`, () => {
    const { change, pending, svg, handle, section } = setup(type)
    const x = Number(handle.getAttribute('cx')), y = Number(handle.getAttribute('cy'))
    fireEvent.pointerDown(handle, { button: 0, clientX: x, clientY: y })
    fireEvent.pointerMove(svg, { clientX: x + 20, clientY: y + 10 })
    fireEvent.pointerUp(svg, { clientX: x + 20, clientY: y + 10 })
    expect(Number((screen.getByLabelText('Точка 1, X') as HTMLInputElement).value)).toBeGreaterThan(120)
    expect(screen.getByLabelText('Точка 1, Z')).not.toHaveValue(-8)
    expect(change).not.toHaveBeenCalled(); expect(pending).toHaveBeenLastCalledWith(true)
    fireEvent.click(screen.getByRole('button', { name: 'Применить геометрию' }))
    expect(change).toHaveBeenCalledTimes(1); expect(pending).toHaveBeenLastCalledWith(false)
    expect(section.graphics[0]!.points[0]).toEqual({ x: 120, z: -8 })
  })
  it('Escape restores the pre-gesture draft rather than discarding earlier edits', () => {
    const { svg, handle, change } = setup('oxidation')
    fireEvent.change(screen.getByLabelText('Точка 2, X'), { target: { value: '305' } })
    fireEvent.pointerDown(handle, { button: 0 })
    fireEvent.pointerMove(svg, { clientX: Number(handle.getAttribute('cx')) + 20, clientY: Number(handle.getAttribute('cy')) })
    fireEvent.keyDown(handle, { key: 'Escape' })
    expect(screen.getByLabelText('Точка 1, X')).toHaveValue(120)
    expect(screen.getByLabelText('Точка 2, X')).toHaveValue(305)
    expect(change).not.toHaveBeenCalled()
  })
  it('a background pan does not move the vertex or add points to the draft', () => {
    const { handle, change } = setup('oxidation')
    fireEvent.click(screen.getByRole('button', { name: 'Увеличить разрез' }))
    fireEvent.click(screen.getByRole('button', { name: 'Увеличить разрез' }))
    const viewport = screen.getByLabelText('Графическая область, прокрутка разреза'), before = Number(handle.getAttribute('cx'))
    fireEvent.pointerDown(viewport, { button: 0, clientX: 500, clientY: 250 }); fireEvent.pointerMove(viewport, { clientX: 540, clientY: 270 }); fireEvent.pointerUp(viewport)
    expect(Number(handle.getAttribute('cx'))).toBeCloseTo(before + 40)
    expect(screen.getByLabelText('Точка 1, X')).toHaveValue(120)
    expect(change).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Применить геометрию' })).toBeDisabled()
  })
  it('rejects an invalid vertex and restores its previous position', () => {
    const { svg, handle, change } = setup('lithology')
    const second = screen.getByRole('button', { name: 'Геометрия: переместить точку 2' })
    fireEvent.pointerDown(handle, { button: 0 }); fireEvent.pointerMove(svg, { clientX: Number(second.getAttribute('cx')), clientY: Number(second.getAttribute('cy')) }); fireEvent.pointerUp(svg, { clientX: Number(second.getAttribute('cx')), clientY: Number(second.getAttribute('cy')) })
    expect(screen.getByLabelText('Точка 1, X')).toHaveValue(120)
    expect(screen.getByRole('alert')).toHaveTextContent('Повторяющиеся')
    expect(change).not.toHaveBeenCalled()
  })
  it('does not show editable handles to a viewer', () => {
    const s = initialSections()[0]!; s.graphics = [{ id: 'g', type: 'oxidation', name: 'Линия', points: [{ x: 100, z: -5 }, { x: 200, z: -10 }], closed: false, smooth: false, reversed: false }]
    render(<GraphicEditor section={s} mode="oxidation" selection="g" disabled onChange={vi.fn()} onSelect={vi.fn()} onPending={vi.fn()} />)
    expect(screen.queryByRole('button', { name: /переместить точку/ })).toBeNull()
    expect(screen.getByRole('button', { name: 'Добавлять точки' })).toBeDisabled()
  })
})
