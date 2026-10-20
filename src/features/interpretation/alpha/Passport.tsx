import { alphaDepositNames, alphaWellKindNames } from '../../../entities/interpretation/model/alphaHeader'
import { ALPHA_CALC_VERSION } from '../../../entities/interpretation/model/alphaVersion'
import { useRef, useState } from 'react'
import type { TrackSpec } from '@kapgeo/geo-viz/wellog'
import { domainTokens } from '@kapgeo/geo-viz/tokens'
import type { AlphaDocument } from '../../../entities/interpretation/model/alphaTypes'
import type { InterpretationWell } from '../../../entities/interpretation/model/types'
import { alphaStale } from '../../../entities/interpretation/lib/alphaCalculations'
import { Button } from '../../../shared/ui/Button'
import { defaultAlphaView, loadAlphaViews, styledTracks } from './viewPreferences'
import { alphaColors, alphaTracks } from './tracks'
import { NumberField, SelectField } from './Fields'
import { PassportTracks } from './PassportTracks'
import { alphaExport, resultCsv, saveBlob, svgToJpeg } from './export'

const names = { ore: 'Паспорт рудных интервалов', construction: 'Конструкция и техническое состояние', flow: 'Приложение: расходометрия' }
function basePassportTracks(well: InterpretationWell, doc: AlphaDocument): TrackSpec[] {
  if (doc.passport.template === 'flow') return alphaTracks(well, doc, 'flow', 'result')
  if (doc.passport.template === 'construction') {
    const tracks = [alphaTracks(well, doc, 'current', 'result'), alphaTracks(well, doc, 'thermal', 'result'), alphaTracks(well, doc, 'thermal', 'induction'), alphaTracks(well, doc, 'caliper', 'result')].flat()
    return tracks.filter((t, i) => tracks.findIndex(other => other.id === t.id) === i)
  }
  const order = [doc.parameters.gamma.recordId, doc.parameters.electro.recordId, 'electro', 'kf', 'gamma', 'oxidation', 'current']
  return alphaTracks(well, doc, 'passport', 'result').filter(t => order.includes(t.id)).sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id))
}
function passportTracks(well: InterpretationWell, doc: AlphaDocument) {
  const all = loadAlphaViews(well.id), preference = defaultAlphaView()
  const pages = doc.passport.template === 'ore' ? ['electro', 'gamma'] as const : doc.passport.template === 'construction' ? ['current', 'thermal', 'caliper'] as const : ['flow'] as const
  for (const page of pages) { const view = all[page]; if (view) { Object.assign(preference.scales, view.scales); Object.assign(preference.styles, view.styles); preference.notes.push(...view.notes.map(n => ({ ...n, id: `${page}-${n.id}`, trackId: n.trackId.replace(/^extra-/, '') }))) } }
  return styledTracks(basePassportTracks(well, doc), preference)
}
export function AlphaPassport({ well, doc, disabled, onChange, onPending }: { well: InterpretationWell; doc: AlphaDocument; disabled: boolean; onChange: (doc: AlphaDocument) => void; onPending: (pending: boolean) => void }) {
  const svg = useRef<SVGSVGElement>(null), [p, setParameters] = useState(doc.passport), [error, setError] = useState(''), [busy, setBusy] = useState(false)
  const dirty = JSON.stringify(p) !== JSON.stringify(doc.passport)
  const valid = Number.isFinite(p.from) && Number.isFinite(p.to) && p.to > p.from && p.from >= 0 && p.to <= well.depth && (p.to - p.from) * 1000 / p.scale <= 285
  const current = { ...doc, passport: p }, tracks = passportTracks(well, current)
  const methods = p.template === 'ore' ? ['electro', 'gamma', 'current'] as const : p.template === 'construction' ? ['current', 'thermal', 'metal', 'caliper'] as const : ['electro', 'flow', 'current'] as const
  const stale = methods.filter(key => alphaStale(well, doc, key))
  const patch = (values: Partial<AlphaDocument['passport']>) => { const next = { ...p, ...values }; setParameters(next); onPending(JSON.stringify(next) !== JSON.stringify(doc.passport)) }
  const source = () => new XMLSerializer().serializeToString(svg.current!)
  const raster = async () => { setBusy(true); setError(''); try { saveBlob(await svgToJpeg(source()), `${well.code}-${p.template}-passport.jpg`) } catch (e) { setError((e as Error).message) } finally { setBusy(false) } }
  const apply = () => { try { if (!valid) throw new Error('Задайте диапазон, помещающийся на A3 в выбранном масштабе.'); onChange(current); onPending(false); setError('') } catch (e) { setError((e as Error).message) } }
  const exportable = valid && !dirty && !busy
  const legend: [string, string][] = p.template === 'ore' ? [[alphaColors.ore, 'Баланс'], [alphaColors.offbalance, 'Забаланс'], [alphaColors.technological, 'Тех. забаланс'], [alphaColors.oxidation, 'ЗПО'], [alphaColors.filter, 'Фильтр'], [alphaColors.sump, 'Отстойник']] : p.template === 'construction' ? [[alphaColors.filter, 'Фильтр'], [alphaColors.sump, 'Отстойник'], [alphaColors.cement, 'Цементация'], [alphaColors.project, 'Проект'], [alphaColors.metal, 'Металл']] : [[alphaColors.flow, 'Расход'], [alphaColors.filter, 'Фильтр / секции'], [alphaColors.lowKf, 'Кф 1…<7'], [alphaColors.middleKf, 'Кф 7…12'], [alphaColors.highKf, 'Кф >12']]
  return <section className="alpha-passport"><form className="alpha-passport-settings" onSubmit={e => { e.preventDefault(); apply() }}><fieldset disabled={disabled || busy}>
    <SelectField label="Лист паспорта" value={p.template} onChange={template => patch({ template: template as typeof p.template })} options={Object.entries(names)} />
    <NumberField label="Паспорт: от, м" value={p.from} onChange={from => patch({ from })} /><NumberField label="Паспорт: до, м" value={p.to} onChange={to => patch({ to })} />
    <SelectField label="Масштаб паспорта" value={String(p.scale)} onChange={scale => patch({ scale: Number(scale) })} options={[["200", "1:200"], ["500", "1:500"]]} />
    <label className="alpha-field"><span>Исполнитель</span><input value={p.compiledBy} onChange={e => patch({ compiledBy: e.target.value })} maxLength={70} /></label>
    <label className="alpha-field"><span>Комментарий паспорта</span><input value={p.note} onChange={e => patch({ note: e.target.value })} maxLength={140} /></label>
    {dirty && <div className="alpha-actions"><Button size="sm" type="submit" disabled={!valid}>Применить оформление</Button><Button size="sm" variant="quiet" onClick={() => { setParameters(doc.passport); onPending(false); setError('') }}>Отменить оформление</Button></div>}
  </fieldset></form><div className="alpha-actions">
    <Button disabled={!exportable} size="sm" onClick={() => saveBlob(new Blob([source()], { type: 'image/svg+xml;charset=utf-8' }), `${well.code}-${p.template}-passport.svg`)}>Экспорт SVG</Button>
    <Button disabled={!exportable} size="sm" variant="secondary" onClick={() => void raster()}>{busy ? 'Подготовка JPEG…' : 'Экспорт JPEG'}</Button>
    <Button disabled={!exportable} size="sm" variant="secondary" onClick={() => window.print()}>Печать / PDF</Button>
    <Button size="sm" variant="secondary" onClick={() => saveBlob(new Blob([resultCsv(well, doc, 'gamma', 'result')], { type: 'text/csv;charset=utf-8' }), `${well.code}-ore.csv`)}>Таблица руды CSV</Button>
    <Button size="sm" variant="secondary" onClick={() => saveBlob(new Blob([JSON.stringify(alphaExport(well, doc), null, 2)], { type: 'application/json' }), `${well.code}-parameters-results.json`)}>Параметры и исходные данные</Button>
  </div>
    <p className="alpha-print-hint">A3 · печать 100%, без подгонки и полей браузера. Контрольная линейка — 50 мм. JPEG: 3508×4961 px; физический масштаб проверяйте по линейке.</p>
    {!valid && <p role="alert" className="alpha-alert">Выбранный диапазон не помещается на A3 в масштабе. Уменьшите диапазон или выберите 1:500.</p>}{error && <p role="alert" className="alpha-alert">{error}</p>}{stale.length > 0 && <p className="alpha-notice">В паспорте есть устаревшие результаты: {stale.map(key => ({electro:'ЭК',gamma:'ГК',current:'ТК',thermal:'ТМ',metal:'ИК',caliper:'КМр',flow:'РМ'})[key]).join(', ')}. Пересчитайте зависимые методы перед передачей.</p>}
    {valid && <div className="alpha-passport-paper"><svg ref={svg} xmlns="http://www.w3.org/2000/svg" width="297mm" height="420mm" viewBox="0 0 297 420" role="img" aria-label={`${names[p.template]} A3`} fontFamily="Segoe UI, sans-serif">
      <rect width="297" height="420" fill="white" /><rect x="10" y="10" width="277" height="400" fill="none" stroke={domainTokens.plan.label} strokeWidth="0.3" />
      <text x="148.5" y="22" textAnchor="middle" fontSize="5">{names[p.template].toUpperCase()}</text><text x="148.5" y="30" textAnchor="middle" fontSize="4">Скважина {well.code} · Комплексная интерпретация ГИС</text>
      <text x="16" y="37" fontSize="2.8">{alphaDepositNames[doc.header.deposit]} · {doc.header.horizon.slice(0, 45)}</text><text x="16" y="43" fontSize="2.8">Блок {doc.header.block.slice(0, 25)} · ряд {doc.header.row.slice(0, 20)} · {alphaWellKindNames[doc.header.kind]} · глубина {well.depth} м</text><text x="235" y="43" fontSize="2.8">1:{p.scale}</text>
      <text x="16" y="48" fontSize="3">{p.from}–{p.to} м · {stale.length ? 'Есть устаревшие результаты' : 'Результаты методов'} · Условные обозначения</text>
      <text x="16" y="52" fontSize="2.5">{doc.header.loggedAt} · {doc.header.organization.slice(0, 110)}</text>
      <PassportTracks tracks={tracks} from={p.from} to={p.to} scale={p.scale} />
      <text x="16" y="366" fontSize="3.1">{p.template === 'ore' ? `Руда: ${doc.gamma.rows.length} интервалов · mc: ${doc.gamma.rows.reduce((s, r) => s + r.metro, 0).toFixed(4)} м·%` : p.template === 'flow' ? `Сумма Q: ${doc.flow.rows.reduce((s, r) => s + r.rate, 0).toFixed(3)} м³/час · ${{injection: 'налив', pumping: 'откачка', natural: 'естественные условия'}[doc.parameters.flow.mode]}` : 'ТК · ТМ · ИК · КМр · проектные и фактические интервалы'}
      </text>
      {legend.map(([fill, label], i) => <g key={label}><rect x={16 + i * 44} y="370" width="4" height="3" fill={fill} stroke={domainTokens.plan.axis} strokeWidth="0.15" /><text x={21 + i * 44} y="372.6" fontSize="2.6">{label}</text></g>)}
      <text x="16" y="381" fontSize="2.8">{ALPHA_CALC_VERSION} · Исходные измерения, коэффициенты и таблицы передаются отдельными файлами.</text>
      {[p.note.slice(0, 85), p.note.slice(85)].filter(Boolean).map((line, i) => <text key={i} x="16" y={386 + i * 3.2} fontSize="2.8">{line}</text>)}
      <text x="16" y="399" fontSize="3">Составил: {p.compiledBy.slice(0, 65)}</text><line x1="220" x2="270" y1="398" y2="398" stroke={domainTokens.plan.label} strokeWidth="0.3" /><text x="245" y="405" textAnchor="middle" fontSize="3">Контроль 50 мм</text>
    </svg></div>}
  </section>
}
