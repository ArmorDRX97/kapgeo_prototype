import { useId, type ReactNode } from 'react'
import './switch.css'

export function Switch({ checked, onChange, label, description, disabled = false }: { checked: boolean; onChange: (checked: boolean) => void; label: string; description?: ReactNode; disabled?: boolean }) {
  const id = useId()
  return <div className={`ui-switch-row${disabled ? ' is-disabled' : ''}`}><div><span id={`${id}-label`}>{label}</span>{description && <small id={`${id}-description`}>{description}</small>}</div><button type="button" role="switch" className="ui-switch" aria-checked={checked} aria-labelledby={`${id}-label`} aria-describedby={description ? `${id}-description` : undefined} disabled={disabled} onClick={() => onChange(!checked)}><span aria-hidden="true" /></button></div>
}
