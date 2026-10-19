import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { Activity, CircleDot, Flame, Gem, Layers3, Map, Printer, SquareStack } from 'lucide-react'
import type { SectionView } from '../../../entities/geology-section/model/types'
import { sectionViews } from '../../../entities/geology-section/model/types'

const groups: Array<{ label: string; ids: SectionView[] }> = [
  { label: 'Подготовка', ids: ['overview', 'map'] },
  { label: 'Геологические данные', ids: ['technology', 'lithology', 'ore', 'offbalance', 'oxidation'] },
  { label: 'Оформление', ids: ['drawing'] },
]
const icons: Record<SectionView, typeof Map> = {
  overview: SquareStack, map: Map, technology: Layers3, lithology: Activity,
  ore: Gem, offbalance: CircleDot, oxidation: Flame, drawing: Printer,
}

/** Grouped vertical workspace navigation keeps the geological tools one click away. */
export function SectionAreaNavigation({ value, onChange, children }: { value: SectionView; onChange: (id: SectionView) => void; children: ReactNode }) {
  const id = useId(), list = useRef<HTMLDivElement>(null)
  const ordered = groups.flatMap(group => group.ids)
  const active = sectionViews.find(view => view.id === value) ?? sectionViews[0]!
  const moveFocus = (event: KeyboardEvent<HTMLButtonElement>) => {
    const index = ordered.indexOf(value)
    const next = event.key === 'ArrowDown' ? (index + 1) % ordered.length
      : event.key === 'ArrowUp' ? (index + ordered.length - 1) % ordered.length
        : event.key === 'Home' ? 0 : event.key === 'End' ? ordered.length - 1 : -1
    if (next < 0) return
    event.preventDefault()
    const target = ordered[next]!
    onChange(target)
    list.current?.querySelector<HTMLButtonElement>(`[data-view="${target}"]`)?.focus()
  }
  return <div className="section-area-navigation">
    <nav className="section-area-navigation__nav" aria-label="Рабочие области разреза">
      <h2>Рабочая область</h2>
      <div className="section-area-navigation__tabs" role="tablist" aria-label="Навигация по рабочим областям" aria-orientation="vertical" ref={list}>
        {groups.map(group => <section className="section-area-navigation__group" key={group.label}>
          <h3>{group.label}</h3>
          {group.ids.map(viewId => {
            const view = sectionViews.find(item => item.id === viewId)!
            const Icon = icons[viewId]
            return <button key={view.id} id={`${id}-${view.id}`} data-view={view.id} type="button" role="tab" aria-selected={value === view.id} aria-controls={`${id}-panel`} tabIndex={value === view.id ? 0 : -1} onClick={() => onChange(view.id)} onKeyDown={moveFocus}>
              <Icon size={16} aria-hidden="true" /><span>{view.label}</span>
            </button>
          })}
        </section>)}
      </div>
    </nav>
    <div id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-${active.id}`} tabIndex={0} className="section-area-navigation__panel">{children}</div>
  </div>
}
