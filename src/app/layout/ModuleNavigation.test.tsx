import type { AnchorHTMLAttributes, ElementType } from 'react'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ModuleNavigation } from './ModuleNavigation'
import { userPersonas } from '../../entities/session/model/personas'
import { hasPermission } from '../../shared/auth/permissions'

const router = vi.hoisted(() => ({ subscribe: vi.fn(() => () => undefined) }))
const state = vi.hoisted(() => ({ location: { pathname: '/geology/interpretation/electro', search: { well: 'int-demo-04', from: 110, to: 135 } as Record<string, unknown> } }))
type MockLink = AnchorHTMLAttributes<HTMLAnchorElement> & { to: string; params?: Record<string, string>; search?: Record<string, unknown>; activeProps?: object }
vi.mock('@tanstack/react-router', () => {
  const link = (Component: ElementType) => ({ to, params, search, activeProps, ...props }: MockLink) => {
    const query = new URLSearchParams(Object.entries(search ?? {}).filter(([, v]) => v !== undefined).map(([key, value]) => [key, String(value)]))
    const path = to.replace(/\$(\w+)/g, (_, key: string) => params?.[key] ?? '')
    // TanStack adds aria-current after user props for every matching URL,
    // including aliases. Custom anchors must resolve the workspace selection.
    const matched = state.location.pathname === path
    return <Component {...props} {...(matched ? activeProps : {})} href={path + (query.size ? `?${query}` : '')} {...(matched ? { 'aria-current': 'page' } : {})} />
  }
  return {
  useRouter: () => router,
  useRouterState: ({ select }: { select: (s: typeof state) => unknown }) => select(state),
  Link: link('a'),
  createLink: link,
  }
})
const persona = userPersonas[0]!
describe('module dropdown navigation', () => {
  beforeEach(() => {
    sessionStorage.clear(); state.location = { pathname: '/geology/interpretation/electro', search: { well: 'int-demo-04', from: 110, to: 135 } }
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { callback(0); return 1 }); vi.stubGlobal('cancelAnimationFrame', vi.fn())
  })
  afterEach(() => { cleanup(); vi.unstubAllGlobals() })
  it('links every available geology workspace while retaining well and depth context', () => {
    render(<ModuleNavigation persona={persona} />)
    const trigger = screen.getByRole('button', { name: 'Геология' })
    expect(trigger).toHaveAttribute('aria-expanded', 'false'); fireEvent.click(trigger)
    const menu = screen.getByRole('menu', { name: 'Подмодули геологии' }), items = within(menu).getAllByRole('menuitem')
    expect(items.map(item => item.textContent)).toEqual(['Интерпретация', 'Интерпретация по керну и литологии', 'Планшет ГИС', 'Паспорт скважины', 'Интерактивный план месторождения', 'Разрезы и развертки', 'Обмен и подготовка разведочных данных', 'Подсчёт запасов'])
    expect(items.filter(item => item.tagName === 'A')).toHaveLength(6)
    for (const name of ['Интерпретация по керну и литологии', 'Планшет ГИС']) {
      const item = within(menu).getByRole('menuitem', { name })
      expect(item.tagName).toBe('BUTTON')
      expect(item).not.toHaveAttribute('href')
      fireEvent.click(item)
      expect(screen.getByRole('status')).toHaveTextContent(`Раздел «${name}» пока не подключён.`)
      expect(state.location.pathname).toBe('/geology/interpretation/electro')
      expect(item).not.toHaveAttribute('aria-current')
    }
    expect(within(menu).getByRole('menuitem', { name: 'Паспорт скважины' })).toHaveAttribute('href', '/geology/passports')
    expect(items[0]).toHaveAttribute('aria-current', 'page')
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

  it('keeps one interpretation entry and current marker on the gamma method', () => {
    state.location = { pathname: '/geology/interpretation/gamma', search: { well: 'int-demo-04', from: 110, to: 135 } }
    render(<ModuleNavigation persona={persona} />)
    fireEvent.click(screen.getByRole('button', { name: 'Геология' }))
    const interpretation = screen.getByRole('menuitem', { name: 'Интерпретация' })
    expect(interpretation).toHaveAttribute('href', '/geology/interpretation/gamma?well=int-demo-04&from=110&to=135')
    expect(screen.getAllByRole('menuitem').filter(item => item.getAttribute('aria-current') === 'page')).toEqual([interpretation])
    expect(screen.getByRole('menuitem', { name: 'Планшет ГИС' })).not.toHaveAttribute('href')
    expect(interpretation).toHaveFocus()
  })

  it('keeps the GIS method available after entering core interpretation', () => {
    const view = render(<ModuleNavigation persona={persona} />)
    state.location = { pathname: '/geology/interpretation', search: { well: 'int-demo-04', from: 110, to: 135, mode: 'core' } }
    view.rerender(<ModuleNavigation persona={persona} />)
    fireEvent.click(screen.getByRole('button', { name: 'Геология' }))
    expect(screen.getByRole('menuitem', { name: 'Интерпретация' })).toHaveAttribute('href', '/geology/interpretation/electro?well=int-demo-04&from=110&to=135')
    expect(screen.getByRole('menuitem', { name: 'Интерпретация по керну и литологии' })).not.toHaveAttribute('href')
    expect(screen.getByRole('menuitem', { name: 'Интерпретация' })).not.toHaveAttribute('aria-current')
    expect(JSON.parse(sessionStorage.getItem('kapgeo.geology.alpha-navigation.v1')!)).toMatchObject({ method: 'electro' })
  })

  it('opens GIS interpretation directly when the session starts in core interpretation', () => {
    state.location = { pathname: '/geology/interpretation', search: { well: 'int-demo-01', from: 98, to: 143, mode: 'lithology' } }
    render(<ModuleNavigation persona={persona} />)
    fireEvent.click(screen.getByRole('button', { name: 'Геология' }))
    expect(screen.getByRole('menuitem', { name: 'Интерпретация' })).toHaveAttribute('href', '/geology/interpretation/gamma?well=int-demo-01&from=98&to=143')
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
  it('keeps geology guarded while linking the technology scenario', () => {
    render(<ModuleNavigation persona={userPersonas.find(p => p.id === 'dispatcher.nur')!} />)
    expect(screen.queryByRole('button', { name: 'Геология' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Геотехнология' }))
    const items = within(screen.getByRole('menu', { name: 'Подмодули геотехнологии' })).getAllByRole('menuitem')
    expect(items).toHaveLength(8); expect(items[0]).toHaveAttribute('href', '/technology'); expect(items.slice(1).every(item => item.tagName === 'BUTTON')).toBe(true)
    expect(items[0]).toHaveTextContent('Технологическая база данных')
  })
  it('restores an independent map project and selection after leaving geology', () => {
    state.location = { pathname: '/geology/plans/MAP-FIELD', search: { selection: 'field-well-1' } }
    const view = render(<ModuleNavigation persona={persona} />)
    state.location = { pathname: '/analytics', search: {} }; view.rerender(<ModuleNavigation persona={persona} />)
    fireEvent.click(screen.getByRole('button', { name: 'Геология' }))
    expect(screen.getByRole('menuitem', { name: 'Интерактивный план месторождения' })).toHaveAttribute('href', '/geology/plans/MAP-FIELD?selection=field-well-1')
  })
  it('opens the full deposit instead of an old remembered small plan', () => {
    sessionStorage.setItem('kapgeo.geology.plan-navigation.v1', JSON.stringify({ id: 'MAP-01', search: { selection: 'well-49' } }))
    render(<ModuleNavigation persona={persona} />)
    fireEvent.click(screen.getByRole('button', { name: 'Геология' }))
    expect(screen.getByRole('menuitem', { name: 'Интерактивный план месторождения' })).toHaveAttribute('href', '/geology/plans')
  })
  it('keeps the passport well selection on return from another module', () => {
    state.location = { pathname: '/geology/passports', search: { well: 'PS-301' } }
    const view = render(<ModuleNavigation persona={persona} />)
    fireEvent.click(screen.getByRole('button', { name: 'Геология' }))
    expect(screen.getByRole('menuitem', { name: 'Паспорт скважины' })).toHaveAttribute('aria-current', 'page')
    fireEvent.keyDown(screen.getByRole('menuitem', { name: 'Паспорт скважины' }), { key: 'Escape' })
    state.location = { pathname: '/analytics', search: {} }; view.rerender(<ModuleNavigation persona={persona} />)
    fireEvent.click(screen.getByRole('button', { name: 'Геология' }))
    expect(screen.getByRole('menuitem', { name: 'Паспорт скважины' })).toHaveAttribute('href', '/geology/passports?well=PS-301')
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
