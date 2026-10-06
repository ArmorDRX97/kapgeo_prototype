import { ChevronDown, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useState } from 'react'
import type { BgdWellSection } from '../model/bgdWellSection'
import { bgdWellNavigationGroups as groups } from '../model/bgdWellNavigation'

export function BgdWellNavigation({ section, onChange, wellCode }: { section: BgdWellSection; onChange: (section: BgdWellSection) => void; wellCode: string }) {
  const [collapsed, setCollapsed] = useState(() => window.matchMedia?.('(max-width: 700px)').matches ?? false)
  const active = section === 'development' ? 'drilling' : section
  return <aside className={`bgd-section-navigation${collapsed ? ' is-collapsed' : ''}`} aria-label="Разделы выбранной скважины">
    <header><div><small>Разделы скважины</small><strong>{wellCode}</strong></div><button type="button" onClick={() => setCollapsed(!collapsed)} aria-expanded={!collapsed} aria-controls="bgd-section-groups" aria-label={collapsed ? 'Развернуть разделы скважины' : 'Свернуть разделы скважины'} title={collapsed ? 'Развернуть разделы' : 'Свернуть разделы'}>{collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}</button></header>
    {collapsed && <span className="bgd-section-navigation__rail">Разделы скважины</span>}
    <nav id="bgd-section-groups" hidden={collapsed}>
      {groups.map((group) => <details key={group.id} open className="bgd-section-group">
        <summary><ChevronDown size={15} /><span>{group.label}</span></summary>
        <div>{group.items.map((item) => <button key={item.id} type="button" aria-current={active === item.id ? 'page' : undefined} onClick={() => onChange(item.id)}><item.icon size={17} /><span>{item.label}</span>{active === item.id && <span className="bgd-section-navigation__selected" aria-hidden="true" />}</button>)}</div>
      </details>)}
    </nav>
  </aside>
}
