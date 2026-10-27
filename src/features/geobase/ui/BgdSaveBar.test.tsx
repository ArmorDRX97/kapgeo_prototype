import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { BgdSaveBar } from './BgdSaveBar'

describe('BGD save state', () => {
  it('prevents saving unchanged or invalid forms and enables a valid draft', () => {
    const onSave = vi.fn()
    const props = { status: 'Нет несохранённых изменений', pending: false, disabled: false, onSave }
    const view = render(<BgdSaveBar {...props} ready={false} />)
    const save = screen.getByRole('button', { name: 'Сохранить изменения' })
    expect(save).toBeDisabled()
    fireEvent.click(save)
    expect(onSave).not.toHaveBeenCalled()
    view.rerender(<BgdSaveBar {...props} ready />)
    fireEvent.click(save)
    expect(onSave).toHaveBeenCalledOnce()
    view.rerender(<BgdSaveBar {...props} ready pending />)
    expect(screen.getByRole('button', { name: 'Сохраняем…' })).toBeDisabled()
  })
})
