import { Save } from 'lucide-react'
import { Button } from '../../../shared/ui/Button'
import './bgd-save-bar.css'

export function BgdSaveBar({ status, ready, pending, disabled, onSave, label = 'Сохранить изменения' }: {
  status: string
  ready: boolean
  pending: boolean
  disabled: boolean
  onSave: () => void
  label?: string
}) {
  return <footer className="bgd-save-bar" data-state={ready && !pending ? 'ready' : 'idle'} aria-busy={pending}>
    <span role="status">{status}</span>
    <Button disabled={disabled || pending} onClick={onSave}><Save size={16} />{pending ? 'Сохраняем…' : label}</Button>
  </footer>
}
