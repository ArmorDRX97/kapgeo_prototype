import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { initialSections } from '../../../entities/geology-section/model/fixtures'
import { referenceSection as completeReferenceSection } from '../../../entities/geology-section/model/referenceSection'
import { sectionSources, stationAtDepth } from '../../../entities/geology-section/lib/correlation'
import type { GeologySection } from '../../../entities/geology-section/model/types'
import { SectionSvg } from './SectionCanvas'

afterEach(cleanup)

function referenceSection(): GeologySection {
  const section = initialSections()[0]!
  return {
    ...section, demoPreset: 'video-reference-v1', top: -445, bottom: -525,
    participation: { ...section.participation, offbalance: [...section.wellIds] },
    graphics: [
      { id: 'sand-area', type: 'lithology', name: 'Песчаная толща', rock: 'sand', points: [{ x: 0, z: -445 }, { x: 350, z: -445 }, { x: 350, z: -525 }, { x: 0, z: -525 }], closed: true, reversed: false, smooth: false },
      { id: 'oxidation', type: 'oxidation', name: 'Окисление', points: [{ x: 0, z: -480 }, { x: 350, z: -480 }], closed: false, reversed: false, smooth: false },
    ],
  }
}

describe('reference section rendering', () => {
  it('renders lithology behind correlated bodies and contextual boundaries above them', () => {
    const { container } = render(<SectionSvg section={referenceSection()} layers={['technology', 'ore']} right={350} />)
    const lithology = container.querySelector('.section-canvas__graphic--lithology')!, body = container.querySelector('.section-canvas__body--technology')!, oxidation = container.querySelector('.section-canvas__graphic--oxidation')!
    expect(lithology.compareDocumentPosition(body) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(body.compareDocumentPosition(oxidation) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(container.querySelector('svg')!.classList.contains('section-canvas--reference')).toBe(true)
  })

  it('excludes unrelated lithology and oxidation in a correlation editor context', () => {
    const { container } = render(<SectionSvg section={referenceSection()} graphicTypes={['foundation', 'fault']} layers={['technology', 'ore', 'uncorrected', 'offbalance']} />)
    expect(container.querySelector('.section-canvas__graphic--lithology')).toBeNull()
    expect(container.querySelector('.section-canvas__graphic--oxidation')).toBeNull()
    for (const layer of ['technology', 'ore', 'uncorrected', 'offbalance']) expect(container.querySelector(`.section-canvas__body--${layer}`)).toBeTruthy()
  })

  it('uses whole rounded graduations outside the plot rather than eleven arbitrary fractions', () => {
    const { container } = render(<SectionSvg section={referenceSection()} right={350} />)
    expect([...container.querySelectorAll('[data-axis="x"]')].map(node => node.textContent)).toEqual(['0', '50', '100', '150', '200', '250', '300', '350'])
    expect([...container.querySelectorAll('[data-axis="z"]')].map(node => node.textContent)).toEqual(['-520', '-510', '-500', '-490', '-480', '-470', '-460', '-450'])
    for (const label of container.querySelectorAll('[data-axis="z"]')) expect(Number(label.getAttribute('x'))).toBeLessThan(42)
  })

  it('shows one fixed inspectable source node per visible lithology contact only in its working context', () => {
    const section = completeReferenceSection(), right = 350
    const expected = sectionSources(section).filter(well => section.wellIds.includes(well.id)).flatMap(well => [...new Set(well.lithology.flatMap(interval => [interval.from, interval.to]))].map(md => ({ well, md, point: stationAtDepth(section, well, md) })).filter(({ point }) => point.x >= 0 && point.x <= right && point.z >= section.bottom && point.z <= section.top))
    const { container, rerender } = render(<SectionSvg section={section} graphicTypes={['lithology', 'foundation', 'fault']} layers={[]} right={right} />)
    const contacts = container.querySelectorAll('.section-canvas__lithology-contact')
    expect(expected.length).toBeGreaterThan(50)
    expect(contacts).toHaveLength(expected.length)
    const uniqueNames = new Set<string>()
    for (const contact of contacts) {
      expect(contact.getAttribute('r')).toBe('3')
      expect(contact.classList.contains('section-canvas__drag-handle')).toBe(false)
      const info = JSON.parse(contact.getAttribute('data-inspect')!)
      expect(info.kind).toBe('Исходный литологический контакт')
      expect(info.selection).toBeUndefined()
      expect(info.rows).toContainEqual(['Правило', 'Исходный контакт: перемещение запрещено'])
      uniqueNames.add(contact.getAttribute('aria-label')!)
    }
    expect(uniqueNames.size).toBe(expected.length)
    const first = expected[0]!, info = JSON.parse(contacts[0]!.getAttribute('data-inspect')!)
    expect(info.rows).toContainEqual(['MD', `${first.md.toFixed(2)} м`])
    expect(info.rows).toContainEqual(['Z', `${first.point.z.toFixed(2)} м`])
    expect(info.rows).toContainEqual(['Скважина', first.well.name])
    rerender(<SectionSvg section={section} graphicTypes={['foundation', 'fault']} layers={['technology']} right={right} />)
    expect(container.querySelector('.section-canvas__lithology-contact')).toBeNull()
    rerender(<SectionSvg section={section} graphicTypes={['lithology']} layers={[]} right={right} clean />)
    expect(container.querySelector('.section-canvas__lithology-contact')).toBeNull()
  })

  it('reverses repeated screen-sized oxidation ticks without changing the line geometry', () => {
    const section = referenceSection(), { container, rerender } = render(<SectionSvg section={section} graphicTypes={['oxidation']} right={350} />)
    const line = container.querySelector('.section-canvas__graphic--oxidation')!.getAttribute('d'), normal = container.querySelector('.section-canvas__oxidation-tick')!.getAttribute('d')!
    expect(normal.split('M').length).toBeGreaterThan(20)
    expect(normal).toContain('l0 6')
    section.graphics[1]!.reversed = true
    rerender(<SectionSvg section={section} graphicTypes={['oxidation']} right={350} />)
    expect(container.querySelector('.section-canvas__graphic--oxidation')!.getAttribute('d')).toBe(line)
    expect(container.querySelector('.section-canvas__oxidation-tick')!.getAttribute('d')).toContain('l0 -6')
  })

  for (const width of [364, 1000]) it(`labels resolved well bottoms within the frame without overlapping at ${width}px`, () => {
    const section = completeReferenceSection(), { container, rerender } = render(<SectionSvg section={section} right={350} width={width} />)
    const labels = [...container.querySelectorAll('[data-well-bottom]')]
    expect(labels).toHaveLength(7)
    const boxes = labels.map(label => {
      const well = sectionSources(section).find(w => w.id === label.getAttribute('data-well-bottom'))!, bottom = stationAtDepth(section, well, well.depth)
      const info = JSON.parse(label.getAttribute('data-inspect')!)
      expect(label.lastChild?.textContent).toBe(`MD ${well.depth}`)
      expect(info.rows).toContainEqual(['MD', `${well.depth} м`])
      expect(info.rows).toContainEqual(['Z', `${bottom.z.toFixed(2)} м`])
      expect(label.classList.contains('section-canvas__bottom-label')).toBe(true)
      expect(label.getAttribute('transform')).toBeNull()
      const x = Number(label.getAttribute('x')), y = Number(label.getAttribute('y')), labelWidth = `MD ${well.depth}`.length * 7
      expect(x).toBeGreaterThan(42)
      expect(x + labelWidth).toBeLessThan(width - 42)
      expect(y + 4).toBeLessThanOrEqual(458)
      expect(label.closest('[clip-path]')).toBeNull()
      return { x, y, width: labelWidth }
    })
    for (const [i, box] of boxes.entries()) for (const other of boxes.slice(i + 1)) expect(box.x + box.width <= other.x || other.x + other.width <= box.x || box.y + 4 <= other.y - 12 || other.y + 4 <= box.y - 12).toBe(true)
    rerender(<SectionSvg section={section} right={350} width={width} top={-450} bottom={-510} />)
    expect(container.querySelector('[data-well-bottom]')).toBeNull()
    rerender(<SectionSvg section={section} right={350} width={width} clean />)
    expect(container.querySelector('[data-well-bottom]')).toBeNull()
  })

  it('keeps clean print geometry and removes interactive affordances for the reference palette', () => {
    const { container } = render(<SectionSvg section={referenceSection()} clean width={1600} height={800} right={350} />)
    expect(container.querySelector('svg')!.getAttribute('viewBox')).toBe('0 0 1600 800')
    expect(container.querySelector('.section-canvas__grid path')!.getAttribute('d')).toContain(' 42V758')
    expect(container.querySelector('[data-inspect], [tabindex], .section-canvas__headers, .section-canvas__source-contact, .section-canvas__inspect-line')).toBeNull()
    expect(container.querySelector('pattern[id$="-clay"] path')!.getAttribute('d')).toBe('M0 2h3M4 6h3')
  })
})
