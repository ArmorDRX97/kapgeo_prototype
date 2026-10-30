import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { IntervalReview } from './IntervalReview'

afterEach(() => localStorage.clear())
describe('AP interval workflow', () => {
  it('validates bounds and persists the selected horizon per well', () => {
    const view = render(<IntervalReview wellId="test-ap" depth={500} canEdit />)
    fireEvent.change(screen.getByLabelText('Горизонт'), { target: { value: 'K₂ новый' } })
    fireEvent.change(screen.getByLabelText('До, м'), { target: { value: '999' } })
    expect(screen.getByRole('button', { name: 'Сохранить интервалы' })).toBeDisabled()
    fireEvent.change(screen.getByLabelText('До, м'), { target: { value: '350' } })
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить интервалы' }))
    view.unmount()
    render(<IntervalReview wellId="test-ap" depth={500} canEdit />)
    expect(screen.getByLabelText('Горизонт')).toHaveValue('K₂ новый')
  })
  it('selects an interval from any cell in its row and from the keyboard', () => {
    render(<IntervalReview wellId="select-ap" depth={500} canEdit />)
    const rows = screen.getAllByRole('row')
    fireEvent.click(rows[2]!.querySelectorAll('td')[2]!)
    expect(rows[2]).toHaveAttribute('aria-current', 'true')
    fireEvent.keyDown(rows[3]!, { key: 'Enter' })
    expect(rows[3]).toHaveAttribute('aria-current', 'true')
  })
})
