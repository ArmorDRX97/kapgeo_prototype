import { useState } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { initialSections, sectionWellSources } from '../../../entities/geology-section/model/fixtures'
import { TrackSettingsEditor } from './TrackSettingsEditor'
import { SectionSvg } from './SectionCanvas'
import { defaultColumns } from '../model/presentation'
import type { GeologySection } from '../../../entities/geology-section/model/types'
afterEach(cleanup)
describe('track composition controls and shared rendering', () => {
  it('reorders, removes, adds and resizes tracks in the resulting SVG', () => {
    function Harness() {
      const [s, set] = useState<GeologySection>(initialSections()[0]!)
      return <><TrackSettingsEditor section={s} columnId="all" column={s.columnSettings?.all ?? defaultColumns} source={sectionWellSources[0]!} disabled={false} onChange={set} /><SectionSvg section={s} clean /></>
    }
    const { container } = render(<Harness />)
    const types = () => [...container.querySelectorAll('svg g[data-track-type]')].slice(0, 4).map(g => g.getAttribute('data-track-type'))
    fireEvent.click(screen.getByRole('button', { name: 'Трек 2: влево' }))
    expect(types()).toEqual(['curve', 'lithology', 'curve', 'intervals'])
    fireEvent.change(screen.getByLabelText('Трек 1: ширина'), { target: { value: 45 } })
    fireEvent.click(screen.getByRole('button', { name: 'Удалить трек 3' }))
    expect(screen.getAllByRole('button', { name: /Удалить трек/ })).toHaveLength(3)
    fireEvent.change(screen.getByLabelText('Новый трек'), { target: { value: 'curve:gr' } })
    fireEvent.click(screen.getByRole('button', { name: 'Добавить трек' }))
    expect(types()).toEqual(['curve', 'lithology', 'intervals', 'curve'])
    fireEvent.change(screen.getByLabelText('Трек 1: ширина'), { target: { value: 100 } })
    expect(screen.getByRole('alert')).toHaveTextContent('2 до 80')
    expect(screen.getByLabelText('Трек 1: ширина')).toHaveValue(45)
  })
  it('prevents read-only edits and does not render editable handles in export', () => {
    const change = vi.fn(), section = initialSections()[0]!
    const { container } = render(<><TrackSettingsEditor section={section} columnId="all" column={defaultColumns} source={sectionWellSources[0]!} disabled onChange={change} /><SectionSvg section={section} clean /></>)
    expect(screen.getByRole('button', { name: 'Добавить трек' })).toBeDisabled()
    expect(screen.getByLabelText('Трек 1: ширина')).toBeDisabled()
    expect(container.querySelector('[tabindex]')).toBeNull()
    expect(change).not.toHaveBeenCalled()
  })
})
