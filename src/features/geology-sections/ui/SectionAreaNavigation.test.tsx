import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { SectionAreaNavigation } from './SectionAreaNavigation'

it('switches between work areas using the horizontal tab bar', () => {
  const onChange = vi.fn()
  render(<SectionAreaNavigation value="overview" onChange={onChange} actions={<button type="button">Сохранить разрез</button>}><p>Параметры разреза</p></SectionAreaNavigation>)
  const tabList = screen.getByRole('tablist')
  const save = screen.getByRole('button', { name: 'Сохранить разрез' })
  expect(tabList.parentElement).toContainElement(save)
  expect(tabList).not.toContainElement(save)
  expect(screen.getByRole('tabpanel', { name: 'Разрез' })).toHaveTextContent('Параметры разреза')
  fireEvent.keyDown(screen.getByRole('tab', { name: 'Разрез' }), { key: 'ArrowRight' })
  expect(onChange).toHaveBeenCalledWith('map')
  expect(screen.getByRole('tab', { name: 'Карта' })).toHaveFocus()
})
