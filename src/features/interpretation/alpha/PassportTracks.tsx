import { valueToX, type CurveSpec, type TrackSpec } from '@kapgeo/geo-viz/wellog'
import { domainTokens } from '@kapgeo/geo-viz/tokens'
const color = domainTokens.plan
export function PassportTracks({ tracks, from, to, scale }: { tracks: TrackSpec[]; from: number; to: number; scale: number }) {
  const full = tracks.reduce((s, t) => s + (t.width ?? 140), 0), height = (to - from) * 1000 / scale, y = (d: number) => 76 + (d - from) * 1000 / scale
  return <g fontFamily="Segoe UI, sans-serif" fontSize="2.5"><text x="21" y="65" textAnchor="end">MD, м</text>
    {Array.from({ length: Math.ceil((to - from) / 5) + 1 }, (_, i) => from + i * 5).filter(d => d <= to).map(d => <g key={d}><text x="22" y={y(d) + 1} textAnchor="end">{Number(d.toFixed(1))}</text><line x1="24" x2="280" y1={y(d)} y2={y(d)} stroke={color.grid} strokeWidth="0.2" /></g>)}
    {tracks.map((track, index) => {
      const width = (track.width ?? 140) / full * 256, x = 24 + tracks.slice(0, index).reduce((s, t) => s + (t.width ?? 140), 0) / full * 256
      const title = track.title.match(/.{1,14}(?:\s|$)|.{1,14}/g)?.slice(0, 3) ?? [track.title]
      return <g key={track.id}><defs><clipPath id={`passport-track-${index}`}><rect x={x} y="76" width={width} height={height} /></clipPath>
        {(['dots', 'lines', 'diagonal'] as const).map(pattern => <pattern key={pattern} id={`passport-pattern-${index}-${pattern}`} width="3" height="3" patternUnits="userSpaceOnUse">{pattern === 'dots' ? <circle cx="1.5" cy="1.5" r="0.2" fill={color.label} /> : <path d={pattern === 'lines' ? 'M0 1.5 H3' : 'M-1 1 L2 4 M1 -1 L4 2'} fill="none" stroke={color.label} strokeWidth="0.15" />}</pattern>)}
      </defs><rect x={x} y="54" width={width} height={height + 22} fill="none" stroke={color.axis} strokeWidth="0.2" />
        {title.map((line, i) => <text key={i} x={x + width / 2} y={59 + i * 3.3} textAnchor="middle" fontSize="2.4">{line.trim()}</text>)}
        {track.curves.map((curve, i) => <text key={curve.id} x={x + 1} y={72 + i * 2.5} fontSize="2" fill={curve.color ?? domainTokens.curves[curve.type]}>{Number(curve.scale.min.toFixed(1))}–{Number(curve.scale.max.toFixed(1))} {curve.unit}</text>)}
        <g clipPath={`url(#passport-track-${index})`}>{track.intervals?.map(r => <g key={r.id}><rect x={x + 0.5} y={y(r.from)} width={width - 1} height={(r.to - r.from) * 1000 / scale} fill={r.fill} fillOpacity="0.8" stroke={color.axis} strokeWidth="0.15" />{r.pattern && <rect x={x + 0.5} y={y(r.from)} width={width - 1} height={(r.to - r.from) * 1000 / scale} fill={`url(#passport-pattern-${index}-${r.pattern})`} opacity="0.5" />}{(r.to - r.from) * 1000 / scale > 5 && <text x={x + width / 2} y={y((r.from + r.to) / 2)} textAnchor="middle" fontSize="2.1">{r.label.slice(0, Math.max(4, Math.floor(width / 1.2)))}</text>}</g>)}
          {track.bars?.map(bar => <g key={bar.id}><rect x={x + 0.3} y={y(bar.from)} width={(width - 0.6) * bar.value / (track.barMax || 1)} height={Math.max(0.2, (bar.to - bar.from) * 1000 / scale - 0.15)} fill={bar.fill} /><text x={x + 1} y={y((bar.from + bar.to) / 2) + 0.8} fontSize="2">{bar.label}</text></g>)}
          {track.curves.map(curve => <PassportCurve key={curve.id} curve={curve} from={from} to={to} x={x} width={width} y={y} />)}
          {track.guides?.map((guide, i) => guide.depth !== undefined ? <line key={i} x1={x} x2={x + width} y1={y(guide.depth)} y2={y(guide.depth)} stroke={guide.color} strokeDasharray={guide.dashed ? '1 0.6' : undefined} strokeWidth="0.25" /> : guide.value !== undefined && guide.scale ? <line key={i} x1={x + (valueToX(guide.value, guide.scale, width) ?? 0)} x2={x + (valueToX(guide.value, guide.scale, width) ?? 0)} y1="76" y2={76 + height} stroke={guide.color} strokeWidth="0.25" /> : null)}
          {track.annotations?.filter(n => n.depth >= from && n.depth <= to).map(n => <g key={n.id}><rect x={x + 0.5} y={y(n.depth) - 2.5} width={width - 1} height="5" fill={n.background} stroke={n.color} strokeWidth="0.2" /><text x={x + 1.5} y={y(n.depth) + 0.7} fill={n.color} fontSize="2.3">{n.text.slice(0, Math.max(3, Math.floor((width - 3) / 1.25)))}</text></g>)}
        </g></g>
    })}</g>
}
function PassportCurve({ curve, from, to, x, width, y }: { curve: CurveSpec; from: number; to: number; x: number; width: number; y: (depth: number) => number }) {
  let open = false, path = '', fillPath = ''
  const points: { x: number; y: number }[] = [], stride = Math.max(1, Math.ceil(curve.data.depths.length / 300))
  for (let i = 0; i < curve.data.depths.length; i++) {
    const depth = curve.data.depths[i]!, value = curve.data.values[i]!, cx = valueToX(value, curve.scale, width)
    if (depth < from || depth > to || cx === undefined) { open = false; continue }
    path += `${open ? 'L' : 'M'}${(x + cx).toFixed(3)},${y(depth).toFixed(3)} `; open = true
    if (curve.markers && i % stride === 0) points.push({ x: x + cx, y: y(depth) })
  }
  const fill = curve.fill
  if (fill) {
    const base = valueToX(fill.baseline, curve.scale, width)
    if (base !== undefined) for (let i = 0; i < curve.data.depths.length - 1; i++) {
      const da = curve.data.depths[i]!, db = curve.data.depths[i + 1]!, va = curve.data.values[i]!, vb = curve.data.values[i + 1]!
      if (![va, vb].every(Number.isFinite) || db <= da) continue
      let a = Math.max(from, fill.from, da), b = Math.min(to, fill.to, db)
      if (b <= a || (fill.below ? Math.min(va, vb) >= fill.baseline : Math.max(va, vb) <= fill.baseline)) continue
      if ((va < fill.baseline) !== (vb < fill.baseline)) { const contact = da + (fill.baseline - va) / (vb - va) * (db - da); if (fill.below ? va > vb : va < vb) a = Math.max(a, contact); else b = Math.min(b, contact) }
      if (b <= a) continue
      const ax = valueToX(va + (vb - va) * (a - da) / (db - da), curve.scale, width), bx = valueToX(va + (vb - va) * (b - da) / (db - da), curve.scale, width)
      if (ax === undefined || bx === undefined) continue
      fillPath += `M${x + base},${y(a)} L${x + ax},${y(a)} L${x + bx},${y(b)} L${x + base},${y(b)} Z `
    }
  }
  const stroke = curve.color ?? domainTokens.curves[curve.type]
  return <g>{fillPath && <path d={fillPath} fill={fill!.color} opacity="0.18" />}<path d={path} fill="none" stroke={stroke} strokeWidth={(curve.lineWidth ?? 1) * 0.25} strokeDasharray={curve.dashed ? '1.2 0.8' : undefined} />{points.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="0.6" fill={stroke} />)}</g>
}
