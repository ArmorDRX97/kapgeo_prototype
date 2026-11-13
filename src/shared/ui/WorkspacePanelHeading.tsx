import { PanelRightClose, PanelRightOpen } from 'lucide-react'
import { Button } from './Button'
import { Tooltip } from './Tooltip'
import './workspace-panel-heading.css'

export function WorkspacePanelHeading({ title, open, controls, onToggle, openLabel, closeLabel }: {
  title: string
  open: boolean
  controls: string
  onToggle: () => void
  openLabel: string
  closeLabel: string
}) {
  const Icon = open ? PanelRightClose : PanelRightOpen
  const label = open ? closeLabel : openLabel
  return <header className="workspace-panel-heading" data-open={open}>
    {open && <h2>{title}</h2>}
    <Tooltip content={label}><Button size="sm" variant="quiet" className="workspace-panel-toggle" aria-label={label} aria-expanded={open} aria-controls={controls} onClick={onToggle}>
      <Icon size={16} aria-hidden="true" />{!open && <span>{title}</span>}
    </Button></Tooltip>
  </header>
}
