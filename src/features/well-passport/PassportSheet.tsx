import { useId, useState, type PointerEvent } from 'react'
import { readLegend } from '../geology-data/legend'
import { curveValue, lithologyIntervals, number, oreIntervals, type PageRange, type PassportSettings, type PassportWell, type TrackId } from './model'

// The supplied approved sheet is portrait. In A3 portrait it occupies 270 × 420 mm;
// the remaining horizontal space is the print margin, preserving the depth scale.
export const SHEET_WIDTH = 1260
export const SHEET_HEIGHT = 1960
const TOP = 350, BOTTOM = 1850, PX_PER_MM = SHEET_HEIGHT / 420
const columns = [0, 46, 92, 345, 390, 436, 745, 790, 1000, 1260]
const colors = { gamma: '#c62e31', resistivity: '#413985', sp: '#2c987c', induction: '#cb4392', km: '#269ac3', tm: '#9d3730', current: '#428e8a' }

type Hover = { x: number; y: number; depth: number; lines: string[] }
export function PassportSheet({ well, settings: s, range, pageNumber, pageCount, onTrack }: {
  well: PassportWell; settings: PassportSettings; range: PageRange; pageNumber: number; pageCount: number; onTrack?: (id: TrackId) => void
}) {
  const legend = readLegend(), uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const [hover, setHover] = useState<Hover | null>(null)
  const y = (depth: number) => TOP + (depth - range.from) * PX_PER_MM * 1000 / s.scale
  const ticks = Array.from({ length: Math.ceil((range.to - range.from) / 2) + 1 }, (_, i) => Math.ceil(range.from / 2) * 2 + i * 2).filter(d => d <= range.to)
  const visibleLithology = lithologyIntervals(well).filter(l => l.to > range.from && l.from < range.to)
  const ores = oreIntervals(well, s.oreSource).filter(o => o.to > range.from && o.from < range.to)
  const curvePath = (id: TrackId, left: number, right: number, max: number) => Array.from({ length: 400 }, (_, i) => {
    const depth = range.from + (range.to - range.from) * i / 399
    const value = Math.max(0, Math.min(max, curveValue(id, depth, well)))
    return `${i ? 'L' : 'M'}${(left + 4 + value / max * (right - left - 8)).toFixed(2)},${y(depth).toFixed(2)}`
  }).join(' ')
  const showValues = (event: PointerEvent<SVGGElement>, track: 'gamma' | 'electro') => {
    if (!onTrack) return
    const svg = event.currentTarget.ownerSVGElement, matrix = svg?.getScreenCTM()
    if (!svg || !matrix) return
    const point = svg.createSVGPoint(); point.x = event.clientX; point.y = event.clientY
    const p = point.matrixTransform(matrix.inverse()), depth = range.from + (p.y - TOP) * s.scale / PX_PER_MM / 1000
    if (depth < range.from || depth > range.to) { setHover(null); return }
    const lines = track === 'gamma' ? [`ГК: ${number(curveValue('gamma', depth, well), 2)} мкР/ч`] : [`КС: ${number(curveValue('resistivity', depth, well), 2)} Ом·м`, `ПС: ${number(curveValue('sp', depth, well), 2)} мВ`]
    setHover({ x: Math.min(p.x + 12, SHEET_WIDTH - 235), y: Math.min(Math.max(TOP + 4, p.y + 10), BOTTOM - (lines.length + 1) * 25 - 8), depth, lines })
  }
  const clickable = (id: TrackId) => onTrack ? { role: 'button' as const, tabIndex: 0, onClick: () => onTrack(id), onKeyDown: (event: React.KeyboardEvent<SVGGElement>) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onTrack(id) } } } : {}
  const vertical = (x: number, label: string) => <text x={x} y="250" transform={`rotate(-90 ${x} 250)`} textAnchor="middle" fontSize="15" fontWeight="bold">{label}</text>
  const scale = (x0: number, x1: number, yy: number, label: string, color: string, max: number) => <g fill={color} stroke={color}><text x={(x0 + x1) / 2} y={yy - 24} textAnchor="middle" fontSize="11" stroke="none">{label}</text><path d={`M${x0 + 8} ${yy}H${x1 - 8}`} fill="none" strokeWidth="1" />{Array.from({ length: 6 }, (_, i) => { const xx = x0 + 9 + i * (x1 - x0 - 18) / 5; return <g key={i}><path d={`M${xx} ${yy - 5}v10`} /><text x={xx} y={yy - 8} textAnchor="middle" fontSize="10" stroke="none">{number(max * i / 5)}</text></g> })}</g>
  const date = s.date.split('-').reverse().join('.')
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${SHEET_WIDTH} ${SHEET_HEIGHT}`} width={SHEET_WIDTH} height={SHEET_HEIGHT} className="passport-sheet" role="group" aria-label={`Паспорт ${well.name}, лист ${pageNumber} из ${pageCount}`} fontFamily="Times New Roman, serif" fontSize="16" fill="#111">
    <defs>
      <pattern id={`${uid}-dots`} width="11" height="13" patternUnits="userSpaceOnUse"><circle cx="3" cy="4" r="1.4" fill="#222" /><circle cx="8" cy="10" r="1" fill="#222" /></pattern>
      <pattern id={`${uid}-lines`} width="12" height="10" patternUnits="userSpaceOnUse"><path d="M0 5h12" stroke="#444" strokeWidth=".7" /></pattern>
      <pattern id={`${uid}-diagonal`} width="8" height="8" patternUnits="userSpaceOnUse"><path d="M0 8L8 0" stroke="#777" strokeWidth=".6" /></pattern>
      <pattern id={`${uid}-filter`} width="8" height="8" patternUnits="userSpaceOnUse"><path d="M0 2h8M0 6h8" stroke="#176f78" strokeWidth="1" /></pattern>
      <clipPath id={`${uid}-plot`}><rect x="0" y={TOP} width={SHEET_WIDTH} height={BOTTOM - TOP} /></clipPath>
      <filter id={`${uid}-mono`}><feColorMatrix type="saturate" values="0" /></filter>
    </defs>
    <rect width={SHEET_WIDTH} height={SHEET_HEIGHT} fill="#fff" />
    <g filter={s.color ? undefined : `url(#${uid}-mono)`}>
      <rect x="1" y="1" width="1258" height="1958" fill="none" stroke="#000" strokeWidth="2" />
      <g fontSize="16" fontWeight="bold"><text x="10" y="27">Месторождение Инкай · Участок № 2</text><text x="10" y="55">Залежь: —</text><text x="10" y="82">Блок № {well.block}</text><text x="10" y="109">Ряд: —</text><text x="10" y="136">Тип скважины: {well.purpose}</text></g>
      <text x="630" y="38" textAnchor="middle" fontSize="27">ПАСПОРТ РУДНЫХ ИНТЕРВАЛОВ</text><text x="630" y="65" textAnchor="middle" fontSize="21">по результатам комплексной интерпретации ГИС</text><text x="630" y="102" textAnchor="middle" fontSize="26">Скважина № {well.name}</text><text x="630" y="143" textAnchor="middle" fontSize="17">Масштаб 1:{s.scale}</text>
      <g textAnchor="end" fontSize="15"><text x="1250" y="28">Геофизическая служба</text><text x="1250" y="108">Дата каротажа: 16.10.2026</text><text x="1250" y="136">Устье: X {number(well.x)} · Y {number(well.y)} · Z {number(well.z)} м</text></g>
      <path d="M0 155H1260 M0 350H1260 M0 1850H1260" stroke="#000" strokeWidth="2" />
      {columns.slice(1, -1).map(x => <path key={x} d={`M${x} 155V1850`} stroke="#111" strokeWidth="1.8" />)}
      {vertical(23, 'Стратиграфия')}{vertical(69, 'Глубина, м')}{vertical(368, 'Литология')}{vertical(413, 'Коэф. фильтр., м/сут')}{vertical(768, 'Фильтр (проект.)')}
      <text x="218" y="202" textAnchor="middle" fontWeight="bold">Диаграммы гамма-каротажа</text>
      <text x="590" y="202" textAnchor="middle" fontWeight="bold">Диаграммы ЭК и ИК</text>
      <text x="895" y="235" textAnchor="middle" fontWeight="bold">Диаграммы КМ</text>
      <text x="1130" y="202" textAnchor="middle" fontWeight="bold">Диаграммы ТМ, КОосв.</text>
      {scale(92, 345, 294, 'ГК мкР/ч', colors.gamma, s.gammaMax)}{scale(92, 345, 335, 'ГК мкР/ч', colors.gamma, s.gammaMax * 5)}
      {scale(436, 745, 254, 'ИК мСм/м', colors.induction, 490)}{scale(436, 745, 294, 'ПС мВ', colors.sp, 100)}{scale(436, 745, 335, 'КС Ом·м', colors.resistivity, 50)}
      {scale(790, 1000, 335, 'КМр мм', colors.km, 400)}{scale(1000, 1260, 294, 'ТМ градС', colors.tm, 30)}{scale(1000, 1260, 335, 'ТКосв мА', colors.current, 120)}
      <g clipPath={`url(#${uid}-plot)`}>
        {s.grid && <g stroke="#b7b9cf" strokeWidth=".8">{ticks.map(d => <path key={d} d={`M46 ${y(d)}H1260`} />)}{[134,176,218,260,302,488,540,592,644,696,832,874,916,958,1052,1104,1156,1208].map(x => <path key={x} d={`M${x} ${TOP}V${BOTTOM}`} />)}</g>}
        {ticks.map(d => <text key={d} x="80" y={y(d) + 5} fontSize="13" textAnchor="end">{number(d)}</text>)}
        {[{ from: 0, to: 426 + well.offset, label: 'P₂' }, { from: 426 + well.offset, to: 500 + well.offset, label: 'K₂' }, { from: 500 + well.offset, to: well.depth, label: 'K₁' }].filter(v => v.to > range.from && v.from < range.to).map(v => <text key={v.label} x="23" y={y((Math.max(v.from, range.from) + Math.min(v.to, range.to)) / 2)} textAnchor="middle" fontSize="14">{v.label}</text>)}
        {visibleLithology.map(l => { const start=Math.max(l.from,range.from), end=Math.min(l.to,range.to), h=y(end)-y(start), entry=legend.find(e=>e.name===l.label), pattern=entry?.pattern ?? (l.label==='Глина'?'lines':'dots'); const kf=curveValue('kf',(start+end)/2,well); return <g key={l.from}><rect x="345" y={y(start)} width="45" height={h} fill={entry?.color ?? l.color} stroke="#111" /><rect x="345" y={y(start)} width="45" height={h} fill={pattern==='none'?'none':`url(#${uid}-${pattern === 'diagonal' ? 'diagonal' : pattern === 'lines' ? 'lines' : 'dots'})`} /><rect x="390" y={y(start)} width="46" height={h} fill={kf>2?'#d9d6f8':'#f7d6d7'} stroke="#111" />{h>21 && <text x="413" y={y(start)+h/2+4} textAnchor="middle" fontSize="13">{number(kf,1)}</text>}</g> })}
        <g data-track="gamma" className={onTrack?'passport-track':undefined} aria-label={onTrack?'Посмотреть данные: Гамма-каротаж':undefined} {...clickable('gamma')} onPointerMove={e=>showValues(e,'gamma')} onPointerLeave={()=>setHover(null)}><rect x="92" y={TOP} width="253" height={BOTTOM-TOP} fill="transparent" /><path d={curvePath('gamma',92,345,s.gammaMax)} fill="none" stroke={colors.gamma} strokeWidth="1.4" /></g>
        <g data-track="resistivity" className={onTrack?'passport-track':undefined} aria-label={onTrack?'Посмотреть данные: Сопротивление':undefined} {...clickable('resistivity')} onPointerMove={e=>showValues(e,'electro')} onPointerLeave={()=>setHover(null)}><rect x="436" y={TOP} width="309" height={BOTTOM-TOP} fill="transparent" /><path d={curvePath('resistivity',436,745,50)} fill="none" stroke={colors.resistivity} strokeWidth="1.3" /><path d={curvePath('sp',436,745,100)} fill="none" stroke={colors.sp} strokeWidth="1.3" /><path d={curvePath('deviation',436,745,20)} fill="none" stroke={colors.induction} strokeWidth="1" /></g>
        <path d={curvePath('deviation',790,1000,8)} fill="none" stroke={colors.km} strokeWidth="1.3" /><path d="M920 350V1850" stroke="#d55050" strokeWidth="1" />
        <path d={curvePath('deviation',1000,1260,40)} fill="none" stroke={colors.tm} strokeWidth="1.2" />
        {ores.map(o => {const a=Math.max(o.from,range.from),b=Math.min(o.to,range.to);return <g key={o.from}><rect x="92" y={y(a)} width="253" height={y(b)-y(a)} fill="#e688d4" fillOpacity=".45" stroke="#ad488f" /><text x="100" y={y(a)+14} fontSize="12">{number(o.from,2)}–{number(o.to,2)} · {o.label}</text></g>})}
        {(() => {const a=Math.max(442+well.offset,range.from),b=Math.min(483+well.offset,range.to);return b>a?<g><rect x="790" y={y(a)} width="210" height={y(b)-y(a)} fill={`url(#${uid}-diagonal)`} stroke="#777" /><rect x="1000" y={y(a)} width="45" height={y(b)-y(a)} fill="#9ee2e2" stroke="#111" /><rect x="1000" y={y(a)} width="45" height={y(b)-y(a)} fill={`url(#${uid}-filter)`} /><path d={curvePath('deviation',1000,1260,8)} fill="none" stroke={colors.current} strokeWidth="1" /></g>:null})()}
      </g>
      <text x="85" y="1892" fontSize="18" fontWeight="bold">Интерпретировал: {s.author || '—'}</text><text x="85" y="1930" fontSize="17" fontWeight="bold">Дата: {date}</text><text x="920" y="1892" fontSize="18" fontWeight="bold">Геолог: __________________</text><text x="920" y="1930" fontSize="17" fontWeight="bold">Дата: __________________</text>
      {hover && <g pointerEvents="none"><rect x={hover.x} y={hover.y} width="225" height={(hover.lines.length+1)*25+10} rx="4" fill="#fff" stroke="#344a63" /><text x={hover.x+9} y={hover.y+20} fontFamily="Arial, sans-serif" fontSize="14">Глубина: {number(hover.depth,2)} м</text>{hover.lines.map((line,i)=><text key={line} x={hover.x+9} y={hover.y+45+i*25} fontFamily="Arial, sans-serif" fontSize="14">{line}</text>)}</g>}
    </g>
  </svg>
}
