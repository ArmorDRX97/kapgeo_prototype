import { MoreHorizontal } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { Button } from '../../../shared/ui/Button'
import { Switch } from '../../../shared/ui/Switch'
import { Tooltip } from '../../../shared/ui/Tooltip'
import './map-display-menu.css'

export function MapDisplayMenu({ topography, grid, onTopography, onGrid }: { topography: boolean; grid: boolean; onTopography: (value: boolean) => void; onGrid: (value: boolean) => void }) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null), id = useId()
  useEffect(() => {
    if (!open) return
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false) }
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.stopPropagation(); setOpen(false); trigger.current?.focus() } }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape, true)
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape, true) }
  }, [open])
  return <div className="map-display-menu" ref={root}>
    <Tooltip content="Настройки отображения"><Button ref={trigger} className="map-display-menu__button" variant="quiet" size="sm" aria-label="Настройки отображения карты" aria-expanded={open} aria-controls={open ? id : undefined} onClick={() => setOpen(value => !value)}><MoreHorizontal size={19} /></Button></Tooltip>
    {open && <div className="map-display-menu__panel" id={id} role="group" aria-label="Настройки отображения карты"><strong>Отображение карты</strong><Switch label="Отображать карту" checked={topography} onChange={onTopography} /><Switch label="Отображать сетку" checked={grid} onChange={onGrid} /></div>}
  </div>
}
