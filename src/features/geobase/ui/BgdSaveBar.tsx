import { Pencil, Save } from 'lucide-react'
import { Button } from '../../../shared/ui/Button'
import './bgd-save-bar.css'

export function BgdSaveBar({ status, ready, pending, disabled, onSave, label = 'Сохранить изменения', mode = 'save', onCancel }: {
  status: string
  ready: boolean
  pending: boolean
  disabled: boolean
  onSave: () => void
  label?: string
  mode?: 'edit' | 'save'
  onCancel?: () => void
}) {
  return <footer className="bgd-save-bar" data-state={mode === 'save' && ready && !pending ? 'ready' : 'idle'} aria-busy={pending}>
    <span role="status">{status}</span>
    {onCancel && <Button variant="secondary" disabled={pending} onClick={onCancel}>Отменить</Button>}
    <Button disabled={disabled || pending || !ready} onClick={onSave}>{mode === 'edit' ? <Pencil size={16} /> : <Save size={16} />}{pending ? 'Сохраняем…' : label}</Button>
  </footer>
}
