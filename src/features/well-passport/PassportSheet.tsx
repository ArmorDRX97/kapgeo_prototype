import { readLegend } from '../geology-data/legend'
import { useId } from 'react'
import { curveValue, lithologyIntervals, number, oreIntervals, templates, trackDefinitions, type PageRange, type PassportSettings, type PassportWell, type TrackId } from './model'

export const SHEET_WIDTH = 1260
export const SHEET_HEIGHT = 891
const TOP = 213, LEFT = 36, RIGHT = 1224, DEPTH_WIDTH = 62
const curveLimits: Partial<Record<TrackId, [number, string]>> = { gamma: [100, 'мкР/ч'], resistivity: [50, 'Ом·м'], sp: [100, 'мВ'], knd: [.15, '%'], kf: [20, 'м/сут'], deviation: [8, 'м'] }
const shortNames: Partial<Record<TrackId, string>> = { gamma: 'ГК', resistivity: 'КС', sp: 'ПС', radium: 'Ra · Бк/кг', knd: 'КНД', kf: 'Кф', ore: 'Рудные инт.', construction: 'Конструкция', core: 'Выход керна', samples: 'U · %', deviation: 'Отклонение' }

export function PassportSheet({ well, settings: s, range, pageNumber, pageCount, onTrack }: {
  well: PassportWell; settings: PassportSettings; range: PageRange; pageNumber: number; pageCount: number; onTrack?: (id: TrackId) => void
}) {
  const legend = readLegend()
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const height = (range.to - range.from) * 3000 / s.scale
  const bottom = TOP + height
  const y = (depth: number) => TOP + (depth - range.from) * 3000 / s.scale
  const width = (RIGHT - LEFT - DEPTH_WIDTH) / Math.max(1, s.tracks.length)
  const ticks = Array.from({ length: Math.ceil((range.to - range.from) / 5) + 1 }, (_, i) => Math.ceil(range.from / 5) * 5 + i * 5).filter(d => d <= range.to)
  const lithology = lithologyIntervals(well), ores = oreIntervals(well, s.oreSource)
  const visibleOres = ores.filter(o => o.to > s.from && o.from < s.to)
  const sourceName = { gamma: 'ГК', knd: 'КНД', samples: 'по пробам' }[s.oreSource]
  const date = s.date.split('-').reverse().join('.')
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${SHEET_WIDTH} ${SHEET_HEIGHT}`} width={SHEET_WIDTH} height={SHEET_HEIGHT} className="passport-sheet" role="group" aria-label={`Паспорт ${well.name}, лист ${pageNumber} из ${pageCount}`} fontFamily="Arial, sans-serif" fontSize="14" fill="#263b4c">
    <defs>
      <pattern id={`${uid}-dots`} width="12" height="10" patternUnits="userSpaceOnUse"><circle cx="4" cy="4" r="1" fill="#555" /></pattern><pattern id={`${uid}-lines`} width="12" height="10" patternUnits="userSpaceOnUse"><path d="M0 5H12" stroke="#555" /></pattern><pattern id={`${uid}-diagonal`} width="10" height="10" patternUnits="userSpaceOnUse"><path d="M0 10L10 0" stroke="#555" /></pattern><pattern id={`${uid}-sand`} width="12" height="10" patternUnits="userSpaceOnUse"><path d="M2 3h1M8 8h1" stroke="#9e8442" strokeWidth="1.8" /></pattern>
      <pattern id={`${uid}-clay`} width="12" height="10" patternUnits="userSpaceOnUse"><path d="M0 5h12" stroke="#718a77" strokeWidth=".8" /></pattern>
      <pattern id={`${uid}-silt`} width="12" height="10" patternUnits="userSpaceOnUse"><path d="M0 5h5M8 5h1" stroke="#9e8e68" strokeWidth="1" /></pattern>
      <pattern id={`${uid}-cement`} width="8" height="8" patternUnits="userSpaceOnUse"><path d="M-2 2L2-2M0 8L8 0M6 10l4-4" stroke="#a1aab5" strokeWidth="1" /></pattern>
      <pattern id={`${uid}-ore`} width="8" height="8" patternUnits="userSpaceOnUse"><path d="M0 8L8 0" stroke="#714e23" strokeWidth="1" /></pattern><filter id={`${uid}-mono`}><feColorMatrix type="saturate" values="0" /></filter>
    </defs>
    <rect width={SHEET_WIDTH} height={SHEET_HEIGHT} fill="white" />
    <g filter={s.color ? undefined : `url(#${uid}-mono)`}>
      <text x={LEFT} y="39" fontSize="16" fontWeight="bold" letterSpacing="2" fill="#0e3479">KAPGEO</text>
      <text x="1224" y="39" textAnchor="end" fontSize="12" fill="#6b7786">ГЕОЛОГИЧЕСКАЯ ДОКУМЕНТАЦИЯ</text>
      <path d={`M${LEFT} 52H${RIGHT}`} stroke="#0e3479" strokeWidth="2" />
      <text x={LEFT} y="84" fontSize="26" fontWeight="bold">ПАСПОРТ СКВАЖИНЫ {well.name}</text>
      <text x={RIGHT} y="81" textAnchor="end" fontSize="14">{templates.find(t => t.id === s.template)!.name} · М 1:{s.scale}</text>
      <text x={LEFT} y="109" fill="#596a7e">Месторождение Инкай · Участок № 2 · Блок {well.block}</text>
      <text x={RIGHT} y="109" textAnchor="end" fill="#596a7e">Интервал {number(s.from)}–{number(s.to)} м · Лист {pageNumber}/{pageCount}</text>
      <rect x={LEFT} y="124" width={RIGHT - LEFT} height="40" fill="#f5f7fa" />
      <text x="48" y="149">Устье: X {number(well.x)} · Y {number(well.y)} · Z {number(well.z)} м</text>
      <text x="670" y="149">Глубина {number(well.depth)} м</text>
      <text x="880" y="149">Каротаж 16.10.2026 · СК-1-76</text>
      <rect x={LEFT} y="174" width={DEPTH_WIDTH} height={39 + height} fill="#f8fafc" stroke="#98a7b5" />
      <text x={LEFT + DEPTH_WIDTH / 2} y="190" textAnchor="middle" fontSize="12">Глубина</text><text x={LEFT + DEPTH_WIDTH / 2} y="206" textAnchor="middle" fontSize="12">м</text>
      {ticks.map(d => <g key={d}><path d={`M${LEFT + DEPTH_WIDTH - 8} ${y(d)}h8`} stroke="#718096" /><text x={LEFT + DEPTH_WIDTH - 14} y={y(d) + 4} textAnchor="end" fontSize="12">{number(d)}</text></g>)}
      {s.tracks.map((id, index) => {
        const def = trackDefinitions.find(t => t.id === id)!, x = LEFT + DEPTH_WIDTH + index * width, limit = id === 'gamma' ? s.gammaMax : curveLimits[id]?.[0]
        const clip = `${uid}-${id}`
        const heading = shortNames[id] ?? def.name
        const headingSize = Math.min(13, Math.max(9, (width - 10) / (heading.length * .62)))
        return <g key={id} className={onTrack ? 'passport-track' : undefined} data-track={id} role={onTrack ? 'button' : undefined} tabIndex={onTrack ? 0 : undefined} aria-label={onTrack ? `Посмотреть данные: ${def.name}` : undefined} onClick={onTrack ? () => onTrack(id) : undefined} onKeyDown={onTrack ? e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onTrack(id) } } : undefined}>
          <defs><clipPath id={clip}><rect x={x + 1} y={TOP} width={width - 2} height={height} /></clipPath></defs>
          <rect className="passport-track-header" x={x} y="174" width={width} height="39" fill="#f5f7fa" stroke="#98a7b5" />
          <text x={x + width / 2} y="190" textAnchor="middle" fontWeight="bold" fontSize={headingSize}><title>{def.name}</title>{heading}</text>
          <text x={x + width / 2} y="206" textAnchor="middle" fontSize="10" fill={def.color}>{limit ? `0 — ${number(limit, 2)} ${curveLimits[id]?.[1]}` : id === 'ore' ? sourceName : id === 'lithology' ? { summary: 'Сводная', core: 'По керну', logging: 'По каротажу' }[s.lithology] : id === 'core' ? 'Рейс · выход, %' : id === 'samples' ? '№ пробы · U, %' : id === 'radium' ? '№ пробы · Ra, Бк/кг' : id === 'stratigraphy' ? 'Индекс' : 'Ø 90 мм'}</text>
          <rect x={x} y={TOP} width={width} height={height} fill="white" stroke="#98a7b5" />
          <g clipPath={`url(#${clip})`}>
            {s.grid && <g stroke="#e5eaf0" strokeWidth=".8">{ticks.map(d => <path key={d} d={`M${x} ${y(d)}h${width}`} />)}{limit && [1, 2, 3].map(i => <path key={i} d={`M${x + width * i / 4} ${TOP}v${height}`} />)}</g>}
            {id === 'lithology' && lithology.filter(l => l.to > range.from && l.from < range.to).map((l, i) => {
              const start = Math.max(range.from, l.from + (s.lithology === 'logging' && i > 0 ? .3 : 0)), end = Math.min(range.to, l.to), h = y(end) - y(start)
              const entry = legend.find(r => r.name === l.label), pattern = entry?.pattern ?? (l.label.startsWith('Песок') ? 'sand' : l.label === 'Глина' ? 'clay' : 'silt')
              return <g key={l.from}><rect x={x} y={y(start)} width={width} height={h} fill={entry?.color ?? l.color} /><rect x={x} y={y(start)} width={width} height={h} fill={pattern === "none" ? "none" : `url(#${uid}-${pattern})`} stroke="#9b9b81" strokeWidth=".5" />{h > 24 && <text x={x + width / 2} y={y(start) + h / 2 + 4} textAnchor="middle" fontSize="10" fill="#5a5745">{entry?.code ?? l.label}</text>}</g>
            })}
            {id === 'stratigraphy' && [{ from: 0, to: 426 + well.offset, label: 'P₂' }, { from: 426 + well.offset, to: 500 + well.offset, label: 'K₂ · мынкудук' }, { from: 500 + well.offset, to: well.depth, label: 'K₁' }].map(l => <g key={l.label}><rect x={x} y={y(l.from)} width={width} height={y(l.to) - y(l.from)} fill={l.label.startsWith('K₂') ? '#f5f0e4' : '#eef1e9'} stroke="#b6b8ac" />{l.to > range.from && l.from < range.to && <text transform={`translate(${x + width / 2},${y((Math.max(range.from, l.from) + Math.min(range.to, l.to)) / 2)}) rotate(-90)`} textAnchor="middle" fontSize="12">{l.label}</text>}</g>)}
            {limit && <path fill="none" stroke={def.color} strokeWidth="1.8" d={Array.from({ length: 241 }, (_, i) => { const d = range.from + (range.to - range.from) * i / 240; return `${i ? 'L' : 'M'}${(x + 5 + Math.min(1, curveValue(id, d, well) / limit) * (width - 10)).toFixed(2)},${y(d).toFixed(2)}` }).join('')} />}
            {id === 'ore' && ores.map(o => <g key={o.from}><rect x={x + width * .2} y={y(o.from)} width={width * .6} height={y(o.to) - y(o.from)} fill={o.color} stroke="#a57029" /><rect x={x + width * .2} y={y(o.from)} width={width * .6} height={y(o.to) - y(o.from)} fill={`url(#${uid}-ore)`} /><text x={x + width / 2} y={y(o.from) - 5} textAnchor="middle" fontSize="10">{number(o.from)}–{number(o.to)}</text><text x={x + width / 2} y={y((o.from + o.to) / 2) + 3} textAnchor="middle" fontWeight="bold" fontSize="11">{o.label}</text><text x={x + width / 2} y={y(o.to) + 12} textAnchor="middle" fontSize="10">m = {number(o.to - o.from)} м</text></g>)}
            {id === 'construction' && <g><rect x={x + width * .25} y={TOP} width={width * .5} height={height} fill={`url(#${uid}-cement)`} /><rect x={x + width * .35} y={TOP} width={width * .3} height={height} fill="#e5eaf1" stroke="#62778c" strokeWidth="1.5" /><rect x={x + width * .35} y={y(442 + well.offset)} width={width * .3} height={y(483 + well.offset) - y(442 + well.offset)} fill="#c0dcdf" stroke="#3e858d" />{Array.from({ length: 19 }, (_, i) => 443 + well.offset + i * 2).map(d => <path key={d} d={`M${x + width * .35} ${y(d)}h${width * .3}`} stroke="#4c8c91" />)}<rect x={x + width * .35} y={y(483 + well.offset)} width={width * .3} height={y(488 + well.offset) - y(483 + well.offset)} fill="#8f9eb1" /><text x={x + width / 2} y={y(430 + well.offset)} textAnchor="middle" fontSize="10">ПНД</text><text x={x + width / 2} y={y(492 + well.offset)} textAnchor="middle" fontSize="10">5 м</text></g>}
            {id === 'core' && Array.from({ length: Math.ceil((range.to - range.from) / 4) + 1 }, (_, i) => Math.floor(range.from / 4) * 4 + i * 4).map((d, i) => <g key={d}><rect x={x + 12} y={y(d)} width={(width - 24) * (.76 + (i % 4) * .05)} height={12 / s.scale * 1000 - 2} fill="#e0cfb5" stroke="#aa8d65" strokeWidth=".6" /><text x={x + 18} y={y(d + 2) + 4} fontSize="10">{i + 1 + Math.floor(range.from / 4)} · {76 + (i % 4) * 5}%</text></g>)}
            {(id === 'samples' || id === 'radium') && Array.from({ length: 20 }, (_, i) => 439 + well.offset + i * 2.5).map((d, i) => <g key={d}><path d={`M${x + 12} ${y(d)}h${width - 24}`} stroke="#d7b9c8" /><circle cx={x + 17} cy={y(d + 1.25)} r="3" fill={i % 5 === 0 ? '#4b829c' : '#b2748d'} /><text x={x + 26} y={y(d + 1.25) + 3} fontSize="10">{i % 5 === 0 ? `М-${i + 1}` : `${101 + i} · ${number(curveValue(id === 'radium' ? 'radium' : 'knd', d, well), id === 'radium' ? 1 : 3)}`}</text></g>)}
          </g>
        </g>
      })}
      <path d={`M${LEFT} ${bottom}H${RIGHT}`} stroke="#98a7b5" />
      {s.legend && <g fontSize="11" fill="#526477"><rect x={LEFT} y="776" width="14" height="10" fill="#f5e8b8" /><text x="56" y="785">Песок</text><rect x="127" y="776" width="14" height="10" fill="#b6c5b6" /><text x="147" y="785">Глина</text><rect x="215" y="776" width="14" height="10" fill="#d7cba8" /><text x="235" y="785">Алевролит</text><rect x="330" y="776" width="14" height="10" fill="#d7a25c" /><text x="350" y="785">Руда</text><rect x="414" y="776" width="14" height="10" fill="#c0dcdf" /><text x="434" y="785">Фильтр</text><rect x="515" y="776" width="14" height="10" fill="#8f9eb1" /><text x="535" y="785">Отстойник</text><text x={RIGHT} y="785" textAnchor="end">ГК: зонд СРП-68 · K = 1,02 · КНД: ИНК-1 · Ø 110 мм</text></g>}
      <text x={LEFT} y="809" fontSize="12">{s.template === 'hydro' ? `Освоение: дебит 12,4 м³/ч · понижение 7,2 м · Кф 8,6 м/сут · откачка 18.10.2026, 24 ч` : `Руда ${sourceName}: ${visibleOres.length} интервала · суммарная мощность ${number(visibleOres.reduce((sum, o) => sum + Math.min(o.to, s.to) - Math.max(o.from, s.from), 0))} м · продуктивный горизонт K₂`}</text>
      {s.note && <text x={LEFT} y="832" fontSize="11" fill="#596a7e">Примечание: {s.note.slice(0, 150)}</text>}
      <path d={`M${LEFT} 846H${RIGHT}`} stroke="#a7b3c0" />
      <text x={LEFT} y="867" fontSize="12">Составил: {s.author || '—'} · {date}</text><text x="680" y="867" fontSize="11" fill="#6b7786">Легенда демонстрационная · целевой СТ НАК 16-2026</text><text x={RIGHT} y="867" textAnchor="end" fontSize="12">{well.name} / {pageNumber}</text>
    </g>
  </svg>
}
