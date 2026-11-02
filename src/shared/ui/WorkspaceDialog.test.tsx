import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { WorkspaceDialog } from './WorkspaceDialog'
import { Button } from './Button'

afterEach(cleanup)
function Example({ saved = () => {} }: { saved?: (value: string) => void }) {
  const [open, setOpen] = useState(true), [value, setValue] = useState('Исходное')
  return open && <WorkspaceDialog title="Форма" onClose={() => setOpen(false)} footer={<><Button onClick={() => setOpen(false)}>Отмена</Button><Button onClick={() => { saved(value); setOpen(false) }}>Сохранить</Button></>}><label>Значение<input value={value} onChange={event => setValue(event.target.value)} /></label></WorkspaceDialog>
}
describe('dialog changes protection', () => {
  it('closes an unchanged form directly, but keeps edited input on Escape and Stay', () => {
    const view = render(<Example />)
    fireEvent.click(screen.getByRole('button', { name: 'Закрыть окно' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    view.unmount(); render(<Example />)
    fireEvent.change(screen.getByLabelText('Значение'), { target: { value: 'Правки' } })
    fireEvent.keyDown(screen.getByLabelText('Значение'), { key: 'Escape' })
    expect(screen.getByRole('dialog', { name: 'Есть несохранённые изменения' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Продолжить редактирование' }))
    expect(screen.getByLabelText('Значение')).toHaveValue('Правки')
    fireEvent.click(screen.getByRole('button', { name: 'Отмена' }))
    fireEvent.click(screen.getByRole('button', { name: 'Отменить изменения и закрыть' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
  it('uses the real save action from confirmation instead of discarding values', async () => {
    const saved = vi.fn()
    render(<Example saved={saved} />)
    fireEvent.change(screen.getByLabelText('Значение'), { target: { value: 'Сохранённое' } })
    fireEvent.click(screen.getByRole('button', { name: 'Закрыть окно' }))
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить изменения' }))
    await waitFor(() => expect(saved).toHaveBeenCalledWith('Сохранённое'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
  it('recognises a reverted value as unchanged', () => {
    render(<Example />)
    fireEvent.change(screen.getByLabelText('Значение'), { target: { value: 'Другой' } })
    fireEvent.change(screen.getByLabelText('Значение'), { target: { value: 'Исходное' } })
    fireEvent.click(screen.getByRole('button', { name: 'Отмена' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
