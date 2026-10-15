import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

export function Dialog({ title, children, onClose, className = '' }: { title: string; children: ReactNode; onClose: () => void; className?: string }) {
  const ref = useRef<HTMLDialogElement>(null)
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose }, [onClose])
  useEffect(() => {
    const dialog = ref.current
    const previous = document.activeElement
    dialog?.showModal()
    const cancel = (event: Event) => { event.preventDefault(); onCloseRef.current() }
    dialog?.addEventListener('cancel', cancel)
    return () => { dialog?.removeEventListener('cancel', cancel); dialog?.close(); if (previous instanceof HTMLElement) previous.focus() }
  }, [])
  return <dialog ref={ref} className={`dialog ${className}`} aria-labelledby="dialog-title" onClick={event => { if (event.target === event.currentTarget) onClose() }}>
    <div className="dialog-heading"><h2 id="dialog-title">{title}</h2><button className="icon-button" onClick={onClose} aria-label="Закрыть окно"><X size={20} /></button></div>
    <div className="dialog-body">{children}</div>
  </dialog>
}
