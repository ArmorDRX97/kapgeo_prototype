import { useEffect, useId, useRef, useState, type PointerEvent } from 'react'
import { distance, fitCamera, hitObject, objectPath, plotMargin as m, projectOnSegment, screenToWorld, splitBezier, worldToScreen, zoomCamera, type Camera, type Size } from '../../entities/geology-map/geometry'
import { defaultMapGrid, layerVisible, orderedLayers, type MapObject, type MapProject, type SnapPoint, type XY } from '../../entities/geology-map/model'
import { gridLabel, gridLabelTicks, mapGridTicks } from '../../entities/geology-map/grid'
import { wellSymbol, wellSymbolPath } from '../../entities/geology-map/wellSymbols'
import { changedNode, translated } from '../../entities/geology-map/fixtures'

export type PlanTool = 'select' | 'draw' | 'move' | 'add' | 'delete' | 'measure' | 'label'
type Props = { project: MapProject; camera: Camera | null; onCamera: (camera: Camera) => void; selected?: string; draft: MapObject | null; tool: PlanTool; editable: boolean; snap: (p: XY, radius: number) => SnapPoint; onSelect: (ids: string[]) => void; onDraft: (object: MapObject) => void; onPoint: (p: SnapPoint) => void; onNode: (id: string) => void; onCancel: () => void; grid: boolean; labels: boolean; values: boolean; measure: XY[]; rasterUrl?: string }
type Gesture = { pointer: number; start: XY; moved: boolean; camera: Camera; world: XY; object?: MapObject; node?: string; label?: boolean }
export function PlanCanvas(props: Props) {
  const svg = useRef<SVGSVGElement>(null), wrap = useRef<HTMLDivElement>(null), gesture = useRef<Gesture | null>(null), clip = useId().replace(/:/g, '')
  const [size, setSize] = useState<Size>({ width: 900, height: 700 }), [panning, setPanning] = useState(false), [cursor, setCursor] = useState<XY | null>(null), [hover, setHover] = useState<string>(''), [snapHint,setSnapHint] = useState<SnapPoint | null>(null)
  const camera = props.camera ?? fitCamera(props.project, size), to = (p: XY) => worldToScreen(p, camera, size)
  const { camera: suppliedCamera, project: fitProject, onCamera: publishCamera } = props
  useEffect(() => { const element = wrap.current; if (!element) return; const observer = new ResizeObserver(([entry]) => { if (entry && entry.contentRect.width > 0) setSize({ width: entry.contentRect.width, height: Math.max(300, entry.contentRect.height) }) }); observer.observe(element); return () => observer.disconnect() }, [])
  useEffect(() => { if (!suppliedCamera) { const rect = wrap.current?.getBoundingClientRect(); publishCamera(fitCamera(fitProject, rect && rect.width > 0 ? { width: rect.width, height: Math.max(300, rect.height) } : size)) } }, [suppliedCamera, fitProject, publishCamera, size])
  const cameraRef = useRef(camera), propsRef = useRef(props), sizeRef = useRef(size)
  useEffect(() => { cameraRef.current = camera; propsRef.current = props; sizeRef.current = size })
  useEffect(() => {
    const element = svg.current; if (!element) return
    const wheel = (event: WheelEvent) => { if (gesture.current || event.ctrlKey || event.metaKey) return; event.preventDefault(); const rect = element.getBoundingClientRect(), size = sizeRef.current, p = { x: (event.clientX - rect.left) * size.width / rect.width, y: (event.clientY - rect.top) * size.height / rect.height }; if (event.shiftKey) propsRef.current.onCamera({ ...cameraRef.current, y: cameraRef.current.y + event.deltaY / cameraRef.current.scale }); else propsRef.current.onCamera(zoomCamera(cameraRef.current, Math.exp(-Math.max(-200, Math.min(200, event.deltaY)) * .002), p, size)) }
    element.addEventListener('wheel', wheel, { passive: false }); return () => element.removeEventListener('wheel', wheel)
  }, [])
  const local = (e: { clientX: number; clientY: number }): XY => { const r = svg.current!.getBoundingClientRect(); return { x: (e.clientX - r.left) * size.width / r.width, y: (e.clientY - r.top) * size.height / r.height } }
  const rendered = orderedLayers(props.project).flatMap(l => props.project.objects.filter(o => o.layerId === l.id && layerVisible(props.project, l.id)).map(o => props.draft?.id === o.id ? props.draft : o))
  if (props.draft && !props.project.objects.some(o => o.id === props.draft!.id)) rendered.push(props.draft)
  const selected = props.draft ?? rendered.find(o => o.id === props.selected)
  const candidates = (p: XY) => [...rendered].reverse().filter(o => hitObject(o, p, 7 / camera.scale)).sort((a, b) => Number(b.kind === 'well') - Number(a.kind === 'well'))
  const cancelGesture = () => { const g = gesture.current; gesture.current = null; setPanning(false); if (g?.moved) { if (g.object) props.onDraft(g.object); else props.onCamera(g.camera) } }
  useEffect(() => { const blur = () => { const g = gesture.current; if (g) { if (g.object) propsRef.current.onDraft(g.object); else propsRef.current.onCamera(g.camera); gesture.current = null; setPanning(false) } }; window.addEventListener('blur', blur); return () => window.removeEventListener('blur', blur) }, [])
  const down = (e: PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0 || !e.isPrimary) return
    const at = local(e), world = screenToWorld(at, camera, size), node = (e.target as Element).closest('[data-node]')?.getAttribute('data-node')
    if (props.editable && node && selected && props.tool !== 'measure') {
      props.onNode(node)
      if (props.tool === 'delete') { props.onDraft({ ...selected, parts: selected.parts.map(p => { const i = p.nodes.findIndex(n => n.id === node); if (i < 0) return p; if (selected.shape !== 'bezier') return { ...p, nodes: p.nodes.filter(n => n.id !== node) }; const anchor = Math.min(p.nodes.length - 1, Math.ceil(i / 3) * 3), start = anchor === 0 ? 0 : anchor === p.nodes.length - 1 ? anchor - 2 : anchor - 1; return { ...p, nodes: p.nodes.filter((_, j) => j < start || j >= start + 3) } }) }); return }
      gesture.current = { pointer: e.pointerId, start: at, world, camera, moved: false, object: selected, node }; e.currentTarget.setPointerCapture(e.pointerId); return
    }
    if (props.tool === 'draw' || props.tool === 'measure') { props.onPoint(props.snap(world, 10 / camera.scale)); return }
    if (props.editable && props.tool === 'add' && selected) {
      if (selected.shape === 'bezier') { props.onDraft(splitBezier(selected, world)); return }
      let best = { part: 0, index: 1, distance: Infinity }
      selected.parts.forEach((part, pi) => part.nodes.forEach((n, i) => { const next = part.nodes[(i + 1) % part.nodes.length]; if (!next || !selected.closed && i === part.nodes.length - 1) return; const d = distance(world, projectOnSegment(world, n, next)); if (d < best.distance) best = { part: pi, index: i + 1, distance: d } }))
      const p = props.snap(world, 10 / camera.scale); props.onDraft({ ...selected, parts: selected.parts.map((part, i) => i === best.part ? { ...part, nodes: [...part.nodes.slice(0, best.index), { id: crypto.randomUUID(), ...p }, ...part.nodes.slice(best.index)] } : part) }); return
    }
    gesture.current = { pointer: e.pointerId, start: at, world, camera, moved: false, ...(props.editable && selected && (props.tool === 'move' || props.tool === 'label') ? { object: selected, label: props.tool === 'label' } : {}) }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const move = (e: PointerEvent<SVGSVGElement>) => {
    const at = local(e), world = screenToWorld(at, camera, size); setCursor(world); const hint = props.snap(world,10/camera.scale); setSnapHint((props.tool === 'draw' || !!props.draft || !!gesture.current?.node) && hint.anchor ? hint : null)
    const g = gesture.current
    if (!g) { const near = candidates(world)[0]; setHover(near ? `${near.name} · ${near.kind === 'well' ? near.attributes.type : near.closed ? 'Замкнутая область' : 'Линия'}` : ''); return }
    if (g.pointer !== e.pointerId || !g.moved && distance(at, g.start) < 5) return
    g.moved = true; e.preventDefault()
    if (g.object) {
      const p = props.snap(screenToWorld(at, g.camera, size), 10 / camera.scale)
      if (g.node) props.onDraft(changedNode(g.object, g.node, p))
      else if (g.label) props.onDraft({ ...g.object, label: { ...g.object.label, dx: g.object.label.dx + at.x - g.start.x, dy: g.object.label.dy + at.y - g.start.y } })
      else props.onDraft(translated(g.object, p.x - g.world.x, p.y - g.world.y))
    } else { setPanning(true); props.onCamera({ x: g.camera.x + (at.y - g.start.y) / g.camera.scale, y: g.camera.y - (at.x - g.start.x) / g.camera.scale, scale: g.camera.scale }) }
  }
  const up = (e: PointerEvent<SVGSVGElement>) => { const g = gesture.current; gesture.current = null; setPanning(false); if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); if (g && !g.moved && !g.node && props.tool === 'select') props.onSelect(candidates(screenToWorld(local(e), camera, size)).map(o => o.id)) }
  const nw = screenToWorld({ x: m.left, y: m.top }, camera, size), se = screenToWorld({ x: size.width - m.right, y: size.height - m.bottom }, camera, size)
  const gridSettings = props.project.grid ?? defaultMapGrid
  const xTicks = mapGridTicks(se.x,nw.x,80/camera.scale,gridSettings,'x'), yTicks = mapGridTicks(nw.y,se.y,100/camera.scale,gridSettings,'y'), rulerMeters = 10 ** Math.floor(Math.log10(100 / camera.scale)), rulerWidth = rulerMeters * camera.scale
  return <div className="map-canvas-area"><div ref={wrap} className={`map-canvas-wrap${panning ? ' is-panning' : ''}`}><svg ref={svg} width="100%" height="100%" viewBox={`0 0 ${size.width} ${size.height}`} role="group" aria-label="Интерактивный инженерный план" tabIndex={0} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={cancelGesture} onLostPointerCapture={() => { if (gesture.current) cancelGesture() }} onContextMenu={e => { e.preventDefault(); props.onSelect(candidates(screenToWorld(local(e), camera, size)).map(o => o.id)) }} onKeyDown={e => {
      if (e.key === 'Escape') { cancelGesture(); props.onCancel() }
      const delta = { ArrowLeft: [0, -60], ArrowRight: [0, 60], ArrowUp: [60, 0], ArrowDown: [-60, 0] }[e.key]
      if (delta) { e.preventDefault(); props.onCamera({ ...camera, x: camera.x + delta[0]! / camera.scale, y: camera.y + delta[1]! / camera.scale }) }
      if (e.key === '+' || e.key === '-') { e.preventDefault(); props.onCamera(zoomCamera(camera, e.key === '+' ? 1.25 : .8, { x: size.width / 2, y: size.height / 2 }, size)) }
      if (e.key === 'F10' && e.shiftKey && selected) { e.preventDefault(); props.onSelect([selected.id]) }
    }}>
      <defs><marker id={`${clip}-arrow`} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 1L7 4L0 7" fill="none" stroke="context-stroke" /></marker><clipPath id={clip}><rect x={m.left} y={m.top} width={Math.max(1, size.width - m.left - m.right)} height={Math.max(1, size.height - m.top - m.bottom)} /></clipPath></defs>
      <rect width={size.width} height={size.height} className="map-sheet" />
      <g clipPath={`url(#${clip})`}>
        {props.rasterUrl && props.project.underlay?.visible && (() => { const u = props.project.underlay, p = to(u); return <image href={props.rasterUrl} x={p.x} y={p.y} width={u.width * camera.scale} height={u.height * camera.scale} opacity={u.opacity} transform={`rotate(${u.angle} ${p.x} ${p.y})`} preserveAspectRatio="none" /> })()}
        {props.grid && <g className="map-grid">{xTicks.map(x => <path key={`x${x}`} style={{stroke:gridSettings.color,strokeWidth:gridSettings.width}} d={`M${m.left},${to({ x, y: camera.y }).y}H${size.width - m.right}`} />)}{yTicks.map(y => <path key={`y${y}`} style={{stroke:gridSettings.color,strokeWidth:gridSettings.width}} d={`M${to({ x: camera.x, y }).x},${m.top}V${size.height - m.bottom}`} />)}</g>}
        {rendered.map(o => { const active = o.id === props.selected || o.id === props.draft?.id, a = to(o.parts[0]?.nodes[0] ?? { x: 0, y: 0 }); return <g key={o.id} data-object={o.id} className={active ? 'map-object is-selected' : 'map-object'}>
          <title>{o.name}</title>
          {o.kind === 'well' && o.parts[0]!.nodes.length === 2 ? (() => { const b=to(o.parts[0]!.nodes[1]!), radius=active?5:3.8, symbol=wellSymbol(o.attributes.type), paths=wellSymbolPath(a,b,radius); return <><path data-well-direction={o.id} d={paths.direction} stroke={symbol.color} strokeWidth={active?1.5:.8} fill="none"/><circle cx={a.x} cy={a.y} r={radius} fill="var(--surface-panel)" stroke={symbol.color} strokeWidth={active?1.5:1}/><path data-well-cross={o.id} d={paths.cross} stroke={symbol.color} strokeWidth="1"/>{props.labels && o.label.visible && (camera.scale>=1.6 || active) && <text x={a.x+o.label.dx} y={a.y+o.label.dy} className="map-well-label">{o.name}</text>}{props.values && (camera.scale>=2 || active) && <text x={a.x+o.label.dx} y={a.y+o.label.dy+12} className="map-value-label">{o.attributes.value.toFixed(2)}</text>}</> })() : <><path d={objectPath(o,to)} fill={o.closed?o.style.fill:'none'} fillOpacity={o.style.opacity} fillRule="evenodd" stroke={o.style.stroke} strokeWidth={active?o.style.width+1:o.style.width} strokeDasharray={o.style.dash==='dash'?'8 4':o.style.dash==='dot'?'2 4':undefined} markerEnd={o.kind==='profile'?`url(#${clip}-arrow)`:undefined}/>{props.labels && o.label.visible && o.kind!=='contour' && (()=>{const nodes=o.parts[0]?.nodes??[], position=o.kind==='block' && nodes.length ? to({x:nodes.reduce((v,n)=>v+n.x,0)/nodes.length,y:nodes.reduce((v,n)=>v+n.y,0)/nodes.length}):a;return <text x={position.x+o.label.dx} y={position.y+o.label.dy} className="map-profile-label">{o.name}</text>})()}</>}

        </g> })}
        {selected && props.editable && props.tool !== 'measure' && <g>{selected.shape === 'bezier' && <path d={selected.parts.map(p => p.nodes.map((n, i) => `${i ? 'L' : 'M'}${to(n).x},${to(n).y}`).join(' ')).join(' ')} className="map-control-line" />}{selected.parts.flatMap(p => p.nodes.map((n, i) => { const s = to(n); return <g key={n.id} data-node={n.id} className="map-node"><circle cx={s.x} cy={s.y} r={10} fill="transparent" /><circle cx={s.x} cy={s.y} r={selected.shape === 'bezier' && i % 3 !== 0 ? 3 : 4.5} className={`map-node-dot${n.anchor ? ' is-bound' : ''}`} /><title>{`${selected.kind === 'well' ? i === 0 ? 'Устье' : 'Забой' : `Точка ${i + 1}${n.anchor ? ' · '+props.project.objects.find(w=>w.id===n.anchor!.wellId)?.name+' · привязано' : ' · свободная'}`} · X ${n.x.toFixed(2)} · Y ${n.y.toFixed(2)}`}</title></g> }))}</g>}
        {snapHint?.anchor && <g className="map-snap-hint" pointerEvents="none"><circle cx={to(snapHint).x} cy={to(snapHint).y} r="10"/><text x={to(snapHint).x+12} y={to(snapHint).y-12}>Привязка · {props.project.objects.find(w=>w.id===snapHint.anchor!.wellId)?.name} · {snapHint.anchor.target==='bottom'?'забой':'устье'}</text></g>}
        {props.measure.length > 0 && <g className="map-measure"><path d={props.measure.map((p, i) => `${i ? 'L' : 'M'}${to(p).x},${to(p).y}`).join(' ')} />{props.measure.map((p, i) => <circle key={i} cx={to(p).x} cy={to(p).y} r={4} />)}{props.measure.length === 2 && <text x={to(props.measure[1]!).x + 8} y={to(props.measure[1]!).y - 8}>{distance(props.measure[0]!, props.measure[1]!).toFixed(2)} м</text>}</g>}
      </g>
      <rect x={m.left} y={m.top} width={Math.max(1, size.width - m.left - m.right)} height={Math.max(1, size.height - m.top - m.bottom)} className="map-frame" />
      <g className="map-axis-labels"><text x={8} y={15}>X, м</text><text x={size.width - 35} y={16}>Y, м</text>{gridLabelTicks(xTicks,camera.scale,40).map(x => <text key={x} x={m.left - 7} y={to({ x, y: camera.y }).y + 4} textAnchor="end">{gridLabel(x,xTicks)}</text>)}{gridLabelTicks(yTicks,camera.scale,72).map(y => <text key={y} x={to({ x: camera.x, y }).x} y={size.height - 12} textAnchor="middle">{gridLabel(y,yTicks)}</text>)}</g>
      <g className="map-ruler"><rect x={m.left + 15} y={size.height - m.bottom - 29} width={rulerWidth + 35} height={25} /><path d={`M${m.left + 23},${size.height - m.bottom - 13}h${rulerWidth}m-${rulerWidth},-3v6m${rulerWidth},-6v6`} /><text x={m.left + 23} y={size.height - m.bottom - 18}>{rulerMeters} м</text></g>
    </svg></div><div className="map-canvas-status"><span>{cursor ? `X ${cursor.x.toFixed(2)} · Y ${cursor.y.toFixed(2)} м` : 'X — север · Y — восток · метры'}</span><span title={hover}>{hover || `${rendered.filter(o => o.kind === 'well').length} скважин · ${rendered.filter(o => o.kind !== 'well').length} построений`}</span></div></div>
}
