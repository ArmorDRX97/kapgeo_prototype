import { MoreHorizontal } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '../../shared/ui/Button'
import { Switch } from '../../shared/ui/Switch'
import { Tooltip } from '../../shared/ui/Tooltip'

export function PlanQuickDisplay({ topography, grid, labels, forceLabels, onChange }: {
  topography: boolean; grid: boolean; labels: boolean; forceLabels: boolean
  onChange: (patch: { topography?: boolean; grid?: boolean; forceLabels?: boolean }) => void
}) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!open) return
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false) }
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); trigger.current?.focus() } }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape) }
  }, [open])
  return <div className="plan-quick-display" ref={root}>
    <Tooltip content="Настройки отображения"><Button ref={trigger} className="map-icon-button" size="sm" variant="quiet" aria-label="Настройки отображения карты" aria-expanded={open} aria-controls={open ? 'plan-quick-display' : undefined} onClick={() => setOpen(value => !value)}><MoreHorizontal size={19} /></Button></Tooltip>
    {open && <div className="plan-quick-display__panel" id="plan-quick-display" role="group" aria-label="Настройки отображения карты">
      <strong>Отображение карты</strong>
      <Switch label="Номера на текущем масштабе" checked={forceLabels} disabled={!labels} onChange={value => onChange({ forceLabels: value })} />
      <Switch label="Отображать карту" checked={topography} onChange={value => onChange({ topography: value })} />
      <Switch label="Отображать сетку" checked={grid} onChange={value => onChange({ grid: value })} />
    </div>}
  </div>
}
