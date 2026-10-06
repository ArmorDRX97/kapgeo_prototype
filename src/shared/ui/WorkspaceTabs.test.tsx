import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, expect, it } from 'vitest'
import { WorkspaceTabs } from './WorkspaceTabs'

afterEach(cleanup)

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
