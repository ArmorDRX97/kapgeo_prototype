import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { BgdWellPermeabilityTab } from './BgdWellPermeabilityTab'
import { permeabilityStorageKey } from '../../../features/geobase/model/bgdWellPermeability'

afterEach(() => { cleanup(); localStorage.clear() })
const component = <BgdWellPermeabilityTab wellId="PERM-W1" wellCode="С-101" depth={500} canEdit />
describe('permeability workspace', () => {
  it('shows its own columns and filters instead of the AP editor', () => {
    render(component)
    expect(screen.getByRole('heading', { name: 'Проницаемые и непроницаемые породы' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Горизонт')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('U, %')).not.toBeInTheDocument()
    const filters = screen.getByRole('group', { name: 'Фильтр по проницаемости' })
    fireEvent.click(within(filters).getByRole('button', { name: 'Проницаемые' }))
    expect(screen.getAllByRole('row')).toHaveLength(4)
    fireEvent.click(within(filters).getByRole('button', { name: 'Нет данных' }))
    expect(screen.getAllByRole('row')).toHaveLength(2)
    expect(screen.queryByRole('heading', { name: 'Характеристики интервала проницаемости' })).not.toBeInTheDocument()
  })
  it('saves explicit classification independently, even without a Kf measurement', () => {
    const view = render(component)
    fireEvent.change(screen.getByRole('combobox', { name: 'Проницаемость' }), { target: { value: 'permeable' } })
    fireEvent.change(screen.getByLabelText('До, м'), { target: { value: '101' } })
    expect(screen.getByRole('button', { name: 'Сохранить проницаемость' })).toBeDisabled()
    fireEvent.change(screen.getByLabelText('До, м'), { target: { value: '100' } })
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить проницаемость' }))
    expect(JSON.parse(localStorage.getItem(permeabilityStorageKey('PERM-W1'))!)[0]).toMatchObject({ kind: 'permeable', kf: null })
    view.unmount(); render(component)
    expect(screen.getByRole('combobox', { name: 'Проницаемость' })).toHaveValue('permeable')
  })
  it('selects an interval from every cell and with Enter or Space on the row', () => {
    render(component)
    const rows = screen.getAllByRole('row'), target = rows[3]!
    for (const cell of within(target).getAllByRole('cell')) {
      fireEvent.click(rows[1]!)
      fireEvent.click(cell)
      expect(screen.getByLabelText('От, м')).toHaveValue(330)
      expect(target).toHaveAttribute('aria-current', 'true')
      expect(rows[1]).not.toHaveAttribute('aria-current')
    }
    for (const key of ['Enter', ' ']) {
      fireEvent.click(rows[1]!)
      rows[2]!.focus()
      fireEvent.keyDown(rows[2]!, { key })
      expect(screen.getByLabelText('От, м')).toHaveValue(100)
      expect(rows[2]).toHaveAttribute('aria-current', 'true')
    }
  })
  it('splits a selected interval without losing coverage and can undo the draft', () => {
    render(component)
    fireEvent.click(screen.getByRole('button', { name: 'Разделить интервал' }))
    expect(screen.getAllByRole('row')).toHaveLength(9)
    expect(screen.getByText('Показано 8 из 8 · не описано 0 м')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Отменить изменения интервалов' }))
    expect(screen.getAllByRole('row')).toHaveLength(8)
  })
})
