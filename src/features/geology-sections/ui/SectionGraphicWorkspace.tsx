import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Info, PanelRightClose, PanelRightOpen, Eye, MousePointer2, ScanLine } from 'lucide-react'
import type { SectionView } from '../../../entities/geology-section/model/types'
import { Button } from '../../../shared/ui/Button'
import { WorkspaceDialog } from '../../../shared/ui/WorkspaceDialog'
import { ToolContext, type ToolId, type ToolSlot } from '../model/toolContext'

const PlotToolbarContext = createContext<HTMLElement | null | undefined>(undefined)
export function PlotToolbar({ children, state }: { children: ReactNode; state?: 'inactive' | 'preview' }) {
  const target = useContext(PlotToolbarContext)
  if (state === 'inactive') return null
  if (target === undefined) return <>{children}</>
  return target ? createPortal(<div className="section-camera-controls">{children}</div>, target) : null
}
const viewHints: Partial<Record<SectionView, string>> = {
  map: 'Выберите профиль или скважину. Для изменения сегмента откройте редактор текущего разреза.',
  technology: 'Соединяйте интервалы соседних скважин и уточняйте границы горизонта.',
  lithology: 'Выберите область на разрезе или создайте новую литологическую границу.',
  ore: 'Сопоставляйте рудные интервалы и редактируйте контуры рудных тел.',
  offbalance: 'Настройте связи и границы забалансовых интервалов.',
  oxidation: 'Выберите линию или область окисления для редактирования.',
  drawing: 'Настройте вариант чертежа, проверьте листы и экспортируйте результат.',
}
const PlotSurfaceContext = createContext<HTMLElement | null | undefined>(undefined)
export function ToolCategory({ category, state, children }: { category: ToolSlot; state?: 'inactive' | 'preview'; children: ReactNode }) {
  const context = useContext(ToolContext)
  if (!context) return <>{children}</>
  const target = context.targets[category]
  return target ? createPortal(<div className="section-tool-part" inert={state === 'inactive' || undefined} data-tool-state={state}>{children}</div>, target) : null
}
export function GraphHelp({ children }: { children: ReactNode }) {
  const context = useContext(ToolContext)
  if (!context) return <>{children}</>
  return context.help ? createPortal(<div className="section-graph-help__context" onKeyDown={event => { if (event.key === 'Escape') event.stopPropagation() }}>{children}</div>, context.help) : null
}

/** Editors retain state and event ancestry; only their plot is placed in the center. */
export function PlotSurface({ children, state }: { children: ReactNode; state?: 'inactive' | 'preview' }) {
  const target = useContext(PlotSurfaceContext)
  if (target === undefined) return <>{children}</>
  return target ? createPortal(<div className="section-plot-surface" inert={state === 'inactive' || undefined} data-plot-preview={state === 'preview' || undefined}>{children}</div>, target) : null
}

export function SectionGraphicWorkspace({ title, view, children }: { title: string; view?: SectionView; children: ReactNode }) {
  const [camera, setCamera] = useState<HTMLDivElement | null>(null)
  const [surface, setSurface] = useState<HTMLDivElement | null>(null), [open, setOpen] = useState(true)
  const [activeGroup, setActiveGroup] = useState<{ title: string; id: ToolId | null }>({ title, id: 'objects' })
  const active = activeGroup.title === title ? activeGroup.id : 'objects'
  const setActive = useCallback((id: ToolId | null) => setActiveGroup({ title, id }), [title])
  const [helpOpen, setHelpOpen] = useState(false)
  const [display, setDisplay] = useState<HTMLDivElement | null>(null), [coordinates, setCoordinates] = useState<HTMLDivElement | null>(null), [footer, setFooter] = useState<HTMLDivElement | null>(null), [help, setHelp] = useState<HTMLDivElement | null>(null)
  const content = useRef<HTMLDivElement>(null)
  useEffect(() => { content.current?.querySelectorAll('[data-tool-body]').forEach(node => { node.scrollTop = 0 }) }, [title])
  const groups = [{ id: 'objects' as ToolId, label: 'Работа с объектами', icon: MousePointer2 }, { id: 'display' as ToolId, label: 'Отображение', icon: Eye }, { id: 'coordinates' as ToolId, label: view === 'drawing' ? 'Состав чертежа' : 'Координаты точек', icon: ScanLine }]
  return <PlotToolbarContext.Provider value={camera}><PlotSurfaceContext.Provider value={surface}><ToolContext.Provider value={{ targets: { display, coordinates, footer }, help, reveal: setActive }}>
    <div className={`section-graphic-workspace${view === 'map' ? ' section-graphic-workspace--map' : ''}${open ? '' : ' is-tools-collapsed'}`}>
      <div className="section-graph-center">
        <header className="section-graph-center__header"><div className="section-graph-heading"><h2>{title}</h2>{view && <p>{viewHints[view]}</p>}</div>{view === 'map' && <div className="section-graph-camera" ref={setCamera} aria-label="Управление видом" />}<div className="section-graph-center__actions"><Button variant="quiet" size="sm" onClick={() => setHelpOpen(true)} aria-haspopup="dialog"><Info size={17} />Как работать</Button><Button variant="quiet" size="sm" aria-expanded={open} aria-controls="section-graphic-tools" onClick={() => setOpen(!open)}>{open ? <PanelRightClose size={17} /> : <PanelRightOpen size={17} />}{open ? 'Скрыть инструменты' : 'Показать инструменты'}</Button></div></header>
        {view !== 'map' && <div className="section-graph-camera" ref={setCamera} aria-label="Управление видом" />}
        <div className="section-graph-stage" ref={setSurface}><p className="section-graph-empty">Выберите или создайте объект в панели инструментов.</p></div>
      </div>
      <aside id="section-graphic-tools" className="section-graphic-tools" aria-label="Инструменты разреза" hidden={!open}>
        <header><strong>Инструменты</strong><span>Выберите объект или настройте вид</span></header>
        <div className="section-graphic-tools__content section-tools-groups" ref={content}>{groups.map(group => <section key={group.id} className={`section-tools-group${active === group.id ? ' is-open' : ''}`}>
          <h3><button id={`section-tool-${group.id}`} type="button" aria-expanded={active === group.id} aria-controls={`section-tool-body-${group.id}`} onClick={() => setActive(active === group.id ? null : group.id)}><span><group.icon size={16} aria-hidden="true" />{group.label}</span><ChevronDown size={16} aria-hidden="true" /></button></h3>
          <div id={`section-tool-body-${group.id}`} role="region" aria-labelledby={`section-tool-${group.id}`} hidden={active !== group.id} data-tool-body className="section-tools-group__body" ref={group.id === 'display' ? setDisplay : group.id === 'coordinates' ? setCoordinates : undefined}>
            {group.id === 'objects' && surface && display && coordinates && footer && children}
          </div>
        </section>)}</div>
        <div ref={setFooter} className="section-tool-footer" />
      </aside>
    </div>
    {helpOpen && <WorkspaceDialog title="Управление графикой" size="compact" onClose={() => setHelpOpen(false)}><div className="section-graph-help">
      <p>Выберите нужный инструмент справа. Заголовки блоков всегда доступны; открытый блок можно свернуть повторным нажатием.</p>
      <p>Сведения об объектах на разрезе и карте: наведение — подсказка, ПКМ или Shift+F10 — меню, Enter на выбранном объекте — карточка сведений.</p>
      <div ref={setHelp} />
    </div></WorkspaceDialog>}
  </ToolContext.Provider></PlotSurfaceContext.Provider></PlotToolbarContext.Provider>
}
