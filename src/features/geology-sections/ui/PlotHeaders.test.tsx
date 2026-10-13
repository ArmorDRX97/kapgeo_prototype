import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { initialSections } from '../../../entities/geology-section/model/fixtures'
import { SectionCanvas, SectionSvg } from './SectionCanvas'
import { plotFrame } from '../model/plotFrame'
import { plotHeaders } from '../model/plotHeaders'
import { profileLength } from '../../../entities/geology-section/lib/profile'

afterEach(() => { cleanup(); vi.unstubAllGlobals(); localStorage.clear() })
describe('external plot headers', () => {
  it('places only well names in a compact separate header above the geology frame', () => {
    const { container } = render(<SectionSvg section={initialSections()[0]!} />)
    const section = initialSections()[0]!, header = container.querySelector('.section-canvas__headers')!, frame = plotFrame(1000, 500, false, plotHeaders(section, 1000, 0, profileLength(section.profile)).top)
    expect(header).toBeTruthy()
    expect(header.querySelectorAll('[data-header-well]')).toHaveLength(5)
    for (const label of header.querySelectorAll('text')) expect(Number(label.getAttribute('y'))).toBeLessThan(frame.top)
    const verticalGrid = container.querySelector('.section-canvas__grid path')!
    expect(verticalGrid.getAttribute('d')).toContain(` ${frame.top}V${frame.bottom}`)
    expect(header.querySelectorAll('text')).toHaveLength(5)
    expect(header.textContent).toBe('ГС-101ГС-102ГС-103ГС-104ГС-105')
    expect(header.querySelectorAll('[data-header-track], .section-canvas__header-divider')).toHaveLength(0)
    expect(header.querySelectorAll('text[transform]')).toHaveLength(0)
    expect(header.querySelectorAll('.section-canvas__header-card')).toHaveLength(5)
  })
  it('moves headers horizontally with their columns but does not move them vertically with the camera', () => {
    vi.stubGlobal('PointerEvent', MouseEvent)
    const { container } = render(<SectionCanvas section={initialSections()[0]!} />)
    fireEvent.click(screen.getByRole('button', { name: 'Увеличить разрез' })); fireEvent.click(screen.getByRole('button', { name: 'Увеличить разрез' }))
    const text = container.querySelector('[data-header-well="GTR-W3"] .section-canvas__well-label')!, anchor = container.querySelector('[data-header-anchor="GTR-W3"]')!, before = { x: Number(anchor.getAttribute('data-column-x')), y: text.getAttribute('y') }
    const viewport = screen.getByLabelText('Графическая область, прокрутка разреза')
    fireEvent.pointerDown(viewport, { button: 0, clientX: 500, clientY: 250 }); fireEvent.pointerMove(viewport, { clientX: 540, clientY: 270 }); fireEvent.pointerUp(viewport)
    expect(Number(anchor.getAttribute('data-column-x'))).toBeCloseTo(before.x + 40)
    expect(text.getAttribute('y')).toBe(before.y)
  })
  it('preserves the existing print margins and labels without an interactive header or handles', () => {
    const { container } = render(<SectionSvg section={initialSections()[0]!} clean />)
    expect(container.querySelector('.section-canvas__headers')).toBeNull()
    expect(container.querySelector('.section-canvas__drag-handle')).toBeNull()
    expect(container.querySelector('.section-canvas__grid path')!.getAttribute('d')).toContain(' 42V458')
    expect(container.querySelectorAll('.section-canvas__well-label')).toHaveLength(5)
  })
})
