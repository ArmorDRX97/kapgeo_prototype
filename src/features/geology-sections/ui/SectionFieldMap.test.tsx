import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { initialSections } from '../../../entities/geology-section/model/fixtures'
import { SectionGraphicWorkspace } from './SectionGraphicWorkspace'
import { SectionMapView } from './SectionFieldMap'

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} })
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => null)
})
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

describe('compact deposit map in sections', () => {
  it('keeps type filters above the map and search without a type select in the inspector', () => {
    const onChange = vi.fn()
    const { container } = render(<SectionGraphicWorkspace title="Карта" view="map"><SectionMapView section={initialSections()[0]!} documents={[]} disabled={false} onChange={onChange} onPending={vi.fn()} /></SectionGraphicWorkspace>)
    const plot = container.querySelector('.section-plot-surface')!
    const filter = screen.getByRole('group', { name: 'Типы скважин' })
    const canvas = screen.getByRole('group', { name: 'Интерактивный инженерный план' })
    expect(filter.compareDocumentPosition(canvas) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(plot.querySelector('.map-find')).toBeNull()
    expect(screen.queryByLabelText('Тип искомого объекта')).not.toBeInTheDocument()
    expect(within(screen.getByRole('complementary', { name: 'Инструменты разреза' })).getByRole('combobox', { name: 'Найти объект плана' })).toBeInTheDocument()
    expect(container.querySelector('.section-graph-center__header')?.contains(screen.getByRole('button', { name: 'Приблизить месторождение' }))).toBe(true)
    expect(container.querySelector('[data-field-wells]')).toHaveAttribute('data-field-wells', '8215')
    const backgrounds = within(screen.getByRole('group', { name: 'Подложки карты' }))
    fireEvent.click(backgrounds.getByRole('checkbox', { name: 'OpenTopoMap' }))
    fireEvent.click(backgrounds.getByRole('checkbox', { name: 'Сетка' }))
    expect(container.querySelector('[data-topo-tile]')).toBeNull()
    expect(container.querySelector('.map-grid')).toBeNull()
    expect(container.querySelector('[data-field-profile]')).not.toBeNull()
    expect(container.querySelector('[data-field-wells]')).toHaveAttribute('data-field-wells', '8215')
    fireEvent.click(within(filter).getByRole('button', { name: /Откачная/ }))
    expect(within(filter).getByRole('button', { name: /Откачная/ })).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(screen.getByRole('button', { name: 'Скрыть инструменты' }))
    expect(filter).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Показать все' }))
    expect(container.querySelector('[data-field-wells]')).toHaveAttribute('data-field-wells', '8215')
    expect(onChange).not.toHaveBeenCalled()
  })
})
