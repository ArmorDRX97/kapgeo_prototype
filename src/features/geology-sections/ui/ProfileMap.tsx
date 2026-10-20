import { mapSegments, mapSources, placeMapSegment } from '../../../entities/geology-section/lib/sectionMapGeometry'
import { SectionWells } from './SectionWells'
import { ProfileEditor } from './ProfileEditor'
import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { pointAtDepth, profileIssues } from '../../../entities/geology-section/lib/profile'
import type { GeologySection, XY } from '../../../entities/geology-section/model/types'
import { Button } from '../../../shared/ui/Button'
import { profileChangeIssues, profileWithBoundaries } from '../../../entities/geology-section/lib/profileChange'
import { WorkspaceDialog } from '../../../shared/ui/WorkspaceDialog'
import { wellSymbolPath } from '../../../entities/geology-map/wellSymbols'
import { SegmentComposition } from './SegmentComposition'
import { SegmentWellPicker } from './SegmentWellPicker'
import { joinProfile } from '../../../entities/geology-section/lib/joinProfile'
import { changeSectionWells } from '../model/wells'
import { useWheelGesture, wheelZoom } from '../model/useWheelGesture'
import { GraphicInspection } from './GraphicInspection'
import { inspectAttributes } from '../model/graphicInfo'
import { useDragPan } from '../model/useDragPan'
import { GraphHelp, PlotSurface, ToolCategory } from './SectionGraphicWorkspace'
import { usePlotSize } from '../model/usePlotSize'
import { SectionToolButton } from './SectionToolButton'
import { Crosshair, GitBranch, Hand, List, Maximize2, Move, MoveRight, MousePointer2, Route, ZoomIn, ZoomOut } from 'lucide-react'

function mapTicks(min: number, max: number, unitsPerLabel: number) {
  const magnitude = 10 ** Math.floor(Math.log10(unitsPerLabel))
  const step = ([1, 2, 5, 10].find(value => value * magnitude >= unitsPerLabel) ?? 10) * magnitude
  const precision = Math.max(0, -Math.floor(Math.log10(step)))
  return Array.from({ length: Math.max(0, Math.floor(max / step) - Math.ceil(min / step) + 1) }, (_, index) => Number(((Math.ceil(min / step) + index) * step).toFixed(precision)))
}

function demoBlockOutline(points: XY[], bounds: XY[]): XY[] {
  if (!points.length || !bounds.length) return []
  const minX = Math.min(...points.map(point => point.x)), maxX = Math.max(...points.map(point => point.x))
  const minY = Math.min(...points.map(point => point.y)), maxY = Math.max(...points.map(point => point.y))
  const boundsMinX = Math.min(...bounds.map(point => point.x)), boundsMaxX = Math.max(...bounds.map(point => point.x))
  const boundsMinY = Math.min(...bounds.map(point => point.y)), boundsMaxY = Math.max(...bounds.map(point => point.y))
  const padX = Math.max(18, (maxX - minX) * .06), padY = Math.max(48, (maxY - minY) * .32)
  return [
    { x: minX - padX, y: minY + (maxY - minY) * .24 },
    { x: minX + (maxX - minX) * .28, y: minY - padY },
    { x: maxX - (maxX - minX) * .12, y: minY - padY * .65 },
    { x: maxX + padX, y: minY + (maxY - minY) * .45 },
    { x: maxX + padX * .6, y: maxY + padY },
    { x: minX + (maxX - minX) * .42, y: maxY + padY * .75 },
    { x: minX - padX, y: minY + (maxY - minY) * .78 },
  ].map(point => ({ x: Math.max(boundsMinX, Math.min(boundsMaxX, point.x)), y: Math.max(boundsMinY, Math.min(boundsMaxY, point.y)) }))
}

export function ProfileMap({ section, disabled, onChange, onPending, documents=[] }: { documents?:GeologySection[]; section: GeologySection; disabled: boolean; onChange: (next: GeologySection) => void; onPending: (pending: boolean) => void }) {
  const [segmentDX,setSegmentDX]=useState(0),[segmentDY,setSegmentDY]=useState(0)
  const [foundId,setFoundId]=useState('')
  const found=documents.find(d=>d.id===foundId)
  const svg = useRef<SVGSVGElement>(null)
  const viewport = useRef<HTMLDivElement>(null), viewportSize = usePlotSize(viewport)
  const [tool, setTool] = useState<'select' | 'pan' | 'new' | 'segment' | 'append' | 'move' | 'segmentMove' | 'wells'>('select')
  const [selected, setSelected] = useState<number | null>(null), [snap, setSnap] = useState(false), [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 }), [message, setMessage] = useState('')
  const [wellSearch, setWellSearch] = useState(''), [workingSegment,setWorkingSegment]=useState(0), [alignEnd,setAlignEnd]=useState<'start'|'end'>('end'), [alignWell,setAlignWell]=useState(''), [editingSegmentId,setEditingSegmentId]=useState<string|null>(null)
  const segments=mapSegments(section), activeSegment=segments[Math.min(workingSegment,segments.length-1)]
  const applyProfile=(profile:XY[])=>{const issues=profileChangeIssues(section,profile);if(issues.length){setMessage(issues.join(' '));return false};onChange(profileWithBoundaries(section,profile));setSelected(null);return true}
  const mapDrag = useRef<{ id: string; line: [XY, XY]; start: XY; end?: 0 | 1 } | null>(null)
  const [mapDraftId,setMapDraftId] = useState<string|null>(null)
  const [mapDraft, setMapDraft] = useState<[XY, XY] | null>(null)
  const drag = useRef<{ index: number; points: XY[]; start?: XY } | null>(null), [draft, setDraft] = useState<XY[] | null>(null)
  const [editorPending,setEditorPending]=useState(false)
  useEffect(() => { onPending(!!draft||!!mapDraft||editorPending); return () => onPending(false) }, [draft,mapDraft,editorPending, onPending])
  const cancel = () => { drag.current = null; mapDrag.current = null; setMapDraft(null); setDraft(null); setTool('select'); setMessage('Инструмент отменён') }
  const chooseTool = (next: typeof tool) => { mapDrag.current = null; setMapDraft(null); drag.current = null; setDraft(null); setTool(next); setMessage('') }
  const [joinSide, setJoinSide] = useState<'start' | 'end'>('end'), [reverseSegment, setReverseSegment] = useState(false)
  const joined = tool === 'segment' && draft?.length === 2 ? joinProfile(section, draft, joinSide, reverseSegment) : null
  const newIssues = tool === 'new' && draft?.length === 2 ? profileChangeIssues(section, draft) : []
  const includeWell = (id: string) => {
    if (disabled || tool !== 'wells') return
    const well = mapSources(section).find(w => w.id === id)!
    if (section.wellIds.includes(id)) { if(window.confirm(`Исключить ${well.name} из разреза? Связанные интервалы и назначения будут скорректированы.`)){onChange(changeSectionWells(section,section.wellIds.filter(w=>w!==id)));setMessage(`${well.name} исключена из разреза`)};return }
    onChange(changeSectionWells(section, [...section.wellIds, id])); setMessage(`${well.name} добавлена. Участие в слоях выбирается отдельно.`)
  }
  const sourceWells = mapSources(section)
  const extent = [...segments.flatMap(s=>[s.a,s.b]), ...(found?.profile??[]), ...(mapDraft??[]), ...(draft ?? []), ...sourceWells.flatMap(w => [w.collar, pointAtDepth(w, w.depth)])].filter(p => Number.isFinite(p.x) && Number.isFinite(p.y))
  const blockOutline = demoBlockOutline(sourceWells.map(well => well.collar), extent)
  const minX = Math.min(...extent.map(p => p.x)), maxX = Math.max(...extent.map(p => p.x)), minY = Math.min(...extent.map(p => p.y)), maxY = Math.max(...extent.map(p => p.y))
  const reference = section.demoPreset?.startsWith('video-reference-')
  const baseWidth = Math.max(section.mapGeometry?280:550, maxX-minX+(section.mapGeometry?80:60)), baseHeight=Math.max(250,maxY-minY+100)
  const base = reference ? { x: (minX + maxX - baseWidth) / 2, y: (minY + maxY - baseHeight) / 2 } : { x: minX - 30, y: minY - 50 }
  const origin = { x: base.x + pan.x, y: base.y + pan.y }, width = baseWidth / zoom, height = baseHeight / zoom
  const unitsPerPixel = Math.max(width / viewportSize.width, height / viewportSize.height)
  const xTicks = reference ? mapTicks(origin.x + 40 * unitsPerPixel, origin.x + width - 60 * unitsPerPixel, 80 * unitsPerPixel) : []
  const yTicks = reference ? mapTicks(origin.y + 28 * unitsPerPixel, origin.y + height - 28 * unitsPerPixel, 60 * unitsPerPixel) : []
  const dragPan = useDragPan(tool === 'select' || tool === 'pan', () => {
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
    const near = snap ? mapSources(section).flatMap(w => [w.collar, pointAtDepth(w, w.depth)]).find(p => Math.hypot(p.x - coordinate.x, p.y - coordinate.y) < 8 / zoom) : undefined
    setMessage(near ? 'Привязка к скважине' : `X ${coordinate.x.toFixed(1)} · Y ${coordinate.y.toFixed(1)} м`)
    return near ? { x: near.x, y: near.y } : coordinate
  }
  const visibleSegments = segments.map(s => mapDraftId===s.id && mapDraft ? {...s,a:mapDraft[0],b:mapDraft[1]} : s)
  const mapVertices = section.mapGeometry && tool!=='new' ? visibleSegments.flatMap(s=>[s.a,s.b]) : null
  const path = tool === 'segment' ? joined?.profile ?? section.profile : draft ?? section.profile
  return <section onKeyDown={e => { if (e.key === 'Escape') cancel() }}><div className="section-actions section-map-toolbar"><h2>Карта профиля</h2><span>Экран {Math.round(zoom*100)}%</span></div><div className="section-tool-icon-grid" role="group" aria-label="Инструменты карты профиля"><SectionToolButton icon={Move} label="Переместить сегмент целиком" disabled={disabled||!activeSegment} aria-pressed={tool==='segmentMove'} variant={tool==='segmentMove'?'primary':'secondary'} onClick={()=>chooseTool('segmentMove')} /><SectionToolButton icon={MousePointer2} label="Выбор" variant={tool==='select'?'primary':'secondary'} aria-pressed={tool==='select'} onClick={() => chooseTool('select')} /><SectionToolButton icon={Hand} label="Переместить карту" variant={tool==='pan'?'primary':'secondary'} aria-pressed={tool==='pan'} onClick={() => chooseTool('pan')} /><SectionToolButton icon={Route} label="Новый профиль" disabled={disabled} variant={tool==='new'?'primary':'secondary'} aria-pressed={tool==='new'} onClick={() => chooseTool('new')} />{!section.mapGeometry && <SectionToolButton icon={GitBranch} label="Независимый сегмент" disabled={disabled} variant={tool==='segment'?'primary':'secondary'} aria-pressed={tool==='segment'} onClick={() => { chooseTool('segment'); setReverseSegment(false) }} />}{!section.mapGeometry && <SectionToolButton icon={MoveRight} label="Продолжить профиль" disabled={disabled} variant={tool==='append'?'primary':'secondary'} aria-pressed={tool==='append'} onClick={() => chooseTool('append')} />}<SectionToolButton icon={Crosshair} label="Переместить вершину" disabled={disabled} variant={tool==='move'?'primary':'secondary'} aria-pressed={tool==='move'} onClick={() => chooseTool('move')} /><SectionToolButton icon={List} label="Скважины разреза" disabled={disabled} variant={tool==='wells'?'primary':'secondary'} aria-pressed={tool==='wells'} onClick={() => chooseTool('wells')} /></div><div className="section-actions"><label><input type="checkbox" checked={snap} onChange={e => setSnap(e.target.checked)} />Привязка</label><ToolCategory category="display"><div className="section-tool-icon-grid" role="group" aria-label="Масштаб карты"><SectionToolButton icon={ZoomIn} label="Приблизить" variant="quiet" onClick={() => setZoom(Math.min(5, zoom * 1.25))} /><SectionToolButton icon={ZoomOut} label="Отдалить" variant="quiet" onClick={() => setZoom(Math.max(0.5, zoom / 1.25))} /><SectionToolButton icon={Maximize2} label="Весь профиль" variant="quiet" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }) }} /></div></ToolCategory></div>
    <GraphHelp><p className="section-muted">{tool === 'segmentMove' ? 'Перетащите выбранный сегмент целиком либо задайте смещение координатами. Другие сегменты и скважины сохраняют положение.' : tool === 'segment' ? 'Задайте отдельный сегмент двумя кликами или точными координатами. Соединение с началом/концом профиля применяется после проверки. Escape отменяет.' : tool === 'new' ? draft ? 'Укажите конец нового профиля. Escape отменяет построение.' : 'Укажите начало и конец двумя кликами. Текущий профиль заменится только после проверки и применения; состав скважин сохраняется.' : tool === 'append' ? 'Щёлкните для добавления сопряжённого сегмента.' : tool === 'move' ? 'Перетащите вершину. Escape отменяет текущий жест.' : tool === 'wells' ? 'Выберите скважину, чтобы включить её в разрез или исключить из разреза. Это меняет общий состав разреза; назначение скважины выбранному сегменту настраивается отдельно.' : tool === 'pan' ? 'ЛКМ + перетаскивание перемещает карту.' : 'ЛКМ + перетаскивание — перемещение карты. Круг с внутренним крестом — скважина; линия указывает к забою. Стрелка профиля задаёт направление разреза.'}</p></GraphHelp>
    {tool !== 'select' && <p role="status">{tool === 'segmentMove' ? 'Перетащите сегмент или задайте смещение X/Y.' : tool === 'new' || tool === 'segment' ? 'Укажите две точки на карте.' : tool === 'move' ? 'Выберите и перетащите вершину.' : tool === 'append' ? 'Укажите конец нового сегмента.' : tool === 'pan' ? 'Перетащите карту.' : 'Выберите скважину на карте.'}</p>}
    {tool==='segmentMove'&&activeSegment&&<div className="section-form"><label>Перенос сегмента X, м<input type="number" value={segmentDX} onChange={e=>setSegmentDX(e.target.valueAsNumber)}/></label><label>Перенос сегмента Y, м<input type="number" value={segmentDY} onChange={e=>setSegmentDY(e.target.valueAsNumber)}/></label><Button disabled={disabled||!Number.isFinite(segmentDX)||!Number.isFinite(segmentDY)} onClick={()=>section.mapGeometry?onChange(placeMapSegment(section,activeSegment.id,[{x:activeSegment.a.x+segmentDX,y:activeSegment.a.y+segmentDY},{x:activeSegment.b.x+segmentDX,y:activeSegment.b.y+segmentDY}])):setDraft(section.profile.map((p,i)=>i===activeSegment.index||i===activeSegment.index+1?{x:p.x+segmentDX,y:p.y+segmentDY}:p))}>{section.mapGeometry?'Перенести сегмент':'Предпросмотр переноса'}</Button></div>}
    <div><div className="section-segment-tools"><SegmentComposition section={section} selectedIndex={workingSegment}/>{activeSegment && <Button variant="secondary" size="sm" disabled={disabled} onClick={()=>setEditingSegmentId(activeSegment.id)}>Назначить скважины сегменту</Button>}</div>{activeSegment && !section.mapGeometry && <details className="section-setup__details"><summary>Действия с сегментом</summary><div><div className="section-form"><label>Конец сегмента для выравнивания<select value={alignEnd} onChange={e=>setAlignEnd(e.target.value as 'start'|'end')}><option value="start">Начало</option><option value="end">Конец</option></select></label><label>Выровнять по забою<select value={alignWell} onChange={e=>setAlignWell(e.target.value)}><option value="">Выберите скважину</option>{mapSources(section).map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select></label><div className="section-actions"><Button variant="secondary" disabled={disabled||!alignWell||!!draft} onClick={()=>{const well=mapSources(section).find(w=>w.id===alignWell)!;const p=pointAtDepth(well,well.depth);applyProfile(section.profile.map((v,i)=>i===activeSegment.index+(alignEnd==='end'?1:0)?{x:p.x,y:p.y}:v));setMessage('Выравнивание общей вершины затрагивает оба примыкающих сегмента.')}}>Выровнять конец сегмента</Button><Button variant="secondary" disabled={disabled||section.profile.length<=2||!!draft} onClick={()=>{if(!window.confirm('Удалить выбранный сегмент? Для внутреннего сегмента соседние части будут соединены общей вершиной. Назначения и геометрия пройдут проверку.'))return;const remove=activeSegment.index===0?0:activeSegment.index+1;applyProfile(section.profile.filter((_,i)=>i!==remove))}}>Удалить выбранный сегмент</Button></div></div></div></details>}</div>
    <ToolCategory category="coordinates"><p>Точные координаты вершин профиля доступны во вкладке «Разрез», блок «Линии сегмента».</p></ToolCategory>
    <details><summary>Добавить скважины в коридоре</summary><SectionWells section={section} disabled={disabled} onChange={onChange}/></details><details><summary>Прямолинейные сегменты разреза</summary><ProfileEditor onPending={setEditorPending} section={section} disabled={disabled} onChange={onChange}/></details>
    <div className="section-actions"><label>Найти разрез<select value={foundId} onChange={e=>{setFoundId(e.target.value);setZoom(1);setPan({x:0,y:0})}}><option value="">Текущий разрез</option>{documents.map(d=><option key={d.id} value={d.id}>{d.title}</option>)}</select></label><label>Найти блок<select value="" onChange={e=>{const d=documents.find(d=>d.metadata?.geoBlock===e.target.value||d.metadata?.techBlock===e.target.value);if(d){setFoundId(d.id);setMessage(`Блок ${e.target.value}: показана трасса разреза «${d.title}».`)}}}><option value="">Блоки разрезов</option>{[...new Set(documents.flatMap(d=>[d.metadata?.geoBlock,d.metadata?.techBlock]).filter((id):id is string=>!!id))].map(id=><option key={id}>{id}</option>)}</select></label><label>Скважина на карте<select value={wellSearch} onChange={e => { setWellSearch(e.target.value); const well = mapSources(section).find(w => w.id === e.target.value); if (well) { const p = pointAtDepth(well, well.depth); setZoom(2); setPan({ x: p.x - base.x - baseWidth / 4, y: p.y - base.y - baseHeight / 4 }); setMessage(`${well.name}: X ${p.x.toFixed(2)}, Y ${p.y.toFixed(2)} м`) } }}><option value="">Найти скважину</option>{mapSources(section).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select></label></div>
    <PlotSurface><GraphicInspection><div ref={viewport} {...dragPan.events} className={`section-map-wrap${tool === 'select' || tool === 'pan' ? ' is-pannable' : ''}${dragPan.panning ? ' is-panning' : ''}`}><svg ref={svg} className="section-map" viewBox={`${origin.x} ${-origin.y - height} ${width} ${height}`} role="group" aria-label="Карта скважин и линий сегмента" tabIndex={0} onKeyDown={e => {
      const move = { ArrowLeft: [-20, 0], ArrowRight: [20, 0], ArrowUp: [0, 20], ArrowDown: [0, -20] }[e.key]
      if (move) { e.preventDefault(); setPan({ x: pan.x + move[0]! / zoom, y: pan.y + move[1]! / zoom }) }
    }} onPointerDown={e => {
      if (disabled || e.button !== 0 || tool === 'pan') return
      const p = coordinate(e), index = path.findIndex(v => Math.hypot(v.x - p.x, v.y - p.y) < 10 / zoom)
      if (section.mapGeometry && (tool === 'segmentMove' || tool === 'move') && activeSegment) {
        const endpoint = ([activeSegment.a, activeSegment.b] as XY[]).findIndex(v=>Math.hypot(v.x-p.x,v.y-p.y)<10/zoom)
        if(tool==='segmentMove'||endpoint>=0) { setMapDraftId(activeSegment.id);mapDrag.current={id:activeSegment.id,line:[activeSegment.a,activeSegment.b],start:p,...(tool==='move'?{end:endpoint as 0|1}:{})};e.currentTarget.setPointerCapture(e.pointerId) }
      }
      else if (tool === 'segmentMove' && activeSegment) {drag.current={index:activeSegment.index,points:section.profile,start:p};e.currentTarget.setPointerCapture(e.pointerId)}
      else if (tool === 'move' && index >= 0) { drag.current = { index, points: section.profile }; e.currentTarget.setPointerCapture(e.pointerId); setSelected(index) }
      else if (tool === 'new' || tool === 'segment') { setDraft(draft?.length === 1 ? [...draft, p] : [p]); setSelected(null) }
      else if (tool === 'append') { const points = [...section.profile, p], issues = profileChangeIssues(section, points); if (issues.length) setMessage(issues.join(' ')); else onChange({ ...section, profile: points }) }
      else setSelected(index >= 0 ? index : null)
    }} onPointerMove={e => { if(mapDrag.current){const p=coordinate(e),d=mapDrag.current;setMapDraft(d.line.map((v,i)=>d.end===undefined||d.end===i?{x:v.x+p.x-d.start.x,y:v.y+p.y-d.start.y}:v) as [XY,XY]);return} if (drag.current) setDraft(drag.current.points.map((p, i) => drag.current!.start ? (i===drag.current!.index||i===drag.current!.index+1?{x:p.x+coordinate(e).x-drag.current!.start.x,y:p.y+coordinate(e).y-drag.current!.start.y}:p) : i === drag.current!.index ? coordinate(e) : p)) }} onPointerUp={() => {
      if(mapDrag.current){if(mapDraft&&Math.hypot(mapDraft[1].x-mapDraft[0].x,mapDraft[1].y-mapDraft[0].y)>.001)onChange(placeMapSegment(section,mapDrag.current.id,mapDraft));mapDrag.current=null;setMapDraft(null);return}
      if (drag.current && draft && tool!=='segmentMove') { const issues = profileChangeIssues(section, draft); if (issues.length) setMessage(issues.join(' ')); else onChange(profileWithBoundaries(section,draft)) }
      if (drag.current) { drag.current = null; if(tool!=='segmentMove')setDraft(null) }
    }} onPointerCancel={() => { mapDrag.current=null;setMapDraft(null);drag.current = null; setDraft(null) }}>

      {found&&found.id!==section.id&&<polyline points={found.profile.map(p=>`${p.x},${-p.y}`).join(' ')} className="section-map__profile section-map__profile--previous" fill="none"/>}
      <defs><pattern id="section-map-grid" width={50} height={50} patternUnits="userSpaceOnUse"><path d="M 50 0 L 0 0 0 50" className="section-map__grid" fill="none" /></pattern><marker id="section-map-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6" className="section-map__arrow" /></marker></defs>
      <rect x={origin.x} y={-origin.y - height} width={width} height={height} fill="url(#section-map-grid)" />
      {reference && <g data-map-axes="true" aria-hidden="true" pointerEvents="none" fill="var(--text-tertiary)" fontSize={11 * unitsPerPixel}>
        <text x={origin.x + width - 8 * unitsPerPixel} y={-origin.y - 8 * unitsPerPixel} textAnchor="end">X, м</text>
        <text x={origin.x + 8 * unitsPerPixel} y={-origin.y - height + 16 * unitsPerPixel}>Y, м</text>
        {xTicks.map(value => <text data-map-axis="x" key={value} x={value} y={-origin.y - 8 * unitsPerPixel} textAnchor="middle">{value}</text>)}
        {yTicks.map(value => <text data-map-axis="y" key={value} x={origin.x + 8 * unitsPerPixel} y={-value} dominantBaseline="middle">{value}</text>)}
      </g>}
      {blockOutline.length > 0 && <g role="img" aria-label="Контур геоблока"><polygon data-map-block="true" points={blockOutline.map(point => `${point.x},${-point.y}`).join(' ')} className="section-map__block" /><text className="section-map__block-label" x={origin.x + 88 * unitsPerPixel} y={-origin.y - height + 20 * unitsPerPixel} fontSize={9 * unitsPerPixel}>Геоблок</text></g>}
      {sourceWells.map(w => { const b = pointAtDepth(w, w.depth),symbol=wellSymbolPath({x:w.collar.x,y:-w.collar.y},{x:b.x,y:-b.y},4*unitsPerPixel); return <g key={w.id} {...inspectAttributes({ title: w.name, kind: 'Скважина на карте', rows: [['Устье X/Y', `${w.collar.x.toFixed(2)} / ${w.collar.y.toFixed(2)} м`], ['Забой X/Y', `${b.x.toFixed(2)} / ${b.y.toFixed(2)} м`], ['Глубина', `${w.depth} м`], ['В составе', section.wellIds.includes(w.id) ? 'Да' : 'Нет']] })} className={section.wellIds.includes(w.id) ? 'section-map__well is-included' : 'section-map__well'} role="button" tabIndex={tool === 'wells' && disabled ? undefined : 0} aria-label={tool === 'wells' ? `${section.wellIds.includes(w.id)?'Исключить':'Добавить'} ${w.name} ${section.wellIds.includes(w.id)?'из':'в'} разрез` : `${w.name}: сведения`} aria-pressed={tool === 'wells' ? section.wellIds.includes(w.id) : undefined} aria-disabled={tool === 'wells' ? disabled : undefined} onPointerDown={e => { if (tool === 'wells') { e.stopPropagation(); if (e.button === 0) includeWell(w.id) } }} onKeyDown={e => { if (tool === 'wells' && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); e.stopPropagation(); includeWell(w.id) } }}>{<rect className="section-map__well-hit" x={Math.min(w.collar.x, b.x) - 8 / zoom} y={Math.min(-w.collar.y, -b.y) - 18 / zoom} width={Math.abs(b.x - w.collar.x) + 55 / zoom} height={Math.abs(b.y - w.collar.y) + 30 / zoom} />}<line x1={w.collar.x} y1={-w.collar.y} x2={b.x} y2={-b.y} /><circle cx={w.collar.x} cy={-w.collar.y} r={4 * unitsPerPixel} /><path d={symbol.cross} /><text x={b.x + 6 / zoom} y={-b.y - 7 / zoom} fontSize={12 * unitsPerPixel} className="section-map__well-label">{w.name}</text></g> })}
      {(tool === 'new' || tool === 'segment') && !profileIssues(section.profile).length && <polyline points={section.profile.map(p => `${p.x},${-p.y}`).join(' ')} className="section-map__profile section-map__profile--previous" fill="none" />}
      {section.mapGeometry && visibleSegments.map(segment=><g key={segment.id} data-map-segment={segment.id}><line x1={segment.a.x} y1={-segment.a.y} x2={segment.b.x} y2={-segment.b.y} className="section-map__profile" markerEnd="url(#section-map-arrow)"/><text className="section-map__profile-label" x={segment.a.x} y={-segment.a.y-20/zoom} fontSize={12*unitsPerPixel}>Сегмент {segment.index+1}</text></g>)}
      {(!section.mapGeometry || tool==='new') && !profileIssues(path).length && <polyline {...inspectAttributes({ title: 'Линии сегмента', kind: 'Трасса разреза', rows: [['Вершин', String(path.length)], ['Направление', 'От первой вершины к последней'], ['Координаты', 'Локальные X/Y, м']] })} tabIndex={0} role="button" aria-label="Линия профиля: сведения" points={path.map(p => `${p.x},${-p.y}`).join(' ')} className="section-map__profile" fill="none" markerMid="url(#section-map-arrow)" markerEnd="url(#section-map-arrow)" />}
      {tool==='select' && visibleSegments.map(segment=><line key={segment.id} x1={segment.a.x} y1={-segment.a.y} x2={segment.b.x} y2={-segment.b.y} className={`section-map__segment-hit${activeSegment?.id===segment.id?' is-selected':''}`} role="button" tabIndex={0} aria-label={`Выбрать сегмент ${segment.index+1} профиля`} onPointerDown={e=>{if(e.button===0){e.stopPropagation();setWorkingSegment(segment.index)}}} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();setWorkingSegment(segment.index)}}}/>)}
      {tool === 'segment' && draft && <polyline points={draft.filter(p => Number.isFinite(p.x) && Number.isFinite(p.y)).map(p => `${p.x},${-p.y}`).join(' ')} className="section-map__profile section-map__segment" fill="none" />}
      {(mapVertices??path).filter(p => Number.isFinite(p.x) && Number.isFinite(p.y)).map((p, i) => <circle {...inspectAttributes({ title: `Вершина профиля ${i + 1}`, kind: 'Точка направленной трассы', rows: [['X', `${p.x.toFixed(2)} м`], ['Y', `${p.y.toFixed(2)} м`], ['Редактирование', 'Инструмент «Переместить вершину» или таблица профиля']] })} tabIndex={0} role="button" aria-label={`Вершина профиля ${i + 1}: сведения`} key={i} cx={p.x} cy={-p.y} r={(selected === i ? 5 : 3.5) * unitsPerPixel} className="section-map__vertex" />)}
    </svg></div></GraphicInspection></PlotSurface>{message && <p role="status">{message}</p>}<GraphHelp><p>{ 'Точные координаты — в таблице «Профиль». Колёсико масштабирует под указателем; стрелки сдвигают карту. Наведение или ПКМ — сведения.'}</p></GraphHelp>
    {tool==='segmentMove'&&draft&&<WorkspaceDialog title="Перемещение сегмента" onClose={cancel} footer={<><Button variant="secondary" onClick={cancel}>Отмена</Button><Button disabled={profileChangeIssues(section,draft).length>0} onClick={()=>{applyProfile(draft);cancel()}}>Применить перенос</Button></>}><p>Обе вершины перемещаются совместно. Длина сегмента сохранена; смежные сегменты изменятся.</p>{profileChangeIssues(section,draft).length>0&&<p role="alert">{profileChangeIssues(section,draft).join(' ')}</p>}</WorkspaceDialog>}
    {tool === 'segment' && !draft && <Button variant="secondary" disabled={disabled} onClick={() => setDraft([{ x: section.profile.at(-1)!.x + 20, y: section.profile.at(-1)!.y }, { x: section.profile.at(-1)!.x + 80, y: section.profile.at(-1)!.y }])}>Задать координатами</Button>}
    {tool === 'segment' && draft?.length === 2 && joined && <WorkspaceDialog title="Соединить независимый сегмент" onClose={cancel} footer={<><Button variant="secondary" onClick={cancel}>Отмена</Button><Button disabled={disabled || joined.issues.length > 0} onClick={() => { onChange(joined.section); setDraft(null); setTool('select'); setMessage('Сегмент соединён с профилем. Состав скважин сохранён.') }}>Соединить сегмент</Button></>}>
      <div className="section-form"><label>Присоединить к<select value={joinSide} onChange={e => setJoinSide(e.target.value as typeof joinSide)}><option value="end">Концу профиля</option><option value="start">Началу профиля</option></select></label><label><input type="checkbox" checked={reverseSegment} onChange={e => setReverseSegment(e.target.checked)} />Обратное направление сегмента</label>{draft.map((p, i) => <fieldset key={i}><legend>Точка сегмента {i + 1}</legend>{(['x', 'y'] as const).map(key => <label key={key}>{key.toUpperCase()}, м<input type="number" aria-label={`Сегмент ${i + 1}, ${key.toUpperCase()}`} value={Number.isFinite(p[key]) ? p[key] : ''} onChange={e => setDraft(draft.map((q, j) => i === j ? { ...q, [key]: e.target.valueAsNumber } : q))} /></label>)}</fieldset>)}</div>
      <p>Соединитель: {Number.isFinite(joined.gap) ? joined.gap.toFixed(2) : '—'} м. Направление выбирается по ближайшему концу сегмента; его можно развернуть. Скважины сохраняются. Ручные координаты X разреза остаются прежними; проверьте их положение при изменении начала трассы.</p>
      <svg className="section-map section-map--preview" viewBox={`${origin.x} ${-origin.y - height} ${width} ${height}`} role="img" aria-label="Предпросмотр соединённого профиля"><polyline points={joined.profile.filter(p => Number.isFinite(p.x) && Number.isFinite(p.y)).map(p => `${p.x},${-p.y}`).join(' ')} className="section-map__profile" fill="none" /></svg>
      {joined.issues.length > 0 && <p role="alert" className="section-error">{joined.issues.join(' ')}</p>}
    </WorkspaceDialog>}
    {tool === 'new' && draft?.length === 2 && <WorkspaceDialog title="Новый профиль на карте" size="compact" onClose={cancel} footer={<><Button variant="secondary" onClick={cancel}>Отмена</Button><Button disabled={disabled || newIssues.length > 0} onClick={() => { onChange(profileWithBoundaries(section,draft)); setDraft(null); setTool('select'); setMessage('Новый профиль применён. Состав скважин сохранён.') }}>Применить профиль</Button></>}><p>Заменить текущую трассу двумя выбранными точками?</p><ol>{draft.map((p, i) => <li key={i}>X {p.x.toFixed(2)} · Y {p.y.toFixed(2)} м</li>)}</ol>{newIssues.length > 0 && <div role="alert" className="section-error"><p>Профиль не применён. Исправьте точки или зависимую геометрию.</p><ul>{newIssues.map(issue => <li key={issue}>{issue}</li>)}</ul></div>}</WorkspaceDialog>}
    {editingSegmentId && <SegmentWellPicker section={section} segmentId={editingSegmentId} onApply={onChange} onClose={() => setEditingSegmentId(null)} />}
  </section>
}
