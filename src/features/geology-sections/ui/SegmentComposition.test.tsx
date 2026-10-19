import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { initialSections } from '../../../entities/geology-section/model/fixtures'
import { sectionSegments } from '../../../entities/geology-section/lib/segments'
import { sectionSources } from '../../../entities/geology-section/lib/correlation'
import { SegmentComposition } from './SegmentComposition'

afterEach(cleanup)

it('shows only the names explicitly assigned to the selected segment', () => {
  const original = initialSections()[0]!
  const first = sectionSegments(original)[0]!
  const wellId = original.wellIds[0]!
  const name = sectionSources(original).find(well => well.id === wellId)!.name
  const section = { ...original, segmentWells: { [first.id]: [wellId] } }
  render(<SegmentComposition section={section} selectedIndex={first.index} />)
  const region = screen.getByRole('region', { name: 'Скважины сегмента 1' })
  expect(within(region).getByText(name)).toBeInTheDocument()
  const names = [...region.querySelectorAll('li')]
  expect(names).toHaveLength(1)
  expect(names.every(item => item.textContent?.trim())).toBe(true)
  expect(region.textContent).not.toContain('Проекция')
})

it('does not infer segment membership from well position', () => {
  const section = initialSections()[0]!
  render(<SegmentComposition section={section} selectedIndex={0} />)
  const region = screen.getByRole('region', { name: 'Скважины сегмента 1' })
  expect(within(region).getByText('Назначенных скважин нет')).toBeInTheDocument()
  expect(region.querySelectorAll('li')).toHaveLength(0)
})
