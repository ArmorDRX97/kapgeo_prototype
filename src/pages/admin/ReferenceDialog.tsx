import { X } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { useDialogDismissGuard } from '../../shared/lib/useDialogDismissGuard'
import { Button } from '../../shared/ui/Button'

export function ReferenceDialog({ title, children, pending = false, wide = false, dirty, onClose }: {
  title: string
  children: ReactNode
  pending?: boolean
  wide?: boolean
  dirty?: boolean
  onClose: () => void
}) {
  const ref = useRef<HTMLElement>(null)
  const titleId = useId()
  const dismiss = useDialogDismissGuard(ref, { onClose, pending, dirty })
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    ref.current?.focus()
    return () => previous?.focus()
  }, [])
  return <><div className="reference-dialog-backdrop" onMouseDown={event => {
    if (!pending && event.target === event.currentTarget) dismiss.requestClose()
  }}><section ref={ref} className={`reference-dialog${wide ? ' reference-dialog--wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} onKeyDown={event => {
    if (event.key === 'Escape' && !pending) { event.stopPropagation(); dismiss.requestClose() }
    if (event.key !== 'Tab') return
    const elements = [...(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href]') ?? [])].filter(element => !element.closest('[hidden]'))
    const first = elements[0], last = elements.at(-1)
    if (event.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) { event.preventDefault(); last?.focus() }
    else if (!event.shiftKey && (document.activeElement === last || document.activeElement === ref.current)) { event.preventDefault(); first?.focus() }
  }}><header><h2 id={titleId}>{title}</h2><Button variant="quiet" disabled={pending} onClick={onClose} aria-label="Закрыть форму"><X size={20} /></Button></header>{children}</section></div>{dismiss.confirmation}</>
}
