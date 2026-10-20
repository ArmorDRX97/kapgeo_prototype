import type { ButtonHTMLAttributes } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Button } from '../../shared/ui/Button'
import { Tooltip } from '../../shared/ui/Tooltip'

export function PlanIconButton({ icon: Icon, label, title, variant = 'quiet', ...props }: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  icon: LucideIcon; label: string; variant?: 'primary' | 'secondary' | 'quiet' | 'danger'
}) {
  return <Tooltip content={title || label}><Button {...props} variant={variant} size="sm" className={`map-icon-button${props.className ? ` ${props.className}` : ''}`} aria-label={label}><Icon size={17} strokeWidth={1.8} aria-hidden="true" /></Button></Tooltip>
}
