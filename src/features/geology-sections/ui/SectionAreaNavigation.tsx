import type { ReactNode } from 'react'
import { Activity, CircleDot, Flame, Gem, Layers3, Map, Printer, SquareStack, type LucideIcon } from 'lucide-react'
import { sectionViews, type SectionView } from '../../../entities/geology-section/model/types'
import { WorkspaceTabs } from '../../../shared/ui/WorkspaceTabs'

const order: SectionView[] = ['overview', 'map', 'technology', 'lithology', 'ore', 'offbalance', 'oxidation', 'drawing']
const icons: Record<SectionView, LucideIcon> = {
  overview: SquareStack, map: Map, technology: Layers3, lithology: Activity,
  ore: Gem, offbalance: CircleDot, oxidation: Flame, drawing: Printer,
}
const tabs = order.map(id => {
  const Icon = icons[id]
  return { id, label: <><Icon size={15} aria-hidden="true" />{sectionViews.find(view => view.id === id)!.label}</> }
})

export function SectionAreaNavigation({ value, onChange, actions, children }: {
  value: SectionView
  onChange: (id: SectionView) => void
  actions?: ReactNode
  children: ReactNode
}) {
  return <div className="section-area-navigation">
    <WorkspaceTabs tabs={tabs} value={value} onChange={onChange} label="Навигация по рабочим областям" actions={actions} compact>
      {children}
    </WorkspaceTabs>
  </div>
}
