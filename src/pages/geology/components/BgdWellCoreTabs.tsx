import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, ChevronRight, FlaskConical, Gauge, Pencil, Plus, Ruler, Save, ShieldCheck, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { coreRecoveryPercent, coreRunLength, type CoreMeasurement, type CoreRun, type CoreSample, type WellCoreWorkspace } from '../../../entities/well-core/model/types'
import { validateCoreMeasurement, validateCoreRun, validateCoreSample } from '../../../entities/well-core/lib/validation'
import type { Well } from '../../../entities/well/model/types'
import { fetchWellCoreWorkspace, saveWellCoreWorkspace } from '../../../repository/api'
import { Badge } from '../../../shared/ui/Badge'
import { Button } from '../../../shared/ui/Button'
import { Panel } from '../../../shared/ui/Panel'

const people = ['Айгерим Садыкова · synthetic', 'Марат Омаров · synthetic', 'Ирина Иванова · synthetic']
const laboratories = ['Лаборатория КАП · synthetic', 'Центральная лаборатория · synthetic', 'Полевая лаборатория · synthetic']
const analytes = [{ code: 'U', unit: '%' }, { code: 'Ra', unit: 'Бк/кг' }, { code: 'Se', unit: 'мг/кг' }, { code: 'V', unit: 'мг/кг' }]

const number = (value: string) => Number.isFinite(Number(value)) ? Number(value) : 0
const nullableNumber = (value: string) => value.trim() === '' ? null : number(value)
const formatDate = (value: string) => value ? new Date(value).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' }) : 'Не указана'
const displayNumber = (value: number) => value.toLocaleString('ru-RU', { maximumFractionDigits: 3 })
const pluralRu = (value: number, one: string, few: string, many: string) => {
  const mod100 = value % 100
  const mod10 = value % 10
  return mod100 >= 11 && mod100 <= 14 ? many : mod10 === 1 ? one : mod10 >= 2 && mod10 <= 4 ? few : many
}

function useCoreWorkspace(well: Well) {
  const client = useQueryClient()
  const query = useQuery({ queryKey: ['well-core', well.id], queryFn: () => fetchWellCoreWorkspace(well.id) })
  const save = useMutation({
    mutationFn: ({ current, next, eventType }: { current: WellCoreWorkspace; next: WellCoreWorkspace; eventType: string }) => saveWellCoreWorkspace(well.id, current, next, eventType),
    onSuccess: (next) => client.setQueryData(['well-core', well.id], next),
  })
  return { query, save }
}

function WorkspaceMessage({ error, notice }: { error: Error | null; notice: string }) {
  return <>
    {error && <div className="form-alert form-alert--error" role="alert"><AlertTriangle size={17} /><span><strong>Не удалось сохранить данные</strong><small>{error.message}</small></span></div>}
    {notice && <div className="success-message" role="status"><CheckCircle2 size={17} /><span><strong>Керновые данные обновлены</strong>{notice}</span></div>}
  </>
}

export function BgdWellCoreRunsTab({ well, canEditRuns, canEditMeasurements }: { well: Well; canEditRuns: boolean; canEditMeasurements: boolean }) {
  const { query, save } = useCoreWorkspace(well)
  const [selectedId, setSelectedId] = useState('')
  const [runDraft, setRunDraft] = useState<CoreRun | null>(null)
  const [measurementDraft, setMeasurementDraft] = useState<CoreMeasurement | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [notice, setNotice] = useState('')
  const workspace = query.data
  const selected = workspace?.runs.find((run) => run.id === selectedId) ?? workspace?.runs[0]
  const requestError = (query.error ?? save.error) as Error | null

  if (query.isLoading || !workspace) return <div className="page-loading page-loading--inline"><span /><p>Загружаем керновые рейсы…</p></div>

  const createRun = () => {
    const nextNumber = Math.max(0, ...workspace.runs.map((run) => Number(run.number) || 0)) + 1
    const start = workspace.runs.length ? Math.max(...workspace.runs.map((run) => run.depthTo)) : 0
    setErrors([])
    setMeasurementDraft(null)
    setRunDraft({ id: `CORE-RUN-${well.id}-DRAFT-${workspace.version + 1}`, number: String(nextNumber), depthFrom: start, depthTo: Math.min(well.depth, start + 1), recoveredLength: 0, measurements: [] })
  }

  const persistRun = () => {
    if (!runDraft) return
    const nextErrors = validateCoreRun(runDraft, workspace.runs, well.depth)
    setErrors(nextErrors)
    if (nextErrors.length) return
    const exists = workspace.runs.some((run) => run.id === runDraft.id)
    const nextRuns = exists ? workspace.runs.map((run) => run.id === runDraft.id ? runDraft : run) : [...workspace.runs, runDraft]
    save.mutate({ current: workspace, next: { ...workspace, runs: nextRuns }, eventType: exists ? 'core.run.updated' : 'core.run.created' }, { onSuccess: () => { setSelectedId(runDraft.id); setRunDraft(null); setNotice(exists ? 'Рейс сохранён как новая версия.' : 'Керновый рейс добавлен.') } })
  }

  const deleteRun = (run: CoreRun) => {
    const measurements = run.measurements.reduce((sum, item) => sum + item.intervals.length, 0)
    const samples = workspace.samples.reduce((sum, sample) => sum + sample.intervals.filter((item) => item.runId === run.id).length, 0)
    if (measurements || samples) {
      setNotice('')
      setErrors([`Удаление заблокировано: связано интервалов промера — ${measurements}, интервалов проб — ${samples}. Сначала удалите зависимые записи.`])
      return
    }
    if (!window.confirm(`Вы действительно хотите удалить данные о керновом рейсе «${run.number}»?`)) return
    save.mutate({ current: workspace, next: { ...workspace, runs: workspace.runs.filter((item) => item.id !== run.id) }, eventType: 'core.run.deleted' }, { onSuccess: (next) => { setSelectedId(next.runs[0]?.id ?? ''); setNotice('Керновый рейс удалён.'); setErrors([]) } })
  }

  const persistMeasurement = () => {
    if (!selected || !measurementDraft) return
    const nextErrors = validateCoreMeasurement(measurementDraft, selected)
    setErrors(nextErrors)
    if (nextErrors.length) return
    const exists = selected.measurements.some((item) => item.id === measurementDraft.id)
    const measurements = exists ? selected.measurements.map((item) => item.id === measurementDraft.id ? measurementDraft : item) : [...selected.measurements, measurementDraft]
    const runs = workspace.runs.map((run) => run.id === selected.id ? { ...run, measurements } : run)
    save.mutate({ current: workspace, next: { ...workspace, runs }, eventType: exists ? 'core.measurement.updated' : 'core.measurement.created' }, { onSuccess: () => { setMeasurementDraft(null); setNotice(exists ? 'Промер керна обновлён.' : 'Промер добавлен к выбранному рейсу.') } })
  }

  const deleteMeasurement = (measurement: CoreMeasurement) => {
    if (!selected || !window.confirm('Удалить промер керна и все его интервалы?')) return
    const runs = workspace.runs.map((run) => run.id === selected.id ? { ...run, measurements: run.measurements.filter((item) => item.id !== measurement.id) } : run)
    save.mutate({ current: workspace, next: { ...workspace, runs }, eventType: 'core.measurement.deleted' }, { onSuccess: () => setNotice('Промер керна удалён.') })
  }

  return <div className="bgd-well-stack bgd-core-workspace" data-geology-tour="bgd-core-runs">
    <WorkspaceMessage error={requestError} notice={notice} />
    {!canEditRuns && !canEditMeasurements && <div className="form-alert"><ShieldCheck size={17} /><span>Раздел открыт только для чтения.</span></div>}
    {errors.length > 0 && <div className="form-alert form-alert--error" role="alert"><AlertTriangle size={17} /><span>{errors.map((error) => <small key={error}>{error}</small>)}</span></div>}
    <div className="bgd-core-layout">
      <Panel className="bgd-core-registry" title="Керновые рейсы" description="Реестр рейсов по глубине бурения." action={canEditRuns && <Button size="sm" disabled={save.isPending} onClick={createRun}><Plus size={15} /> Добавить рейс</Button>}>
        {workspace.runs.length ? <div className="bgd-core-run-list" role="table" aria-label="Керновые рейсы">
          <div className="bgd-core-run-list__head" role="row"><span>Рейс</span><span>Интервал, м</span><span>Выход</span></div>
          {[...workspace.runs].sort((a, b) => a.depthFrom - b.depthFrom).map((run) => <button type="button" role="row" key={run.id} className={run.id === selected?.id && !runDraft ? 'is-selected' : ''} onClick={() => { setSelectedId(run.id); setRunDraft(null); setMeasurementDraft(null); setErrors([]) }}>
            <span role="cell"><strong>№ {run.number}</strong><small>{run.measurements.length} {pluralRu(run.measurements.length, 'промер', 'промера', 'промеров')}</small></span>
            <span role="cell"><strong>{displayNumber(run.depthFrom)}–{displayNumber(run.depthTo)}</strong><small>{displayNumber(coreRunLength(run))} м</small></span>
            <span role="cell"><strong>{displayNumber(coreRecoveryPercent(run))}%</strong><ChevronRight size={16} /></span>
          </button>)}
        </div> : <div className="geobase-empty"><Ruler size={22} /><strong>Рейсов пока нет</strong><span>Добавьте первый керновый рейс.</span></div>}
      </Panel>

      {runDraft ? <RunEditor draft={runDraft} well={well} pending={save.isPending} isNew={!workspace.runs.some((run) => run.id === runDraft.id)} onChange={setRunDraft} onCancel={() => { setRunDraft(null); setErrors([]) }} onSave={persistRun} />
        : selected ? <Panel className="bgd-core-detail" title={`Рейс № ${selected.number}`} description={`${displayNumber(selected.depthFrom)}–${displayNumber(selected.depthTo)} м по буровому журналу`} action={<Badge tone="success" dot>{displayNumber(coreRecoveryPercent(selected))}% выхода</Badge>}>
          <div className="bgd-core-facts">
            <article><small>Длина рейса</small><strong>{displayNumber(coreRunLength(selected))} м</strong></article>
            <article><small>Поднято керна</small><strong>{displayNumber(selected.recoveredLength)} м</strong></article>
            <article><small>Выход керна</small><strong>{displayNumber(coreRecoveryPercent(selected))}%</strong></article>
          </div>
          {canEditRuns && <div className="bgd-core-actions"><Button size="sm" variant="secondary" disabled={save.isPending} onClick={() => { setRunDraft(structuredClone(selected)); setErrors([]) }}><Pencil size={15} /> Изменить рейс</Button><Button size="sm" variant="quiet" disabled={save.isPending} onClick={() => deleteRun(selected)}><Trash2 size={15} /> Удалить</Button></div>}
          <section className="bgd-core-measurements">
            <header><div><span><Gauge size={18} /></span><div><h3>Промер керна</h3><p>Радиометрические интервалы внутри выбранного рейса.</p></div></div>{canEditMeasurements && <Button size="sm" variant="secondary" disabled={save.isPending} onClick={() => { setMeasurementDraft(emptyMeasurement(selected, workspace)); setErrors([]) }}><Plus size={15} /> Добавить промер</Button>}</header>
            {measurementDraft ? <MeasurementEditor run={selected} draft={measurementDraft} pending={save.isPending} onChange={setMeasurementDraft} onCancel={() => { setMeasurementDraft(null); setErrors([]) }} onSave={persistMeasurement} />
              : selected.measurements.length ? <div className="bgd-core-measurement-list">{selected.measurements.map((measurement) => <article key={measurement.id}>
                <div className="bgd-core-measurement-list__title"><span><strong>{measurement.columnType === 'DRILLING' ? 'По бурению' : 'Сводная колонка'}</strong><small>{formatDate(measurement.measurementDate)} · {measurement.operator || 'Оператор не указан'}</small></span>{canEditMeasurements && <span><button type="button" aria-label="Изменить промер" onClick={() => setMeasurementDraft(structuredClone(measurement))}><Pencil size={15} /></button><button type="button" aria-label="Удалить промер" onClick={() => deleteMeasurement(measurement)}><Trash2 size={15} /></button></span>}</div>
                <div className="bgd-core-interval-table"><div><span>Интервал</span><span>Мощность дозы</span></div>{measurement.intervals.map((interval) => <div key={interval.id}><span>{displayNumber(interval.depthFrom)}–{displayNumber(interval.depthTo)} м</span><strong>{interval.doseRate === null ? 'Нет замера' : `${displayNumber(interval.doseRate)} мкР/ч`}</strong></div>)}</div>
                {measurement.note && <p>{measurement.note}</p>}
              </article>)}</div> : <div className="geobase-empty bgd-core-empty"><Gauge size={21} /><strong>Промеров нет</strong><span>Добавление доступно только внутри выбранного рейса.</span></div>}
          </section>
        </Panel> : <Panel title="Карточка рейса" description="Выберите рейс слева."><div className="geobase-empty"><Ruler size={22} /><strong>Нет выбранного рейса</strong></div></Panel>}
    </div>
  </div>
}

function RunEditor({ draft, well, isNew, pending, onChange, onCancel, onSave }: { draft: CoreRun; well: Well; isNew: boolean; pending: boolean; onChange: (value: CoreRun) => void; onCancel: () => void; onSave: () => void }) {
  const update = <Key extends keyof CoreRun>(key: Key, value: CoreRun[Key]) => onChange({ ...draft, [key]: value })
  return <Panel className="bgd-core-detail" title={isNew ? 'Новый керновый рейс' : `Редактирование рейса № ${draft.number}`} description={`Скважина ${well.code} · глубина ${well.depth} м`}>
    <div className="form-grid bgd-well-form-grid">
      <label className="field"><span className="field__label">Номер рейса <em>*</em></span><input autoFocus disabled={pending} value={draft.number} onChange={(event) => update('number', event.target.value)} /></label>
      <label className="field"><span className="field__label">Глубина от, м <em>*</em></span><input type="number" step="0.01" disabled={pending} value={draft.depthFrom} onChange={(event) => update('depthFrom', number(event.target.value))} /></label>
      <label className="field"><span className="field__label">Глубина до, м <em>*</em></span><input type="number" step="0.01" disabled={pending} value={draft.depthTo} onChange={(event) => update('depthTo', number(event.target.value))} /></label>
      <label className="field"><span className="field__label">Выход керна, м <em>*</em></span><input type="number" min="0" step="0.01" disabled={pending} value={draft.recoveredLength} onChange={(event) => update('recoveredLength', number(event.target.value))} /></label>
    </div>
    <div className="bgd-core-calculated"><span><small>Длина рейса</small><strong>{displayNumber(coreRunLength(draft))} м</strong></span><span><small>Выход керна</small><strong>{displayNumber(coreRecoveryPercent(draft))}%</strong></span></div>
    <div className="bgd-core-form-actions"><Button variant="secondary" disabled={pending} onClick={onCancel}>Отмена</Button><Button disabled={pending} onClick={onSave}><Save size={16} /> {pending ? 'Сохраняем…' : 'Сохранить рейс'}</Button></div>
  </Panel>
}

function emptyMeasurement(run: CoreRun, workspace: WellCoreWorkspace): CoreMeasurement {
  return { id: `CORE-MEASURE-${workspace.wellId}-DRAFT-${workspace.version + 1}`, measurementDate: new Date().toISOString().slice(0, 16), operator: '', note: '', columnType: 'DRILLING', intervals: [{ id: `CORE-MEASURE-DEPTH-DRAFT-${workspace.version + 1}`, depthFrom: run.depthFrom, depthTo: Math.min(run.depthTo, run.depthFrom + 0.1), doseRate: null }] }
}

function MeasurementEditor({ run, draft, pending, onChange, onCancel, onSave }: { run: CoreRun; draft: CoreMeasurement; pending: boolean; onChange: (value: CoreMeasurement) => void; onCancel: () => void; onSave: () => void }) {
  const updateInterval = (index: number, patch: Partial<CoreMeasurement['intervals'][number]>) => onChange({ ...draft, intervals: draft.intervals.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item) })
  const addInterval = () => {
    const from = draft.intervals.at(-1)?.depthTo ?? run.depthFrom
    onChange({ ...draft, intervals: [...draft.intervals, { id: `${draft.id}-I${draft.intervals.length + 1}`, depthFrom: from, depthTo: Math.min(run.depthTo, from + 0.1), doseRate: null }] })
  }
  return <div className="bgd-core-inline-editor">
    <div className="form-grid bgd-well-form-grid">
      <label className="field"><span className="field__label">Дата промера</span><input type="datetime-local" disabled={pending} value={draft.measurementDate} onChange={(event) => onChange({ ...draft, measurementDate: event.target.value })} /></label>
      <label className="field"><span className="field__label">Оператор</span><input list="core-people" disabled={pending} value={draft.operator} onChange={(event) => onChange({ ...draft, operator: event.target.value })} /></label>
      <label className="field"><span className="field__label">Колонка привязки <em>*</em></span><select disabled={pending} value={draft.columnType} onChange={(event) => onChange({ ...draft, columnType: event.target.value as CoreMeasurement['columnType'] })}><option value="DRILLING">По бурению</option><option value="COMPOSITE">Сводная колонка</option></select></label>
      <label className="field bgd-well-form-wide"><span className="field__label">Описание промера</span><textarea maxLength={255} disabled={pending} value={draft.note} onChange={(event) => onChange({ ...draft, note: event.target.value })} /></label>
    </div>
    <div className="bgd-core-edit-table"><header><strong>Интервалы промера</strong><small>Границы рейса: {run.depthFrom}–{run.depthTo} м</small></header>{draft.intervals.map((interval, index) => <div key={interval.id}>
      <label><span>От, м</span><input type="number" step="0.01" value={interval.depthFrom} onChange={(event) => updateInterval(index, { depthFrom: number(event.target.value) })} /></label>
      <label><span>До, м</span><input type="number" step="0.01" value={interval.depthTo} onChange={(event) => updateInterval(index, { depthTo: number(event.target.value) })} /></label>
      <label><span>мкР/ч</span><input type="number" min="0" step="0.01" placeholder="Нет замера" value={interval.doseRate ?? ''} onChange={(event) => updateInterval(index, { doseRate: nullableNumber(event.target.value) })} /></label>
      <button type="button" aria-label="Удалить интервал" disabled={draft.intervals.length === 1} onClick={() => onChange({ ...draft, intervals: draft.intervals.filter((_, itemIndex) => itemIndex !== index) })}><X size={15} /></button>
    </div>)}</div>
    <div className="bgd-core-form-actions"><Button size="sm" variant="quiet" onClick={addInterval}><Plus size={15} /> Интервал</Button><span /><Button size="sm" variant="secondary" onClick={onCancel}>Отмена</Button><Button size="sm" disabled={pending} onClick={onSave}><Save size={15} /> Сохранить промер</Button></div>
    <datalist id="core-people">{people.map((person) => <option key={person} value={person} />)}</datalist>
  </div>
}

export function BgdWellCoreSamplesTab({ well, canEdit }: { well: Well; canEdit: boolean }) {
  const { query, save } = useCoreWorkspace(well)
  const [selectedId, setSelectedId] = useState('')
  const [draft, setDraft] = useState<CoreSample | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [notice, setNotice] = useState('')
  const workspace = query.data
  const selected = workspace?.samples.find((sample) => sample.id === selectedId) ?? workspace?.samples[0]
  const requestError = (query.error ?? save.error) as Error | null
  if (query.isLoading || !workspace) return <div className="page-loading page-loading--inline"><span /><p>Загружаем керновые пробы…</p></div>

  const createSample = () => {
    const firstRun = workspace.runs[0]
    setErrors([])
    setDraft({ id: `CORE-SAMPLE-${well.id}-DRAFT-${workspace.version + 1}`, number: `К-${well.code}-${String(workspace.samples.length + 1).padStart(3, '0')}`, sampleType: 'Керновая', samplingDate: new Date().toISOString().slice(0, 16), performer: '', laboratory: '', comment: '', intervals: firstRun ? [{ id: `CORE-SAMPLE-DEPTH-DRAFT-${workspace.version + 1}`, runId: firstRun.id, drillDepthFrom: firstRun.depthFrom, drillDepthTo: Math.min(firstRun.depthTo, firstRun.depthFrom + 0.2), adjustedDepthFrom: null, adjustedDepthTo: null }] : [], results: [] })
  }

  const persist = () => {
    if (!draft) return
    const nextErrors = validateCoreSample(draft, workspace.samples, workspace.runs)
    setErrors(nextErrors)
    if (nextErrors.length) return
    const exists = workspace.samples.some((sample) => sample.id === draft.id)
    const samples = exists ? workspace.samples.map((sample) => sample.id === draft.id ? draft : sample) : [...workspace.samples, draft]
    save.mutate({ current: workspace, next: { ...workspace, samples }, eventType: exists ? 'core.sample.updated' : 'core.sample.created' }, { onSuccess: () => { setSelectedId(draft.id); setDraft(null); setNotice(exists ? 'Керновая проба обновлена.' : 'Керновая проба добавлена.') } })
  }

  const remove = (sample: CoreSample) => {
    if (!window.confirm('Вы действительно хотите удалить данные о керновой пробе? Интервалы и результаты также будут удалены.')) return
    save.mutate({ current: workspace, next: { ...workspace, samples: workspace.samples.filter((item) => item.id !== sample.id) }, eventType: 'core.sample.deleted' }, { onSuccess: (next) => { setSelectedId(next.samples[0]?.id ?? ''); setNotice('Проба, её интервалы и результаты удалены.') } })
  }

  return <div className="bgd-well-stack bgd-core-workspace" data-geology-tour="bgd-core-samples">
    <WorkspaceMessage error={requestError} notice={notice} />
    {!canEdit && <div className="form-alert"><ShieldCheck size={17} /><span>Раздел открыт только для чтения.</span></div>}
    {errors.length > 0 && <div className="form-alert form-alert--error" role="alert"><AlertTriangle size={17} /><span>{errors.map((error) => <small key={error}>{error}</small>)}</span></div>}
    <div className="bgd-core-layout">
      <Panel className="bgd-core-registry" title="Керновые пробы" description="Пробы, интервалы отбора и результаты." action={canEdit && <Button size="sm" disabled={!workspace.runs.length || save.isPending} onClick={createSample}><Plus size={15} /> Добавить пробу</Button>}>
        {!workspace.runs.length && <div className="form-alert"><AlertTriangle size={16} /><span>Для создания пробы сначала добавьте керновый рейс.</span></div>}
        {workspace.samples.length ? <div className="bgd-core-sample-list">{workspace.samples.map((sample) => <button type="button" key={sample.id} className={sample.id === selected?.id && !draft ? 'is-selected' : ''} onClick={() => { setSelectedId(sample.id); setDraft(null); setErrors([]) }}>
          <span><FlaskConical size={18} /></span><span><strong>{sample.number}</strong><small>{sample.sampleType} · {formatDate(sample.samplingDate)}</small><em>{sample.intervals.length} {pluralRu(sample.intervals.length, 'интервал', 'интервала', 'интервалов')} · {sample.laboratory || 'Лаборатория не указана'}</em></span><ChevronRight size={16} />
        </button>)}</div> : <div className="geobase-empty"><FlaskConical size={22} /><strong>Проб пока нет</strong><span>Добавьте первую керновую пробу.</span></div>}
      </Panel>
      {draft ? <SampleEditor draft={draft} runs={workspace.runs} pending={save.isPending} isNew={!workspace.samples.some((sample) => sample.id === draft.id)} onChange={setDraft} onCancel={() => { setDraft(null); setErrors([]) }} onSave={persist} />
        : selected ? <Panel className="bgd-core-detail" title={selected.number} description={`${selected.sampleType} проба · ${formatDate(selected.samplingDate)}`} action={(() => { const count = selected.results.filter((result) => result.value !== null).length; return <Badge tone="info">{count} {pluralRu(count, 'результат', 'результата', 'результатов')}</Badge> })()}>
          <div className="bgd-core-facts"><article><small>Исполнитель</small><strong>{selected.performer || 'Не указан'}</strong></article><article><small>Лаборатория</small><strong>{selected.laboratory || 'Не указана'}</strong></article><article><small>Интервалов</small><strong>{selected.intervals.length}</strong></article></div>
          {selected.comment && <p className="bgd-core-comment">{selected.comment}</p>}
          <CoreSampleData sample={selected} runs={workspace.runs} />
          {canEdit && <div className="bgd-core-actions"><Button size="sm" variant="secondary" onClick={() => { setDraft(structuredClone(selected)); setErrors([]) }}><Pencil size={15} /> Изменить</Button><Button size="sm" variant="quiet" onClick={() => remove(selected)}><Trash2 size={15} /> Удалить</Button></div>}
        </Panel> : <Panel title="Карточка пробы" description="Выберите пробу слева."><div className="geobase-empty"><FlaskConical size={22} /><strong>Нет выбранной пробы</strong></div></Panel>}
    </div>
  </div>
}

function CoreSampleData({ sample, runs }: { sample: CoreSample; runs: CoreRun[] }) {
  return <div className="bgd-core-sample-data">
    <section><h3>Глубины</h3><div className="bgd-core-depths"><div><span>Рейс</span><span>По бурению</span><span>Скорректированная</span></div>{[...sample.intervals].sort((a, b) => a.drillDepthFrom - b.drillDepthFrom).map((interval) => <div key={interval.id}><strong>№ {runs.find((run) => run.id === interval.runId)?.number ?? '—'}</strong><span>{displayNumber(interval.drillDepthFrom)}–{displayNumber(interval.drillDepthTo)} м</span><span>{interval.adjustedDepthFrom === null || interval.adjustedDepthTo === null ? 'Не задана' : `${displayNumber(interval.adjustedDepthFrom)}–${displayNumber(interval.adjustedDepthTo)} м`}</span></div>)}</div></section>
    <section><h3>Результаты</h3>{sample.results.length ? <div className="bgd-core-results"><div><span>Показатель</span><span>Результат</span></div>{sample.results.map((result) => <div key={result.id}><strong>{result.analyte}</strong><span>{result.value === null ? 'Нет замера' : `${result.qualifier}${displayNumber(result.value)} ${result.unit}`}</span></div>)}</div> : <div className="geobase-empty bgd-core-empty"><FlaskConical size={20} /><strong>Результаты не добавлены</strong></div>}</section>
  </div>
}

function SampleEditor({ draft, runs, isNew, pending, onChange, onCancel, onSave }: { draft: CoreSample; runs: CoreRun[]; isNew: boolean; pending: boolean; onChange: (value: CoreSample) => void; onCancel: () => void; onSave: () => void }) {
  const updateInterval = (index: number, patch: Partial<CoreSample['intervals'][number]>) => onChange({ ...draft, intervals: draft.intervals.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item) })
  const updateResult = (index: number, patch: Partial<CoreSample['results'][number]>) => onChange({ ...draft, results: draft.results.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item) })
  return <Panel className="bgd-core-detail" title={isNew ? 'Новая керновая проба' : `Редактирование ${draft.number}`} description="Глубины, параметры отбора и лабораторные результаты.">
    <div className="form-grid bgd-well-form-grid">
      <label className="field"><span className="field__label">Номер пробы <em>*</em></span><input autoFocus value={draft.number} onChange={(event) => onChange({ ...draft, number: event.target.value })} /></label>
      <label className="field"><span className="field__label">Вид пробы <em>*</em></span><select value={draft.sampleType} onChange={(event) => onChange({ ...draft, sampleType: event.target.value as CoreSample['sampleType'] })}><option>Керновая</option><option>Контрольная</option><option>Дубликат</option></select></label>
      <label className="field"><span className="field__label">Дата взятия</span><input type="datetime-local" max={new Date().toISOString().slice(0, 16)} value={draft.samplingDate} onChange={(event) => onChange({ ...draft, samplingDate: event.target.value })} /></label>
      <label className="field"><span className="field__label">Исполнитель</span><input list="core-people" value={draft.performer} onChange={(event) => onChange({ ...draft, performer: event.target.value })} /></label>
      <label className="field"><span className="field__label">Лаборатория</span><select value={draft.laboratory} onChange={(event) => onChange({ ...draft, laboratory: event.target.value })}><option value="">Не выбрана</option>{laboratories.map((laboratory) => <option key={laboratory}>{laboratory}</option>)}</select></label>
      <label className="field bgd-well-form-wide"><span className="field__label">Комментарий</span><textarea maxLength={1000} value={draft.comment} onChange={(event) => onChange({ ...draft, comment: event.target.value })} /></label>
    </div>
    <div className="bgd-core-edit-table bgd-core-edit-table--sample"><header><strong>Глубины отбора</strong><Button size="sm" variant="quiet" onClick={() => { const run = runs[0]; if (run) onChange({ ...draft, intervals: [...draft.intervals, { id: `${draft.id}-I${draft.intervals.length + 1}`, runId: run.id, drillDepthFrom: run.depthFrom, drillDepthTo: Math.min(run.depthTo, run.depthFrom + .2), adjustedDepthFrom: null, adjustedDepthTo: null }] }) }}><Plus size={14} /> Интервал</Button></header>{draft.intervals.map((interval, index) => <div key={interval.id}>
      <label><span>Рейс</span><select value={interval.runId} onChange={(event) => { const run = runs.find((item) => item.id === event.target.value)!; updateInterval(index, { runId: run.id, drillDepthFrom: run.depthFrom, drillDepthTo: Math.min(run.depthTo, run.depthFrom + .2) }) }}>{runs.map((run) => <option key={run.id} value={run.id}>№ {run.number} · {run.depthFrom}–{run.depthTo} м</option>)}</select></label>
      <label><span>По бурению от</span><input type="number" step=".01" value={interval.drillDepthFrom} onChange={(event) => updateInterval(index, { drillDepthFrom: number(event.target.value) })} /></label><label><span>По бурению до</span><input type="number" step=".01" value={interval.drillDepthTo} onChange={(event) => updateInterval(index, { drillDepthTo: number(event.target.value) })} /></label>
      <label><span>Скорр. от</span><input type="number" step=".01" placeholder="—" value={interval.adjustedDepthFrom ?? ''} onChange={(event) => updateInterval(index, { adjustedDepthFrom: nullableNumber(event.target.value) })} /></label><label><span>Скорр. до</span><input type="number" step=".01" placeholder="—" value={interval.adjustedDepthTo ?? ''} onChange={(event) => updateInterval(index, { adjustedDepthTo: nullableNumber(event.target.value) })} /></label>
      <button type="button" aria-label="Удалить интервал" onClick={() => onChange({ ...draft, intervals: draft.intervals.filter((_, itemIndex) => itemIndex !== index) })}><X size={15} /></button>
    </div>)}</div>
    <div className="bgd-core-edit-table bgd-core-edit-table--results"><header><strong>Результаты</strong><Button size="sm" variant="quiet" onClick={() => { const analyte = analytes[0]!; onChange({ ...draft, results: [...draft.results, { id: `${draft.id}-R${draft.results.length + 1}`, analyte: analyte.code, value: null, qualifier: '', unit: analyte.unit }] }) }}><Plus size={14} /> Результат</Button></header>{draft.results.map((result, index) => <div key={result.id}>
      <label><span>Показатель</span><select value={result.analyte} onChange={(event) => { const item = analytes.find((entry) => entry.code === event.target.value)!; updateResult(index, { analyte: item.code, unit: item.unit }) }}>{analytes.map((item) => <option key={item.code}>{item.code}</option>)}</select></label>
      <label><span>Предел</span><select value={result.qualifier} onChange={(event) => updateResult(index, { qualifier: event.target.value as CoreSample['results'][number]['qualifier'] })}><option value="">—</option><option>&lt;</option><option>&gt;</option></select></label>
      <label><span>Значение</span><input type="number" step="any" placeholder="Нет замера" value={result.value ?? ''} onChange={(event) => updateResult(index, { value: nullableNumber(event.target.value) })} /></label><strong>{result.unit}</strong>
      <button type="button" aria-label="Удалить результат" onClick={() => onChange({ ...draft, results: draft.results.filter((_, itemIndex) => itemIndex !== index) })}><X size={15} /></button>
    </div>)}</div>
    <div className="bgd-core-form-actions"><Button variant="secondary" disabled={pending} onClick={onCancel}>Отмена</Button><Button disabled={pending} onClick={onSave}><Save size={16} /> {pending ? 'Сохраняем…' : 'Сохранить пробу'}</Button></div>
    <datalist id="core-people">{people.map((person) => <option key={person} value={person} />)}</datalist>
  </Panel>
}
