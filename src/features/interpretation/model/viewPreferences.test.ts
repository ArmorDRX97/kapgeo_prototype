import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defaultInterpretationView, interpretationViewKey, readInterpretationView, useInterpretationView } from './viewPreferences'

afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.removeItem(interpretationViewKey('a')); localStorage.removeItem(interpretationViewKey('b')) })
describe('independent interpretation display preferences', () => {
  it('persists visibility, widths, order and scales without affecting another well', () => {
    const hook = renderHook(() => useInterpretationView('a'))
    act(() => hook.result.current.update(p => ({ ...p, view: { ...p.view, gr: false }, trackWidths: { lithology: 208 }, trackOrder: ['rs-main', 'lithology'], scales: { 'rs-main': { min: 1, max: 100, log: true } } })))
    const stored = hook.result.current.preferences
    hook.unmount()
    const reopened = renderHook(() => useInterpretationView('a'))
    expect(reopened.result.current.preferences).toEqual(stored)
    expect(readInterpretationView('b')).toEqual(defaultInterpretationView())
    act(() => reopened.result.current.reset())
    expect(readInterpretationView('a')).toEqual(defaultInterpretationView())
  })
  it('keeps corrupt bytes untouched on mount and rejects invalid scales or widths', () => {
    const corrupt = '{broken'
    localStorage.setItem(interpretationViewKey('a'), corrupt)
    const hook = renderHook(() => useInterpretationView('a'))
    expect(hook.result.current.preferences).toEqual(defaultInterpretationView())
    expect(localStorage.getItem(interpretationViewKey('a'))).toBe(corrupt)
    expect(() => hook.result.current.update(p => ({ ...p, scales: { rs: { min: 0, max: 10, log: true } } }))).toThrow()
    expect(() => hook.result.current.update(p => ({ ...p, trackWidths: { rs: 900 } }))).toThrow()
    expect(localStorage.getItem(interpretationViewKey('a'))).toBe(corrupt)
  })
  it('retains working settings and shows a storage failure, then permits retry', () => {
    const hook = renderHook(() => useInterpretationView('a'))
    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('quota', 'QuotaExceededError') })
    act(() => hook.result.current.update(p => ({ ...p, view: { ...p.view, gr: false } })))
    expect(hook.result.current.preferences.view.gr).toBe(false)
    expect(hook.result.current.storageError).toContain('Не удалось сохранить')
    write.mockRestore()
    act(() => hook.result.current.update(p => p))
    expect(hook.result.current.storageError).toBe('')
    expect(readInterpretationView('a').view.gr).toBe(false)
  })
})
