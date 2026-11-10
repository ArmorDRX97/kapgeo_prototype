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
    expect(screen.getByRole('combobox', { name: 'Фильтр по сегменту' })).toHaveTextContent('А → Б')
    fireEvent.click(screen.getByRole('button', { name: 'Состав скважин' }))
    expect(screen.queryByRole('spinbutton', { name: 'Радиус от линии сегмента, м' })).toBeNull()
  })
  it('shows just one profile, its three connected segments and seven document wells', () => {
    render(<Harness />)
    expect(screen.getByRole('heading', { name: 'Профиль разреза' })).toBeVisible()
    const filter = screen.getByRole('combobox', { name: 'Фильтр по сегменту' })
    expect(filter).toHaveDisplayValue('Весь разрез')
    expect(within(filter).getAllByRole('option')).toHaveLength(4)
    const table = screen.getByRole('table', { name: 'Скважины разреза' })
    expect(within(table).getAllByRole('row')).toHaveLength(8)
    expect(screen.queryByText('Весь фонд')).toBeNull()
  })
  it('filters wells by the selected segment and by name without accessing the whole field', () => {
    render(<Harness />)
    const filter = screen.getByRole('combobox', { name: 'Фильтр по сегменту' })
    fireEvent.change(filter, { target: { value: '0' } })
    const table = screen.getByRole('table', { name: 'Скважины разреза' })
    expect(within(table).getAllByRole('row')).toHaveLength(3)
    fireEvent.change(filter, { target: { value: '1' } })
    expect(within(table).getAllByRole('row')).toHaveLength(4)
    fireEvent.change(screen.getByLabelText('Поиск скважины разреза'), { target: { value: 'ГС-104' } })
    expect(within(table).getAllByRole('row')).toHaveLength(2)
    fireEvent.change(screen.getByLabelText('Поиск скважины разреза'), { target: { value: 'нет' } })
    expect(screen.getByText('Скважины не найдены')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Сбросить поиск' }))
    fireEvent.change(filter, { target: { value: '' } })
    expect(within(table).getAllByRole('row')).toHaveLength(8)
  })
  it('keeps parameters and source composition editable and respects read-only access', () => {
    const view = render(<Harness />)
    fireEvent.click(screen.getByText('Параметры разреза', { selector: 'summary' }))
    fireEvent.change(screen.getByLabelText('Название'), { target: { value: 'Название пользователя' } })
    expect(screen.getByLabelText('Название')).toHaveValue('Название пользователя')
    const kind = screen.getByRole('combobox', { name: 'Тип разреза' })
    fireEvent.change(kind, { target: { value: 'auxiliary' } })
    expect(kind).toHaveDisplayValue('Вспомогательный')
    expect(screen.getByText('Параметры разреза', { selector: 'summary' })).toHaveTextContent('Вспомогательный')
    fireEvent.click(screen.getByRole('button', { name: 'Состав скважин' }))
    expect(screen.getByRole('dialog', { name: 'Состав скважин разреза' })).toBeVisible()
    expect(screen.getByRole('checkbox', { name: 'Включить ГС-106 в разрез' })).toBeChecked()
    view.unmount()
    render(<Harness disabled />)
    expect(screen.getByLabelText('Название')).toBeDisabled()
    expect(screen.getByLabelText('Тип разреза')).toBeDisabled()
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
