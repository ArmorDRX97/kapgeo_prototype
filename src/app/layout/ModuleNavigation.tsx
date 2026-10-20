import { Link, useRouter, useRouterState } from '@tanstack/react-router'
import { Activity, Beaker, BookOpenText, Boxes, ChartNoAxesCombined, Check, ChevronDown, Database, Droplets, FileChartColumn, FileText, FlaskConical, Gauge, Layers3, Map, Mountain, Network, ScanLine, Settings2, Sparkles, TrendingUp, Wrench, type LucideIcon } from 'lucide-react'
import { type KeyboardEvent, useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { UserPersona } from '../../entities/session/model/types'
import { useGeologyNavigation } from '../../features/geology-navigation/useGeologyNavigation'
import { hasPermission, type Permission } from '../../shared/auth/permissions'
import './module-navigation.css'

type MenuId = 'geology' | 'technology'
const modules: { label: string; to: '/geology/bgd' | '/geology' | '/technology' | '/modeling' | '/analytics' | '/admin'; permission: Permission; icon: LucideIcon; menu?: MenuId }[] = [
  { label: 'БГД', to: '/geology/bgd', permission: 'bgd.view', icon: Database },
  { label: 'Геология', to: '/geology', permission: 'geology.view', icon: Mountain, menu: 'geology' },
  { label: 'Геотехнология', to: '/technology', permission: 'technology.view', icon: Network, menu: 'technology' },
  { label: 'Моделирование', to: '/modeling', permission: 'modeling.view', icon: Boxes },
  { label: 'Аналитика', to: '/analytics', permission: 'analytics.view', icon: ChartNoAxesCombined },
  { label: 'Администрирование', to: '/admin', permission: 'administration.view', icon: Settings2 },
]
const geologyItems: { id: string; label: string; icon: LucideIcon }[] = [
  { id: 'interpretation', label: 'Интерпретация', icon: ScanLine },
  { id: 'core', label: 'Интерпретация по керну и литологии', icon: Layers3 },
  { id: 'tablet', label: 'Планшет ГИС', icon: Activity },
  { id: 'passport', label: 'Паспорт скважины', icon: FileText },
  { id: 'map', label: 'Интерактивный план месторождения', icon: Map },
  { id: 'sections', label: 'Разрезы и развертки', icon: BookOpenText },
  { id: 'reserves', label: 'Подсчёт запасов', icon: TrendingUp },
]
const technologyItems: { id: string; label: string; icon: LucideIcon }[] = [
  { id: 'database', label: 'Технологическая база данных', icon: Database },
  { id: 'composition', label: 'Контроль состава растворов', icon: FlaskConical },
  { id: 'flow', label: 'Контроль потока растворов', icon: Droplets },
  { id: 'acid', label: 'Контроль расхода кислоты', icon: Beaker },
  { id: 'equipment', label: 'Контроль работы средств раствороподъёма', icon: Gauge },
  { id: 'repairs', label: 'Ремонтно-восстановительные работы', icon: Wrench },
  { id: 'reports', label: 'Отчёты', icon: FileChartColumn },
  { id: 'ai', label: 'AI', icon: Sparkles },
]

export function ModuleNavigation({ persona }: { persona: UserPersona | null }) {
  const router = useRouter()
  const location = useRouterState({ select: state => state.location }), context = useGeologyNavigation()
  const [open, setOpen] = useState<MenuId | null>(null), [position, setPosition] = useState({ left: 12, top: 68, width: 384 }), [notice, setNotice] = useState('Выберите раздел'), [pressed, setPressed] = useState('')
  const menuRef = useRef<HTMLDivElement>(null), triggers = useRef<Partial<Record<MenuId, HTMLButtonElement>>>({}), openFocus = useRef<'current' | 'last'>('current'), menuId = useId()
  const isGeology = location.pathname.startsWith('/geology') && !location.pathname.startsWith('/geology/bgd')
  const current = location.pathname.startsWith('/geology/interpretation') ? 'interpretation' : location.pathname.startsWith('/geology/sections') ? 'sections' : location.pathname.startsWith('/geology/plans') ? 'map' : location.pathname.startsWith('/geology/passports') ? 'passport' : ''
  // This menu contains presentation-only buttons; it grants no module access.
  const shown = open && (open === 'technology' ? !!persona : hasPermission(persona, 'geology.view'))
  const place = useCallback((id: MenuId) => {
    const anchor = triggers.current[id]?.getBoundingClientRect(); if (!anchor) return
    const width = Math.min(384, window.innerWidth - 24)
    setPosition({ left: Math.max(12, Math.min(anchor.left, window.innerWidth - width - 12)), top: anchor.bottom + 8, width })
  }, [])
  const close = (restore = false) => { if (restore && open) triggers.current[open]?.focus(); setOpen(null) }
  const toggle = (id: MenuId) => { if (open === id) close(); else { place(id); openFocus.current = 'current'; setNotice('Выберите раздел'); setPressed(''); setOpen(id) } }
  useEffect(() => router.subscribe('onResolved', () => setOpen(null)), [router])
  useLayoutEffect(() => {
    if (!shown || !open) return
    // Deferred focus could overwrite the user's first arrow/Home/End command.
    const items = menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]')
    if (openFocus.current === 'last') items?.[items.length - 1]?.focus()
    else (menuRef.current?.querySelector<HTMLElement>('[aria-current="page"]') ?? items?.[0])?.focus()
    const pointer = (event: PointerEvent) => { const node = event.target as Node; if (!menuRef.current?.contains(node) && !Object.values(triggers.current).some(trigger => trigger?.contains(node))) setOpen(null) }
    const focus = (event: FocusEvent) => { const node = event.target as Node; if (!menuRef.current?.contains(node) && !Object.values(triggers.current).some(trigger => trigger?.contains(node))) setOpen(null) }
    const resize = () => place(open)
    const escape = (event: globalThis.KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); triggers.current[open]?.focus(); setOpen(null) } }
    document.addEventListener('pointerdown', pointer); document.addEventListener('focusin', focus); document.addEventListener('keydown', escape); window.addEventListener('resize', resize)
    return () => { document.removeEventListener('pointerdown', pointer); document.removeEventListener('focusin', focus); document.removeEventListener('keydown', escape); window.removeEventListener('resize', resize) }
  }, [open, shown, place])
  const keys = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Tab') { close(true); return }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []), index = items.indexOf(document.activeElement as HTMLElement)
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length
    items[next]?.focus()
  }
  const selectStub = (id: string, label: string) => { setPressed(id); setNotice(`Раздел «${label}» пока не подключён.`) }
  const activeName = isGeology ? geologyItems.find(item => item.id === current)?.label : undefined
  return <>
    <nav className="topbar__module-nav" aria-label="Модули системы">
      {modules.filter(item => item.menu === 'technology' ? !!persona : hasPermission(persona, item.permission)).map(item => {
        const Icon = item.icon, active = item.to === '/geology' ? isGeology : location.pathname.startsWith(item.to)
        return item.menu ? <button key={item.to} ref={node => { if (node) triggers.current[item.menu!] = node }} type="button" className={`module-trigger${active ? ' is-active' : ''}`} title={item.label} aria-label={item.label} aria-haspopup="menu" aria-current={active ? 'true' : undefined} aria-description={active && item.menu === 'geology' ? activeName : undefined} aria-expanded={shown && open === item.menu ? true : false} aria-controls={shown && open === item.menu ? menuId : undefined} onClick={() => toggle(item.menu!)} onKeyDown={event => { if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); openFocus.current = event.key === 'ArrowUp' ? 'last' : 'current'; place(item.menu!); setOpen(item.menu!); setNotice('Выберите раздел'); setPressed('') } }}>
          <Icon size={17} aria-hidden="true" /><span className="module-trigger__copy"><span>{item.label}</span>{active && activeName && item.menu === 'geology' && <small>{activeName}</small>}</span><ChevronDown size={13} className="module-trigger__chevron" aria-hidden="true" />
        </button> : <Link key={item.to} to={item.to} title={item.label} aria-label={item.label} aria-current={active ? 'page' : undefined} className={active ? 'is-active' : ''}><Icon size={17} aria-hidden="true" /><span>{item.label}</span></Link>
      })}
    </nav>
    {shown && open && createPortal(<div ref={menuRef} className="module-dropdown" style={position} onKeyDown={keys}>
      <div className="module-dropdown__header"><span className="module-dropdown__heading-icon">{open === 'geology' ? <Mountain size={19} aria-hidden="true" /> : <Network size={19} aria-hidden="true" />}</span><div><strong>{open === 'geology' ? 'Геология' : 'Геотехнология'}</strong><span>Разделы модуля</span></div></div>
      <div role="menu" aria-label={open === 'geology' ? 'Подмодули геологии' : 'Подмодули геотехнологии'} id={menuId} className="module-dropdown__items">
        {(open === 'geology' ? geologyItems : technologyItems).map(item => {
          const Icon = item.icon, active = open === 'geology' && isGeology && item.id === current
          const content = <><span className="module-dropdown__icon"><Icon size={18} aria-hidden="true" /></span><span className="module-dropdown__label">{item.label}</span>{active && <Check size={16} className="module-dropdown__check" aria-hidden="true" />}</>
          const props = { role: 'menuitem' as const, className: `module-dropdown__item${pressed === item.id ? ' is-pressed' : ''}`, onClick: () => close(), 'aria-current': active ? 'page' as const : undefined }
          if (open === 'geology' && item.id === 'sections') return context.section ? <Link key={item.id} {...props} to="/geology/sections/$sectionId" params={{ sectionId: context.section.id }} search={context.section.search}>{content}</Link> : <Link key={item.id} {...props} to="/geology/sections">{content}</Link>
          if (open === 'geology' && item.id === 'interpretation') return context.alpha ? <Link key={item.id} {...props} to="/geology/interpretation/$method" params={{ method: context.alpha.method }} search={context.alpha.search}>{content}</Link> : <Link key={item.id} {...props} to="/geology/interpretation" search={context.legacy}>{content}</Link>
          if (open === 'geology' && item.id === 'map') return context.plan ? <Link key={item.id} {...props} to="/geology/plans/$projectId" params={{ projectId: context.plan.id }} search={context.plan.search}>{content}</Link> : <Link key={item.id} {...props} to="/geology/plans">{content}</Link>
          if (open === 'geology' && item.id === 'passport') return <Link key={item.id} {...props} to="/geology/passports" search={context.passport}>{content}</Link>
          return <button key={item.id} role="menuitem" type="button" className={props.className} onClick={() => selectStub(item.id, item.label)}>{content}</button>
        })}
      </div>
      <footer className="module-dropdown__footer" role="status" aria-atomic="true">{notice}</footer>
    </div>, document.body)}
  </>
}
