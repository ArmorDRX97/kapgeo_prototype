import { useId } from 'react'
import type { GeologicalInterval } from '../../../entities/well/model/types'
import { columnLithologyCode, type LegendEntry } from '../../../features/geology-data/legend'
import { geochemistryColor } from '../../../shared/scientific/geology/standard16'
import { GeologyHatch } from '../../../shared/ui/GeologyHatch'

export function BgdLithologyColumn({ intervals, depth, legend, selected, onSelect }: {
  intervals: GeologicalInterval[]; depth: number; legend: LegendEntry[]; selected?: string; onSelect: (id: string) => void
}) {
  const uid = useId().replace(/[^a-z0-9-]/gi, '')
  const entries = new Map(legend.map(row => [row.name, row]))
  return <>
    <svg viewBox="0 0 700 360" style={{ width: '100%', height: 360 }} role="img" aria-label="Литологические и геохимические интервалы">
      <defs>
        {legend.map((row, index) => <GeologyHatch key={index} id={`${uid}-rock-${index}`} hatch={row.pattern} background={row.color} />)}
        <GeologyHatch id={`${uid}-unmatched`} hatch="diagonal" background="#ffffff" />
      </defs>
      {intervals.map(row => {
        const entry = entries.get(row.lithology)
        const y = 20 + row.from / depth * 310, height = (row.to - row.from) / depth * 310
        const code = columnLithologyCode(row.lithology, row.lithologyCode, legend)
        const geochemistry = geochemistryColor(row.geochemistryCode)
        return <g key={row.id} role="button" tabIndex={0} aria-label={`Выбрать литологию ${row.from}–${row.to}`}
          onClick={() => onSelect(row.id)} onKeyDown={event => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              onSelect(row.id)
            }
          }}>
          <rect x="90" y={y} width="150" height={height} fill={entry ? `url(#${uid}-rock-${legend.indexOf(entry)})` : '#ffffff'}
            stroke={row.id === selected ? '#243d7c' : '#8e9aaa'} strokeWidth={row.id === selected ? 3 : 1} />
          <text x="4" y={y + 12} fontSize="12">{row.from.toFixed(1)}</text>
          {height > 14 && <text x="250" y={y + 13} fontSize="12">{code ?? '—'} · {row.lithology} · геохимия: {row.geochemistryCode || 'не задана'}</text>}
          {row.geochemistryCode && <rect x="65" y={y} width="18" height={height} fill={geochemistry ?? `url(#${uid}-unmatched)`} stroke="#64748b">
            <title>{row.geochemistryCode} · {geochemistry ? 'СТ НАК 16-2026, таблица 8' : 'Локальный код'}</title>
          </rect>}
        </g>
      })}
    </svg>
    <p className="data-note">Коды пород: таблица 1, графа 5. Слева показана окраска геохимии по таблице 8. Штриховкой отмечены локальные коды.</p>
  </>
}
