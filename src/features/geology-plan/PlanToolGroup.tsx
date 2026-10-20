import { useId, type ReactNode } from 'react'
import { ChevronDown, type LucideIcon } from 'lucide-react'

export function PlanToolGroup({ label, icon: Icon, open, onToggle, children }: {
  label: string; icon: LucideIcon; open: boolean; onToggle: () => void; children: ReactNode
}) {
  const id = useId()
  return <section className={`map-tool-block${open ? ' is-open' : ''}`}>
    <h3><button type="button" id={`${id}-heading`} aria-expanded={open} aria-controls={`${id}-body`} onClick={onToggle}><span><Icon size={16} aria-hidden="true" />{label}</span><ChevronDown size={15} aria-hidden="true" /></button></h3>
    <div className="map-tool-content" id={`${id}-body`} role="region" aria-labelledby={`${id}-heading`} hidden={!open}>{children}</div>
  </section>
}
