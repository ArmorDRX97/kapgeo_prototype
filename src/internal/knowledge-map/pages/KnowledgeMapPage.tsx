import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ReactFlowProvider, useReactFlow, type Viewport } from '@xyflow/react'
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, ChevronRight, Crosshair, Download, Home, Layers3, LayoutGrid, Link2, Menu, Network, Pin, Route, SlidersHorizontal, X } from 'lucide-react'
import { knowledge as index } from '../entities/knowledge/model'
import { ancestors, projectGraph, type GraphPath } from '../entities/knowledge/graph'
import { modeLabels, nodeLabels, relationScopeLabels } from '../entities/knowledge/labels'
import type { MapMode } from '../entities/knowledge/schema'
import { emptyFilter, readState, readUrl, saveState, stateHash, travel, visit, type ExplorerState } from '../features/explore/state'
import { exportMap } from '../features/explore/export'
import { Search } from '../features/search/Search'
import { FilterDialog } from '../features/filters/FilterDialog'
import { LearningBar, LearningDialog } from '../features/learning/Learning'
import { PathExplorer, type PathSelection } from '../features/path/PathExplorer'
import { Dialog } from '../shared/Dialog'
import { MapCanvas } from '../widgets/map/MapCanvas'
import { DetailPanel } from '../widgets/explanations/DetailPanel'
import { Sidebar } from '../widgets/navigation/Sidebar'
import { announceKnowledgeReady, knowledgeShareUrl, publishKnowledgeContext } from '../integration/frameBridge'

function initialState() {
  const loaded = readState(index)
  const url = readUrl(index, window.location.hash)
  const sameContext = url?.selected === loaded.state.selected && url?.mode === loaded.state.mode
  return { ...loaded, state: url && !sameContext ? { ...loaded.state, ...url, focus: false, activeTour: null, filter: emptyFilter } : loaded.state }
}
function KnowledgeMapContent() {
  useEffect(() => { announceKnowledgeReady() }, [])
  const [initial] = useState(initialState)
  const [state, setState] = useState<ExplorerState>(initial.state)
  const { mode, selected: selectedId, expanded, focus, depth, filter } = state
  const [notice, setNotice] = useState(initial.warning ? 'Сохранённые настройки не удалось прочитать. Открыта общая карта.' : '')
  const [dialog, setDialog] = useState<'learning' | 'filters' | 'path' | 'help' | 'export' | 'share' | null>(null)
  const [navOpen, setNavOpen] = useState(false)
  const [layoutVersion, setLayoutVersion] = useState(0)
  const [pathSelection, setPathSelection] = useState<PathSelection>({ from: 'logging', to: 'composite-data', direction: 'flow' })
  const [path, setPath] = useState<GraphPath | null>(null)
  const [edgeId, setEdgeId] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const container = useRef<HTMLDivElement>(null)
  const flow = useReactFlow()
  const currentState = useRef(state)
  const storageWarning = useRef(false)
  useEffect(() => { currentState.current = state })
  useEffect(() => {
    const persist = () => {
      if (!saveState(currentState.current) && !storageWarning.current) {
        storageWarning.current = true; setNotice('Браузер не разрешил сохранить прогресс. Карта продолжает работать в текущем окне.')
      }
    }
    const timer = window.setTimeout(persist, 550)
    window.addEventListener('pagehide', persist)
    return () => { window.clearTimeout(timer); window.removeEventListener('pagehide', persist) }
  }, [state])
  useEffect(() => {
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${stateHash({ mode, selected: selectedId })}`)
    publishKnowledgeContext({ mode, node: selectedId ?? undefined })
  }, [mode, selectedId])
  useEffect(() => {
    const change = () => {
      const next = readUrl(index, window.location.hash)
      if (next) { setState(previous => visit({ ...previous, activeTour: null }, next)); setPath(null) }
    }
    window.addEventListener('hashchange', change)
    return () => window.removeEventListener('hashchange', change)
  }, [])
  useEffect(() => { if (!notice) return; const timer = window.setTimeout(() => setNotice(''), 6500); return () => window.clearTimeout(timer) }, [notice])
  const selected = state.selected ? index.byId.get(state.selected) : undefined
  const activeTour = index.learningPaths.find(p => p.id === state.activeTour)
  const tourStep = activeTour ? state.progress[activeTour.id]?.step ?? 0 : 0
  const projection = useMemo(() => projectGraph(index, { mode, selected: selectedId, expanded, focus, depth, filter, journeyIds: activeTour?.steps.slice(Math.max(0, tourStep - 1), tourStep + 2).map(step => step.nodeId), path }), [mode, selectedId, expanded, focus, depth, filter, activeTour, tourStep, path])
  const contextKey = `${state.mode}:${state.expanded.join(',')}:${state.focus ? `focus-${state.selected}-${state.depth}` : path ? `path-${path.nodeIds.join(',')}` : activeTour?.id ?? 'map'}`
  const openNode = useCallback((id: string) => {
    if (!index.byId.has(id)) return
    setPath(previous => previous?.nodeIds.includes(id) ? previous : null)
    setState(previous => visit({ ...previous, activeTour: null }, { selected: id, mode: previous.mode, expanded: index.byId.get(id)?.type === 'domain' ? [id] : ancestors(index, id) }))
    setNavOpen(false)
  }, [])
  const expand = useCallback((id: string) => {
    const item = index.byId.get(id)
    if (!item) return
    setPath(null)
    setState(previous => {
      const isExpanded = previous.expanded.includes(id)
      const below = new Set(index.nodes.filter(n => ancestors(index, n.id).includes(id)).map(n => n.id))
      const expanded = isExpanded ? previous.expanded.filter(x => x !== id && !below.has(x)) : [...ancestors(index, id), ...previous.expanded.filter(x => index.byId.get(x)?.categoryId === item.categoryId), id]
      return { ...visit(previous, { mode: item.type === 'module' ? 'modules' : 'processes', selected: isExpanded && item.type === 'domain' ? null : id, expanded: [...new Set(expanded)] }), activeTour: null }
    })
  }, [])
  const area = (id: string) => { setPath(null); setNavOpen(false); setState(previous => ({ ...visit(previous, { mode: 'processes', selected: id, expanded: [id] }), activeTour: null })) }
  const setMode = (mode: MapMode) => { setPath(null); setNavOpen(false); setState(previous => ({ ...visit(previous, { mode, selected: null, expanded: [] }), activeTour: null })) }
  const home = () => { setPath(null); setState(previous => ({ ...visit(previous, { mode: 'processes', selected: null, expanded: [] }), focus: false, activeTour: null, filter: emptyFilter })); setLayoutVersion(0) }
  const onViewport = useCallback((key: string, viewport: Viewport) => {
    setState(previous => {
      const old = previous.viewports[key]
      if (old && Math.abs(old.x - viewport.x) < 0.1 && Math.abs(old.y - viewport.y) < 0.1 && Math.abs(old.zoom - viewport.zoom) < 0.001) return previous
      return { ...previous, viewports: Object.fromEntries(Object.entries({ ...previous.viewports, [key]: viewport }).slice(-24)) }
    })
  }, [])
  const onPosition = useCallback((key: string, id: string, position: { x: number; y: number }) => { setState(previous => ({ ...previous, positions: Object.fromEntries(Object.entries({ ...previous.positions, [key]: { ...previous.positions[key], [id]: position } }).slice(-24)) })) }, [])
  const startTour = (id: string, restart = false) => {
    const learningPath = index.learningPaths.find(p => p.id === id)
    if (!learningPath) return
    setPath(null); setDialog(null); setNavOpen(false)
    setState(previous => {
      const step = restart ? 0 : previous.progress[id]?.step ?? 0
      const nodeId = learningPath.steps[step]!.nodeId
      return { ...visit(previous, { mode: 'processes', selected: nodeId, expanded: ancestors(index, nodeId) }), activeTour: id, progress: { ...previous.progress, [id]: { step, completed: false } } }
    })
  }
  const goStep = (step: number) => {
    if (!activeTour || step < 0 || step >= activeTour.steps.length) return
    const nodeId = activeTour.steps[step]!.nodeId
    setState(previous => ({ ...previous, selected: nodeId, focus: false, expanded: ancestors(index, nodeId), progress: { ...previous.progress, [activeTour.id]: { step, completed: false } } }))
  }
  const share = async () => {
    try { await navigator.clipboard.writeText(knowledgeShareUrl({ mode: state.mode, node: state.selected ?? undefined })); setNotice('Ссылка на текущий контекст скопирована.') }
    catch { setDialog('share') }
  }
  const pin = () => {
    if (!selected) return
    if (state.pinned.length >= 6 && !state.pinned.includes(selected.id)) { setNotice('Можно закрепить до шести элементов. Открепите один, чтобы добавить другой.'); return }
    setState(previous => ({ ...previous, pinned: previous.pinned.includes(selected.id) ? previous.pinned.filter(id => id !== selected.id) : [...previous.pinned, selected.id] }))
  }
  const exportCurrent = async (format: 'png' | 'svg') => {
    if (!container.current) return
    setExporting(true)
    try { await exportMap(container.current, flow.getNodes(), format); setNotice(`Карта экспортирована в ${format.toUpperCase()}.`); setDialog(null) }
    catch (error) { setNotice(error instanceof Error ? `Экспорт не выполнен: ${error.message}` : 'Экспорт не выполнен. Попробуйте другой формат.') }
    finally { setExporting(false) }
  }
  const filterCount = state.filter.types.length + state.filter.categories.length + state.filter.relations.length
  const crumbIds = selected ? [...ancestors(index, selected.id), selected.id] : []
  const selectedEdge = edgeId ? index.edges.find(e => e.id === edgeId) : undefined
  return <div className={`atlas-app ${activeTour ? 'has-tour' : ''}`}>
    <a className="skip-link" href="#atlas-main" onClick={event => { event.preventDefault(); document.getElementById('atlas-main')?.focus() }}>Перейти к карте</a>
    <div className="app-body"><Sidebar index={index} state={state} open={navOpen} onClose={() => setNavOpen(false)} onMode={setMode} onArea={area} onLearn={() => setDialog('learning')} onStart={() => startTour('enterprise-tour', state.progress['enterprise-tour']?.completed)} onHelp={() => setDialog('help')} />
      <main id="atlas-main" className="atlas-main" tabIndex={-1} aria-label={modeLabels[state.mode].title}>
        <div className="map-search-row">
          <button className="icon-button mobile-menu" onClick={() => setNavOpen(!navOpen)} aria-label="Открыть навигацию" aria-expanded={navOpen}><Menu size={22} /></button>
          <Search index={index} onOpen={id => { setPath(null); setState(previous => ({ ...previous, activeTour: null })); openNode(id) }} />
          <button className="button learning-trigger" aria-label={`Учебные маршруты ${index.learningPaths.length}`} onClick={() => setDialog('learning')}><BookOpen size={17} /><span>Учебные маршруты</span><span className="button-count">{index.learningPaths.length}</span></button>
        </div>
        <div className="map-toolbar"><div className="toolbar-navigation"><button className="icon-button" onClick={() => { setPath(null); setState(previous => travel(previous, 'back')) }} disabled={!state.history.length} aria-label="Предыдущий контекст"><ArrowLeft size={17} /></button><button className="icon-button" onClick={() => { setPath(null); setState(previous => travel(previous, 'forward')) }} disabled={!state.future.length} aria-label="Следующий контекст"><ArrowRight size={17} /></button><span className="toolbar-divider" /><nav aria-label="Хлебные крошки" className="breadcrumbs"><button onClick={home}><Home size={14} /><span>Вся карта</span></button>{crumbIds.map(id => <span key={id}><ChevronRight size={12} /><button aria-current={id === selected?.id ? 'page' : undefined} onClick={() => index.byId.get(id)?.type === 'domain' ? area(id) : openNode(id)}>{index.byId.get(id)?.title}</button></span>)}</nav></div><div className="toolbar-actions"><button className={`tool-button ${state.focus ? 'active' : ''}`} disabled={!selected} onClick={() => { setPath(null); setState(previous => ({ ...previous, focus: !previous.focus })) }} title="Оставить связанные элементы" aria-label="Режим фокусировки" aria-pressed={state.focus}><Crosshair size={17} /><span>Фокус</span></button><button className={`tool-button ${path ? 'active' : ''}`} onClick={() => setDialog('path')} aria-label="Исследовать путь"><Route size={17} /><span>Путь</span></button><button className={`tool-button ${filterCount ? 'active' : ''}`} onClick={() => setDialog('filters')} aria-label="Фильтры карты"><SlidersHorizontal size={17} /><span>Фильтры</span>{filterCount > 0 && <b>{filterCount}</b>}</button><span className="toolbar-divider" /><button className={`icon-button ${state.compact ? 'active' : ''}`} onClick={() => setState(previous => ({ ...previous, compact: !previous.compact }))} aria-label="Компактные карточки" aria-pressed={state.compact} title="Компактные карточки"><LayoutGrid size={17} /></button><button className="icon-button" onClick={() => { setLayoutVersion(v => v + 1); setState(previous => ({ ...previous, positions: { ...previous.positions, [contextKey]: {} } })) }} aria-label="Автоматически выровнять карту" title="Автоматически выровнять"><Network size={17} /></button><button className="icon-button" onClick={() => setDialog('export')} aria-label="Экспорт карты" title="Экспорт карты"><Download size={17} /></button><button className="icon-button share-toolbar" onClick={() => void share()} aria-label="Скопировать ссылку на карту" title="Поделиться ссылкой"><Link2 size={17} /></button></div></div>
        {(state.pinned.length > 0 || state.focus || path || filterCount > 0) && <div className="context-strip">{state.pinned.length > 0 && <><Pin size={13} />{state.pinned.map(id => <button className="pinned-chip" onClick={() => { setPath(null); openNode(id) }} key={id}>{index.byId.get(id)?.title}</button>)}</>}{state.focus && <div className="focus-depth"><span>Глубина:</span>{([1, 2] as const).map(depth => <button className={state.depth === depth ? 'active' : ''} key={depth} onClick={() => setState(previous => ({ ...previous, depth }))}>{depth === 1 ? '1 шаг' : '2 шага'}</button>)}<button className="icon-button" aria-label="Выйти из фокуса" onClick={() => setState(previous => ({ ...previous, focus: false }))}><X size={14} /></button></div>}{path && <><button className="path-context" onClick={() => setDialog('path')}><Route size={14} />{index.byId.get(path.nodeIds[0]!)?.title}<ArrowRight size={13} />{index.byId.get(path.nodeIds.at(-1)!)?.title}</button><button className="icon-button" onClick={() => setPath(null)} aria-label="Закрыть путь"><X size={14} /></button></>}{filterCount > 0 && <button className="text-button filter-reset" onClick={() => setState(previous => ({ ...previous, filter: emptyFilter }))}>Сбросить {filterCount} фильтра</button>}</div>}
        <div className="work-area"><div className="canvas-column" ref={container}><MapCanvas index={index} projection={projection} state={state} contextKey={contextKey} layoutVersion={layoutVersion} path={path} onOpen={openNode} onExpand={expand} onViewport={onViewport} onPosition={onPosition} onEdge={setEdgeId} onResetFilters={() => setState(previous => ({ ...previous, filter: emptyFilter }))} />
          {!selected && !activeTour && !path && !filterCount && <div className="map-welcome"><span className="welcome-icon"><Network size={17} /></span><div><strong>У всего есть связь</strong><p>Выберите область, чтобы раскрыть процессы.<br />Нажмите на элемент, чтобы понять его смысл.</p></div><button className="icon-button" aria-label="Скрыть подсказку" onClick={event => event.currentTarget.parentElement?.classList.add('dismissed')}><X size={14} /></button></div>}
          {projection.truncated && <div className="limit-notice" role="status">Показаны {projection.nodes.length} из {projection.total} элементов. Уточните область, тип или глубину фокуса.</div>}
          {activeTour && <LearningBar path={activeTour} step={tourStep} onStep={goStep} onPause={() => setState(previous => ({ ...previous, activeTour: null }))} onComplete={() => { setState(previous => ({ ...previous, activeTour: null, progress: { ...previous.progress, [activeTour.id]: { step: tourStep, completed: true } } })); setNotice(`Маршрут «${activeTour.title}» пройден. Прогресс сохранён.`); setDialog('learning') }} />}
        </div>{selected && <DetailPanel node={selected} index={index} pinned={state.pinned.includes(selected.id)} focused={state.focus} onClose={() => setState(previous => ({ ...previous, selected: null, focus: false }))} onOpen={openNode} onPin={pin} onFocus={() => { setPath(null); setState(previous => ({ ...previous, focus: !previous.focus })) }} onPath={id => { setPathSelection(previous => ({ ...previous, from: id })); setDialog('path') }} onShare={() => void share()} />}</div>
        <footer className="map-status"><div className="type-legend" aria-label="Легенда типов">{(['process', 'entity', 'data', 'role', 'module'] as const).map(type => <span key={type}><i className={`type-dot type-${type}`} />{nodeLabels[type]}</span>)}</div><span className="status-note">{index.nodes.length} понятий · {index.edges.length} связей <span className="status-separator">/</span> Примеры вымышлены</span></footer>
      </main>
    </div>
    {notice && <div className="toast" role="status"><CheckCircle2 size={18} /><span>{notice}</span><button className="icon-button" aria-label="Закрыть сообщение" onClick={() => setNotice('')}><X size={16} /></button></div>}
    {dialog === 'learning' && <LearningDialog index={index} progress={state.progress} onClose={() => setDialog(null)} onStart={startTour} />}
    {dialog === 'filters' && <FilterDialog index={index} value={state.filter} onChange={filter => setState(previous => ({ ...previous, filter }))} onClose={() => setDialog(null)} />}
    {dialog === 'path' && <PathExplorer index={index} value={pathSelection} onChange={setPathSelection} onShow={result => { setPath(result); if (result) setState(previous => ({ ...previous, focus: false, activeTour: null, selected: result.nodeIds[0] ?? null })) }} onClose={() => setDialog(null)} onOpen={id => { openNode(id); setDialog(null) }} />}
    {dialog === 'help' && <Dialog title="Как пользоваться картой" onClose={() => setDialog(null)} className="help-dialog"><div className="help-intro"><Layers3 size={30} /><p>Это образовательный атлас предприятия. Вы исследуете реальные понятия и логику процессов; ситуации и обозначения в примерах вымышлены.</p></div><ol className="help-steps"><li><strong>Начните с области или маршрута.</strong><p>Кнопка с количеством элементов раскрывает группу. Карточка открывает объяснение.</p></li><li><strong>Переключайте вопрос.</strong><p>Процессы, специалисты, данные и модули показывают одну модель с разных сторон.</p></li><li><strong>Читайте связи.</strong><p>Стрелка показывает смысл связи; нажмите на линию для объяснения. Синяя связь входит в выбранный элемент, зелёная выходит. Пунктир означает состав или предметную связь.</p></li><li><strong>Исследуйте свой вопрос.</strong><p>Поиск доступен через Ctrl/⌘ K. Фокус оставляет связи на один или два шага, а «Путь» объясняет цепочку между элементами.</p></li><li><strong>Двигайте карту.</strong><p>Тяните фон, вращайте колесо или используйте мини-карту. Узлы перемещаются за верхнюю часть с точками. Их можно выбирать клавиатурой и перемещать стрелками.</p></li><li><strong>Возвращайтесь к изученному.</strong><p>История контекста, закрепления, настройки и учебный прогресс сохраняются в браузере. «Вся карта» возвращает общий обзор.</p></li></ol><p className="subtle-note">Геологические и технологические объяснения служат знакомству с предметной областью. Границы текущих функциональных областей KAPGEO указаны в карточках модулей.</p><button className="button primary" onClick={() => setDialog(null)}>Начать исследование<ArrowRight size={16} /></button></Dialog>}
    {dialog === 'export' && <Dialog title="Экспорт текущей карты" onClose={() => { if (!exporting) setDialog(null) }}><p className="dialog-intro">Сохранятся все видимые элементы и связи с текущим выделением. Развёрнутые описания остаются в атласе.</p><div className="export-actions"><button disabled={exporting || !projection.nodes.length} className="button primary" onClick={() => void exportCurrent('png')}><Download size={17} />{exporting ? 'Готовим изображение…' : 'Скачать PNG'}</button><button disabled={exporting || !projection.nodes.length} className="button" onClick={() => void exportCurrent('svg')}>Скачать SVG</button></div></Dialog>}
    {dialog === 'share' && <Dialog title="Ссылка на текущий контекст" onClose={() => setDialog(null)}><p className="dialog-intro">Скопируйте ссылку. Она откроет выбранный элемент и режим карты.</p><input className="share-input" aria-label="Ссылка на элемент" readOnly value={knowledgeShareUrl({ mode: state.mode, node: state.selected ?? undefined })} onFocus={event => event.target.select()} /></Dialog>}
    {selectedEdge && <Dialog title="Почему эти элементы связаны" onClose={() => setEdgeId(null)}><div className="edge-explanation"><button onClick={() => { openNode(selectedEdge.source); setEdgeId(null) }}>{index.byId.get(selectedEdge.source)?.title}</button><ArrowRight size={20} /><button onClick={() => { openNode(selectedEdge.target); setEdgeId(null) }}>{index.byId.get(selectedEdge.target)?.title}</button></div><h3 className="relation-title">{selectedEdge.label}</h3><p className="relation-scope">{relationScopeLabels[selectedEdge.relationScope]}</p><p>{selectedEdge.description}</p>{selectedEdge.evidence.length > 0 && <section className="evidence-section"><h3>Основания и источники</h3><ul className="source-list">{selectedEdge.evidence.map(ref => <li className="source-entry" key={`${ref.sourceId}-${ref.locator}`}><strong>{index.bySourceId.get(ref.sourceId)?.title}</strong><span>{ref.locator}</span></li>)}</ul></section>}</Dialog>}
  </div>
}
export default function KnowledgeMapPage() { return <ReactFlowProvider><KnowledgeMapContent /></ReactFlowProvider> }
