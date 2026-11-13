import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, CircleHelp, Eye, MousePointer2, PanelRightClose, PanelRightOpen, ScanLine } from 'lucide-react'
import type { SectionView } from '../../../entities/geology-section/model/types'
import { WorkspaceToolbar, WorkspaceToolbarGroup } from '../../../shared/ui/WorkspaceToolbar'
import { SectionToolButton } from './SectionToolButton'
import { Button } from '../../../shared/ui/Button'
import { Tooltip } from '../../../shared/ui/Tooltip'
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
  map: 'Профиль, сегменты и скважины выбранного разреза.',
  technology: 'Соединяйте интервалы соседних скважин и уточняйте границы горизонта.',
  lithology: 'Выберите литологическую границу на разрезе.',
  ore: 'Сопоставляйте рудные интервалы на разрезе.',
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

export function SectionGraphicWorkspace({ title, view, children, cameraActions, documentActions, helpTarget }: {
  title: string
  view?: SectionView
  children: ReactNode
  cameraActions?: ReactNode
  documentActions?: ReactNode
  helpTarget?: HTMLElement | null
}) {
  const [camera, setCamera] = useState<HTMLDivElement | null>(null)
  const [surface, setSurface] = useState<HTMLDivElement | null>(null), [open, setOpen] = useState(() => window.innerWidth > 900)
  const [activeGroup, setActiveGroup] = useState<{ title: string; id: ToolId | null }>({ title, id: 'objects' })
  const active = activeGroup.title === title ? activeGroup.id : 'objects'
  const setActive = useCallback((id: ToolId | null) => setActiveGroup({ title, id }), [title])
  const [helpOpen, setHelpOpen] = useState(false)
  const [display, setDisplay] = useState<HTMLDivElement | null>(null), [coordinates, setCoordinates] = useState<HTMLDivElement | null>(null), [footer, setFooter] = useState<HTMLDivElement | null>(null), [help, setHelp] = useState<HTMLDivElement | null>(null)
  const content = useRef<HTMLDivElement>(null), toolToggle = useRef<HTMLButtonElement>(null)
  const restoreToolsFocus = useRef(false)
  const toggleTools = (value: boolean) => { restoreToolsFocus.current = true; setOpen(value) }
  useEffect(() => {
    if (!restoreToolsFocus.current) return
    toolToggle.current?.focus({ preventScroll: true })
    restoreToolsFocus.current = false
  }, [open])
  useEffect(() => { content.current?.querySelectorAll('[data-tool-body]').forEach(node => { node.scrollTop = 0 }) }, [title])
  const groups = [{ id: 'objects' as ToolId, label: 'Работа с объектами', icon: MousePointer2 }, { id: 'display' as ToolId, label: 'Отображение', icon: Eye }, { id: 'coordinates' as ToolId, label: view === 'drawing' ? 'Состав чертежа' : 'Координаты точек', icon: ScanLine }]
  const helpButton = <SectionToolButton variant="quiet" icon={CircleHelp} label="Как работать" aria-haspopup="dialog" onClick={() => setHelpOpen(true)} />
  const ToggleIcon = open ? PanelRightClose : PanelRightOpen
  const toggleLabel = open ? 'Скрыть инструменты' : 'Показать инструменты'
  return <PlotToolbarContext.Provider value={camera}><PlotSurfaceContext.Provider value={surface}><ToolContext.Provider value={{ targets: { display, coordinates, footer }, help, reveal: setActive }}>
    <div className={`section-graphic-workspace${view === 'map' ? ' section-graphic-workspace--map' : ''}${open ? '' : ' is-tools-collapsed'}`}>
      <WorkspaceToolbar preferenceKey="kapgeo.sections.camera-dock" controls={<>
        <WorkspaceToolbarGroup label="Масштаб и вид разреза"><div className="section-camera-portal" ref={setCamera} />{cameraActions}{helpTarget === undefined && helpButton}</WorkspaceToolbarGroup>
        {documentActions}
      </>}>
        <div className="section-graph-stage" ref={setSurface}><p className="section-graph-empty">Выберите или создайте объект в панели инструментов.</p></div>
      </WorkspaceToolbar>
      <aside className="section-graphic-tools" aria-label="Инструменты разреза">
        <header>
          {open && <strong>Инструменты</strong>}
          <Tooltip content={toggleLabel}><Button ref={toolToggle} className="section-tools-toggle" variant="quiet" aria-label={toggleLabel} aria-expanded={open} aria-controls="section-graphic-tools" onClick={() => toggleTools(!open)}>
            <ToggleIcon size={16} aria-hidden="true" />{!open && <span>Инструменты</span>}
          </Button></Tooltip>
        </header>
        <div id="section-graphic-tools" className="section-graphic-tools__body" hidden={!open}>
          <div className="section-graphic-tools__content section-tools-groups" ref={content}>
            {groups.map(group => <section key={group.id} className={`section-tools-group${active === group.id ? ' is-open' : ''}`}>
              <h3><button id={`section-tool-${group.id}`} type="button" aria-expanded={active === group.id} aria-controls={`section-tool-body-${group.id}`} onClick={() => setActive(active === group.id ? null : group.id)}><span><group.icon size={16} aria-hidden="true" />{group.label}</span><ChevronDown size={16} aria-hidden="true" /></button></h3>
              <div id={`section-tool-body-${group.id}`} role="region" aria-labelledby={`section-tool-${group.id}`} hidden={active !== group.id} data-tool-body className="section-tools-group__body" ref={group.id === 'display' ? setDisplay : group.id === 'coordinates' ? setCoordinates : undefined}>
                {group.id === 'objects' && surface && display && coordinates && footer && children}
              </div>
            </section>)}
          </div>
          <div ref={setFooter} className="section-tool-footer" />
        </div>
      </aside>
    </div>
    {helpTarget && createPortal(helpButton, helpTarget)}
    {helpOpen && <WorkspaceDialog title="Управление графикой" size="compact" onClose={() => setHelpOpen(false)}><div className="section-graph-help">
      {view && viewHints[view] && <p>{viewHints[view]}</p>}
      <p>Панель масштаба и управления видом можно закрепить слева, справа или сверху. Перетащите её за ручку или нажмите на ручку и выберите край.</p>
      {view !== 'map' && <p>На разрезе откройте меню объекта правой кнопкой мыши или сочетанием Shift+F10. Нажмите Enter на объекте в фокусе, чтобы сразу открыть сведения.</p>}
      <div ref={setHelp} />
    </div></WorkspaceDialog>}
  </ToolContext.Provider></PlotSurfaceContext.Provider></PlotToolbarContext.Provider>
}
