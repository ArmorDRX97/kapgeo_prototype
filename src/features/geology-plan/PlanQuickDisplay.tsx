import { MoreHorizontal } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import { Button } from '../../shared/ui/Button'
import { FilterPopover } from '../../shared/ui/FilterPopover'
import { Switch } from '../../shared/ui/Switch'
import { Tooltip } from '../../shared/ui/Tooltip'

export function PlanQuickDisplay({ topography, grid, labels, forceLabels, onChange }: {
  topography: boolean; grid: boolean; labels: boolean; forceLabels: boolean
  onChange: (patch: { topography?: boolean; grid?: boolean; forceLabels?: boolean }) => void
}) {
  const [open, setOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  const close = useCallback(() => setOpen(false), [])
  return <>
    <Tooltip content="Настройки отображения карты"><Button ref={trigger} className="map-icon-button" size="sm" variant="quiet" aria-label="Настройки отображения карты" aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? 'plan-quick-display' : undefined} onClick={() => setOpen(value => !value)}><MoreHorizontal size={19} aria-hidden="true" /></Button></Tooltip>
    {open && <FilterPopover id="plan-quick-display" title="Настройки отображения карты" anchor={trigger} onClose={close} footer={null}>
      <Switch label="Номера на текущем масштабе" checked={forceLabels} disabled={!labels} onChange={value => onChange({ forceLabels: value })} />
      <Switch label="Отображать карту" checked={topography} onChange={value => onChange({ topography: value })} />
      <Switch label="Отображать сетку" checked={grid} onChange={value => onChange({ grid: value })} />
    </FilterPopover>}
  </>
}
