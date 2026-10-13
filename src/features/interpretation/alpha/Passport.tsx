import { useRef } from 'react'
import type { TrackSpec } from '@kapgeo/geo-viz/wellog'
import { domainTokens } from '@kapgeo/geo-viz/tokens'
import type { AlphaDocument } from '../../../entities/interpretation/model/alphaTypes'
import type { InterpretationWell } from '../../../entities/interpretation/model/types'
import { Button } from '../../../shared/ui/Button'
import { alphaTracks } from './tracks'
import { NumberField } from './Fields'
import { alphaStale } from '../../../entities/interpretation/lib/alphaCalculations'

function saveBlob(blob: Blob, name: string) { const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000) }
export function AlphaPassport({ well, doc, disabled, onChange }: { well: InterpretationWell; doc: AlphaDocument; disabled: boolean; onChange: (doc: AlphaDocument) => void }) {
  const svg = useRef<SVGSVGElement>(null), p = doc.passport, valid = p.to > p.from && p.from >= 0 && p.to <= well.depth && (p.to - p.from) * 1000 / p.scale <= 285
  const tracks = alphaTracks(well, doc, 'passport', 'result'), stale = (['electro', 'gamma', 'current', 'thermal'] as const).filter(key => alphaStale(well, doc, key))
  const source = () => new XMLSerializer().serializeToString(svg.current!)
  const table = () => {
    const rows = [['Скважина', 'От, м', 'До, м', 'Мощность, м', 'Ra, %', 'U, %', 'mc, м·%', 'Крр', 'Кондиция'], ...doc.gamma.rows.map(r => [well.code, r.from, r.to, r.to - r.from, r.ra, r.uranium, r.metro, r.krr, r.category])]
    saveBlob(new Blob(['\ufeff' + rows.map(row => row.map(v => `"${String(v).replaceAll('"', '""')}"`).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8' }), `${well.code}-ore.csv`)
  }
  return <section className="alpha-passport"><div className="alpha-passport-settings"><fieldset disabled={disabled}><NumberField label="Паспорт: от, м" value={p.from} onChange={v => onChange({ ...doc, passport: { ...p, from: v } })} /><NumberField label="Паспорт: до, м" value={p.to} onChange={v => onChange({ ...doc, passport: { ...p, to: v } })} /><label className="alpha-field"><span>Масштаб паспорта</span><select value={p.scale} onChange={e => onChange({ ...doc, passport: { ...p, scale: Number(e.target.value) } })}><option value={200}>1:200</option><option value={500}>1:500</option></select></label><label className="alpha-field"><span>Исполнитель</span><input value={p.compiledBy} onChange={e => onChange({ ...doc, passport: { ...p, compiledBy: e.target.value } })} /></label></fieldset><div className="alpha-actions"><Button disabled={!valid} size="sm" onClick={() => saveBlob(new Blob([source()], { type: 'image/svg+xml;charset=utf-8' }), `${well.code}-passport.svg`)}>Экспорт SVG</Button><Button disabled={!valid} size="sm" variant="secondary" onClick={() => window.print()}>Печать / PDF</Button><Button size="sm" variant="secondary" onClick={table}>Таблица руды CSV</Button><Button size="sm" variant="secondary" onClick={() => saveBlob(new Blob([JSON.stringify({ well: well.code, ...doc }, null, 2)], { type: 'application/json' }), `${well.code}-parameters-results.json`)}>Параметры и исходные данные</Button></div></div>
    {!valid && <p role="alert" className="alpha-alert">Выбранный диапазон не помещается на A3 в масштабе. Уменьшите диапазон или выберите 1:500.</p>}{stale.length > 0 && <p className="alpha-notice">В паспорте есть устаревшие результаты. Пересчитайте зависимые методы перед передачей.</p>}
    {valid && <div className="alpha-passport-paper"><svg ref={svg} xmlns="http://www.w3.org/2000/svg" width="297mm" height="420mm" viewBox="0 0 297 420" role="img" aria-label="Паспорт рудных интервалов A3">
      <rect width="297" height="420" fill="white" /><rect x="10" y="10" width="277" height="400" fill="none" stroke="#45545e" strokeWidth="0.3" />
      <text x="148.5" y="22" textAnchor="middle" fontSize="5" fontFamily="Segoe UI, sans-serif">ПАСПОРТ РУДНЫХ ИНТЕРВАЛОВ</text><text x="148.5" y="30" textAnchor="middle" fontSize="4">Скважина {well.code} · Комплексная интерпретация ГИС</text><text x="16" y="40" fontSize="3.5">Полигон Северный · глубина {well.depth} м</text><text x="200" y="40" fontSize="3.5">Масштаб 1:{p.scale}</text>
      <text x="16" y="48" fontSize="3">{p.from}–{p.to} м · {stale.length ? 'Есть устаревшие результаты' : 'Результаты методов'}</text>
      <PassportTracks tracks={tracks} from={p.from} to={p.to} scale={p.scale} />
      <text x="16" y="365" fontSize="3.5">Рудные интервалы: {doc.gamma.rows.length} · mc: {doc.gamma.rows.reduce((s, r) => s + r.metro, 0).toFixed(4)} м·%</text>
      <text x="16" y="373" fontSize="3.3">Литология / Кф · ГК / U · фильтр / отстойник · ТМ / цементация</text><text x="16" y="382" fontSize="3">Методика: alpha-prototype-1. Параметры и таблицы передаются отдельными файлами.</text>
      <text x="16" y="394" fontSize="3.5">Составил: {p.compiledBy}</text><line x1="220" x2="270" y1="394" y2="394" stroke="#45545e" strokeWidth="0.3" /><text x="245" y="401" textAnchor="middle" fontSize="3">Контроль 50 мм</text>
    </svg></div>}
  </section>
}
function PassportTracks({ tracks, from, to, scale }: { tracks: TrackSpec[]; from: number; to: number; scale: number }) {
  const full = tracks.reduce((s, t) => s + (t.width ?? 140), 0), height = (to - from) * 1000 / scale, y = (d: number) => 68 + (d - from) * 1000 / scale
  return <g fontFamily="Segoe UI, sans-serif" fontSize="2.6">
    {Array.from({ length: Math.ceil((to - from) / 5) + 1 }, (_, i) => from + i * 5).filter(d => d <= to).map(d => <g key={d}><text x="22" y={y(d) + 1} textAnchor="end">{d.toFixed(0)}</text><line x1="24" x2="280" y1={y(d)} y2={y(d)} stroke="#d6dde2" strokeWidth="0.2" /></g>)}
    {tracks.map((track, index) => {
      const width = (track.width ?? 140) / full * 256, x = 24 + tracks.slice(0, index).reduce((s, t) => s + (t.width ?? 140), 0) / full * 256
      return <g key={track.id}><defs><clipPath id={`passport-track-${index}`}><rect x={x} y="68" width={width} height={height} /></clipPath></defs><rect x={x} y="54" width={width} height={height + 14} fill="none" stroke="#889aa8" strokeWidth="0.2" /><text x={x + width / 2} y="60" textAnchor="middle" fontSize="2.4">{track.title.length > 16 ? track.title.slice(0, 15) : track.title}</text>
        <g clipPath={`url(#passport-track-${index})`}>{track.intervals?.map(r => <g key={r.id}><rect x={x + 0.5} y={y(r.from)} width={width - 1} height={(r.to - r.from) * 1000 / scale} fill={r.fill} fillOpacity="0.65" stroke="#80909a" strokeWidth="0.15" />{r.to - r.from > 1 && <text x={x + width / 2} y={y((r.from + r.to) / 2)} textAnchor="middle" fontSize="2.3">{r.label.slice(0, 12)}</text>}</g>)}
          {track.curves.map(curve => {
            let open = false, path = ''
            for (let i = 0; i < curve.data.depths.length; i++) { const d = curve.data.depths[i]!, v = curve.data.values[i]; if (d < from || d > to || v === undefined || !Number.isFinite(v)) { open = false; continue } const cx = x + Math.max(0, Math.min(width, (v - curve.scale.min) / (curve.scale.max - curve.scale.min) * width)); path += `${open ? 'L' : 'M'}${cx.toFixed(3)},${y(d).toFixed(3)} `; open = true }
            return <path key={curve.id} d={path} fill="none" stroke={curve.color ?? domainTokens.curves[curve.type]} strokeWidth="0.25" />
          })}</g></g>
    })}
  </g>
}
