import { useMemo, useState } from 'react'
import { plotMargin, type Camera, type Size } from '../geometry'
import { visibleTopoTiles, type MapGeoreference } from '../topography'
import './topo-basemap.css'

export function TopoBasemap({ camera, size, reference, padding }: { camera: Camera; size: Size; reference?: MapGeoreference; padding?: typeof plotMargin }) {
  const tiles = useMemo(() => visibleTopoTiles(camera, size, reference, padding), [camera, size, reference, padding])
  const [failed, setFailed] = useState<Set<string>>(new Set()), [attempt, setAttempt] = useState(0)
  const missing = tiles.some(t => failed.has(t.id))
  return <g data-topo-basemap="OpenTopoMap"><g opacity=".74" pointerEvents="none">{tiles.map(t => <image key={`${t.id}-${attempt}`} data-topo-tile={t.id} href={t.url} x={t.x} y={t.y} width={t.side + .3} height={t.side + .3} preserveAspectRatio="none" onError={() => setFailed(previous => new Set(previous).add(t.id))} onLoad={() => setFailed(previous => { if (!previous.has(t.id)) return previous; const next = new Set(previous); next.delete(t.id); return next })} />)}</g>{missing && <foreignObject x={plotMargin.left + 8} y={plotMargin.top + 8} width="290" height="38"><div className="topo-load-error" role="status" onPointerDown={e => e.stopPropagation()}>Подложка загрузилась не полностью <button type="button" onClick={e => { e.stopPropagation(); setFailed(new Set()); setAttempt(n => n + 1) }}>Повторить</button></div></foreignObject>}</g>
}
export function TopoAttribution({ size }: { size: Size }) {
  return <foreignObject x={Math.max(plotMargin.left, size.width - 445)} y={size.height - plotMargin.bottom - 27} width={Math.min(425, size.width - plotMargin.left - plotMargin.right)} height="25" className="topo-attribution" onPointerDown={e => e.stopPropagation()}><div>© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> · SRTM | <a href="https://opentopomap.org" target="_blank" rel="noreferrer">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noreferrer">CC BY-SA</a>)</div></foreignObject>
}
