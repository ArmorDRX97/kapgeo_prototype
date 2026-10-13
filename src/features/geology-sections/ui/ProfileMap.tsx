import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { sectionWellSources } from '../../../entities/geology-section/model/fixtures'
import { pointAtDepth, profileIssues } from '../../../entities/geology-section/lib/profile'
import type { GeologySection, XY } from '../../../entities/geology-section/model/types'
import { Button } from '../../../shared/ui/Button'
import { profileChangeIssues } from '../../../entities/geology-section/lib/profileChange'
import { WorkspaceDialog } from '../../../shared/ui/WorkspaceDialog'
import { joinProfile } from '../../../entities/geology-section/lib/joinProfile'
import { changeSectionWells } from '../model/wells'
import { useWheelGesture, wheelZoom } from '../model/useWheelGesture'
import { GraphicInspection } from './GraphicInspection'
import { inspectAttributes } from '../model/graphicInfo'
import { useDragPan } from '../model/useDragPan'
import { GraphHelp, PlotSurface, ToolCategory } from './SectionGraphicWorkspace'

export function ProfileMap({ section, disabled, onChange, onPending }: { section: GeologySection; disabled: boolean; onChange: (next: GeologySection) => void; onPending: (pending: boolean) => void }) {
  const svg = useRef<SVGSVGElement>(null)
  const [tool, setTool] = useState<'select' | 'new' | 'segment' | 'append' | 'move' | 'wells'>('select')
  const [selected, setSelected] = useState<number | null>(null), [snap, setSnap] = useState(true), [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 }), [message, setMessage] = useState('')
  const [wellSearch, setWellSearch] = useState('')
  const drag = useRef<{ index: number; points: XY[] } | null>(null), [draft, setDraft] = useState<XY[] | null>(null)
  useEffect(() => { onPending(!!draft); return () => onPending(false) }, [draft, onPending])
  const cancel = () => { drag.current = null; setDraft(null); setTool('select'); setMessage('Инструмент отменён') }
  const chooseTool = (next: typeof tool) => { drag.current = null; setDraft(null); setTool(next); setMessage('') }
  const [joinSide, setJoinSide] = useState<'start' | 'end'>('end'), [reverseSegment, setReverseSegment] = useState(false)
  const joined = tool === 'segment' && draft?.length === 2 ? joinProfile(section, draft, joinSide, reverseSegment) : null
  const newIssues = tool === 'new' && draft?.length === 2 ? profileChangeIssues(section, draft) : []
  const includeWell = (id: string) => {
    if (disabled || tool !== 'wells') return
    const well = sectionWellSources.find(w => w.id === id)!
    if (section.wellIds.includes(id)) { setMessage(`${well.name} уже в составе разреза`); return }
    onChange(changeSectionWells(section, [...section.wellIds, id])); setMessage(`${well.name} добавлена. Участие в слоях выбирается отдельно.`)
  }
  const extent = [...section.profile, ...(draft ?? []), ...sectionWellSources.flatMap(w => [w.collar, pointAtDepth(w, w.depth)])].filter(p => Number.isFinite(p.x) && Number.isFinite(p.y))
  const base = { x: Math.min(...extent.map(p => p.x)) - 30, y: Math.min(...extent.map(p => p.y)) - 50 }
  const baseWidth = Math.max(550, Math.max(...extent.map(p => p.x)) - base.x + 30), baseHeight = Math.max(250, Math.max(...extent.map(p => p.y)) - base.y + 50)
  const origin = { x: base.x + pan.x, y: base.y + pan.y }, width = baseWidth / zoom, height = baseHeight / zoom
  const dragPan = useDragPan(tool === 'select', () => {
    const start = pan, inverse = svg.current?.getScreenCTM()?.inverse()
    return { move: (dx, dy) => { if (inverse) setPan({ x: start.x - dx * inverse.a - dy * inverse.c, y: start.y + dx * inverse.b + dy * inverse.d }) }, cancel: () => setPan(start) }
  })
  useWheelGesture(svg, event => {
    if (drag.current || dragPan.panning) return
    event.preventDefault()
    const matrix = svg.current?.getScreenCTM()
    if (!matrix) return
    const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse()), next = wheelZoom(zoom, event, .5, 5), ratio = zoom / next
    setPan({ x: origin.x + (p.x - origin.x) * (1 - ratio) - base.x, y: origin.y + (-p.y - origin.y) * (1 - ratio) - base.y }); setZoom(next)
  })
  const coordinate = (event: PointerEvent<SVGSVGElement>): XY => {
    const matrix = svg.current?.getScreenCTM()
    if (!matrix) return origin
    const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse()), coordinate = { x: p.x, y: -p.y }
    const near = snap ? sectionWellSources.flatMap(w => [w.collar, pointAtDepth(w, w.depth)]).find(p => Math.hypot(p.x - coordinate.x, p.y - coordinate.y) < 8 / zoom) : undefined
    setMessage(near ? 'Привязка к скважине' : `X ${coordinate.x.toFixed(1)} · Y ${coordinate.y.toFixed(1)} м`)
    return near ? { x: near.x, y: near.y } : coordinate
  }
  const path = tool === 'segment' ? joined?.profile ?? section.profile : draft ?? section.profile
  return <section onKeyDown={e => { if (e.key === 'Escape') cancel() }}><h2>Карта профиля</h2><div className="section-actions"><Button variant={tool === 'select' ? 'primary' : 'secondary'} onClick={() => chooseTool('select')}>Выбор</Button><Button disabled={disabled} variant={tool === 'new' ? 'primary' : 'secondary'} onClick={() => chooseTool('new')}>Новый профиль</Button><Button disabled={disabled} variant={tool === 'segment' ? 'primary' : 'secondary'} onClick={() => { chooseTool('segment'); setReverseSegment(false) }}>Независимый сегмент</Button><Button disabled={disabled} variant={tool === 'append' ? 'primary' : 'secondary'} onClick={() => chooseTool('append')}>Продолжить профиль</Button><Button disabled={disabled} variant={tool === 'move' ? 'primary' : 'secondary'} onClick={() => chooseTool('move')}>Переместить вершину</Button><Button disabled={disabled} variant={tool === 'wells' ? 'primary' : 'secondary'} onClick={() => chooseTool('wells')}>Добавить скважины</Button><label><input type="checkbox" checked={snap} onChange={e => setSnap(e.target.checked)} />Привязка</label><ToolCategory category="display"><div className="section-actions"><Button variant="quiet" onClick={() => setZoom(Math.min(5, zoom * 1.25))}>Приблизить</Button><Button variant="quiet" onClick={() => setZoom(Math.max(0.5, zoom / 1.25))}>Отдалить</Button><Button variant="quiet" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }) }}>Весь профиль</Button></div></ToolCategory></div>
    <GraphHelp><p className="section-muted">{tool === 'segment' ? 'Задайте отдельный сегмент двумя кликами или точными координатами. Соединение с началом/концом профиля применяется после проверки. Escape отменяет.' : tool === 'new' ? draft ? 'Укажите конец нового профиля. Escape отменяет построение.' : 'Укажите начало и конец двумя кликами. Текущий профиль заменится только после проверки и применения; состав скважин сохраняется.' : tool === 'append' ? 'Щёлкните для добавления сопряжённого сегмента.' : tool === 'move' ? 'Перетащите вершину. Escape отменяет текущий жест.' : tool === 'wells' ? 'Нажмите на скважину или выберите её клавишами Tab и Enter. Уже включённые скважины остаются в составе.' : 'ЛКМ + перетаскивание — перемещение карты. Устья — кружки, забои — кресты; стрелка задаёт направление.'}</p></GraphHelp>
    {tool !== 'select' && <p role="status">{tool === 'new' || tool === 'segment' ? 'Укажите две точки на карте.' : tool === 'move' ? 'Выберите и перетащите вершину.' : tool === 'append' ? 'Укажите конец нового сегмента.' : 'Выберите скважину на карте.'}</p>}
    <ToolCategory category="coordinates"><p>Точные координаты вершин профиля доступны в разделе «Профиль».</p></ToolCategory>
    <div className="section-actions"><label>Скважина на карте<select value={wellSearch} onChange={e => { setWellSearch(e.target.value); const well = sectionWellSources.find(w => w.id === e.target.value); if (well) { const p = pointAtDepth(well, well.depth); setZoom(2); setPan({ x: p.x - base.x - baseWidth / 4, y: p.y - base.y - baseHeight / 4 }); setMessage(`${well.name}: X ${p.x.toFixed(2)}, Y ${p.y.toFixed(2)} м`) } }}><option value="">Найти скважину</option>{sectionWellSources.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select></label></div>
    <PlotSurface><GraphicInspection><div {...dragPan.events} className={`section-map-wrap${tool === 'select' ? ' is-pannable' : ''}${dragPan.panning ? ' is-panning' : ''}`}><svg ref={svg} className="section-map" viewBox={`${origin.x} ${-origin.y - height} ${width} ${height}`} role="group" aria-label="Карта скважин и направленного профиля" tabIndex={0} onKeyDown={e => {
      const move = { ArrowLeft: [-20, 0], ArrowRight: [20, 0], ArrowUp: [0, 20], ArrowDown: [0, -20] }[e.key]
      if (move) { e.preventDefault(); setPan({ x: pan.x + move[0]! / zoom, y: pan.y + move[1]! / zoom }) }
    }} onPointerDown={e => {
      if (disabled || e.button !== 0) return
      const p = coordinate(e), index = path.findIndex(v => Math.hypot(v.x - p.x, v.y - p.y) < 10 / zoom)
      if (tool === 'move' && index >= 0) { drag.current = { index, points: section.profile }; e.currentTarget.setPointerCapture(e.pointerId); setSelected(index) }
      else if (tool === 'new' || tool === 'segment') { setDraft(draft?.length === 1 ? [...draft, p] : [p]); setSelected(null) }
      else if (tool === 'append') { const points = [...section.profile, p], issues = profileChangeIssues(section, points); if (issues.length) setMessage(issues.join(' ')); else onChange({ ...section, profile: points }) }
      else setSelected(index >= 0 ? index : null)
    }} onPointerMove={e => { if (drag.current) setDraft(drag.current.points.map((p, i) => i === drag.current!.index ? coordinate(e) : p)) }} onPointerUp={() => {
      if (drag.current && draft) { const issues = profileChangeIssues(section, draft); if (issues.length) setMessage(issues.join(' ')); else onChange({ ...section, profile: draft }) }
      if (drag.current) { drag.current = null; setDraft(null) }
    }} onPointerCancel={() => { drag.current = null; setDraft(null) }}>
      <defs><pattern id="section-map-grid" width={50} height={50} patternUnits="userSpaceOnUse"><path d="M 50 0 L 0 0 0 50" className="section-map__grid" fill="none" /></pattern><marker id="section-map-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6" className="section-map__arrow" /></marker></defs>
      <rect x={origin.x} y={-origin.y - height} width={width} height={height} fill="url(#section-map-grid)" />
      {sectionWellSources.map(w => { const b = pointAtDepth(w, w.depth); return <g key={w.id} {...inspectAttributes({ title: w.name, kind: 'Скважина на карте', rows: [['Устье X/Y', `${w.collar.x.toFixed(2)} / ${w.collar.y.toFixed(2)} м`], ['Забой X/Y', `${b.x.toFixed(2)} / ${b.y.toFixed(2)} м`], ['Глубина', `${w.depth} м`], ['В составе', section.wellIds.includes(w.id) ? 'Да' : 'Нет']] })} className={section.wellIds.includes(w.id) ? 'section-map__well is-included' : 'section-map__well'} role="button" tabIndex={tool === 'wells' && disabled ? undefined : 0} aria-label={tool === 'wells' ? `Добавить ${w.name} в разрез` : `${w.name}: сведения`} aria-pressed={tool === 'wells' ? section.wellIds.includes(w.id) : undefined} aria-disabled={tool === 'wells' ? disabled : undefined} onPointerDown={e => { if (tool === 'wells') { e.stopPropagation(); if (e.button === 0) includeWell(w.id) } }} onKeyDown={e => { if (tool === 'wells' && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); e.stopPropagation(); includeWell(w.id) } }}>{<rect className="section-map__well-hit" x={Math.min(w.collar.x, b.x) - 8 / zoom} y={Math.min(-w.collar.y, -b.y) - 18 / zoom} width={Math.abs(b.x - w.collar.x) + 55 / zoom} height={Math.abs(b.y - w.collar.y) + 30 / zoom} />}<line x1={w.collar.x} y1={-w.collar.y} x2={b.x} y2={-b.y} /><circle cx={w.collar.x} cy={-w.collar.y} r={3 / zoom} /><path d={`M${b.x - 3 / zoom},${-b.y}h${6 / zoom}M${b.x},${-b.y - 3 / zoom}v${6 / zoom}`} /><text x={b.x + 6 / zoom} y={-b.y - 7 / zoom} fontSize={9 / zoom}>{w.name}</text></g> })}
      {(tool === 'new' || tool === 'segment') && !profileIssues(section.profile).length && <polyline points={section.profile.map(p => `${p.x},${-p.y}`).join(' ')} className="section-map__profile section-map__profile--previous" fill="none" />}
      {!profileIssues(path).length && <polyline {...inspectAttributes({ title: 'Направленный профиль', kind: 'Трасса разреза', rows: [['Вершин', String(path.length)], ['Направление', 'От первой вершины к последней'], ['Координаты', 'Локальные X/Y, м']] })} tabIndex={0} role="button" aria-label="Линия профиля: сведения" points={path.map(p => `${p.x},${-p.y}`).join(' ')} className="section-map__profile" fill="none" markerMid="url(#section-map-arrow)" markerEnd="url(#section-map-arrow)" />}
      {tool === 'segment' && draft && <polyline points={draft.filter(p => Number.isFinite(p.x) && Number.isFinite(p.y)).map(p => `${p.x},${-p.y}`).join(' ')} className="section-map__profile section-map__segment" fill="none" />}
      {path.filter(p => Number.isFinite(p.x) && Number.isFinite(p.y)).map((p, i) => <circle {...inspectAttributes({ title: `Вершина профиля ${i + 1}`, kind: 'Точка направленной трассы', rows: [['X', `${p.x.toFixed(2)} м`], ['Y', `${p.y.toFixed(2)} м`], ['Редактирование', 'Инструмент «Переместить вершину» или таблица профиля']] })} tabIndex={0} role="button" aria-label={`Вершина профиля ${i + 1}: сведения`} key={i} cx={p.x} cy={-p.y} r={(selected === i ? 5 : 3.5) / zoom} className="section-map__vertex" />)}
    </svg></div></GraphicInspection></PlotSurface>{message && <p role="status">{message}</p>}<GraphHelp><p>{ 'Точные координаты — в таблице «Профиль». Колёсико масштабирует под указателем; стрелки сдвигают карту. Наведение или ПКМ — сведения.'}</p></GraphHelp>
    {tool === 'segment' && !draft && <Button variant="secondary" disabled={disabled} onClick={() => setDraft([{ x: section.profile.at(-1)!.x + 20, y: section.profile.at(-1)!.y }, { x: section.profile.at(-1)!.x + 80, y: section.profile.at(-1)!.y }])}>Задать координатами</Button>}
    {tool === 'segment' && draft?.length === 2 && joined && <WorkspaceDialog title="Соединить независимый сегмент" onClose={cancel} footer={<><Button variant="secondary" onClick={cancel}>Отмена</Button><Button disabled={disabled || joined.issues.length > 0} onClick={() => { onChange({ ...section, profile: joined.profile }); setDraft(null); setTool('select'); setMessage('Сегмент соединён с профилем. Состав скважин сохранён.') }}>Соединить сегмент</Button></>}>
      <div className="section-form"><label>Присоединить к<select value={joinSide} onChange={e => setJoinSide(e.target.value as typeof joinSide)}><option value="end">Концу профиля</option><option value="start">Началу профиля</option></select></label><label><input type="checkbox" checked={reverseSegment} onChange={e => setReverseSegment(e.target.checked)} />Обратное направление сегмента</label>{draft.map((p, i) => <fieldset key={i}><legend>Точка сегмента {i + 1}</legend>{(['x', 'y'] as const).map(key => <label key={key}>{key.toUpperCase()}, м<input type="number" aria-label={`Сегмент ${i + 1}, ${key.toUpperCase()}`} value={Number.isFinite(p[key]) ? p[key] : ''} onChange={e => setDraft(draft.map((q, j) => i === j ? { ...q, [key]: e.target.valueAsNumber } : q))} /></label>)}</fieldset>)}</div>
      <p>Соединитель: {Number.isFinite(joined.gap) ? joined.gap.toFixed(2) : '—'} м. Направление выбирается по ближайшему концу сегмента; его можно развернуть. Скважины сохраняются. Ручные координаты X разреза остаются прежними; проверьте их положение при изменении начала трассы.</p>
      <svg className="section-map section-map--preview" viewBox={`${origin.x} ${-origin.y - height} ${width} ${height}`} role="img" aria-label="Предпросмотр соединённого профиля"><polyline points={joined.profile.filter(p => Number.isFinite(p.x) && Number.isFinite(p.y)).map(p => `${p.x},${-p.y}`).join(' ')} className="section-map__profile" fill="none" /></svg>
      {joined.issues.length > 0 && <p role="alert" className="section-error">{joined.issues.join(' ')}</p>}
    </WorkspaceDialog>}
    {tool === 'new' && draft?.length === 2 && <WorkspaceDialog title="Новый профиль на карте" size="compact" onClose={cancel} footer={<><Button variant="secondary" onClick={cancel}>Отмена</Button><Button disabled={disabled || newIssues.length > 0} onClick={() => { onChange({ ...section, profile: draft }); setDraft(null); setTool('select'); setMessage('Новый профиль применён. Состав скважин сохранён.') }}>Применить профиль</Button></>}><p>Заменить текущую трассу двумя выбранными точками?</p><ol>{draft.map((p, i) => <li key={i}>X {p.x.toFixed(2)} · Y {p.y.toFixed(2)} м</li>)}</ol>{newIssues.length > 0 && <div role="alert" className="section-error"><p>Профиль не применён. Исправьте точки или зависимую геометрию.</p><ul>{newIssues.map(issue => <li key={issue}>{issue}</li>)}</ul></div>}</WorkspaceDialog>}
  </section>
}
