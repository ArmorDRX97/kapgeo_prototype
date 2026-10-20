import type { ButtonHTMLAttributes } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Button } from '../../../shared/ui/Button'
import { Tooltip } from '../../../shared/ui/Tooltip'

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  icon: LucideIcon
  label: string
  variant?: 'primary' | 'secondary' | 'quiet' | 'danger'
}

export function SectionToolButton({ icon: Icon, label, title, variant = 'secondary', ...props }: Props) {
  return <Tooltip content={title || label}><Button {...props} variant={variant} className={`section-icon-tool${props.className ? ` ${props.className}` : ''}`} aria-label={label}>
    <Icon size={17} strokeWidth={1.8} aria-hidden="true" />
  </Button></Tooltip>
}
