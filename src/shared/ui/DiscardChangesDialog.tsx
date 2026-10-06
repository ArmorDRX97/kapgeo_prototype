import './workspace.css'
import { useEffect, useId, useRef } from 'react'
import { Button } from './Button'

export function DiscardChangesDialog({ onStay, onDiscard }: { onStay: () => void; onDiscard: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const title = useId()
  const description = useId()
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const dialog = dialogRef.current
    if (dialog?.showModal) dialog.showModal()
    else dialog?.setAttribute('open', '')
    dialog?.querySelector<HTMLButtonElement>('button')?.focus()
    return () => { dialog?.close?.(); previous?.focus({ preventScroll: true }) }
  }, [])
  return <dialog ref={dialogRef} className="discard-changes-dialog" aria-labelledby={title} aria-describedby={description} onCancel={(event) => { event.preventDefault(); onStay() }}>
    <h2 id={title}>Есть несохранённые изменения</h2>
    <p id={description}>Сначала сохраните изменения в текущем разделе или отбросьте их, чтобы перейти. При переходе черновик этого раздела будет потерян.</p>
    <footer><Button variant="secondary" onClick={onStay}>Остаться</Button><Button variant="danger" onClick={onDiscard}>Отбросить и перейти</Button></footer>
  </dialog>
}
