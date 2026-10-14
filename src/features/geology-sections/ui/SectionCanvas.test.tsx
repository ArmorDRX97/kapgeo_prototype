import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { initialSections } from '../../../entities/geology-section/model/fixtures'
import { layerAnchors, sourceAnchorPoint } from '../../../entities/geology-section/lib/correlation'
import { profileLength } from '../../../entities/geology-section/lib/profile'
import { defaultColumns } from '../model/presentation'
import { visibleTracks } from '../../../entities/geology-section/lib/columnTracks'
import { sectionWellSources } from '../../../entities/geology-section/model/fixtures'
import { SectionCanvas, SectionSvg } from './SectionCanvas'

afterEach(() => { cleanup(); localStorage.clear(); vi.unstubAllGlobals() })
describe('section exploration', () => {
  it('keeps original contacts and offset tracks aligned for inclined wells in all four modes', () => {
    const base=initialSections()[0]!,wellIds=['GTR-W2','GTR-W4'],section={...base,wellIds,columnSettings:{all:{...defaultColumns,offset:21}},participation:{technology:wellIds,ore:wellIds,uncorrected:wellIds,offbalance:wellIds}}
    for(const layer of ['technology','ore','uncorrected','offbalance'] as const) {
      const anchor=layerAnchors(section,layer)[0]!,extended={...section,bottomExtensions:{[anchor.id]:anchor.bottom.z-2}}
      for(const [left,right,top,bottom] of [[0,profileLength(base.profile),10,-45],[20,300,5,-30]]) {
        const {container,unmount}=render(<SectionSvg section={extended} layers={[layer]} width={1000} height={500} left={left!} right={right!} top={top!} bottom={bottom!} headerLayout={{top:60,cards:[]}} />)
        for(const a of layerAnchors(extended,layer)) for(const edge of ['top','bottom'] as const) {
          const source=sourceAnchorPoint(extended,a,edge),point=container.querySelector(`[data-source-contact="${a.id}"][data-edge="${edge}"]`)!
          expect(Number(point.getAttribute('cx'))).toBeCloseTo(42+(source.x-left!)/(right!-left!)*916)
          expect(Number(point.getAttribute('cy'))).toBeCloseTo(60+(top!-source.z)/(top!-bottom!)*398)
          const well=sectionWellSources.find(w=>w.id===a.wellId)!,tracks=visibleTracks(section.columnSettings.all,well),index=tracks.findIndex(t=>t.type==='intervals'),offset=21+tracks.slice(0,index).reduce((sum,t)=>sum+t.width+5,0)
          const path=container.querySelector(`[data-source-interval="${a.id}"]`)!.getAttribute('d')!
          const originalTop=sourceAnchorPoint(extended,a,'top')
          expect(path).toContain(`M${42+(originalTop.x-left!)/(right!-left!)*916+offset} ${60+(top!-originalTop.z)/(top!-bottom!)*398}`)
          expect(container.querySelector(`[data-contact-bridge="${a.id}"]`)).toBeTruthy()
        }
        unmount()
      }
    }
  })
  it('pans by left drag, suppresses selection after a drag and restores the camera on Escape', () => {
    vi.stubGlobal('PointerEvent', MouseEvent)
    const section = initialSections()[0]!, original = JSON.stringify(section), select = vi.fn()
    render(<SectionCanvas section={section} onAnchor={select} />)
    fireEvent.click(screen.getByRole('button', { name: 'Увеличить разрез' }))
    fireEvent.click(screen.getByRole('button', { name: 'Увеличить разрез' }))
    const viewport = screen.getByLabelText('Графическая область, прокрутка разреза'), point = screen.getAllByRole('button', { name: /Верхний контакт .*: сведения/ })[0]!
    const initialX = Number(point.getAttribute('cx')), initialY = Number(point.getAttribute('cy'))
    fireEvent.pointerDown(point, { button: 0, clientX: 400, clientY: 200 })
    fireEvent.pointerMove(viewport, { clientX: 460, clientY: 220 })
    expect(viewport.classList.contains('is-panning')).toBe(true)
    expect(Number(point.getAttribute('cx'))).toBeCloseTo(initialX + 60)
    expect(Number(point.getAttribute('cy'))).toBeCloseTo(initialY + 20)
    fireEvent.pointerUp(viewport)
    expect(viewport.classList.contains('is-panning')).toBe(false)
    fireEvent.click(point, { detail: 1 })
    expect(select).not.toHaveBeenCalled()
    const beforeCancel = point.getAttribute('cx')
    fireEvent.pointerDown(viewport, { button: 0, clientX: 400, clientY: 200 })
    fireEvent.pointerMove(viewport, { clientX: 350, clientY: 200 })
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(Number(point.getAttribute('cx'))).toBeCloseTo(Number(beforeCancel), 8)
    expect(JSON.stringify(section)).toBe(original)
  })
  it('keeps the SVG frame and marker sizes fixed while magnifying the geometry', () => {
    const { container } = render(<SectionCanvas section={initialSections()[0]!} />)
    const svg = screen.getByRole('group', { name: 'Разрез: расстояние вдоль профиля и абсолютные высоты' })
    const frame = svg.getAttribute('viewBox'), radius = container.querySelector('.section-canvas__source-contact')!.getAttribute('r')
    fireEvent.click(screen.getByRole('button', { name: 'Увеличить разрез' }))
    expect(svg.getAttribute('viewBox')).toBe(frame)
    expect(container.querySelector('.section-canvas__source-contact')!.getAttribute('r')).toBe(radius)
    expect(container.querySelector('.section-canvas-scroll > div')).toBeNull()
  })
  it('leaves drawing gestures to the editor while a new line is being constructed', () => {
    vi.stubGlobal('PointerEvent', MouseEvent)
    render(<SectionCanvas section={initialSections()[0]!} onPoint={vi.fn()} />)
    const viewport = screen.getByLabelText('Графическая область, прокрутка разреза'), point = screen.getAllByRole('button', { name: /Верхний контакт .*: сведения/ })[0]!
    const before = point.getAttribute('cx')
    fireEvent.pointerDown(viewport, { button: 0, clientX: 400, clientY: 200 })
    fireEvent.pointerMove(viewport, { clientX: 460, clientY: 220 }); fireEvent.pointerUp(viewport)
    expect(point.getAttribute('cx')).toBe(before)
  })
  it('zooms by wheel and pans with Shift-wheel without changing the document', () => {
    const section = initialSections()[0]!, original = JSON.stringify(section)
    render(<SectionCanvas section={section} />)
    const plot = screen.getByLabelText('Графическая область, прокрутка разреза')
    const event = new WheelEvent('wheel', { deltaY: -100, bubbles: true, cancelable: true })
    fireEvent(plot, event)
    expect(event.defaultPrevented).toBe(true)
    expect(screen.getByText(/Экран 128%/)).toBeTruthy()
    const contact = screen.getAllByRole('button', { name: /Верхний контакт .*: сведения/ })[0]!, x = Number(contact.getAttribute('cx'))
    fireEvent.wheel(plot, { deltaY: 50, shiftKey: true })
    expect(screen.getByText(/Экран 128%/)).toBeTruthy()
    expect(Number(contact.getAttribute('cx'))).toBeLessThan(x)
    expect(JSON.stringify(section)).toBe(original)
  })
  it('shows fixed-contact information by right click and keyboard, with optional selection', () => {
    vi.stubGlobal('PointerEvent', MouseEvent)
    const section = initialSections()[0]!, anchor = layerAnchors(section, 'technology')[0]!, select = vi.fn()
    render(<SectionCanvas section={section} onAnchor={select} />)
    const point = screen.getByRole('button', { name: `Верхний контакт ${anchor.id}: сведения` })
    fireEvent.pointerOver(point, { clientX: 150, clientY: 200 })
    expect(screen.getByRole('tooltip').textContent).toContain('Опорная точка')
    fireEvent.contextMenu(point, { clientX: 150, clientY: 200 })
    expect(screen.getByRole('menu')).toBeTruthy()
    // Focusing a large SVG object can scroll its viewport programmatically.
    fireEvent.scroll(document)
    expect(screen.getByRole('menu')).toBeTruthy()
    fireEvent.click(screen.getByRole('menuitem', { name: 'Выбрать в редакторе' }))
    expect(select).toHaveBeenCalledWith(anchor.id)
    fireEvent.keyDown(point, { key: 'F10', shiftKey: true })
    fireEvent.click(screen.getByRole('menuitem', { name: 'Сведения об объекте' }))
    expect(screen.getByRole('dialog').textContent).toContain('перемещение запрещено')
  })
  it('does not export interactive contacts, hit paths or object metadata', () => {
    const { container } = render(<SectionSvg section={initialSections()[0]!} clean />)
    expect(container.querySelector('[data-inspect]')).toBeNull()
    expect(container.querySelector('.section-canvas__source-contact')).toBeNull()
    expect(container.querySelector('.section-canvas__inspect-line')).toBeNull()
    expect(container.querySelector('[tabindex]')).toBeNull()
  })
  it('offers information without editor commands when no selection action is available', () => {
    render(<SectionCanvas section={initialSections()[0]!} />)
    const point = screen.getAllByRole('button', { name: /Верхний контакт .*: сведения/ })[0]!
    fireEvent.contextMenu(point)
    expect(screen.queryByRole('menuitem', { name: 'Выбрать в редакторе' })).toBeNull()
    fireEvent.click(screen.getByRole('menuitem', { name: 'Сведения об объекте' }))
    expect(screen.getByRole('dialog').textContent).toContain('Опорная точка интервала')
  })
})
