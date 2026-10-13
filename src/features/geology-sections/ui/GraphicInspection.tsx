import { useEffect, useRef, useState, type HTMLAttributes, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { WorkspaceDialog } from '../../../shared/ui/WorkspaceDialog'
import { Button } from '../../../shared/ui/Button'

import type { GraphicInfo } from '../model/graphicInfo'
function readInfo(target: EventTarget | null) {
  const element = target instanceof Element ? target.closest<SVGElement>('[data-inspect]') : null
  if (!element) return null
  try { return { info: JSON.parse(element.dataset.inspect!) as GraphicInfo, element } } catch { return null }
}

/** Read-only object information is available on hover, right click, and keyboard. */
export function GraphicInspection({ children, onSelect }: { children: ReactNode; onSelect?: (id: string) => void }) {
  const [hover, setHover] = useState<{ info: GraphicInfo; x: number; y: number } | null>(null)
  const [menu, setMenu] = useState<typeof hover>(null), [detail, setDetail] = useState<GraphicInfo | null>(null)
  const panel = useRef<HTMLDivElement>(null), origin = useRef<Element | null>(null)
  useEffect(() => {
    if (!menu) return
    panel.current?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true })
    const outside = (event: PointerEvent) => { if (!panel.current?.contains(event.target as Node)) setMenu(null) }
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); setMenu(null); (origin.current as HTMLElement | null)?.focus?.({ preventScroll: true }) }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Home' || event.key === 'End') {
        event.preventDefault(); const items = [...(panel.current?.querySelectorAll<HTMLButtonElement>('button') ?? [])], index = items.indexOf(document.activeElement as HTMLButtonElement)
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length
        items[next]?.focus()
      }
      if (event.key === 'Tab') setMenu(null)
    }
    const close = (event: Event) => { if (!panel.current?.contains(event.target as Node)) setMenu(null) }
    document.addEventListener('pointerdown', outside); document.addEventListener('keydown', key); document.addEventListener('wheel', close, true); window.addEventListener('resize', close)
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', key); document.removeEventListener('wheel', close, true); window.removeEventListener('resize', close) }
  }, [menu])
  const showMenu = (target: EventTarget | null, x: number, y: number) => { const object = readInfo(target); if (!object) return false; origin.current = object.element; setHover(null); setMenu({ info: object.info, x, y }); return true }
  const events: HTMLAttributes<HTMLDivElement> = {
    onPointerDown: () => setHover(null),
    onPointerOver: event => { const object = readInfo(event.target); if (object && !menu && !detail) setHover({ info: object.info, x: event.clientX, y: event.clientY }); else setHover(null) },
    onPointerOut: () => setHover(null), onPointerLeave: () => setHover(null),
    onContextMenu: event => { if (showMenu(event.target, event.clientX, event.clientY)) { event.preventDefault(); event.stopPropagation() } },
    onFocus: event => { const object = readInfo(event.target); if (object) { const r = object.element.getBoundingClientRect(); setHover({ info: object.info, x: r.left, y: r.bottom }) } },
    onBlur: () => setHover(null),
    onKeyDown: event => {
      if (event.key === 'ContextMenu' || event.key === 'F10' && event.shiftKey) { const r = (event.target as Element).getBoundingClientRect(); if (showMenu(event.target, r.left, r.bottom)) { event.preventDefault(); event.stopPropagation() } }
      if (event.key === 'Enter' && readInfo(event.target)) { event.preventDefault(); setDetail(readInfo(event.target)!.info); setHover(null) }
    },
  }
  const place = (x: number, y: number, height: number) => ({ left: Math.max(8, Math.min(x + 12, window.innerWidth - Math.min(300, window.innerWidth - 16) - 8)), top: Math.max(8, Math.min(y + 12, window.innerHeight - height - 8)) })
  return <><div className="graphic-inspection" {...events}>{children}</div>{hover && !menu && !detail && createPortal(<div role="tooltip" className="graphic-tooltip" style={place(hover.x, hover.y, 128)}><strong>{hover.info.title}</strong><span>{hover.info.kind}</span><small>{hover.info.rows.slice(0, 2).map(([label, value]) => `${label}: ${value}`).join(' · ')}</small><small>ПКМ или Shift+F10 — сведения</small></div>, document.body)}
    {menu && createPortal(<div ref={panel} role="menu" aria-label="Действия с объектом графики" className="graphic-context-menu" style={place(menu.x, menu.y, 160)}><strong>{menu.info.title}</strong><button type="button" role="menuitem" onClick={() => { setDetail(menu.info); setMenu(null) }}>Сведения об объекте</button>{onSelect && menu.info.selection && <button type="button" role="menuitem" onClick={() => { onSelect(menu.info.selection!); setMenu(null); (origin.current as HTMLElement | null)?.focus?.({ preventScroll: true }) }}>Выбрать в редакторе</button>}<button type="button" role="menuitem" onClick={() => { setMenu(null); (origin.current as HTMLElement | null)?.focus?.({ preventScroll: true }) }}>Закрыть меню</button></div>, document.body)}
    {detail && <WorkspaceDialog title="Сведения об объекте" size="compact" onClose={() => { setDetail(null); (origin.current as HTMLElement | null)?.focus?.({ preventScroll: true }) }} footer={<Button onClick={() => { setDetail(null); (origin.current as HTMLElement | null)?.focus?.({ preventScroll: true }) }}>Закрыть</Button>}><h3>{detail.title}</h3><p className="section-muted">{detail.kind}</p><dl className="graphic-info">{detail.rows.map(([label, value], i) => <div key={i}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></WorkspaceDialog>}
  </>
}
