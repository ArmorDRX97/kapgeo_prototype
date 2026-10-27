import { useState } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useModalFocus } from './useModalFocus'

afterEach(cleanup)
function Form({ onClose, pending }: { onClose: () => void; pending: boolean }) {
  const ref = useModalFocus(onClose, pending)
  return <section ref={ref} role="dialog"><button onClick={onClose}>Закрыть</button><input aria-label="Значение" /><button>Последняя кнопка</button></section>
}
function Example({ pending = false }: { pending?: boolean }) {
  const [open, setOpen] = useState(false)
  return <><button onClick={() => setOpen(true)}>Открыть</button>{open && <Form pending={pending} onClose={() => setOpen(false)} />}</>
}
describe('legacy modal keyboard behavior', () => {
  it('contains Tab navigation and returns focus to the trigger on Escape', () => {
    render(<Example />)
    const trigger = screen.getByRole('button', { name: 'Открыть' }); trigger.focus(); fireEvent.click(trigger)
    const first = screen.getByRole('button', { name: 'Закрыть' }), last = screen.getByRole('button', { name: 'Последняя кнопка' })
    expect(first).toHaveFocus()
    fireEvent.keyDown(first, { key: 'Tab', shiftKey: true, cancelable: true }); expect(last).toHaveFocus()
    fireEvent.keyDown(last, { key: 'Tab' }); expect(first).toHaveFocus()
    fireEvent.keyDown(first, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); expect(trigger).toHaveFocus()
  })
  it('keeps a pending form open and uses the current state after a rerender', () => {
    const view = render(<Example pending />)
    fireEvent.click(screen.getByRole('button', { name: 'Открыть' }))
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    view.rerender(<Example />)
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
