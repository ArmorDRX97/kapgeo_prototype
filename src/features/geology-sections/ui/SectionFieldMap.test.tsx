import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { referenceSection } from '../../../entities/geology-section/model/referenceSection'
import { SectionGraphicWorkspace } from './SectionGraphicWorkspace'
import { sectionWellCatalogue, segmentWellDistance } from '../model/wellAssignment'
import { sectionSegments } from '../../../entities/geology-section/lib/segments'
import { SectionMapView } from './SectionFieldMap'

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} })
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => null)
})
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals() })
describe('map of the selected section', () => {
  it('opens assignment for the active segment and updates its list only after applying', () => {
    const initial = referenceSection(), id = `${initial.id}-v1:${initial.id}-v2`
    initial.segmentWells = { ...initial.segmentWells, [id]: ['GTR-W1'] }
    initial.segmentRadiiM = { [id]: 35 }
    function Harness() {
      const [section, setSection] = useState(initial)
      return <SectionGraphicWorkspace title="Карта" view="map"><SectionMapView section={section} documents={[]} disabled={false} onChange={setSection} onPending={vi.fn()} /></SectionGraphicWorkspace>
    }
    const { container } = render(<Harness />)
    const open = () => fireEvent.click(screen.getByRole('button', { name: 'Назначить скважины сегменту' }))
    open()
    expect(screen.getByRole('dialog', { name: 'Скважины сегмента 1' })).toBeInTheDocument()
    expect(screen.getByRole('spinbutton', { name: 'Радиус подбора для сегмента, м' })).toHaveValue(35)
    fireEvent.change(screen.getByLabelText('Доступные скважины'), { target: { value: 'GTR-W2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Добавить →' }))
    fireEvent.click(screen.getByRole('button', { name: 'Отмена' }))
    expect(screen.queryByRole('button', { name: 'ГС-102' })).toBeNull()
    open()
    fireEvent.change(screen.getByLabelText('Доступные скважины'), { target: { value: 'GTR-W2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Добавить →' }))
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Радиус подбора для сегмента, м' }), { target: { value: '40' } })
    fireEvent.click(screen.getByRole('button', { name: 'Применить состав' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByRole('button', { name: 'ГС-102' })).toBeInTheDocument()
    expect(container.querySelector('[data-segment-corridor]')).toHaveAttribute('data-segment-corridor', '40')
  })
  it('offers nearby field wells in the dialog without first adding them on another tab', () => {
    const section = referenceSection(), segment = sectionSegments(section)[0]!, change = vi.fn()
    const well = sectionWellCatalogue(section).find(w => w.id.startsWith('field-well-') && segmentWellDistance(section, segment.id, w.collar) <= 20)!
    render(<SectionGraphicWorkspace title="Карта" view="map"><SectionMapView section={section} documents={[]} disabled={false} onChange={change} onPending={vi.fn()} /></SectionGraphicWorkspace>)
    fireEvent.click(screen.getByRole('button', { name: 'Назначить скважины сегменту' }))
    const available = screen.getByLabelText('Доступные скважины')
    expect(available.querySelector(`option[value="${well.id}"]`)).not.toBeNull()
    fireEvent.change(available, { target: { value: well.id } })
    fireEvent.click(screen.getByRole('button', { name: 'Добавить →' }))
    fireEvent.click(screen.getByRole('button', { name: 'Применить состав' }))
    expect(change.mock.calls[0]![0].wellIds).toContain(well.id)
    expect(change.mock.calls[0]![0].segmentWells[segment.id]).toContain(well.id)
  })
  it('prevents assignment in read-only mode', () => {
    render(<SectionGraphicWorkspace title="Карта" view="map"><SectionMapView section={referenceSection()} documents={[]} disabled={true} onChange={vi.fn()} onPending={vi.fn()} /></SectionGraphicWorkspace>)
    expect(screen.getByRole('button', { name: 'Назначить скважины сегменту' })).toBeDisabled()
  })

  it('updates the visible corridor with the radius and hides it through a switch', () => {
    function Harness() {
      const [section, setSection] = useState(referenceSection())
      return <SectionGraphicWorkspace title="Карта" view="map"><SectionMapView section={section} documents={[]} disabled={false} onChange={setSection} onPending={vi.fn()} /></SectionGraphicWorkspace>
    }
    const { container } = render(<Harness />)
    expect(container.querySelector('[data-segment-corridor]')).toHaveAttribute('data-segment-corridor', '20')
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Радиус захвата, м' }), { target: { value: '35' } })
    expect(container.querySelector('[data-segment-corridor]')).toHaveAttribute('data-segment-corridor', '35')
    expect(screen.getByText(/Полная ширина — 70 м/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Отображение' }))
    fireEvent.click(screen.getByRole('switch', { name: 'Зона захвата сегмента' }))
    expect(container.querySelector('[data-segment-corridor]')).toBeNull()
  })
  it('shows only the document profile, highlights its segment and keeps the fund as optional background', () => {
    const onChange = vi.fn()
    const { container } = render(<SectionGraphicWorkspace title="Карта" view="map"><SectionMapView section={referenceSection()} documents={[]} disabled={false} onChange={onChange} onPending={vi.fn()} /></SectionGraphicWorkspace>)
    expect(container.querySelectorAll('[data-field-profile]')).toHaveLength(1)
    expect(container.querySelectorAll('[data-segment-label]')).toHaveLength(3)
    expect(container.querySelectorAll('[data-profile-vertex]')).toHaveLength(4)
    expect(container.querySelector('[data-active-segment]')).toBeInTheDocument()
    expect(container.querySelector('[data-field-wells]')).toHaveAttribute('data-field-wells', '8215')
    expect(screen.queryByLabelText('Профиль на карте')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Сегмент профиля').querySelectorAll('option')).toHaveLength(3)
    expect(screen.getByRole('button', { name: 'ГС-101' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Отображение' }))
    fireEvent.click(screen.getByLabelText('Фон: скважины месторождения'))
    expect(container.querySelector('[data-field-wells]')).toHaveAttribute('data-field-wells', '7')
    expect(container.querySelectorAll('[data-field-profile]')).toHaveLength(1)
    const backgrounds = within(screen.getByRole('group', { name: 'Подложки карты' }))
    fireEvent.click(backgrounds.getByRole('checkbox', { name: 'OpenTopoMap' }))
    fireEvent.click(backgrounds.getByRole('checkbox', { name: 'Сетка' }))
    expect(container.querySelector('[data-topo-tile]')).toBeNull()
    expect(container.querySelector('.map-grid')).toBeNull()
    expect(onChange).not.toHaveBeenCalled()
  })
})
