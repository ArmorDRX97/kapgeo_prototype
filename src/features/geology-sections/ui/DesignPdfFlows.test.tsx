import { useState } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { initialSections } from '../../../entities/geology-section/model/fixtures'
import { validateSection } from '../../../repository/demo/sectionRepository'
import { newDrawing } from '../../../entities/geology-section/lib/drawing'
import { sectionSegments } from '../../../entities/geology-section/lib/segments'
import { AddSegmentDialog } from './AddSegmentDialog'
import { SegmentWellPicker } from './SegmentWellPicker'
import { DrawingEditor } from './DrawingEditor'

afterEach(cleanup)

describe('design and PDF flows', () => {
  it('keeps the profile unchanged on dialog cancel and applies an added segment only on confirmation', () => {
    const original = initialSections()[0]!, before = structuredClone(original), onApply = vi.fn(), onClose = vi.fn()
    const view = render(<AddSegmentDialog section={original} onApply={onApply} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: 'Отмена' }))
    expect(onApply).not.toHaveBeenCalled()
    expect(original).toEqual(before)
    view.unmount()
    render(<AddSegmentDialog section={original} onApply={onApply} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: 'Добавить линию' }))
    expect(onApply).toHaveBeenCalledTimes(1)
    expect(onApply.mock.calls[0]![0].profile.length).toBeGreaterThan(original.profile.length)
    expect(original).toEqual(before)
  })

  it('applies a selected well and its moved order once without mutating the input section', () => {
    const section = initialSections()[0]!, first = section.wellIds[0]!, second = section.wellIds[1]!, added = section.wellIds[2]!
    const actualSegmentId = sectionSegments(section)[0]!.id
    section.segmentWells = { [actualSegmentId]: [first, second] }
    const before = structuredClone(section), onApply = vi.fn(), onClose = vi.fn()
    render(<SegmentWellPicker section={section} segmentId={actualSegmentId} onApply={onApply} onClose={onClose} />)
    fireEvent.change(screen.getByLabelText('Доступные скважины'), { target: { value: added } })
    fireEvent.click(screen.getByRole('button', { name: 'Добавить →' }))
    fireEvent.change(screen.getByLabelText('Скважины сегмента'), { target: { value: second } })
    fireEvent.click(screen.getByRole('button', { name: 'Вниз' }))
    fireEvent.click(screen.getByRole('button', { name: 'Применить состав' }))
    expect(onApply).toHaveBeenCalledTimes(1)
    expect(onApply.mock.calls[0]![0].segmentWells?.[actualSegmentId]).toEqual([first, added, second])
    expect(section).toEqual(before)
  })

  it('limits segment candidates to wells in the section and inside the selected radius', () => {
    const section = initialSections()[0]!
    section.profile = [{ x: 35, y: 40 }, { x: 100, y: 40 }]
    section.profileRadiusM = 20
    const actualSegmentId = sectionSegments(section)[0]!.id
    render(<SegmentWellPicker section={section} segmentId={actualSegmentId} onApply={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByRole('dialog').querySelector('p:nth-of-type(2)')?.textContent).toContain('в радиусе 20 м от сегмента')
    const available = screen.getByLabelText('Доступные скважины')
    expect(available.querySelector('option[value="GTR-W1"]')).not.toBeNull()
    expect(available.querySelector('option[value="GTR-W5"]')).toBeNull()
  })

  it('renders updated drawing settings and preserves them through section validation', () => {
    const source = initialSections()[0]!, drawing = { ...newDrawing(source, 'print'), layers: ['ore'], planHeight: 10 }
    source.wellIds = source.wellIds.slice(0, 2)
    for (const layer of Object.keys(source.participation) as Array<keyof typeof source.participation>) source.participation[layer] = source.participation[layer].filter(id => source.wellIds.includes(id))
    source.drawings = [drawing]
    function Harness() {
      const [section, setSection] = useState(source)
      return <><DrawingEditor section={section} disabled={false} onChange={setSection} selection="print" onSelect={vi.fn()} /><output data-testid="validated">{JSON.stringify(validateSection(section).drawings[0])}</output></>
    }
    render(<Harness />)
    fireEvent.click(screen.getByText('Компоновка, условные знаки и скважины'))
    fireEvent.change(screen.getByLabelText('Разделитель плана и разреза, мм'), { target: { value: '18' } })
    fireEvent.change(screen.getByLabelText('№ приложения'), { target: { value: 'Б' } })
    fireEvent.change(screen.getByLabelText('Первый номер листа'), { target: { value: '7' } })
    const includeWell = screen.getByLabelText(`ГС-${101}`)
    fireEvent.click(includeWell)
    expect(screen.getByTestId('validated').textContent).toContain('"separator":18')
    expect(screen.getByTestId('validated').textContent).toContain('"appendix":"Б"')
    expect(screen.getByTestId('validated').textContent).toContain('"firstSheet":7')
    expect(screen.getByTestId('validated').textContent).toContain('"wellIds":["GTR-W2"]')
    const preview = screen.getAllByRole('img', { name: 'Лист 1 чертежа Чертёж 1' })[0]!
    expect(preview.textContent).toContain('Лист 7 ·')
    expect(preview.textContent).toContain('Приложение: Б')
    expect(preview.querySelector('svg')?.getAttribute('y')).toBe('280')
    expect(preview.textContent).toContain('ГС-102')
    expect(preview.textContent).not.toContain('ГС-101')
    expect(source.drawings[0]).toEqual(drawing)
  })
})
