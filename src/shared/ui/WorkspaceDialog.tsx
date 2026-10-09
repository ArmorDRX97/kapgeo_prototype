import { X } from 'lucide-react'
import { useEffect, useId, useRef, type PropsWithChildren, type ReactNode } from 'react'
import { Button } from './Button'
import './workspace.css'

export function WorkspaceDialog({ title, children, onClose, pending = false, footer, size = 'wide' }: PropsWithChildren<{
  title: string
  onClose: () => void
  pending?: boolean
  footer?: ReactNode
  size?: 'compact' | 'wide'
}>) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const dialog = dialogRef.current
    if (dialog?.showModal) dialog.showModal()
    else dialog?.setAttribute('open', '')
    dialog?.querySelector<HTMLElement>('input:not(:disabled), button:not(:disabled)')?.focus()
    return () => { dialog?.close?.(); previous?.focus({ preventScroll: true }) }
  }, [])
  return <dialog ref={dialogRef} className={`workspace-dialog workspace-dialog--${size}`} aria-labelledby={titleId}
    onCancel={(event) => { event.preventDefault(); if (!pending) onClose() }}
    onClick={(event) => {
      if (pending || event.target !== event.currentTarget) return
      const bounds = event.currentTarget.getBoundingClientRect()
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose()
    }}>
    <header><h2 id={titleId}>{title}</h2><Button variant="quiet" disabled={pending} aria-label="Закрыть окно" onClick={onClose}><X size={19} /></Button></header>
    <div className="workspace-dialog__body">{children}</div>
    {footer && <footer>{footer}</footer>}
  </dialog>
}
