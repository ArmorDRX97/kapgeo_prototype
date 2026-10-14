import type { AnchorHTMLAttributes } from 'react'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ModuleNavigation } from './ModuleNavigation'
import { userPersonas } from '../../entities/session/model/personas'
import { hasPermission } from '../../shared/auth/permissions'

const router = vi.hoisted(() => ({ subscribe: vi.fn(() => () => undefined) }))
const state = vi.hoisted(() => ({ location: { pathname: '/geology/interpretation/electro', search: { well: 'int-demo-04', from: 110, to: 135 } as Record<string, unknown> } }))
type MockLink = AnchorHTMLAttributes<HTMLAnchorElement> & { to: string; params?: Record<string, string>; search?: Record<string, unknown> }
vi.mock('@tanstack/react-router', () => ({
  useRouter: () => router,
  useRouterState: ({ select }: { select: (s: typeof state) => unknown }) => select(state),
  Link: ({ to, params, search, ...props }: MockLink) => {
    const query = new URLSearchParams(Object.entries(search ?? {}).filter(([, v]) => v !== undefined).map(([key, value]) => [key, String(value)]))
    return <a {...props} href={to.replace(/\$(\w+)/g, (_, key: string) => params?.[key] ?? '') + (query.size ? `?${query}` : '')} />
  },
}))
const persona = userPersonas[0]!
describe('module dropdown navigation', () => {
  beforeEach(() => {
    sessionStorage.clear(); state.location = { pathname: '/geology/interpretation/electro', search: { well: 'int-demo-04', from: 110, to: 135 } }
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { callback(0); return 1 }); vi.stubGlobal('cancelAnimationFrame', vi.fn())
  })
  afterEach(() => { cleanup(); vi.unstubAllGlobals() })
  it('shows the requested geology structure and keeps five placeholders on the current page', () => {
    render(<ModuleNavigation persona={persona} />)
    const trigger = screen.getByRole('button', { name: 'Геология' })
    expect(trigger).toHaveAttribute('aria-expanded', 'false'); fireEvent.click(trigger)
    const menu = screen.getByRole('menu', { name: 'Подмодули геологии' }), items = within(menu).getAllByRole('menuitem')
    expect(items.map(item => item.textContent)).toEqual(['Интерпретация', 'Интерпретация по керну и литологии', 'Планшет ГИС', 'Паспорт скважины', 'Интерактивный план месторождения', 'Разрезы и развертки', 'Подсчёт запасов'])
    expect(items.filter(item => item.tagName === 'A')).toHaveLength(2)
    expect(items[0]).toHaveAttribute('aria-current', 'page')
    for (const item of items.filter(item => item.tagName === 'BUTTON')) {
      fireEvent.click(item); expect(item).not.toHaveAttribute('href'); expect(screen.getByRole('status')).toHaveTextContent(`Раздел «${item.textContent}» пока не подключён.`)
      expect(state.location.pathname).toBe('/geology/interpretation/electro')
    }
  })
  it('supports arrows, Home/End, Escape with focus return and outside pointer dismissal', () => {
    render(<ModuleNavigation persona={persona} />)
    const trigger = screen.getByRole('button', { name: 'Геология' }); trigger.focus(); fireEvent.keyDown(trigger, { key: 'ArrowUp' })
    const items = screen.getAllByRole('menuitem'); expect(items.at(-1)).toHaveFocus()
    fireEvent.keyDown(document.activeElement!, { key: 'Home' }); expect(items[0]).toHaveFocus()
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown' }); expect(items[1]).toHaveFocus()
    fireEvent.keyDown(document.activeElement!, { key: 'End' }); expect(items.at(-1)).toHaveFocus()
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' }); expect(screen.queryByRole('menu')).not.toBeInTheDocument(); expect(trigger).toHaveFocus()
    fireEvent.click(trigger); fireEvent.pointerDown(document.body); expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    fireEvent.click(trigger); fireEvent.keyDown(document.activeElement!, { key: 'Tab' }); expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })
  it('records context while closed and restores the method and selected section in links', () => {
    const view = render(<ModuleNavigation persona={persona} />)
    state.location = { pathname: '/geology/sections/GTR-DEMO-011', search: { view: 'lithology', q: 'Северный' } }
    view.rerender(<ModuleNavigation persona={persona} />); fireEvent.click(screen.getByRole('button', { name: 'Геология' }))
    expect(screen.getByRole('menuitem', { name: 'Интерпретация' })).toHaveAttribute('href', '/geology/interpretation/electro?well=int-demo-04&from=110&to=135')
    const section = screen.getByRole('menuitem', { name: 'Разрезы и развертки' }); expect(section).toHaveFocus(); expect(section).toHaveAttribute('aria-current', 'page')
    expect(section.getAttribute('href')).toContain('/geology/sections/GTR-DEMO-011?view=lithology')
    fireEvent.keyDown(section, { key: 'Escape' }); state.location = { pathname: '/analytics', search: {} }; view.rerender(<ModuleNavigation persona={persona} />)
    fireEvent.click(screen.getByRole('button', { name: 'Геология' })); expect(screen.getByRole('menuitem', { name: 'Разрезы и развертки' }).getAttribute('href')).toContain('GTR-DEMO-011')
  })
  it('keeps geology guarded while displaying geotechnology placeholders', () => {
    render(<ModuleNavigation persona={userPersonas.find(p => p.id === 'dispatcher.nur')!} />)
    expect(screen.queryByRole('button', { name: 'Геология' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Геотехнология' }))
    const items = within(screen.getByRole('menu', { name: 'Подмодули геотехнологии' })).getAllByRole('menuitem')
    expect(items).toHaveLength(8); expect(items.every(item => item.tagName === 'BUTTON' && !item.hasAttribute('href'))).toBe(true)
    fireEvent.click(items.at(-1)!); expect(screen.getByRole('status')).toHaveTextContent('Раздел «AI» пока не подключён.')
  })
  it('shows all geotechnology placeholders to the geologist without granting technology access', () => {
    expect(hasPermission(persona, 'technology.view')).toBe(false)
    const view = render(<ModuleNavigation persona={persona} />)
    fireEvent.click(screen.getByRole('button', { name: 'Геотехнология' }))
    const items = within(screen.getByRole('menu', { name: 'Подмодули геотехнологии' })).getAllByRole('menuitem')
    expect(items).toHaveLength(8)
    for (const item of items) {
      expect(item.tagName).toBe('BUTTON'); expect(item).not.toHaveAttribute('href'); fireEvent.click(item)
      expect(state.location.pathname).toBe('/geology/interpretation/electro')
    }
    expect(hasPermission(persona, 'technology.view')).toBe(false)
    view.rerender(<ModuleNavigation persona={null} />)
    expect(screen.queryByRole('button', { name: 'Геотехнология' })).not.toBeInTheDocument()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })
})
