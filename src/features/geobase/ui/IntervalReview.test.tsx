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
})
