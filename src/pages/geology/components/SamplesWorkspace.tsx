import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Check, ClipboardCheck, FlaskConical, Plus, Save } from 'lucide-react'
import { useMemo, useState } from 'react'
import { validateSamples } from '../../../entities/well/lib/validateSamples'
import { validateLabResults } from '../../../entities/well/lib/validateLabResults'
import type { LabResult, QaStatus, Sample, SampleStatus, SampleType, Well } from '../../../entities/well/model/types'
import { fetchLabResults, fetchWellGeologyData, fetchWellSamples, saveLabResults, saveWellSamples } from '../../../repository/api'
import { Badge } from '../../../shared/ui/Badge'
import { Button } from '../../../shared/ui/Button'
import { Panel } from '../../../shared/ui/Panel'

const types: SampleType[] = ['Керновая', 'Контрольная', 'Пустая', 'Дубликат']
const statuses: SampleStatus[] = ['Черновик', 'Зарегистрирована', 'Отправлена в лабораторию', 'Результат получен']
const statusTone: Record<SampleStatus, 'neutral' | 'info' | 'warning' | 'success'> = { 'Черновик': 'neutral', 'Зарегистрирована': 'info', 'Отправлена в лабораторию': 'warning', 'Результат получен': 'success' }
const qaTone: Record<QaStatus, 'success' | 'warning' | 'danger'> = { 'Принят': 'success', 'На проверке': 'warning', 'Отклонён': 'danger' }

export function SamplesWorkspace({ well }: { well: Well }) {
  const samplesQuery = useQuery({ queryKey: ['well-samples', well.id], queryFn: () => fetchWellSamples(well.id) })
  const geologyQuery = useQuery({ queryKey: ['well-geology', well.id], queryFn: () => fetchWellGeologyData(well.id) })
  const labQuery = useQuery({ queryKey: ['lab-results', well.id], queryFn: () => fetchLabResults(well.id) })
  if (samplesQuery.isLoading || geologyQuery.isLoading || labQuery.isLoading || !samplesQuery.data || !geologyQuery.data || !labQuery.data) return <div className="page-loading page-loading--inline"><span /><p>Загружаем реестр проб…</p></div>
  return <SamplesEditor well={well} initial={samplesQuery.data} intervals={geologyQuery.data.intervals} initialResults={labQuery.data} />
}

function SamplesEditor({ well, initial, intervals, initialResults }: { well: Well; initial: Sample[]; intervals: Awaited<ReturnType<typeof fetchWellGeologyData>>['intervals']; initialResults: LabResult[] }) {
  const [samples, setSamples] = useState(initial)
  const [selectedId, setSelectedId] = useState(initial[0]?.id ?? '')
  const [saved, setSaved] = useState(false)
  const selected = samples.find((item) => item.id === selectedId)
  const issues = useMemo(() => validateSamples(samples, well.depth), [samples, well.depth])
  const selectedIssues = selected ? issues.filter((item) => item.sampleId === selected.id) : []
  const queryClient = useQueryClient()
  const mutation = useMutation({ mutationFn: () => saveWellSamples(well.id, samples), onSuccess: (data) => { queryClient.setQueryData(['well-samples', well.id], data); setSaved(true) } })
  const update = (id: string, patch: Partial<Sample>) => { setSamples((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item)); setSaved(false) }
  const addSample = () => {
    const interval = intervals.find((item) => item.id === selected?.linkedIntervalId) ?? intervals[0]
    const index = samples.length + 1
    const sample: Sample = { id: `SMP-${well.id}-DRAFT-${index}`, number: `${well.code}-DRAFT-${String(index).padStart(2, '0')}`, wellId: well.id, from: interval?.from ?? 0, to: Math.min(interval?.to ?? 2, (interval?.from ?? 0) + 2), type: 'Керновая', status: 'Черновик', purpose: 'Химический анализ', linkedIntervalId: interval?.id, createdAt: 'Только что' }
    setSamples((items) => [...items, sample]); setSelectedId(sample.id); setSaved(false)
  }
  return <div className="object-workspace samples-workspace">
    {saved && <div className="success-banner"><Check size={17} /><span><strong>Реестр проб сохранён</strong>Черновик синхронизирован с цепочкой лабораторной обработки.</span><button type="button" onClick={() => setSaved(false)}>Закрыть</button></div>}
    <div className="samples-workspace__summary"><div><Badge tone="info">GEO-10</Badge><strong>Опробование · {well.code}</strong><span>Каждая проба сохраняет связь с глубинным интервалом и последующей лабораторной цепочкой.</span></div><Button size="sm" onClick={addSample}><Plus size={15} /> Создать пробу</Button></div>
    <div className="samples-layout">
      <Panel title="Цепочка пробы" description="Статус не заменяет QA/QC лабораторного результата">
        <ol className="sample-chain"><li className="is-done"><span>1</span><div><strong>Интервал</strong><small>{selected ? `${selected.from}–${selected.to} м` : '—'}</small></div></li><li className="is-done"><span>2</span><div><strong>Проба</strong><small>{selected?.number ?? '—'}</small></div></li><li className={selected?.status === 'Черновик' ? '' : 'is-done'}><span>3</span><div><strong>Отправка</strong><small>{selected?.status === 'Черновик' ? 'Не зарегистрирована' : selected?.status}</small></div></li><li className={selected?.status === 'Результат получен' ? 'is-done' : ''}><span>4</span><div><strong>Результат и QA/QC</strong><small>{selected?.status === 'Результат получен' ? 'Доступен' : 'Ожидается'}</small></div></li></ol>
      </Panel>
      <div className="samples-layout__main"><Panel title="Реестр проб" description="Номер, интервал, тип и текущее состояние" action={<Badge tone="neutral">{samples.length} шт.</Badge>}>
        <div className="samples-table"><div className="samples-table__head"><span>Проба</span><span>Интервал</span><span>Тип</span><span>Статус</span></div>{samples.map((sample) => <button key={sample.id} type="button" className={sample.id === selectedId ? 'is-selected' : ''} onClick={() => setSelectedId(sample.id)}><span><strong>{sample.number}</strong><small>{sample.purpose}</small></span><span>{sample.from}–{sample.to} м</span><span>{sample.type}</span><span><Badge tone={statusTone[sample.status]}>{sample.status}</Badge></span></button>)}</div>
        {selected && <div className="sample-inspector"><div className="sample-inspector__title"><FlaskConical size={18} /><div><strong>{selected.number}</strong><span>Редактирование регистрации пробы</span></div><Badge tone={statusTone[selected.status]}>{selected.status}</Badge></div><div className="sample-form-grid"><label><span>Номер пробы</span><input value={selected.number} onChange={(event) => update(selected.id, { number: event.target.value })} /></label><label><span>Тип</span><select value={selected.type} onChange={(event) => update(selected.id, { type: event.target.value as SampleType })}>{types.map((item) => <option key={item}>{item}</option>)}</select></label><label><span>От, м</span><input type="number" value={selected.from} onChange={(event) => update(selected.id, { from: Number(event.target.value) })} /></label><label><span>До, м</span><input type="number" value={selected.to} onChange={(event) => update(selected.id, { to: Number(event.target.value) })} /></label><label><span>Связанный интервал</span><select value={selected.linkedIntervalId ?? ''} onChange={(event) => { const interval = intervals.find((item) => item.id === event.target.value); update(selected.id, { linkedIntervalId: interval?.id, from: interval?.from ?? selected.from, to: Math.min(interval?.to ?? selected.to, (interval?.from ?? selected.from) + 2) }) }}>{intervals.map((item) => <option key={item.id} value={item.id}>{item.from}–{item.to} м · {item.lithology}</option>)}</select></label><label><span>Статус</span><select value={selected.status} onChange={(event) => update(selected.id, { status: event.target.value as SampleStatus })}>{statuses.map((item) => <option key={item}>{item}</option>)}</select></label></div>{selectedIssues.length > 0 && <div className="validation-list">{selectedIssues.map((issue) => <div className="validation-item validation-item--error" key={issue.message}><AlertTriangle size={15} /><span>{issue.message}</span></div>)}</div>}</div>}
      </Panel></div>
    </div>
    {selected && <LabResultsWorkspace well={well} sample={selected} initial={initialResults} />}
    <div className="workspace-savebar"><div><strong>{issues.length ? `${issues.length} ошибок регистрации` : 'Реестр проб готов к сохранению'}</strong><span>{issues.length ? 'Исправьте номер или границы интервала.' : 'Номера уникальны, интервалы лежат в пределах скважины.'}</span></div><Button disabled={issues.length > 0 || mutation.isPending} onClick={() => mutation.mutate()}><Save size={16} /> {mutation.isPending ? 'Сохраняем…' : 'Сохранить черновик'}</Button></div>
  </div>
}

function LabResultsWorkspace({ well, sample, initial }: { well: Well; sample: Sample; initial: LabResult[] }) {
  const [allResults, setAllResults] = useState(initial)
  const [saved, setSaved] = useState(false)
  const queryClient = useQueryClient()
  const results = allResults.filter((item) => item.sampleId === sample.id)
  const issues = useMemo(() => validateLabResults(results), [results])
  const mutation = useMutation({ mutationFn: () => saveLabResults(well.id, allResults), onSuccess: (data) => { queryClient.setQueryData(['lab-results', well.id], data); setSaved(true) } })
  const update = (id: string, patch: Partial<LabResult>) => { setAllResults((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item)); setSaved(false) }
  const add = () => { const id = `LAB-${sample.id}-DRAFT-${results.length + 1}`; setAllResults((items) => [...items, { id, sampleId: sample.id, analyte: 'U', value: 0, unit: 'мг/кг', method: 'ICP-MS · М-24', analyst: 'Д. Аминова', qaStatus: 'На проверке', flag: sample.type === 'Контрольная' ? 'Контрольная' : undefined }]); setSaved(false) }
  return <Panel className="lab-workspace" title="Лабораторные результаты и QA/QC" description={`GEO-11 · ${sample.number}`} action={<Button size="sm" variant="secondary" onClick={add}><Plus size={15} /> Результат</Button>}>
    {saved && <div className="success-banner"><Check size={17} /><span><strong>Результаты сохранены</strong>QA/QC-статус останется видимым в карточке пробы.</span><button type="button" onClick={() => setSaved(false)}>Закрыть</button></div>}
    {results.length ? <div className="lab-results-table"><div className="lab-results-table__head"><span>Показатель</span><span>Значение</span><span>Метод / аналитик</span><span>QA/QC</span></div>{results.map((result) => <div key={result.id}><select aria-label={`Показатель ${result.id}`} value={result.analyte} onChange={(event) => update(result.id, { analyte: event.target.value as LabResult['analyte'], unit: event.target.value === 'pH' ? 'pH' : 'мг/кг' })}><option>U</option><option>Mo</option><option>pH</option></select><span className="lab-results-table__value"><input aria-label={`Значение ${result.id}`} type="number" value={result.value} onChange={(event) => update(result.id, { value: Number(event.target.value) })} /><select aria-label={`Единица ${result.id}`} value={result.unit} onChange={(event) => update(result.id, { unit: event.target.value as LabResult['unit'] })}><option>мг/кг</option><option>pH</option></select></span><span><strong>{result.method}</strong><small>{result.analyst}</small></span><span><Badge tone={qaTone[result.qaStatus]}>{result.qaStatus}</Badge>{result.flag && <small>{result.flag}</small>}</span></div>)}</div> : <div className="empty-result"><ClipboardCheck size={24} /><strong>Результатов ещё нет</strong><span>Добавьте первый результат и отправьте его на QA/QC.</span></div>}
    {issues.length > 0 && <div className="validation-list">{issues.map((issue) => <div key={issue.resultId} className="validation-item validation-item--error"><AlertTriangle size={15} /><span>{issue.message}</span></div>)}</div>}
    <div className="lab-workspace__footer"><span>{sample.type !== 'Керновая' ? `Флаг образца: ${sample.type}` : 'Обычная керновая проба'}</span><Button size="sm" disabled={issues.length > 0 || mutation.isPending} onClick={() => mutation.mutate()}><Save size={15} /> {mutation.isPending ? 'Сохраняем…' : 'Сохранить результаты'}</Button></div>
  </Panel>
}
