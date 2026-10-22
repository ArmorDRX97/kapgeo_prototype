import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { LanguageSwitcher } from './LanguageSwitcher'

beforeEach(() => localStorage.removeItem('kapgeo.ui.locale'))
afterEach(cleanup)

describe('Language switcher placeholder', () => {
  it('selects and remembers Kazakh and English', () => {
    render(<LanguageSwitcher />)
    const trigger = screen.getByRole('button', { name: 'Язык интерфейса: Русский' })
    for (const [name, code, label] of [['Казахский', 'kk', 'Қазақша'], ['Английский', 'en', 'English']]) {
      fireEvent.click(trigger)
      fireEvent.click(screen.getByRole('menuitemradio', { name }))
      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
      expect(trigger).toHaveAttribute('aria-expanded', 'false')
      expect(trigger).toHaveFocus()
      expect(trigger).toHaveTextContent(label!)
      expect(localStorage.getItem('kapgeo.ui.locale')).toBe(code)
      fireEvent.click(trigger)
      expect(screen.getByRole('menuitemradio', { name })).toHaveAttribute('aria-checked', 'true')
      fireEvent.keyDown(document.activeElement!, { key: 'Escape' })
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
