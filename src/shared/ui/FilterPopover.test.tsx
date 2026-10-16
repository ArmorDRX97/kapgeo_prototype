import { useCallback, useRef, useState } from 'react'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FilterPopover } from './FilterPopover'

afterEach(() => { cleanup(); vi.unstubAllGlobals() })

function Harness() {
  const trigger = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('all')
  const close = useCallback(() => setOpen(false), [])
  return <section data-testid="sidebar"><button ref={trigger} onClick={() => setOpen(true)}>Фильтры</button><button>Вне панели</button>{open && <FilterPopover id="test-filters" title="Фильтры" anchor={trigger} onClose={close} wide footer={<button onClick={() => setValue('all')}>Сбросить</button>}><label>Статус<select value={value} onChange={event => setValue(event.target.value)}><option value="all">Все</option><option value="active">Активные</option></select></label></FilterPopover>}</section>
}

describe('anchored filter popover', () => {
  it('stays within the viewport below its actual top and reflows without losing selection on resize', () => {
    vi.stubGlobal('innerWidth', 1000)
    vi.stubGlobal('innerHeight', 600)
    render(<Harness />)
    const trigger = screen.getByRole('button', { name: 'Фильтры' })
    vi.spyOn(trigger, 'getBoundingClientRect').mockReturnValue({ left: 100, right: 140, top: 150, bottom: 186, width: 40, height: 36, x: 100, y: 150, toJSON: () => ({}) })
    fireEvent.click(trigger)
    const dialog = screen.getByRole('dialog', { name: 'Фильтры' })
    expect(screen.getByTestId('sidebar')).not.toContainElement(dialog)
    expect(dialog.style.left).toBe('148px')
    expect(dialog.style.width).toBe('520px')
    expect(Number.parseFloat(dialog.style.top) + Number.parseFloat(dialog.style.maxHeight)).toBeLessThanOrEqual(588)
    const select = within(dialog).getByRole('combobox', { name: 'Статус' })
    expect(select).toHaveFocus()
    fireEvent.change(select, { target: { value: 'active' } })
    vi.stubGlobal('innerWidth', 390)
    vi.stubGlobal('innerHeight', 300)
    fireEvent.resize(window)
    expect(dialog.style.width).toBe('366px')
    expect(Number.parseFloat(dialog.style.left) + Number.parseFloat(dialog.style.width)).toBeLessThanOrEqual(378)
    expect(Number.parseFloat(dialog.style.top) + Number.parseFloat(dialog.style.maxHeight)).toBeLessThanOrEqual(288)
    expect(select).toHaveValue('active')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Сбросить' }))
    expect(select).toHaveValue('all')
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('dismisses on an outside pointer and keeps field changes inside the panel', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Фильтры' }))
    fireEvent.pointerDown(screen.getByRole('combobox'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Вне панели' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
