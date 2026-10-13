import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { WorkspaceTabs } from './WorkspaceTabs'

afterEach(() => { cleanup(); vi.unstubAllGlobals() })

it('keeps the active tab visible when the strip narrows without changing selection or focus', () => {
  let resize = () => {}
  vi.stubGlobal('ResizeObserver', class { constructor(callback: () => void) { resize = callback } observe() {} disconnect() {} })
  render(<><input aria-label="Внешнее поле" /><WorkspaceTabs label="Разделы" tabs={[{ id: 'first', label: 'Первая' }, { id: 'last', label: 'Последняя' }]} value="last" onChange={vi.fn()}>Содержимое</WorkspaceTabs></>)
  const strip = screen.getByRole('tablist'), last = screen.getByRole('tab', { name: 'Последняя' }), field = screen.getByRole('textbox')
  Object.defineProperties(strip, { offsetLeft: { value: 0 }, clientWidth: { value: 100 } })
  Object.defineProperties(last, { offsetLeft: { value: 140 }, offsetWidth: { value: 80 } })
  field.focus(); resize()
  expect(strip.scrollLeft).toBe(120)
  expect(last).toHaveAttribute('aria-selected', 'true')
  expect(field).toHaveFocus()
})

it('reveals a tab selected by route context by scrolling only the strip without stealing focus', () => {
  const tabs = [{ id: 'first', label: 'Первая' }, { id: 'last', label: 'Последняя' }]
  const view = (value: string) => <><input aria-label="Внешнее поле" /><WorkspaceTabs label="Разделы" tabs={tabs} value={value} onChange={vi.fn()}>Содержимое</WorkspaceTabs></>
  const { rerender } = render(view('first'))
  const strip = screen.getByRole('tablist'), last = screen.getByRole('tab', { name: 'Последняя' }), field = screen.getByRole('textbox')
  Object.defineProperties(strip, { offsetLeft: { value: 0 }, clientWidth: { value: 100 } })
  Object.defineProperties(last, { offsetLeft: { value: 140 }, offsetWidth: { value: 80 } })
  field.focus(); rerender(view('last'))
  expect(strip.scrollLeft).toBe(120)
  expect(last).toHaveAttribute('aria-selected', 'true')
  expect(field).toHaveFocus()
})

it('supports arrow/Home/End navigation, roving focus and an associated panel', () => {
  function Example() {
    const [value, setValue] = useState('source')
    return <WorkspaceTabs label="Колонки" tabs={[{ id: 'source', label: 'Исходная' }, { id: 'composite', label: 'Сводная' }, { id: 'history', label: 'История' }]} value={value} onChange={setValue}>{value}</WorkspaceTabs>
  }
  render(<Example />)
  const source = screen.getByRole('tab', { name: 'Исходная' })
  source.focus()
  fireEvent.keyDown(source, { key: 'ArrowRight' })
  const composite = screen.getByRole('tab', { name: 'Сводная' })
  expect(composite).toHaveFocus()
  expect(composite).toHaveAttribute('aria-selected', 'true')
  expect(source).toHaveAttribute('tabindex', '-1')
  expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', composite.id)
  fireEvent.keyDown(composite, { key: 'End' })
  expect(screen.getByRole('tab', { name: 'История' })).toHaveFocus()
  fireEvent.keyDown(screen.getByRole('tab', { name: 'История' }), { key: 'Home' })
  expect(source).toHaveFocus()
})
