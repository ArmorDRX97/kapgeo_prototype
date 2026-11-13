import { useEffect, useRef, useState, type HTMLAttributes, type ReactNode } from 'react'
import { GripHorizontal } from 'lucide-react'
import { useMovablePopup } from '../../../shared/lib/useMovablePopup'
import { createPortal } from 'react-dom'
import { WorkspaceDialog } from '../../../shared/ui/WorkspaceDialog'
import { Button } from '../../../shared/ui/Button'

import type { GraphicInfo } from '../model/graphicInfo'
function readInfo(target: EventTarget | null) {
  const element = target instanceof Element ? target.closest<SVGElement>('[data-inspect]') : null
  if (!element) return null
  try { return { info: JSON.parse(element.dataset.inspect!) as GraphicInfo, element } } catch { return null }
}

/** Object information opens by context menu or keyboard. Maps may also show a preview. */
export function GraphicInspection({ children, onSelect, hoverPreview = true, highlightOnClick = true }: { children: ReactNode; onSelect?: (id: string) => void; hoverPreview?: boolean; highlightOnClick?: boolean }) {
  const [hover, setHover] = useState<{ info: GraphicInfo; x: number; y: number } | null>(null)
  const [menu, setMenu] = useState<typeof hover>(null), [detail, setDetail] = useState<GraphicInfo | null>(null)
  const { ref: panel, handle } = useMovablePopup(menu)
  const origin = useRef<Element | null>(null)
  const highlighted = useRef<SVGElement | null>(null)
  const highlight = (element: SVGElement | null) => {
    if (highlighted.current === element) return
    highlighted.current?.removeAttribute('data-inspected')
    element?.setAttribute('data-inspected', '')
    highlighted.current = element
  }
  useEffect(() => {
    if (!menu) return
    panel.current?.querySelector<HTMLButtonElement>('[role=menuitem]')?.focus({ preventScroll: true })
    const outside = (event: PointerEvent) => { if (!panel.current?.contains(event.target as Node)) setMenu(null) }
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); setMenu(null); (origin.current as HTMLElement | null)?.focus?.({ preventScroll: true }) }
      if (event.defaultPrevented) return
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Home' || event.key === 'End') {
        event.preventDefault(); const items = [...(panel.current?.querySelectorAll<HTMLButtonElement>('[role=menuitem]') ?? [])], index = items.indexOf(document.activeElement as HTMLButtonElement)
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length
        items[next]?.focus()
      }
    }
    const close = (event: Event) => { if (!panel.current?.contains(event.target as Node)) setMenu(null) }
    document.addEventListener('pointerdown', outside); document.addEventListener('keydown', key); document.addEventListener('wheel', close, true); document.addEventListener('focusin', close)
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', key); document.removeEventListener('wheel', close, true); document.removeEventListener('focusin', close) }
  }, [menu, panel])
  const showMenu = (target: EventTarget | null, x: number, y: number) => { const object = readInfo(target); if (!object) return false; highlight(object.element); origin.current = object.element; setHover(null); setMenu({ info: object.info, x, y }); return true }
  const events: HTMLAttributes<HTMLDivElement> = {
    onPointerDown: () => setHover(null),
    onClickCapture: event => {
      if (!(event.target instanceof SVGElement)) return
      const element = highlightOnClick ? event.target.closest<SVGElement>('[data-inspect]') : null
      const click = event.nativeEvent
      // Panning can cancel the click later in the capture phase.
      queueMicrotask(() => { if (!click.defaultPrevented) highlight(element?.isConnected ? element : null) })
    },
    onPointerOver: hoverPreview ? event => { const object = readInfo(event.target); if (object && !menu && !detail) setHover({ info: object.info, x: event.clientX, y: event.clientY }); else setHover(null) } : undefined,
    onPointerOut: () => setHover(null), onPointerLeave: () => setHover(null),
    onContextMenu: event => { if (showMenu(event.target, event.clientX, event.clientY)) { event.preventDefault(); event.stopPropagation() } },
    onFocus: hoverPreview ? event => { const object = readInfo(event.target); if (object) { const r = object.element.getBoundingClientRect(); setHover({ info: object.info, x: r.left, y: r.bottom }) } } : undefined,
    onBlur: () => setHover(null),
    onKeyDown: event => {
      if (event.key === 'Escape' && !event.defaultPrevented) highlight(null)
      if (event.key === 'ContextMenu' || event.key === 'F10' && event.shiftKey) { const r = (event.target as Element).getBoundingClientRect(); if (showMenu(event.target, r.left, r.bottom)) { event.preventDefault(); event.stopPropagation() } }
      if (event.key === 'Enter' || event.key === ' ') {
        const object = readInfo(event.target)
        if (!object) return
        event.preventDefault()
        highlight(object.element)
        if (event.key === 'Enter') { origin.current = object.element; setDetail(object.info); setHover(null) }
      }
    },
  }
  const place = (x: number, y: number, height: number) => ({ left: Math.max(8, Math.min(x + 12, window.innerWidth - Math.min(300, window.innerWidth - 16) - 8)), top: Math.max(8, Math.min(y + 12, window.innerHeight - height - 8)) })
  return <><div className="graphic-inspection" {...events}>{children}</div>{hoverPreview && hover && !menu && !detail && createPortal(<div role="tooltip" className="graphic-tooltip" style={place(hover.x, hover.y, 128)}><strong>{hover.info.title}</strong><span>{hover.info.kind}</span><small>{hover.info.rows.slice(0, 2).map(([label, value]) => `${label}: ${value}`).join(' · ')}</small><small>ПКМ или Shift+F10 — сведения</small></div>, document.body)}
    {menu && createPortal(<div ref={panel} role="menu" aria-label="Действия с объектом графики" className="graphic-context-menu"><button type="button" className="graphic-context-menu__handle" aria-label={`Переместить окно ${menu.info.title} стрелками`} {...handle}><strong>{menu.info.title}</strong><GripHorizontal size={14} aria-hidden="true" /></button><button type="button" role="menuitem" onClick={() => { setDetail(menu.info); setMenu(null) }}>Сведения об объекте</button>{onSelect && menu.info.selection && <button type="button" role="menuitem" onClick={() => { onSelect(menu.info.selection!); setMenu(null); (origin.current as HTMLElement | null)?.focus?.({ preventScroll: true }) }}>Выбрать в редакторе</button>}<button type="button" role="menuitem" onClick={() => { setMenu(null); (origin.current as HTMLElement | null)?.focus?.({ preventScroll: true }) }}>Закрыть меню</button></div>, document.body)}
    {detail && <WorkspaceDialog title="Сведения об объекте" size="compact" onClose={() => { setDetail(null); (origin.current as HTMLElement | null)?.focus?.({ preventScroll: true }) }} footer={<Button onClick={() => { setDetail(null); (origin.current as HTMLElement | null)?.focus?.({ preventScroll: true }) }}>Закрыть</Button>}><h3>{detail.title}</h3><p className="section-muted">{detail.kind}</p><dl className="graphic-info">{detail.rows.map(([label, value], i) => <div key={i}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></WorkspaceDialog>}
  </>
}
