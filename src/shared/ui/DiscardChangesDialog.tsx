import './workspace.css'
import { useEffect, useId, useRef } from 'react'
import { Button } from './Button'

export function DiscardChangesDialog({ onStay, onDiscard, onSave, pending = false, error }: { onStay: () => void; onDiscard: () => void; onSave?: () => void; pending?: boolean; error?: string }) {
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
  return <dialog ref={dialogRef} className={`discard-changes-dialog${onSave ? ' discard-changes-dialog--save' : ''}`} aria-labelledby={title} aria-describedby={description} onCancel={(event) => { event.preventDefault(); if (!pending) onStay() }}>
    <h2 id={title}>Есть несохранённые изменения</h2>
    <p id={description}>{onSave ? 'Изменения в текущей вкладке ещё не сохранены. Сохраните их перед переходом или отмените внесённые изменения.' : 'Сначала сохраните изменения в текущем разделе или отбросьте их, чтобы перейти. При переходе черновик этого раздела будет потерян.'}</p>
    {error && <p role="alert" className="form-alert form-alert--error">{error}</p>}
    <footer><Button variant="secondary" disabled={pending} onClick={onStay}>Остаться</Button><Button variant={onSave ? 'secondary' : 'danger'} disabled={pending} onClick={onDiscard}>{onSave ? 'Отменить изменения и перейти' : 'Отбросить и перейти'}</Button>{onSave && <Button disabled={pending} onClick={onSave}>{pending ? 'Сохраняем…' : 'Сохранить и перейти'}</Button>}</footer>
  </dialog>
}
