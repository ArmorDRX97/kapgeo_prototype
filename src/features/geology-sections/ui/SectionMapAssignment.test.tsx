import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState, type ComponentProps } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { MapCanvas } from '../../../entities/geology-map/ui/MapCanvas'
import { referenceSection } from '../../../entities/geology-section/model/referenceSection'
import { sectionSegments } from '../../../entities/geology-section/lib/segments'
import { sectionWellCatalogue, segmentWellDistance } from '../model/wellAssignment'
import { SectionMapView } from './SectionFieldMap'
import { SectionGraphicWorkspace } from './SectionGraphicWorkspace'

const map = vi.hoisted(() => ({ select: (_ids: string[]) => { void _ids }, segment: (_index: number) => { void _index } }))
vi.mock('../../../entities/geology-map/ui/MapCanvas', () => ({ MapCanvas: (props: ComponentProps<typeof MapCanvas>) => {
  map.select = props.onSelect; map.segment = props.onSegmentSelect ?? (() => {})
  return <div aria-label="Карта" />
} }))
afterEach(cleanup)
function Harness() {
  const [section, setSection] = useState(referenceSection())
  return <><SectionGraphicWorkspace title="Карта" view="map"><SectionMapView section={section} documents={[]} disabled={false} onChange={setSection} onPending={() => {}} /></SectionGraphicWorkspace><output role="note" data-testid="document">{JSON.stringify(section)}</output></>
}
function sample() {
  const section = referenceSection(), segment = sectionSegments(section)[0]!
  return sectionWellCatalogue(section).find(w => w.id.startsWith('field-well-') && segmentWellDistance(section, segment.id, w.collar) < 20)!
}
describe('assignment directly on the map', () => {
  it('assigns with a map click, prevents duplicates, moves to another segment and can unassign', () => {
    const well = sample()
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Добавлять скважины на карте' }))
    act(() => map.select([well.id]))
    expect(screen.getByRole('status')).toHaveTextContent(`${well.name} назначена сегменту 1`)
    act(() => map.select([well.id]))
    expect(screen.getByRole('status')).toHaveTextContent('уже назначена')
    act(() => map.segment(1))
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Радиус захвата, м' }), { target: { value: '500' } })
    act(() => map.select([well.id]))
    let document = JSON.parse(screen.getByTestId('document').textContent!)
    expect(document.wellIds.filter((id: string) => id === well.id)).toHaveLength(1)
    const segments = sectionSegments(document)
    expect(segments[0]!.wellIds).not.toContain(well.id)
    expect(segments[1]!.wellIds).toContain(well.id)
    fireEvent.click(screen.getByRole('button', { name: 'Исключить из сегмента' }))
    document = JSON.parse(screen.getByTestId('document').textContent!)
    expect(document.wellIds).toContain(well.id)
    expect(sectionSegments(document).flatMap(s => s.wellIds)).not.toContain(well.id)
  })
  it('explains an out-of-radius click and allows assignment from the selection card in normal mode', () => {
    const section = referenceSection(), segment = sectionSegments(section)[0]!, well = sample()
    const distant = sectionWellCatalogue(section).find(w => w.id.startsWith('field-well-') && segmentWellDistance(section, segment.id, w.collar) > 100)!
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Добавлять скважины на карте' }))
    act(() => map.select([distant.id]))
    expect(screen.getByRole('status')).toHaveTextContent('Увеличьте радиус захвата')
    expect(screen.getByRole('button', { name: 'В сегмент 1' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: /^Завершить назначение$/ }))
    act(() => map.select([well.id]))
    expect(JSON.parse(screen.getByTestId('document').textContent!).wellIds).not.toContain(well.id)
    fireEvent.click(screen.getByRole('button', { name: 'В сегмент 1' }))
    expect(JSON.parse(screen.getByTestId('document').textContent!).wellIds).toContain(well.id)
  })
})
