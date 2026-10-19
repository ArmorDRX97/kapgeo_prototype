import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { SectionAreaNavigation } from './SectionAreaNavigation'

it('groups section work areas in a vertical, keyboard-accessible navigator', () => {
  const onChange = vi.fn()
  render(<SectionAreaNavigation value="overview" onChange={onChange}><p>Параметры разреза</p></SectionAreaNavigation>)
  expect(screen.getByRole('tablist', { name: 'Навигация по рабочим областям' })).toHaveAttribute('aria-orientation', 'vertical')
  expect(screen.getByRole('heading', { name: 'Геологические данные' })).toBeInTheDocument()
  fireEvent.keyDown(screen.getByRole('tab', { name: 'Разрез' }), { key: 'ArrowDown' })
  expect(onChange).toHaveBeenCalledWith('map')
})
