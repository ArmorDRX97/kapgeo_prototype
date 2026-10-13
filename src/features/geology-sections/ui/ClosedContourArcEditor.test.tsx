import { useState } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { initialSections } from '../../../entities/geology-section/model/fixtures'
import { ClosedContourArcEditor } from './ClosedContourArcEditor'
afterEach(cleanup)
describe('closed contour arc preview', () => {
  it('keeps preview local, applies one operation and restores the original contour', () => {
    const change = vi.fn(), pending = vi.fn()
    function Harness() {
      const [s, set] = useState(initialSections()[0]!)
      return <ClosedContourArcEditor section={s} layer="technology" disabled={false} onPending={pending} onChange={next => { change(next); set(next) }} />
    }
    render(<Harness />)
    fireEvent.click(screen.getByText('Дуга замкнутого контура'))
    fireEvent.change(screen.getByLabelText('Обработка дуги'), { target: { value: 'straight' } })
    fireEvent.click(screen.getByRole('button', { name: 'Предпросмотр дуги' }))
    expect(pending).toHaveBeenLastCalledWith(true); expect(change).not.toHaveBeenCalled()
    fireEvent.keyDown(screen.getByRole('button', { name: 'Отменить обработку дуги' }), { key: 'Escape' })
    expect(pending).toHaveBeenLastCalledWith(false)
    fireEvent.click(screen.getByRole('button', { name: 'Предпросмотр дуги' }))
    fireEvent.click(screen.getByRole('button', { name: 'Применить обработку дуги' }))
    expect(change).toHaveBeenCalledTimes(1)
    expect(change.mock.calls[0]![0].contourArcEdits.technology[0]).toMatchObject({ route: 'short', operation: 'straight' })
    fireEvent.click(screen.getByRole('button', { name: 'Восстановить исходный контур' }))
    expect(change.mock.calls[1]![0].contourArcEdits.technology).toEqual([])
  })
  it('rejects identical endpoints and respects read-only', () => {
    render(<ClosedContourArcEditor section={initialSections()[0]!} layer="technology" disabled onPending={vi.fn()} onChange={vi.fn()} />)
    fireEvent.click(screen.getByText('Дуга замкнутого контура'))
    fireEvent.change(screen.getByLabelText('Конец дуги'), { target: { value: 0 } })
    expect(screen.getByRole('button', { name: 'Предпросмотр дуги' })).toBeDisabled()
    expect(screen.getByRole('status')).toHaveTextContent('две разные')
  })
})
