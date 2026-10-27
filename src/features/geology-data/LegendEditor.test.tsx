import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LegendEditor } from './LegendEditor'
import { readLegend } from './legend'

beforeEach(() => localStorage.removeItem('kapgeo.legend.2026.v1'))
afterEach(() => { cleanup(); localStorage.removeItem('kapgeo.legend.2026.v1') })

describe('Legend editor', () => {
  it('previews the edited pattern, saves it and discards a later cancelled change', () => {
    const onChange = vi.fn()
    render(<LegendEditor onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Легенда и коды' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Порода 1' }), { target: { value: 'Проверенная порода' } })
    fireEvent.change(screen.getByLabelText('Цвет 1', { exact: true }), { target: { value: '#aaccee' } })
    fireEvent.change(screen.getByRole('combobox', { name: 'Крап 1' }), { target: { value: 'diagonal' } })
    expect(screen.getByRole('img', { name: 'Образец: Проверенная порода, Штриховка' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить легенду' }))
    expect(readLegend()[0]).toMatchObject({ name: 'Проверенная порода', color: '#aaccee', pattern: 'diagonal' })
    expect(onChange).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Легенда и коды' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Порода 1' }), { target: { value: 'Отменённая правка' } })
    fireEvent.click(screen.getByRole('button', { name: 'Отмена' }))
    expect(readLegend()[0]?.name).toBe('Проверенная порода')
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('keeps invalid duplicate codes out of saved data', () => {
    render(<LegendEditor />)
    fireEvent.click(screen.getByRole('button', { name: 'Легенда и коды' }))
    const code = screen.getByRole('textbox', { name: 'Код 1' }) as HTMLInputElement
    fireEvent.change(screen.getByRole('textbox', { name: 'Код 2' }), { target: { value: code.value } })
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить легенду' }))
    expect(screen.getByRole('alert')).toHaveTextContent('уникальные коды')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(localStorage.getItem('kapgeo.legend.2026.v1')).toBeNull()
  })
})
