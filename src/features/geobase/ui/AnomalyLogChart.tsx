import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Check, Focus, Maximize2, ZoomIn, ZoomOut } from 'lucide-react'
import { Button } from '../../../shared/ui/Button'
import type { ReviewInterval } from '../model/bgdAnomalies'

const curves = [
  { id: 'gr', name: 'ГК', color: '#d32f3d', unit: 'мкР/ч', max: 160 },
  { id: 'cased', name: 'ГК в обсадке', color: '#b8861b', unit: 'мкР/ч', max: 160 },
  { id: 'sp', name: 'ПС', color: '#27834a', unit: 'мВ', max: 100 },
  { id: 'res', name: 'КС', color: '#2864c6', unit: 'Ом·м', max: 9000 },
  { id: 'current', name: 'Токовый', color: '#297d89', unit: 'мА', max: 180 },
  { id: 'caliper', name: 'Кавернометрия', color: '#7c4ab5', unit: 'мм', max: 400 },
  { id: 'temp', name: 'Термометрия', color: '#805e4b', unit: '°C', max: 50 },
] as const
type CurveId = typeof curves[number]['id']

// Prepared log shapes serve only the AP interaction; no interpretation calculation is implied.
function sampleCurve(id: CurveId, position: number): number {
  const wave = Math.sin(position * 51) * .018 + Math.sin(position * 317) * .012 + Math.cos(position * 743) * .007
  const peak = Math.exp(-(((position - .685) / .012) ** 2)) + .7 * Math.exp(-(((position - .9) / .008) ** 2))
  switch (id) {
    case 'gr': return .035 + wave * .5 + peak * .19
    case 'cased': return .79 + wave + Math.sin(position * 24) * .025 + peak * .05
    case 'sp': return .38 + wave + Math.sin(position * 41) * .06 + peak * .1
    case 'res': return .09 + Math.abs(Math.sin(position * 37)) * .055 + wave * .55 + peak * .035
    case 'current': return .13 + Math.exp(-(((position - .71) / .004) ** 2)) * .76 + wave * .15
    case 'caliper': return .24 + wave * .15 + Math.sin(position * 4) * .025
    case 'temp': return .17 + position * .055 + wave * .07
  }
}
const format = (n: number) => n.toLocaleString('ru-RU', { maximumFractionDigits: 2 })

export function AnomalyLogChart({ depth, rows, selected, onSelect }: { depth: number; rows: ReviewInterval[]; selected: string; onSelect: (id: string) => void }) {
  const [range, setRange] = useState({ from: 0, to: depth })
  const [visible, setVisible] = useState<CurveId[]>(curves.map(c => c.id))
  const [cursor, setCursor] = useState<number | null>(null)
  const [width, setWidth] = useState(1200)
  const container = useRef<HTMLDivElement>(null), clipId = useId()
  useEffect(() => {
    if (!container.current || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) => { if (entry) setWidth(Math.max(400, entry.contentRect.width)) })
    observer.observe(container.current)
    return () => observer.disconnect()
  }, [])
  const left = 48, right = width - 52, top = 26, bottom = 270
  const span = range.to - range.from
  const x = (value: number) => left + (value - range.from) / span * (right - left)
  const selectedRow = rows.find(row => row.id === selected)
  const paths = useMemo(() => curves.map(curve => ({ ...curve, path: Array.from({ length: 701 }, (_, i) => {
    const d = range.from + i / 700 * (range.to - range.from)
    const px = left + i / 700 * (right - left), py = bottom - sampleCurve(curve.id, d / depth) * (bottom - top)
    return `${i ? 'L' : 'M'}${px.toFixed(2)},${py.toFixed(2)}`
  }).join(' ') })), [range, right, depth])
  function zoom(factor: number) {
    const size = Math.min(depth, Math.max(Math.min(5, depth), span * factor))
    const center = cursor ?? (range.from + range.to) / 2
    const from = Math.max(0, Math.min(depth - size, center - size / 2))
    setRange({ from, to: from + size })
  }
  const safeCursor = cursor === null ? null : Math.max(range.from, Math.min(range.to, cursor))
  return <section className="bgd-ap-chart" aria-label="Совмещённые диаграммы каротажа">
    <header className="bgd-ap-chart__header">
      <div><h3>Диаграммы каротажа</h3><span>Глубина {format(range.from)}–{format(range.to)} м</span></div>
      <div className="bgd-ap-actions">
        <Button size="sm" variant="secondary" disabled={!selectedRow} onClick={() => { if (!selectedRow) return; const padding = Math.max(2, (selectedRow.to - selectedRow.from) * .3); setRange({ from: Math.max(0, selectedRow.from - padding), to: Math.min(depth, selectedRow.to + padding) }) }}><Focus size={15} />К пересечению</Button>
        <Button size="sm" variant="quiet" title="Приблизить график" aria-label="Приблизить график" onClick={() => zoom(.5)} disabled={span <= Math.min(5, depth)}><ZoomIn size={17} /></Button>
        <Button size="sm" variant="quiet" title="Отдалить график" aria-label="Отдалить график" onClick={() => zoom(2)} disabled={span >= depth}><ZoomOut size={17} /></Button>
        <Button size="sm" variant="quiet" title="Вся глубина" aria-label="Вся глубина" onClick={() => setRange({ from: 0, to: depth })}><Maximize2 size={17} /></Button>
      </div>
    </header>
    <div className="bgd-ap-chart__canvas" ref={container}>
      <svg viewBox={`0 0 ${width} 315`} width="100%" height="315" role="img" aria-label="График каротажа: глубина по горизонтали, ГК слева, КС справа" tabIndex={0}
        onPointerLeave={() => setCursor(null)}
        onPointerMove={event => { const rect = event.currentTarget.getBoundingClientRect(); const px = (event.clientX - rect.left) / rect.width * width; setCursor(px >= left && px <= right ? range.from + (px - left) / (right - left) * span : null) }}
        onClick={() => { if (safeCursor === null) return; const row = rows.find(r => safeCursor >= r.from && safeCursor <= r.to); if (row) onSelect(row.id) }}
        onKeyDown={event => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); setCursor(Math.max(range.from, Math.min(range.to, (safeCursor ?? range.from) + (event.key === 'ArrowLeft' ? -1 : 1) * span / 100))) } if (event.key === 'Enter' && safeCursor !== null) { const row = rows.find(r => safeCursor >= r.from && safeCursor <= r.to); if (row) onSelect(row.id) } }}>
        <defs><clipPath id={clipId}><rect x={left} y={top} width={right - left} height={bottom - top} /></clipPath></defs>
        <text x={left} y="14" fill="#d32f3d">ГК, мкР/ч</text><text x={right} y="14" textAnchor="end" fill="#2864c6">КС, Ом·м</text>
        <rect x={left} y={top} width={right - left} height={bottom - top} fill="var(--surface-panel)" stroke="var(--border-default)" />
        {Array.from({ length: 9 }, (_, i) => <g key={`y${i}`}><path d={`M${left},${top + i / 8 * (bottom - top)}H${right}`} className="bgd-ap-chart__grid" /><text x={left - 9} y={top + i / 8 * (bottom - top) + 4} textAnchor="end">{160 - i * 20}</text><text x={right + 8} y={top + i / 8 * (bottom - top) + 4}>{format(9000 - i / 8 * 9000)}</text></g>)}
        {Array.from({ length: 13 }, (_, i) => <g key={`x${i}`}><path d={`M${left + i / 12 * (right - left)},${top}V${bottom}`} className="bgd-ap-chart__grid" /><text x={left + i / 12 * (right - left)} y={bottom + 20} textAnchor="middle">{format(range.from + span * i / 12)}</text></g>)}
        <g clipPath={`url(#${clipId})`}>
          {rows.map(row => <rect key={row.id} x={x(row.from)} y={top} width={Math.max(1, x(row.to) - x(row.from))} height={bottom - top} fill={row.id === selected ? 'rgba(40,100,174,.09)' : 'rgba(40,100,174,.025)'} stroke={row.id === selected ? '#5f91ce' : '#ccd7e5'} strokeDasharray="4 4" />)}
          {paths.filter(curve => visible.includes(curve.id)).map(curve => <path key={curve.id} d={curve.path} fill="none" stroke={curve.color} strokeWidth="1.35" />)}
          {safeCursor !== null && <path d={`M${x(safeCursor)},${top}V${bottom}`} stroke="var(--text-primary)" strokeDasharray="3 3" />}
        </g>
        <text x={(left + right) / 2} y="310" textAnchor="middle">Глубина, м</text>
      </svg>
    </div>
    <div className="bgd-ap-chart__legend" aria-label="Отображаемые кривые">{curves.map(curve => <button type="button" key={curve.id} aria-label={`Кривая ${curve.name}`} title={`${curve.name}: шкала 0–${curve.max} ${curve.unit}`} aria-pressed={visible.includes(curve.id)} onClick={() => setVisible(visible.includes(curve.id) ? visible.filter(id => id !== curve.id) : [...visible, curve.id])}>
      <span className="bgd-ap-chart__check">{visible.includes(curve.id) && <Check size={11} />}</span><i style={{ background: curve.color }} /><strong>{curve.name}</strong><span>{safeCursor === null ? `0–${curve.max} ${curve.unit}` : `${format(sampleCurve(curve.id, safeCursor / depth) * curve.max)} ${curve.unit}`}</span>
    </button>)}</div>
    <div className="bgd-ap-chart__status" role="status">{safeCursor === null ? 'Наведите на график для просмотра значений · нажмите на пересечение для выбора' : `Глубина: ${format(safeCursor)} м`}</div>
  </section>
}
