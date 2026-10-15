import { useState } from 'react'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { initialSections } from '../../../entities/geology-section/model/fixtures'
import { SectionSetup } from './SectionSetup'

afterEach(cleanup)

function Harness({ disabled = false }: { disabled?: boolean }) {
  const [section, setSection] = useState(initialSections()[0]!)
  return <SectionSetup section={section} disabled={disabled} onChange={setSection} />
}

describe('combined section setup', () => {
  it('edits parameters, profile and well membership in the same shared draft', () => {
    render(<Harness />)
    expect(screen.getByRole('heading', { name: 'Параметры разреза' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Линии сегмента' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Состав скважин' })).toBeTruthy()
    expect(screen.getByRole('combobox', { name: 'Месторождение' })).toHaveValue('GTR-LOCAL-NORTH')
    fireEvent.change(screen.getByRole('textbox', { name: 'Название' }), { target: { value: 'Общий черновик' } })
    expect(screen.getByRole('textbox', { name: 'Название' })).toHaveValue('Общий черновик')
    const wells = screen.getByRole('table', { name: 'Скважины разреза' })
    const before = within(wells).getAllByRole('row')[1]!.textContent
    fireEvent.change(screen.getByRole('spinbutton', { name: 'X вершины 2' }), { target: { value: 620 } })
    expect(within(wells).getAllByRole('row')[1]!.textContent).not.toBe(before)
    fireEvent.click(screen.getByRole('checkbox', { name: 'Включить ГС-106 в разрез' }))
    expect(screen.getByRole('checkbox', { name: 'Включить ГС-106 в разрез' })).toBeChecked()
    fireEvent.click(screen.getByText('Расчёт по забоям скважин'))
    expect(within(screen.getByRole('group', { name: 'Сегмент 1' })).getByRole('checkbox', { name: 'ГС-106' })).toBeTruthy()
  })
  it('invalidates corridor results when the profile changes alongside the wells list', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Подобрать по коридору' }))
    expect(screen.getByRole('button', { name: 'Применить подбор' })).toBeTruthy()
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Y вершины 2' }), { target: { value: 240 } })
    expect(screen.queryByRole('button', { name: 'Применить подбор' })).toBeNull()
  })
  it('preserves read-only restrictions across all three blocks', () => {
    render(<Harness disabled />)
    expect(screen.getByRole('combobox', { name: 'Месторождение' })).toBeDisabled()
    expect(screen.getByRole('textbox', { name: 'Название' })).toBeDisabled()
    expect(screen.getByRole('spinbutton', { name: 'X вершины 1' })).toBeDisabled()
    expect(screen.getByRole('checkbox', { name: 'Включить ГС-106 в разрез' })).toBeDisabled()
    expect(screen.getByRole('textbox', { name: 'Поиск скважины' })).toBeEnabled()
  })
})
