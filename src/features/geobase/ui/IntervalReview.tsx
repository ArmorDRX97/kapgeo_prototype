import { useReportUnsavedChanges } from '../../../shared/lib/useReportUnsavedChanges'
import { useState } from 'react'
import { z } from 'zod'
import { Button } from '../../../shared/ui/Button'
import { Panel } from '../../../shared/ui/Panel'
import '../../geology-data/data-workbench.css'

const rowSchema = z.object({ id: z.string(), from: z.number().finite().nonnegative(), to: z.number().finite(), horizon: z.string().min(1), source: z.string(), permeable: z.boolean(), kf: z.number().finite().nonnegative(), lft: z.number().int().nonnegative(), krr: z.number().finite().positive(), uranium: z.number().finite().nonnegative() })
export type ReviewInterval = z.infer<typeof rowSchema>
function validateReviewIntervals(rows: ReviewInterval[], depth: number) {
  const sorted = [...rows].sort((a, b) => a.from - b.from)
  return rows.some(r => !rowSchema.safeParse(r).success || r.to <= r.from || r.to > depth) ? 'Проверьте глубины, горизонт и численные характеристики.' : sorted.some((r, i) => i > 0 && r.from < sorted[i - 1]!.to) ? 'Интервалы перекрываются. Уточните границы.' : ''
}
const demoRows = (depth: number): ReviewInterval[] => [0.67, 0.78, 0.88].map((ratio, i) => ({ id: `AP-${i + 1}`, from: +(depth * ratio).toFixed(2), to: +(depth * (ratio + .045)).toFixed(2), horizon: i < 2 ? 'K₂ · мынкудукский' : 'K₁ · нижний', source: 'Подготовленный пример ГК', permeable: i !== 1, kf: i === 1 ? .03 : 8.2, lft: i === 1 ? 0 : i + 1, krr: 1.05, uranium: .03 + i * .02 }))

/** Independent local examples: no inferred business rules or cross-module propagation. */
export function IntervalReview({ wellId, depth, canEdit, onDirtyChange }: { wellId: string; depth: number; canEdit: boolean; onDirtyChange?: (dirty: boolean) => void }) {
  const key = `kapgeo.interval-review.v1.anomalies.${wellId}`
  const [rows, setRows] = useState<ReviewInterval[]>(() => { try { const p = z.array(rowSchema).max(200).parse(JSON.parse(localStorage.getItem(key) ?? 'null')); return validateReviewIntervals(p, depth) ? demoRows(depth) : p } catch { return demoRows(depth) } })
  const [selected, setSelected] = useState(rows[0]?.id ?? ''), [baseline, setBaseline] = useState(rows), [notice, setNotice] = useState('')
  const row = rows.find(r => r.id === selected), error = validateReviewIntervals(rows, depth), dirty = JSON.stringify(rows) !== JSON.stringify(baseline)
  useReportUnsavedChanges(dirty, onDirtyChange, { discard: () => setRows(baseline), save: async () => { if (error) return false; try { localStorage.setItem(key, JSON.stringify(rows)); setBaseline(rows); return true } catch { setNotice('Не удалось сохранить интервалы'); return false } } })
  const patch = (value: Partial<ReviewInterval>) => { setNotice(''); setRows(rows.map(r => r.id === selected ? { ...r, ...value } : r)) }
  return <div className="data-workbench">
    <Panel title="АП · Аномальные пересечения" description="Локальный демонстрационный пример. Горизонт назначается каждому интервалу вручную; изменения не пересчитывают другие модули.">
      <div className="data-actions"><Button disabled={!canEdit || dirty} onClick={() => { const from = Math.max(0, ...rows.map(r => r.to)); if (from >= depth) return; const r = { ...demoRows(depth)[0]!, id: crypto.randomUUID(), from, to: Math.min(depth, from + 1) }; setRows([...rows, r]); setSelected(r.id) }}>Добавить интервал</Button><Button variant="secondary" disabled={!dirty} onClick={() => { setRows(baseline); setNotice('Изменения отменены') }}>Отменить</Button><Button disabled={!canEdit || !dirty || !!error} onClick={() => { try { localStorage.setItem(key, JSON.stringify(rows)); setBaseline(rows); setNotice('Интервалы сохранены в этом браузере') } catch { setNotice('Не удалось сохранить: локальное хранилище недоступно') } }}>Сохранить интервалы</Button></div>
      {notice && <p role="status">{notice}</p>}{error && <p role="alert">{error}</p>}
      <div className="data-split"><svg className="data-depth-chart" viewBox="0 0 220 440" role="img" aria-label="Интервалы по глубине: выбор открывает свойства">{[0, .25, .5, .75, 1].map(v => <g key={v}><text x="2" y={20 + v * 400}>{(depth * v).toFixed(1)}</text><path d={`M50 ${16 + v * 400}H215`} stroke="#d3dce4" /></g>)}{rows.map(r => <g key={r.id} role="button" tabIndex={0} aria-label={`Выбрать интервал ${r.from}–${r.to}`} onClick={() => setSelected(r.id)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelected(r.id) } }}><rect x="65" y={16 + r.from / depth * 400} width="140" height={Math.max(4, (r.to - r.from) / depth * 400)} fill={r.permeable ? '#b8dfe4' : '#b8b6c6'} stroke={r.id === selected ? '#194b94' : '#67778a'} strokeWidth={r.id === selected ? 3 : 1} /><title>{r.horizon} · {r.from}–{r.to} м</title></g>)}</svg>
      <div className="data-scroll"><table><caption>{rows.length} интервалов · выберите строку</caption><thead><tr>{['Интервал, м', 'Горизонт', 'Породы', 'm, м', 'Кф, м/сут', 'ЛФТ', 'Крр', 'U, %', 'mc, м·%'].map(c => <th key={c}>{c}</th>)}</tr></thead><tbody>{rows.map(r => <tr key={r.id} className={r.id === selected ? 'is-selected' : ''}><td><button onClick={() => setSelected(r.id)}>{r.from}–{r.to}</button></td><td>{r.horizon}</td><td>{r.permeable ? 'Проницаемые' : 'Непроницаемые'}</td><td>{(r.to - r.from).toFixed(2)}</td><td>{r.kf}</td><td>{r.lft}</td><td>{r.krr}</td><td>{r.uranium}</td><td>{((r.to - r.from) * r.uranium).toFixed(4)}</td></tr>)}</tbody></table>{!rows.length && <p>Интервалов нет. Добавьте первый интервал.</p>}</div></div>
    </Panel>
    {row && <Panel title="Свойства выбранного интервала" description={row.source}><fieldset disabled={!canEdit} className="data-fields">{(['from', 'to', 'kf', 'lft', 'krr', 'uranium'] as const).map((name, i) => <label key={name}>{['От, м', 'До, м', 'Кф, м/сут', 'ЛФТ', 'Крр', 'U, %'][i]}<input type="number" step={name === 'lft' ? 1 : 'any'} value={Number.isFinite(row[name]) ? row[name] : ''} onChange={e => patch({ [name]: e.target.valueAsNumber })} /></label>)}<label>Горизонт<input value={row.horizon} maxLength={80} onChange={e => patch({ horizon: e.target.value })} /></label><label>Проницаемость<select value={String(row.permeable)} onChange={e => patch({ permeable: e.target.value === 'true' })}><option value="true">Проницаемые</option><option value="false">Непроницаемые</option></select></label><Button variant="quiet" onClick={() => { setRows(rows.filter(r => r.id !== selected)); setSelected('') }}>Удалить интервал</Button></fieldset></Panel>}
    <p className="data-note">Продуктивность здесь показана как метропроцент mc = m × U. Это подпись демонстрационного показателя, не утверждённая методика подсчёта запасов.</p>
  </div>
}
