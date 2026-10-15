import { ArrowRight, BookOpen, Boxes, Database, HelpCircle, Layers3, Network, Users, X } from 'lucide-react'
import type { KnowledgeIndex } from '../../entities/knowledge/model'
import type { MapMode } from '../../entities/knowledge/schema'
import { modeLabels } from '../../entities/knowledge/labels'
import type { ExplorerState } from '../../features/explore/state'

const icons = { processes: Network, specialists: Users, data: Database, modules: Boxes }
export function Sidebar({ index, state, open, onClose, onMode, onArea, onLearn, onStart, onHelp }: {
  index: KnowledgeIndex; state: ExplorerState; open: boolean; onClose: () => void; onMode: (mode: MapMode) => void; onArea: (id: string) => void; onLearn: () => void; onStart: () => void; onHelp: () => void
}) {
  const current = state.selected ? index.byId.get(state.selected)?.categoryId : null
  const completed = Object.values(state.progress).filter(p => p.completed).length
  return <>
    {open && <button className="sidebar-scrim" aria-label="Закрыть навигацию" onClick={onClose} />}
    <aside className={`sidebar ${open ? 'is-open' : ''}`} aria-label="Навигация атласа">
      <div className="sidebar-mobile-heading">Навигация<button className="icon-button" onClick={onClose} aria-label="Закрыть навигацию"><X size={20} /></button></div>
      <div className="sidebar-scroll">
        <div className="sidebar-label">ИССЛЕДОВАТЬ</div>
        <nav aria-label="Режим карты" className="mode-nav">{(Object.keys(modeLabels) as MapMode[]).map(mode => {
          const Icon = icons[mode]
          return <button key={mode} className={`mode-button ${state.mode === mode ? 'active' : ''}`} onClick={() => onMode(mode)} aria-pressed={state.mode === mode}><Icon size={19} strokeWidth={1.6} /><span><strong>{modeLabels[mode].title}</strong><small>{modeLabels[mode].question}</small></span>{state.mode === mode && <span className="active-mark" />}</button>
        })}</nav>
        <div className="sidebar-label area-label"><span>ПРЕДМЕТНЫЕ ОБЛАСТИ</span><span>{index.categories.length}</span></div>
        <nav className="area-nav" aria-label="Области предприятия">{index.categories.map(category => <button key={category.id} className={`area-button tone-${category.tone} ${current === category.id ? 'active' : ''}`} onClick={() => onArea(category.domainId)}><span className="area-dot" /><span>{category.shortTitle}</span><ArrowRight size={13} /></button>)}</nav>
        <div className="learning-invitation"><span className="learning-icon"><BookOpen size={19} /></span><span className="eyebrow">ПЕРВОЕ ЗНАКОМСТВО</span><h3>Сложная система.<br />Понятный маршрут.</h3><p>Пройдите путь от недр до производственного решения.</p><button onClick={onStart}>Начать изучение<ArrowRight size={16} /></button><button className="all-learning" onClick={onLearn}>Все {index.learningPaths.length} маршрутов{completed > 0 ? ` · ${completed} пройдено` : ''}</button></div>
      </div>
      <div className="sidebar-footer"><span><Layers3 size={14} />Учебный атлас</span><button className="icon-button" aria-label="Как пользоваться картой" onClick={onHelp}><HelpCircle size={18} /></button></div>
    </aside>
  </>
}
