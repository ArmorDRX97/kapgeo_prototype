import { useCallback, useId, useMemo, useRef, useState, type CSSProperties } from 'react'
import type { GeologySection, SectionLayer, XZ } from '../../../entities/geology-section/model/types'
import { sectionWellSources } from '../../../entities/geology-section/model/fixtures'
import { layerAnchors, layerPolygons, polygonPath, sourceFor, stationAtDepth, linkArc } from '../../../entities/geology-section/lib/correlation'
import { visibleTracks, trackName } from '../../../entities/geology-section/lib/columnTracks'
import { profileLength } from '../../../entities/geology-section/lib/profile'
import { resolveGraphicPoints } from '../../../entities/geology-section/lib/boundaries'
import { Button } from '../../../shared/ui/Button'

import { defaultColumns, rockNames, layerNames } from '../model/presentation'
import { useSectionView } from '../model/viewPreferences'
import { useWheelGesture, wheelZoom } from '../model/useWheelGesture'
import { GraphicInspection } from './GraphicInspection'
import { inspectAttributes } from '../model/graphicInfo'
import { useDragPan } from '../model/useDragPan'
import { usePlotSize } from '../model/usePlotSize'
import { anchoredCenter, plotCamera } from '../model/plotCamera'
import { plotFrame } from '../model/plotFrame'
import { plotHeaders, type PlotHeaders } from '../model/plotHeaders'
import { PlotColumnHeaders } from './PlotColumnHeaders'
import { GraphHelp, PlotSurface, ToolCategory } from './SectionGraphicWorkspace'

export type CanvasHandle = { id: string; label: string; point: XZ; kind?: 'graphic' }
export type HandlePhase = 'start' | 'move' | 'end' | 'cancel'
export type CanvasProps = { section: GeologySection; layers?: SectionLayer[]; showGraphics?: boolean; showGrid?: boolean; clean?: boolean; width?: number; height?: number; left?: number; right?: number; top?: number; bottom?: number; onPoint?: (point: XZ) => void; onReadPoint?: (point: XZ) => void; onAnchor?: (id: string) => void; onGraphic?: (id: string) => void; graphicSelectionIds?: string[]; selection?: string; draft?: XZ[]; handles?: CanvasHandle[]; onHandleDrag?: (id: string, point: XZ, phase: HandlePhase) => void; headerLayout?: PlotHeaders; surfaceState?: 'inactive' | 'preview' }
export function SectionSvg({ section, layers = ['technology'], showGraphics = true, showGrid = true, clean = false, width = 1000, height = 500, left = 0, right = profileLength(section.profile), top = section.top, bottom = section.bottom, onPoint, onReadPoint, onAnchor, onGraphic, graphicSelectionIds, selection, draft, handles = [], onHandleDrag, headerLayout }: CanvasProps) {
  const activeHandle = useRef<{ id: string; point: XZ; svg?: SVGSVGElement | null } | null>(null)
  const headers = headerLayout ?? (clean ? { top: 42, cards: [] } : plotHeaders(section, width, left, right))
  const uid = useId().replace(/:/g, ''), frame = plotFrame(width, height, clean, headers.top), pad = frame.left
  const px = useCallback((x: number) => 42 + (x - left) / (right - left) * (width - 84), [left, right, width]), py = useCallback((z: number) => frame.top + (top - z) / (top - bottom) * frame.height, [top, bottom, frame.top, frame.height])
  const pointString = (points: XZ[]) => points.map(p => `${px(p.x)},${py(p.z)}`).join(' ')
  const graphics = section.graphics.filter(g => !g.parentId)
  const coordinate = (event: React.MouseEvent<SVGSVGElement> | React.PointerEvent<SVGSVGElement>, constrain = false) => {
    const svg = event.currentTarget, matrix = svg.getScreenCTM()
    if (!matrix) return null
    const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse())
    if (!constrain && (p.x < pad || p.x > width - pad || p.y < frame.top || p.y > frame.bottom)) return null
    const x = Math.max(pad, Math.min(width - pad, p.x)), y = Math.max(frame.top, Math.min(frame.bottom, p.y))
    const precision = (value: number) => constrain ? value : Math.round(value * 100) / 100
    return { x: precision(left + (x - pad) / (width - 2 * pad) * (right - left)), z: precision(top - (y - frame.top) / frame.height * (top - bottom)) }
  }
  const cancelHandle = () => { if (activeHandle.current) { activeHandle.current.svg?.classList.remove('is-handle-dragging'); onHandleDrag?.(activeHandle.current.id, activeHandle.current.point, 'cancel'); activeHandle.current = null } }
  // Grid/cursor/zoom controls do not re-project all log samples when their inputs are unchanged.
  const columns = useMemo(() => sectionWellSources.filter(w => section.wellIds.includes(w.id)).map(original => {
        const w = sourceFor(section, original), c = section.columnSettings?.[w.id] ?? section.columnSettings?.all ?? defaultColumns
        const center = stationAtDepth(section, w, Math.max(0, Math.min(w.depth, w.collar.z - (clean ? bottom : section.bottom)))).x
        return <g key={w.id}>
          <path {...inspectAttributes({ title: w.name, kind: 'Траектория скважины', rows: [['Глубина', `${w.depth} м`], ['Устье Z', `${w.collar.z.toFixed(2)} м`], ['Источник', 'Локальная скважина разреза']] }, clean)} className="section-canvas__trajectory" d={w.trajectory.map((p, i) => { const q = stationAtDepth(section, w, p.md); return `${i ? 'L' : 'M'}${px(q.x)},${py(q.z)}` }).join(' ')} />
          {visibleTracks(c, w).map((track, index, tracks) => {
            const offset = c.offset + tracks.slice(0, index).reduce((sum, t) => sum + t.width + 5, 0), trackWidth = track.width
            return <g key={track.id} data-track-id={track.id} data-track-type={track.type}>{clean && <text x={px(center) + offset + trackWidth / 2} y={pad + 28} textAnchor="middle" className="section-canvas__track-label">{trackName(track, w)}</text>}
              {track.type === 'lithology' && w.lithology.map(i => { const a = stationAtDepth(section, w, i.from), b = stationAtDepth(section, w, i.to); return <path tabIndex={clean ? undefined : 0} role={clean ? undefined : "button"} aria-label={clean ? undefined : `${w.name}: ${rockNames[i.rock]}, MD ${i.from}–${i.to} м: сведения`} {...inspectAttributes({ title: `${w.name}: ${rockNames[i.rock]}`, kind: 'Исходный литологический интервал', rows: [['MD', `${i.from}–${i.to} м`], ['Порода', rockNames[i.rock]], ['Z', `${b.z.toFixed(2)}…${a.z.toFixed(2)} м`]] }, clean)} key={i.id} d={`M${px(a.x) + offset} ${py(a.z)}h${trackWidth}L${px(b.x) + offset + trackWidth} ${py(b.z)}h${-trackWidth}Z`} style={{ fill: `url(#${uid}-${i.rock})` }} className="section-canvas__column"><title>{w.name}: {rockNames[i.rock]}, MD {i.from}–{i.to} м</title></path> })}
              {track.type === 'curve' && w.curves.filter(curve => curve.id === track.curveId).map(curve => {
                const settings = c.curveSettings?.[curve.id]
                let restart = true
                const d = curve.samples.map(sample => {
                  if (sample.value === null || settings && (sample.md < settings.from || sample.md > settings.to)) { restart = true; return '' }
                  const min = settings?.min ?? (curve.id === 'rs' ? c.curveMin : curve.min), max = settings?.max ?? (curve.id === 'rs' ? c.curveMax : curve.max)
                  const p = stationAtDepth(section, w, sample.md), x = px(p.x) + offset + Math.max(0, Math.min(1, (sample.value - min) / (max - min))) * trackWidth
                  const command = `${restart ? 'M' : 'L'}${x},${py(p.z)}`; restart = false; return command
                }).join(' ')
                return <path tabIndex={clean ? undefined : 0} role={clean ? undefined : "button"} aria-label={clean ? undefined : `${w.name}: ${curve.name}: сведения`} {...inspectAttributes({ title: `${w.name}: ${curve.name}`, kind: 'Каротажная кривая', rows: [['Единица', curve.unit], ['Диапазон', `${settings?.min ?? curve.min}…${settings?.max ?? curve.max}`], ['Отсчётов', String(curve.samples.length)], ['Источник', 'Локальная кривая; пропуски не соединяются']] }, clean)} key={curve.id} d={d} className={`section-canvas__curve section-canvas__curve--${curve.id}`}><title>{w.name}: {curve.name} {settings?.min ?? (curve.id === 'rs' ? c.curveMin : curve.min)}–{settings?.max ?? (curve.id === 'rs' ? c.curveMax : curve.max)} {curve.unit}</title></path>
              })}
              {track.type === 'intervals' && layers.flatMap(layer => layerAnchors(section, layer).filter(a => a.wellId === w.id).map(a => <g {...inspectAttributes({ title: `${w.name}: ${layerNames[layer]}`, kind: 'Опорный интервал', selection: onAnchor ? a.id : undefined, rows: [['MD', `${a.from}–${a.to} м`], ['Z', `${a.bottom.z.toFixed(2)}…${a.top.z.toFixed(2)} м`], ['Границы', 'Исходные контакты фиксированы'], ['ID', a.id]] }, clean)} key={a.id} role={!clean ? 'button' : undefined} tabIndex={!clean ? 0 : undefined} aria-label={`${w.name}, ${layerNames[layer]}, MD ${a.from}–${a.to}`} onClick={e => { if (!clean) { e.stopPropagation(); onAnchor?.(a.id) } }} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onAnchor?.(a.id) } }}><path d={`M${px(a.top.x) + offset} ${py(a.top.z)}h${trackWidth}L${px(a.bottom.x) + offset + trackWidth} ${py(a.bottom.z)}h${-trackWidth}Z`} className={`section-canvas__interval section-canvas__interval--${layer}${selection === a.id ? ' is-selected' : ''}`} /><title>{w.name}: MD {a.from}–{a.to} м; Z {a.bottom.z.toFixed(2)}…{a.top.z.toFixed(2)}</title></g>))}
            </g>
          })}
          {clean && <text x={px(center)} y={pad + 14} textAnchor="middle" className="section-canvas__well-label">{w.name}</text>}
        </g>
      }), [section, layers, selection, clean, onAnchor, uid, px, py, bottom, pad])
  return <svg xmlns="http://www.w3.org/2000/svg" className="section-canvas" viewBox={`0 0 ${width} ${height}`} role={clean ? 'img' : 'group'} aria-label="Разрез: расстояние вдоль профиля и абсолютные высоты" onPointerMove={event => {
    const p = coordinate(event, !!activeHandle.current)
    if (p && activeHandle.current) { activeHandle.current.point = p; onHandleDrag?.(activeHandle.current.id, p, 'move') }
    else if (p) onReadPoint?.(p)
  }} onPointerUp={event => { if (activeHandle.current) { const active = activeHandle.current; activeHandle.current = null; active.svg?.classList.remove('is-handle-dragging'); onHandleDrag?.(active.id, coordinate(event, true) ?? active.point, 'end') } }} onPointerCancel={cancelHandle} onLostPointerCapture={cancelHandle} onKeyDown={event => { if (event.key === 'Escape' && activeHandle.current) { event.preventDefault(); event.stopPropagation(); cancelHandle() } }} onClick={event => { if (onPoint) { const p = coordinate(event); if (p) onPoint(p) } }}>
    <defs><clipPath id={`${uid}-clip`}><rect x={pad} y={frame.top} width={frame.width} height={frame.height} /></clipPath><clipPath id={`${uid}-headers`}><rect x={pad} y={0} width={frame.width} height={frame.top} /></clipPath><clipPath id={`${uid}-handles`}><rect x={pad - 6} y={frame.top - 6} width={frame.width + 12} height={frame.height + 12} /></clipPath>{(['sand', 'clay', 'silt'] as const).map((rock, i) => <pattern key={rock} id={`${uid}-${rock}`} width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" className={`section-canvas__rock--${rock}`} /><path d={['M2 2h.5M6 6h.5', 'M0 4h8', 'M0 8L8 0'][i]} className="section-canvas__hatch" /></pattern>)}</defs>
    <rect width={width} height={height} className="section-canvas__paper" />
    {Array.from({ length: 11 }, (_, i) => <g key={i} className="section-canvas__grid">{showGrid && <><path d={`M${px(left + (right - left) * i / 10)} ${frame.top}V${frame.bottom}`} /><path d={`M${pad} ${py(bottom + (top - bottom) * i / 10)}H${width - pad}`} /></>}<text x={px(left + (right - left) * i / 10)} y={height - 15} textAnchor="middle">{(left + (right - left) * i / 10).toFixed(0)}</text><text x={pad - 5} y={py(bottom + (top - bottom) * i / 10) + 4} textAnchor="end">{(bottom + (top - bottom) * i / 10).toFixed(1)}</text></g>)}
    <text x={width - pad} y={height - 2} textAnchor="end" className="section-canvas__label">Расстояние, м</text><text x={5} y={15} className="section-canvas__label">Z, м</text>
    {!clean && <PlotColumnHeaders layout={headers} clipId={`${uid}-headers`} />}
    <g clipPath={`url(#${uid}-clip)`}>
      {layers.flatMap(layer => layerPolygons(section, layer).map((rings, i) => <path tabIndex={clean ? undefined : 0} role={clean ? undefined : "button"} aria-label={clean ? undefined : `${layerNames[layer]}: контур ${i + 1}, сведения`} {...inspectAttributes({ title: `${layerNames[layer]} · контур ${i + 1}`, kind: 'Объединённая область корреляции', rows: [['Колец', String(rings.length)], ['Внутренних исключений', String(Math.max(0, rings.length - 1))], ['Вершин', String(rings.reduce((n, r) => n + r.length, 0))], ['Источник', 'Связи и опоры текущего слоя']] }, clean)} key={`${layer}-${i}`} d={polygonPath(rings, px, py)} fillRule="evenodd" className={`section-canvas__body section-canvas__body--${layer}`} />))}
      {showGraphics && graphics.map(g => {
        const points = resolveGraphicPoints(g, section), rings = [points, ...section.graphics.filter(h => h.parentId === g.id).map(h => resolveGraphicPoints(h, section))]
        const d = g.closed ? polygonPath(rings, px, py) : points.map((p, i) => `${i ? 'L' : 'M'}${px(p.x)},${py(p.z)}`).join(' ')
        const tickPoints = g.smooth ? points.filter((_, i) => i % 12 === 0 || i === points.length - 1) : points
        const tickEnds = g.closed && tickPoints.length ? [...tickPoints.slice(1), tickPoints[0]!] : tickPoints.slice(1)
        return <g key={g.id} {...inspectAttributes({ title: g.name, kind: g.type === 'lithology' ? 'Ручная литологическая область' : g.type === 'oxidation' ? 'Линия окисления' : g.type === 'foundation' ? 'Фундамент' : 'Ручной разлом', selection: onGraphic && (!graphicSelectionIds || graphicSelectionIds.includes(g.id)) ? g.id : undefined, rows: [['Точек', String(points.length)], ['Замкнут', g.closed ? 'Да' : 'Нет'], ['Порода', g.rock ? rockNames[g.rock] : 'Не назначена'], ['ID', g.id], ['Правило', g.type === 'fault' ? 'Линия без смещения пластов' : 'Ручная геометрия разреза']] }, clean)}><path tabIndex={clean ? undefined : 0} role={clean ? undefined : "button"} aria-label={clean ? undefined : `${g.name}: сведения`} d={d} fillRule="evenodd" style={g.type === 'lithology' ? { fill: `url(#${uid}-${g.rock ?? 'sand'})` } : undefined} className={`section-canvas__graphic section-canvas__graphic--${g.type}${g.id === selection ? ' is-selected' : ''}`} strokeLinejoin={g.smooth ? 'round' : 'miter'} />{g.type === 'oxidation' && tickEnds.map((b, i) => {
          const a = tickPoints[i]!, dx = px(b.x) - px(a.x), dy = py(b.z) - py(a.z), size = Math.hypot(dx, dy), direction = g.reversed ? -1 : 1
          return size > 0 ? <path key={i} className="section-canvas__oxidation-tick" d={`M${(px(a.x) + px(b.x)) / 2} ${(py(a.z) + py(b.z)) / 2}l${-dy / size * 9 * direction} ${dx / size * 9 * direction}`} /> : null
        })}{!clean && !onHandleDrag && g.id === selection && g.points.map((p, i) => <rect {...inspectAttributes({ title: `${g.name}: точка ${i + 1}`, kind: 'Точка ручной геометрии', selection: onGraphic && (!graphicSelectionIds || graphicSelectionIds.includes(g.id)) ? g.id : undefined, rows: [['X', `${p.x.toFixed(2)} м`], ['Z', `${p.z.toFixed(2)} м`], ['Объект', g.name], ['Редактирование', 'Координаты и порядок — в таблице объекта']] })} role="button" tabIndex={0} aria-label={`${g.name}: точка ${i + 1}, сведения`} key={i} x={px(p.x) - 3} y={py(p.z) - 3} width="6" height="6" className="section-canvas__handle" />)}</g>
      })}
      {!clean && showGraphics && section.graphics.filter(g => g.parentId && g.id === selection).map(g => <g key={`selected-${g.id}`} {...inspectAttributes({ title: g.name, kind: 'Внутреннее литологическое исключение', selection: onGraphic && (!graphicSelectionIds || graphicSelectionIds.includes(g.id)) ? g.id : undefined, rows: [['Родитель', g.parentId!], ['Точек', String(g.points.length)], ['Правило', 'Прозрачное отверстие внутри родительской области']] })}><path d={polygonPath([resolveGraphicPoints(g, section)], px, py)} className="section-canvas__draft" />{!onHandleDrag && g.points.map((p, i) => <rect {...inspectAttributes({ title: `${g.name}: точка ${i + 1}`, kind: 'Точка ручной геометрии', selection: onGraphic && (!graphicSelectionIds || graphicSelectionIds.includes(g.id)) ? g.id : undefined, rows: [['X', `${p.x.toFixed(2)} м`], ['Z', `${p.z.toFixed(2)} м`], ['Объект', g.name], ['Редактирование', 'Координаты и порядок — в таблице объекта']] })} role="button" tabIndex={0} aria-label={`${g.name}: точка ${i + 1}, сведения`} key={i} x={px(p.x) - 3} y={py(p.z) - 3} width="6" height="6" className="section-canvas__handle" />)}</g>)}
      {columns}
      {!clean && layers.flatMap(layer => section.links[layer].flatMap(link => (['top', 'bottom'] as const).map(edge => <path key={`inspect-${layer}-${link.id}-${edge}`} {...inspectAttributes({ title: `${layerNames[layer]} · ${edge === 'top' ? 'верхняя' : 'нижняя'} дуга`, kind: 'Линия связи интервалов', rows: [['Связь', link.id], ['От', link.a], ['К', link.b], ['Правило', 'Исходные контакты фиксированы; ручные узлы редактируются отдельно']] })} d={linkArc(section, layer, link.id, edge).map((p, i) => `${i ? 'L' : 'M'}${px(p.x)},${py(p.z)}`).join(' ')} className="section-canvas__inspect-line" vectorEffect="non-scaling-stroke" tabIndex={0} role="button" aria-label={`${edge === 'top' ? 'Верхняя' : 'Нижняя'} дуга ${link.id}: сведения`} />))) }
      {!clean && layers.flatMap(layer => layerAnchors(section, layer).flatMap(a => (['top', 'bottom'] as const).map(edge => <circle key={`contact-${a.id}-${edge}`} {...inspectAttributes({ title: `${sectionWellSources.find(w => w.id === a.wellId)?.name ?? a.wellId} · ${edge === 'top' ? 'верхний' : 'нижний'} контакт`, kind: 'Опорная точка интервала', selection: onAnchor ? a.id : undefined, rows: [['X', `${a[edge].x.toFixed(2)} м`], ['Z', `${a[edge].z.toFixed(2)} м`], ['MD', `${edge === 'top' ? a.from : a.to} м`], ['Правило', 'Исходный контакт: перемещение запрещено'], ['Интервал', a.id]] })} cx={px(a[edge].x)} cy={py(a[edge].z)} r="3.5" className="section-canvas__source-contact" role="button" tabIndex={0} aria-label={`${edge === 'top' ? 'Верхний' : 'Нижний'} контакт ${a.id}: сведения`} onClick={event => { if (!onPoint) { event.stopPropagation(); onAnchor?.(a.id) } }} />))) }
      {draft && <polyline points={pointString(draft)} className="section-canvas__draft" />}
    </g>
      {!clean && onHandleDrag && <g clipPath={`url(#${uid}-handles)`}>{handles.map(handle => <circle {...inspectAttributes({ title: handle.label, kind: handle.kind === 'graphic' ? 'Редактируемая точка ручной геометрии' : 'Редактируемая точка корреляции', rows: [['X', `${handle.point.x.toFixed(2)} м`], ['Z', `${handle.point.z.toFixed(2)} м`], ['Управление', 'Перетаскивание или стрелки; Shift — шаг 1 м; Escape — отмена']] })} key={handle.id} cx={px(handle.point.x)} cy={py(handle.point.z)} r="5" className="section-canvas__drag-handle" role="button" tabIndex={0} aria-label={handle.label} onClick={e => e.stopPropagation()} onPointerDown={e => { if (e.button !== 0) return; e.stopPropagation(); activeHandle.current = { id: handle.id, point: handle.point, svg: e.currentTarget.ownerSVGElement }; e.currentTarget.ownerSVGElement?.classList.add('is-handle-dragging'); e.currentTarget.ownerSVGElement?.setPointerCapture(e.pointerId); e.currentTarget.focus(); onHandleDrag(handle.id, handle.point, 'start') }} onKeyDown={e => {
        const step = e.shiftKey ? 1 : .1, delta = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] }[e.key]
        if (!delta) return
        e.preventDefault(); e.stopPropagation(); onHandleDrag(handle.id, handle.point, 'start'); onHandleDrag(handle.id, { x: handle.point.x + delta[0]!, z: handle.point.z + delta[1]! }, 'end')
      }} />)}</g>}
  </svg>
}

export function SectionCanvas(props: CanvasProps) {
  const available: SectionLayer[] = props.layers ?? ['technology'], [view, setView] = useSectionView(props.section.id, available)
  const cursor = useRef<HTMLParagraphElement>(null), viewport = useRef<HTMLDivElement>(null)
  const size = usePlotSize(viewport), [center, setCenter] = useState<XZ | null>(null)
  const base = { left: props.left ?? 0, right: props.right ?? profileLength(props.section.profile), top: props.top ?? props.section.top, bottom: props.bottom ?? props.section.bottom }
  const bounds = plotCamera(base, view.zoom, view.ratio, center)
  const headers = plotHeaders(props.section, size.width, bounds.left, bounds.right), frame = plotFrame(size.width, size.height, false, headers.top)
  const pan = useDragPan(!props.onPoint, () => {
    const start = { x: (bounds.left + bounds.right) / 2, z: (bounds.top + bounds.bottom) / 2 }
    return { move: (dx, dy) => setCenter({ x: start.x - dx / frame.width * (bounds.right - bounds.left), z: start.z + dy / frame.height * (bounds.top - bounds.bottom) }), cancel: () => setCenter(start) }
  })
  const zoomTo = (zoom: number, fx = .5, fy = .5) => {
    setCenter(anchoredCenter(bounds, (base.right - base.left) / zoom, (base.top - base.bottom) / (zoom * view.ratio), fx, fy))
    setView({ ...view, zoom })
  }
  useWheelGesture(viewport, event => {
    if (event.buttons || pan.panning) return
    event.preventDefault()
    if (event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
      const pixels = (event.deltaX || event.deltaY) * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? size.width : 1)
      setCenter({ x: (bounds.left + bounds.right) / 2 + pixels / frame.width * (bounds.right - bounds.left), z: (bounds.top + bounds.bottom) / 2 })
      return
    }
    const rect = viewport.current!.getBoundingClientRect()
    const fx = Math.max(0, Math.min(1, (event.clientX - rect.left - frame.left) / frame.width)), fy = Math.max(0, Math.min(1, (event.clientY - rect.top - frame.top) / frame.height))
    zoomTo(wheelZoom(view.zoom, event, .5, 4), fx, fy)
  }, true)
  const readPoint = useCallback((point: XZ) => { if (cursor.current) cursor.current.textContent = `Курсор: X ${point.x.toFixed(2)} м · Z ${point.z.toFixed(2)} м` }, [])
  return <><ToolCategory category="display" state={props.surfaceState}><div className="section-actions"><Button variant="secondary" aria-label="Увеличить разрез" onClick={() => zoomTo(Math.min(4, view.zoom * 1.25))}>＋</Button><Button variant="secondary" aria-label="Уменьшить разрез" onClick={() => zoomTo(Math.max(.5, view.zoom / 1.25))}>−</Button><Button variant="quiet" onClick={() => { setCenter(null); setView({ ...view, zoom: 1, ratio: 1 }) }}>Вписать</Button><label>Вертикальное увеличение<select value={view.ratio} onChange={e => setView({ ...view, ratio: Number(e.target.value) })}><option value={.6}>0,6×</option><option value={1}>1×</option><option value={1.5}>1,5×</option><option value={2}>2×</option></select></label><span className="section-muted">Экран {Math.round(view.zoom * 100)}% · масштаб чертежа задаётся отдельно</span></div>
    <div className="section-actions" role="group" aria-label="Видимость на экране"><label><input type="checkbox" checked={view.grid} onChange={e => setView({ ...view, grid: e.target.checked })} />Сетка</label><label><input type="checkbox" checked={view.graphics} onChange={e => setView({ ...view, graphics: e.target.checked })} />Границы и зоны</label>{available.map(layer => <label key={layer}><input type="checkbox" checked={view.layers.includes(layer)} onChange={e => setView({ ...view, layers: e.target.checked ? [...view.layers, layer] : view.layers.filter(l => l !== layer) })} />{layerNames[layer]}</label>)}</div>
    </ToolCategory>{props.surfaceState !== 'inactive' && <GraphHelp><p className="section-muted">{props.onPoint ? 'Построение: ЛКМ добавляет точку' : 'ЛКМ + перетаскивание — перемещение'} · колёсико — масштаб · Shift + колёсико — по горизонтали · ПКМ — сведения</p></GraphHelp>}
    <PlotSurface state={props.surfaceState}><GraphicInspection onSelect={props.onAnchor || props.onGraphic ? id => { if (props.section.graphics.some(g => g.id === id)) props.onGraphic?.(id); else props.onAnchor?.(id) } : undefined}><div {...pan.events} ref={viewport} style={{ "--section-header-height": `${headers.top}px` } as CSSProperties} className={`section-canvas-scroll section-canvas-viewport${props.onPoint ? '' : ' is-pannable'}${pan.panning ? ' is-panning' : ''}`} tabIndex={0} aria-label="Графическая область, прокрутка разреза" onKeyDown={event => {
      const delta = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[event.key]
      if (!delta) return
      event.preventDefault(); setCenter({ x: (bounds.left + bounds.right) / 2 + delta[0]! * (bounds.right - bounds.left) / 10, z: (bounds.top + bounds.bottom) / 2 + delta[1]! * (bounds.top - bounds.bottom) / 10 })
    }}><SectionSvg {...props} {...bounds} headerLayout={headers} width={size.width} height={size.height} layers={view.layers} showGrid={view.grid} showGraphics={view.graphics && props.showGraphics !== false} onReadPoint={readPoint} /></div></GraphicInspection><p ref={cursor} className="section-muted">Курсор: расстояние X и абсолютная высота Z в метрах</p><p className="section-legend"><span className="section-legend__sand">▧ Песок</span><span className="section-legend__clay">▤ Глина</span><span className="section-legend__silt">▥ Алеврит</span><span>┃ Опора интервала</span><span>КС — Ом·м; ГК — мкР/ч (пунктир); разрывы не соединяются</span></p></PlotSurface></>
}
