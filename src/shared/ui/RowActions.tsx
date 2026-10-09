import { MoreHorizontal, PencilLine, Trash2 } from 'lucide-react'
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button } from './Button'
import './workspace.css'

export function RowActions({ label, onEdit, onDelete, disabled = false }: {
  label: string
  onEdit?: () => void
  onDelete?: () => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const menuId = useId()
  const close = () => { setOpen(false); trigger.current?.focus({ preventScroll: true }) }

  useLayoutEffect(() => {
    if (!open || !trigger.current || !menu.current) return
    const bounds = trigger.current.getBoundingClientRect()
    const popup = menu.current
    popup.style.left = `${Math.max(8, Math.min(bounds.right - popup.offsetWidth, window.innerWidth - popup.offsetWidth - 8))}px`
    popup.style.top = `${bounds.bottom + popup.offsetHeight + 8 < window.innerHeight ? bounds.bottom + 4 : Math.max(8, bounds.top - popup.offsetHeight - 4)}px`
    popup.querySelector<HTMLButtonElement>('button')?.focus()
  }, [open])
  useEffect(() => {
    if (!open) return
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Node && !menu.current?.contains(event.target) && !trigger.current?.contains(event.target)) setOpen(false)
    }
    const hide = () => setOpen(false)
    document.addEventListener('pointerdown', dismiss)
    window.addEventListener('resize', hide)
    window.addEventListener('scroll', hide, true)
    return () => {
      document.removeEventListener('pointerdown', dismiss)
      window.removeEventListener('resize', hide)
      window.removeEventListener('scroll', hide, true)
    }
  }, [open])
  if (!onEdit && !onDelete) return null
  return <>
    <Button ref={trigger} size="sm" variant="quiet" disabled={disabled} aria-label={`Действия: ${label}`} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? menuId : undefined}
      onClick={() => setOpen(!open)} onKeyDown={(event) => { if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setOpen(true) } }}><MoreHorizontal size={19} /></Button>
    {open && createPortal(<div ref={menu} id={menuId} className="row-actions-menu" role="menu" aria-label={`Действия: ${label}`}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false) }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') { event.preventDefault(); close() }
        if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
        event.preventDefault()
        const items = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('button')]
        const index = items.indexOf(document.activeElement as HTMLButtonElement)
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length
        items[next]?.focus()
      }}>
      {onEdit && <button type="button" role="menuitem" onClick={() => { close(); onEdit() }}><PencilLine size={16} />Редактировать</button>}
      {onDelete && <button type="button" role="menuitem" className="is-danger" onClick={() => { close(); onDelete() }}><Trash2 size={16} />Удалить</button>}
    </div>, document.body)}
  </>
}
