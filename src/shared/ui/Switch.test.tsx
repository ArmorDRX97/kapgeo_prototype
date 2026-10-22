import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { Switch } from './Switch'

afterEach(cleanup)
it('exposes an accessible labeled switch and toggles its controlled value', () => {
  const onChange = vi.fn(), view = render(<Switch label="Сетка" checked onChange={onChange} />)
  fireEvent.click(screen.getByRole('switch', { name: 'Сетка', checked: true }))
  expect(onChange).toHaveBeenCalledWith(false)
  view.rerender(<Switch label="Сетка" checked={false} disabled onChange={onChange} />)
  expect(screen.getByRole('switch', { name: 'Сетка', checked: false })).toBeDisabled()
})
