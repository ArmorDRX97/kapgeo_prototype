import { useEffect, useState } from 'react'
import type { GeologySection, SectionInterval, SectionLayer } from '../../../entities/geology-section/model/types'
import { sectionWellSources } from '../../../entities/geology-section/model/fixtures'
import { sourceFor } from '../../../entities/geology-section/lib/correlation'
import { repairSection } from '../../../entities/geology-section/lib/repair'
import { Button } from '../../../shared/ui/Button'
import { WorkspaceDialog } from '../../../shared/ui/WorkspaceDialog'
import { nextLocalId } from '../model/presentation'
export function SourceEditor({ section, layer, disabled, onChange, onPending }: { section: GeologySection; layer: SectionLayer; disabled: boolean; onChange: (s: GeologySection) => void; onPending: (pending: boolean) => void }) {
  const [wellId, setWellId] = useState(section.wellIds[0] ?? ''), [draft, setDraft] = useState<SectionInterval[] | null>(null), [preview, setPreview] = useState<ReturnType<typeof repairSection> | null>(null), [error, setError] = useState('')
  useEffect(() => { onPending(!!draft); return () => onPending(false) }, [draft, onPending])
  const well = sectionWellSources.find(w => w.id === wellId), source = well ? sourceFor(section, well) : null, intervals = draft ?? source?.[layer] ?? []
  const previewChanges = () => {
    if (!well || !source || !draft) return
    if (draft.some(i => !Number.isFinite(i.from) || !Number.isFinite(i.to) || i.from < 0 || i.to <= i.from || i.to > well.depth)) { setError('Интервалы должны иметь положительную мощность и лежать внутри ствола.'); return }
    const override = { revision: source.revision + 1, technology: source.technology, ore: source.ore, uncorrected: source.uncorrected, offbalance: source.offbalance, [layer]: draft }
    setPreview(repairSection({ ...section, sourceOverrides: { ...section.sourceOverrides, [well.id]: override } })); setError('')
  }
  return <details><summary>Локальные исходные интервалы и коррекция</summary><p className="section-muted">Редактирование ограничено этим разрезом. Коррекция сохраняет существующие ID и удаляет потерянные связи после предварительного просмотра.</p><label className="section-search">Исходная скважина<select value={wellId} disabled={!!draft} onChange={e => setWellId(e.target.value)}><option value="">Выберите</option>{sectionWellSources.filter(w => section.wellIds.includes(w.id)).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select></label>{source && <p>Ревизия локального источника: {source.revision}</p>}{error && <p role="alert" className="section-error">{error}</p>}
    <div className="section-table-scroll"><table className="section-table"><thead><tr><th>Интервал</th><th>От MD, м</th><th>До MD, м</th><th>Действие</th></tr></thead><tbody>{intervals.map((interval, i) => <tr key={interval.id}><th scope="row">{interval.id}</th>{(['from', 'to'] as const).map(key => <td key={key}><input aria-label={`Источник ${i + 1}, ${key === 'from' ? 'от' : 'до'}`} type="number" value={interval[key]} disabled={disabled} onChange={e => setDraft(intervals.map(a => a.id === interval.id ? { ...a, [key]: Number(e.target.value) } : a))} /></td>)}<td><Button variant="quiet" disabled={disabled} onClick={() => setDraft(intervals.filter(a => a.id !== interval.id))}>Удалить исходный</Button></td></tr>)}</tbody></table></div><div className="section-actions"><Button variant="secondary" disabled={disabled || !well} onClick={() => setDraft([...intervals, { id: nextLocalId(intervals, 'LOCAL'), from: 130, to: 132, kind: layer === 'offbalance' ? 'impermeable' : 'permeable' }])}>Добавить исходный интервал</Button><Button disabled={disabled || !draft} onClick={previewChanges}>Предпросмотр коррекции</Button><Button variant="quiet" disabled={!draft} onClick={() => { setDraft(null); setError('') }}>Отменить исходные правки</Button></div>
    {preview && <WorkspaceDialog title="Последствия изменения источника" onClose={() => setPreview(null)} footer={<><Button variant="secondary" onClick={() => setPreview(null)}>Назад к правкам</Button><Button onClick={() => { onChange(preview.section); setPreview(null); setDraft(null) }}>Применить источник и коррекцию</Button></>}><p>Изменится только «{section.title}», скважина {well?.name}. Литология, окисление и ручные границы сохранятся.</p>{preview.changes.length ? <ul>{preview.changes.map(c => <li key={c}>{c}</li>)}</ul> : <p>Существующие связи остаются валидными. Контуры перестроятся по новым границам интервалов.</p>}<p>Вся операция отменяется одним действием.</p></WorkspaceDialog>}
  </details>
}
