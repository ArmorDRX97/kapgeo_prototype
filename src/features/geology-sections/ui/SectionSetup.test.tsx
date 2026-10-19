import { useState } from 'react'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { initialSections } from '../../../entities/geology-section/model/fixtures'
import { SectionSetup } from './SectionSetup'
import { SectionWells } from './SectionWells'

afterEach(cleanup)

function Harness({ disabled = false }: { disabled?: boolean }) {
  const [section, setSection] = useState(initialSections()[0]!)
  return <SectionSetup section={section} disabled={disabled} onChange={setSection} />
}

describe('combined section setup', () => {
  it('shows one row per segment and edits section parameters and well membership', () => {
    render(<Harness />)
    expect(screen.getByRole('heading', { name: 'Параметры разреза' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Сегменты профиля' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Состав скважин' })).toBeTruthy()
    expect(screen.getByRole('combobox', { name: 'Месторождение' })).toHaveValue('GTR-LOCAL-NORTH')
    fireEvent.change(screen.getByRole('textbox', { name: 'Название' }), { target: { value: 'Общий черновик' } })
    expect(screen.getByRole('textbox', { name: 'Название' })).toHaveValue('Общий черновик')
    const segments = screen.getByRole('table', { name: 'Сегменты профиля' })
    expect(within(segments).getByRole('columnheader', { name: 'От X, м' })).toBeTruthy()
    expect(within(segments).getByRole('columnheader', { name: 'До X, м' })).toBeTruthy()
    for (const name of ['Добавить вершину', 'Развернуть профиль', 'Добавить линию сегмента', 'Скважины по профилю']) expect(screen.queryByRole('button', { name })).toBeNull()
    expect(within(segments).queryByRole('columnheader', { name: 'Порядок' })).toBeNull()
    expect(within(segments).queryByRole('columnheader', { name: 'Действие' })).toBeNull()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Включить ГС-106 в разрез' }))
    expect(screen.getByRole('checkbox', { name: 'Включить ГС-106 в разрез' })).toBeChecked()
    fireEvent.click(screen.getByText('Расчёт по забоям скважин'))
    expect(within(screen.getByRole('group', { name: 'Сегмент 1' })).getByRole('checkbox', { name: 'ГС-106' })).toBeTruthy()
  })
  it('invalidates corridor results when the profile changes', () => {
    const section = initialSections()[0]!, view = render(<SectionWells section={section} disabled={false} onChange={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Найти скважины рядом' }))
    expect(screen.getByRole('button', { name: 'Добавить в разрез' })).toBeTruthy()
    view.rerender(<SectionWells section={{ ...section, profile: section.profile.map((p, index) => index === 1 ? { ...p, y: p.y + 20 } : p) }} disabled={false} onChange={() => {}} />)
    expect(screen.queryByRole('button', { name: 'Добавить в разрез' })).toBeNull()
  })
  it('saves the adjustable radius on the section and reports distance-based candidates', () => {
    const section = initialSections()[0]!, onChange = vi.fn()
    render(<SectionWells section={section} disabled={false} onChange={onChange} />)
    expect(screen.getByRole('spinbutton', { name: 'Радиус от линии профиля, м' })).toHaveValue(20)
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Радиус от линии профиля, м' }), { target: { value: '30' } })
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ profileRadiusM: 30 }))
  })
  it('preserves read-only restrictions across all three blocks', () => {
    render(<Harness disabled />)
    expect(screen.getByRole('combobox', { name: 'Месторождение' })).toBeDisabled()
    expect(screen.getByRole('textbox', { name: 'Название' })).toBeDisabled()
    expect(screen.getByRole('checkbox', { name: 'Включить ГС-106 в разрез' })).toBeDisabled()
    expect(screen.getByRole('textbox', { name: 'Поиск скважины' })).toBeEnabled()
  })
})
