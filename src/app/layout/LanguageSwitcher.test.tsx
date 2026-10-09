import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { LanguageSwitcher } from './LanguageSwitcher'

afterEach(cleanup)

describe('Language switcher placeholder', () => {
  it('keeps Russian selected when either placeholder language is clicked', () => {
    render(<LanguageSwitcher />)
    const trigger = screen.getByRole('button', { name: 'Язык интерфейса: Русский' })
    for (const name of ['Казахский', 'Английский']) {
      fireEvent.click(trigger)
      const menu = screen.getByRole('menu', { name: 'Язык интерфейса' })
      expect(within(menu).getByRole('menuitemradio', { name: 'Русский' })).toHaveAttribute('aria-checked', 'true')
      fireEvent.click(within(menu).getByRole('menuitemradio', { name }))
      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
      expect(trigger).toHaveAttribute('aria-expanded', 'false')
      expect(trigger).toHaveFocus()
      expect(trigger).toHaveTextContent('Русский')
    }
  })

  it('supports keyboard navigation, Escape and outside clicks', () => {
    render(<LanguageSwitcher />)
    const trigger = screen.getByRole('button', { name: 'Язык интерфейса: Русский' })
    fireEvent.keyDown(trigger, { key: 'ArrowUp' })
    const english = screen.getByRole('menuitemradio', { name: 'Английский' })
    expect(english).toHaveFocus()
    fireEvent.keyDown(english, { key: 'ArrowDown' })
    expect(screen.getByRole('menuitemradio', { name: 'Русский' })).toHaveFocus()
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' })
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
    fireEvent.click(trigger)
    fireEvent.pointerDown(document.body)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })
})
