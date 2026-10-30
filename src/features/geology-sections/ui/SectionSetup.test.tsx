import { useState } from 'react'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { referenceSection } from '../../../entities/geology-section/model/referenceSection'
import { initialSections } from '../../../entities/geology-section/model/fixtures'
import { SectionSetup } from './SectionSetup'
import { SectionWells } from './SectionWells'

afterEach(cleanup)
function Harness({ disabled = false }: { disabled?: boolean }) {
  const [section, setSection] = useState(referenceSection())
  return <SectionSetup section={section} disabled={disabled} onChange={setSection} />
}
describe('selected section setup', () => {
  it('omits capture radius and endpoint coordinates from the section tab', () => {
    render(<Harness />)
    expect(screen.queryByRole('spinbutton', { name: 'Радиус захвата, м' })).toBeNull()
    expect(screen.queryByText('Начало X / Y')).toBeNull()
    expect(screen.queryByText('Конец X / Y')).toBeNull()
    expect(screen.getByRole('navigation', { name: 'Список сегментов' })).toHaveTextContent('А → Б')
    fireEvent.click(screen.getByRole('button', { name: 'Состав скважин' }))
    expect(screen.queryByRole('spinbutton', { name: 'Радиус от линии сегмента, м' })).toBeNull()
  })
  it('shows just one profile, its three connected segments and seven document wells', () => {
    render(<Harness />)
    expect(screen.getByRole('heading', { name: 'Профиль разреза' })).toBeVisible()
    expect(screen.getByLabelText('Состав выбранного разреза')).toHaveTextContent('1 профиль3 сегм.7 скв.')
    expect(within(screen.getByRole('navigation', { name: 'Список сегментов' })).getAllByRole('button')).toHaveLength(3)
    const table = screen.getByRole('table', { name: 'Скважины разреза' })
    expect(within(table).getAllByRole('row')).toHaveLength(8)
    expect(screen.queryByText('Весь фонд')).toBeNull()
  })
  it('filters wells by the selected segment and by name without accessing the whole field', () => {
    render(<Harness />)
    fireEvent.click(within(screen.getByRole('group', { name: 'Область списка скважин' })).getByRole('button', { name: 'Сегмент 1' }))
    const table = screen.getByRole('table', { name: 'Скважины разреза' })
    expect(within(table).getAllByRole('row')).toHaveLength(3)
    fireEvent.click(within(screen.getByRole('navigation', { name: 'Список сегментов' })).getByRole('button', { name: /Сегмент 2/ }))
    expect(within(table).getAllByRole('row')).toHaveLength(4)
    fireEvent.change(screen.getByLabelText('Поиск скважины разреза'), { target: { value: 'ГС-104' } })
    expect(within(table).getAllByRole('row')).toHaveLength(2)
    fireEvent.change(screen.getByLabelText('Поиск скважины разреза'), { target: { value: 'нет' } })
    expect(screen.getByText('Скважины не найдены')).toBeVisible()
  })
  it('keeps parameters and source composition editable and respects read-only access', () => {
    const view = render(<Harness />)
    fireEvent.click(screen.getByText('Параметры разреза', { selector: 'summary' }))
    fireEvent.change(screen.getByLabelText('Название'), { target: { value: 'Название пользователя' } })
    expect(screen.getByLabelText('Название')).toHaveValue('Название пользователя')
    fireEvent.click(screen.getByRole('button', { name: 'Состав скважин' }))
    expect(screen.getByRole('dialog', { name: 'Состав скважин разреза' })).toBeVisible()
    expect(screen.getByRole('checkbox', { name: 'Включить ГС-106 в разрез' })).toBeChecked()
    view.unmount()
    render(<Harness disabled />)
    expect(screen.getByLabelText('Название')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Настроить профиль' })).toBeDisabled()
  })
  it('opens only a well belonging to the selected document on the map', () => {
    const onMap = vi.fn()
    render(<SectionSetup section={referenceSection()} disabled={false} onChange={vi.fn()} onMap={onMap} />)
    fireEvent.click(screen.getByRole('button', { name: 'Показать ГС-103 на карте' }))
    expect(onMap).toHaveBeenCalledWith('GTR-W3')
  })
  it('opens a well from any cell of its row and by keyboard', () => {
    const onMap = vi.fn()
    render(<SectionSetup section={referenceSection()} disabled={false} onChange={vi.fn()} onMap={onMap} />)
    const row = screen.getByText('ГС-103').closest('tr')!
    fireEvent.click(within(row).getByText('ГС-103'))
    expect(onMap).toHaveBeenCalledWith('GTR-W3')
    fireEvent.keyDown(row, { key: 'Enter' })
    expect(onMap).toHaveBeenCalledTimes(2)
  })
  it('invalidates corridor results when the profile changes', () => {
    const section = initialSections()[0]!, view = render(<SectionWells section={section} disabled={false} onChange={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Найти скважины рядом' }))
    expect(screen.getByRole('button', { name: 'Добавить в разрез' })).toBeTruthy()
    view.rerender(<SectionWells section={{ ...section, profile: section.profile.map((p, index) => index === 1 ? { ...p, y: p.y + 20 } : p) }} disabled={false} onChange={() => {}} />)
    expect(screen.queryByRole('button', { name: 'Добавить в разрез' })).toBeNull()
  })
})
