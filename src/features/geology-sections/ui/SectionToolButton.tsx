import type { ButtonHTMLAttributes } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Button } from '../../../shared/ui/Button'

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  icon: LucideIcon
  label: string
  variant?: 'primary' | 'secondary' | 'quiet' | 'danger'
}

export function SectionToolButton({ icon: Icon, label, variant = 'secondary', ...props }: Props) {
  return <Button {...props} variant={variant} className={`section-icon-tool${props.className ? ` ${props.className}` : ''}`} aria-label={label} title={label}>
    <Icon size={17} strokeWidth={1.8} aria-hidden="true" />
  </Button>
}
