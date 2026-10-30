import { useReportUnsavedChanges } from '../../../shared/lib/useReportUnsavedChanges'
import { useModalFocus } from '../../../shared/lib/useModalFocus'
import { domainTokens } from '@kapgeo/geo-viz/tokens'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, FileUp, Pencil, Plus, RadioTower, Save, Star, Trash2, X } from 'lucide-react'
import { useMemo, useRef, useState, type KeyboardEvent } from 'react'
import type { LogCurve, LogCurveCode, LogMeasurementPoint, LogRunV2, WellLogWorkspace } from '../../../entities/well-log/model/types'
import type { Well } from '../../../entities/well/model/types'
import { getLogSurveyMetadata, validateBgdWellLogDraft, type BgdWellLogDraft } from '../../../features/geobase/model/bgdWellLog'
import { fetchWellLogWorkspace, saveWellLogWorkspace } from '../../../repository/api'
import { Badge } from '../../../shared/ui/Badge'
import { Button } from '../../../shared/ui/Button'
import { Panel } from '../../../shared/ui/Panel'

const statusPresentation: Record<LogRunV2['status'], { label: string; tone: 'neutral' | 'warning' | 'info' | 'success' }> = {
  draft: { label: 'Черновик', tone: 'neutral' },
  qc_issues: { label: 'Есть замечания QC', tone: 'warning' },
  qc_passed: { label: 'QC пройден', tone: 'success' },
  review: { label: 'На проверке', tone: 'info' },
}

const curveCatalog: Record<'GR' | 'SP' | 'RES' | 'CALI', { label: string; unit: string; range: string; color: string; scale: LogCurve['scale'] }> = {
  GR: { label: 'Гамма-каротаж', unit: 'API', range: '0–150', color: domainTokens.curves.GR, scale: 'linear' },
  SP: { label: 'Потенциал собственной поляризации', unit: 'мВ', range: '−80–40', color: domainTokens.curves.SP, scale: 'linear' },
  RES: { label: 'Кажущееся сопротивление', unit: 'Ом·м', range: '0–120', color: domainTokens.curves.RS, scale: 'log' },
  CALI: { label: 'Кавернометрия', unit: 'мм', range: '80–260', color: '#7c3aed', scale: 'linear' },
}

const editableCurveCodes: Array<keyof typeof curveCatalog> = ['GR', 'SP', 'RES', 'CALI']

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('ru-RU')
}

function logDraft(run: LogRunV2): BgdWellLogDraft {
  const survey = getLogSurveyMetadata(run)
  return {
    ...survey,
    name: run.name,
    source: run.source,
    from: run.from,
    to: run.to,
    step: run.step,
    curveCodes: run.curves.map((curve) => curve.code).filter((code): code is keyof typeof curveCatalog => code in curveCatalog),
    isControl: survey.isControl ?? false,
    probe: survey.probe ?? '',
    instrumentDiameterCm: survey.instrumentDiameterCm ?? null,
    boreholeDiameterCm: survey.boreholeDiameterCm ?? null,
    detectorLengthCm: survey.detectorLengthCm ?? null,
    ecProbeLengthM: survey.ecProbeLengthM ?? null,
    measurementPointCount: survey.measurementPointCount ?? null,
    drillingFluidDensity: survey.drillingFluidDensity ?? '',
    casingStringType: survey.casingStringType ?? '',
    coefficient: survey.coefficient ?? null,
    valueMultiplier: survey.valueMultiplier ?? null,
  }
}

function emptyLogDraft(well: Well): BgdWellLogDraft {
  return {
    name: 'Гамма-каротаж',
    measuredAt: new Date().toISOString().slice(0, 10),
    operator: '',
    instrument: '',
    zone: 'Ствол скважины',
    isPrimary: false,
    isControl: false,
    comment: '',
    source: 'station',
    from: 0,
    to: well.depth,
    step: 0.2,
    probe: '',
    instrumentDiameterCm: null,
    boreholeDiameterCm: null,
    detectorLengthCm: null,
    ecProbeLengthM: null,
    measurementPointCount: null,
    drillingFluidDensity: '',
    casingStringType: '',
    coefficient: null,
    valueMultiplier: null,
    curveCodes: ['GR'],
  }
}

function demoMeasurements(runId: string, from: number, to: number, step: number, curves: LogCurve[]): LogMeasurementPoint[] {
  const count = Math.min(8, Math.max(1, Math.floor((to - from) / step) + 1))
  return Array.from({ length: count }, (_, index) => {
    const values = Object.fromEntries(curves.map((curve) => {
      const value = curve.code === 'SP' ? -24 + index * 2.3
        : curve.code === 'RES' ? 8.4 + index * 1.75
          : curve.code === 'CALI' ? 142 + ((index * 7) % 23)
            : 34 + ((index * 13) % 47)
      return [curve.id, Number(value.toFixed(2))]
    }))
    return { id: `${runId}-POINT-${index + 1}`, depth: Number((from + index * step).toFixed(2)), values }
  })
}

function formatNumber(value: number | null | undefined, digits = 2) {
  return value === null || value === undefined || !Number.isFinite(value) ? '—' : value.toLocaleString('ru-RU', { maximumFractionDigits: digits })
}

function buildCurves(codes: LogCurveCode[], runId: string, existing: LogCurve[] = []): LogCurve[] {
  return codes.flatMap((code) => {
    if (!(code in curveCatalog)) return []
    const found = existing.find((curve) => curve.code === code)
    if (found) return [found]
    const spec = curveCatalog[code as keyof typeof curveCatalog]
    return [{ id: `CURVE-${runId}-${code}`, code, label: spec.label, unit: spec.unit, scale: spec.scale, color: spec.color, }]
  })
}

export function BgdWellLogsTab({ well, canEdit, onDirtyChange }: { well: Well; canEdit: boolean; onDirtyChange?: (dirty: boolean) => void }) {
  const client = useQueryClient()
  const query = useQuery({ queryKey: ['well-log-v2', well.id], queryFn: () => fetchWellLogWorkspace(well.id) })
  const [selectedId, setSelectedId] = useState('')
  const [editorRun, setEditorRun] = useState<LogRunV2 | 'new' | null>(null)
  useReportUnsavedChanges(Boolean(editorRun), onDirtyChange)
  const [activeList, setActiveList] = useState<'control' | 'all'>('all')
  const controlTabRef = useRef<HTMLButtonElement>(null)
  const allTabRef = useRef<HTMLButtonElement>(null)
  const [notice, setNotice] = useState('')

  const save = useMutation({
    mutationFn: ({ current, next, eventType }: { current: WellLogWorkspace; next: WellLogWorkspace; eventType: string }) => saveWellLogWorkspace(well.id, current, next, eventType),
    onSuccess: (next) => client.setQueryData(['well-log-v2', well.id], next),
  })


  const workspace = query.data
  const controlRuns = useMemo(() => workspace?.runs.filter((run) => getLogSurveyMetadata(run).isControl) ?? [], [workspace?.runs])
  const visibleRuns = activeList === 'control' ? controlRuns : workspace?.runs ?? []
  const selected = visibleRuns.find((run) => run.id === selectedId) ?? visibleRuns[0]
  const error = query.error ?? save.error
  const measurementSource = useMemo(() => selected ? (selected.measurements ?? demoMeasurements(selected.id, selected.from, selected.to, selected.step, selected.curves)) : [], [selected])
  const [measurementDraftState, setMeasurementDraftState] = useState<{ runId: string; points: LogMeasurementPoint[] } | null>(null)
  const measurementDraft = measurementDraftState && measurementDraftState.runId === selected?.id ? measurementDraftState.points : measurementSource
  const measurementDirty = Boolean(selected) && JSON.stringify(measurementDraft) !== JSON.stringify(measurementSource)
  const moveTabFocus = (event: KeyboardEvent<HTMLButtonElement>, current: 'control' | 'all') => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const next = event.key === 'Home' ? 'control' : event.key === 'End' ? 'all' : current === 'control' ? 'all' : 'control'
    if (measurementDirty && next !== activeList) return
    setActiveList(next)
    ;(next === 'control' ? controlTabRef : allTabRef).current?.focus()
  }
  const saveMeasurementDraft = async () => {
    if (!workspace || !selected) return false
    const runs = workspace.runs.map((run) => run.id === selected.id ? { ...run, measurements: measurementDraft } : run)
    await save.mutateAsync({ current: workspace, next: { ...workspace, runs }, eventType: 'log.measurements.updated' })
    setMeasurementDraftState(null)
    setNotice('Результаты измерений сохранены.')
    return true
  }
  const discardMeasurementDraft = () => setMeasurementDraftState(null)
  useReportUnsavedChanges(measurementDirty, undefined, { save: saveMeasurementDraft, discard: discardMeasurementDraft })

  if (query.isLoading || !workspace) return <div className="page-loading page-loading--inline"><span /><p>Загружаем каротажи…</p></div>

  const saveEditor = async (draft: BgdWellLogDraft, currentRun: LogRunV2 | 'new') => {
    if (validateBgdWellLogDraft(draft, well.depth).length) return false
    const runId = currentRun === 'new' ? `LOGV2-${well.id}-MANUAL-${crypto.randomUUID()}` : currentRun.id
    const nextSurvey = { measuredAt: draft.measuredAt, operator: draft.operator.trim(), instrument: draft.instrument.trim(), zone: draft.zone.trim(), isPrimary: draft.isPrimary, isControl: draft.isControl, probe: draft.probe.trim(), instrumentDiameterCm: draft.instrumentDiameterCm, boreholeDiameterCm: draft.boreholeDiameterCm, detectorLengthCm: draft.detectorLengthCm ?? null, ecProbeLengthM: draft.ecProbeLengthM ?? null, measurementPointCount: draft.measurementPointCount ?? null, drillingFluidDensity: (draft.drillingFluidDensity ?? '').trim(), casingStringType: (draft.casingStringType ?? '').trim(), coefficient: draft.coefficient ?? null, valueMultiplier: draft.valueMultiplier ?? null, comment: draft.comment.trim() }
    const nextRun: LogRunV2 = currentRun === 'new'
      ? { id: runId, name: draft.name.trim(), source: draft.source, from: draft.from, to: draft.to, step: draft.step, status: 'draft', curves: buildCurves(draft.curveCodes, runId), measurements: demoMeasurements(runId, draft.from, draft.to, draft.step, buildCurves(draft.curveCodes, runId)), rawArtifactId: `RAW-${runId}`, parserProfile: draft.source === 'LAS' ? 'LAS 2.0' : draft.source === 'DAT' ? 'DAT station' : 'station table', survey: nextSurvey }
      : { ...currentRun, name: draft.name.trim(), source: draft.source, from: draft.from, to: draft.to, step: draft.step, curves: buildCurves(draft.curveCodes, runId, currentRun.curves), measurements: currentRun.measurements ?? demoMeasurements(runId, draft.from, draft.to, draft.step, currentRun.curves), parserProfile: draft.source === 'LAS' ? 'LAS 2.0' : draft.source === 'DAT' ? 'DAT station' : 'station table', survey: nextSurvey }
    const others = workspace.runs.map((run) => draft.isPrimary && run.id !== runId ? { ...run, survey: { ...getLogSurveyMetadata(run), isPrimary: false } } : run)
    const nextRuns = currentRun === 'new' ? [...others, nextRun] : others.map((run) => run.id === runId ? nextRun : run)
    await save.mutateAsync({ current: workspace, next: { ...workspace, runs: nextRuns }, eventType: currentRun === 'new' ? 'log.run.created' : 'log.run.updated' })
    setSelectedId(runId)
    setActiveList('all')
    setEditorRun(null)
    setNotice(currentRun === 'new' ? 'Каротаж добавлен в карточку скважины.' : 'Каротаж сохранён.')
    return true
  }

  const setPrimary = (run: LogRunV2) => {
    const runs = workspace.runs.map((item) => ({ ...item, survey: { ...getLogSurveyMetadata(item), isPrimary: item.id === run.id } }))
    save.mutate({ current: workspace, next: { ...workspace, runs }, eventType: 'log.primary.selected' }, { onSuccess: () => setNotice(`«${run.name}» назначен основным каротажом.`) })
  }

  const deleteRun = (run: LogRunV2) => {
    if (!window.confirm(`Удалить каротаж «${run.name}»?`)) return
    save.mutate({ current: workspace, next: { ...workspace, runs: workspace.runs.filter((item) => item.id !== run.id) }, eventType: 'log.run.deleted' }, {
      onSuccess: (next) => {
        setSelectedId(next.runs[0]?.id ?? '')
        setNotice('Каротаж удалён. Операция записана в аудит.')
      },
    })
  }

  return <div className="bgd-well-stack bgd-logs-workspace">
    {error && <div className="form-alert form-alert--error" role="alert"><AlertTriangle size={17} /><span><strong>Не удалось обновить каротажи</strong>{String(error.message ?? error).split('\n').map((line) => <small key={line}>{line}</small>)}</span></div>}
    {notice && <div className="success-message" role="status"><CheckCircle2 size={17} /><span><strong>Каротажи обновлены</strong>{notice}</span></div>}

    <header className="bgd-log-toolbar">
      <div className="bgd-log-tabs" role="tablist" aria-label="Список каротажей">
        <button ref={controlTabRef} type="button" role="tab" id="bgd-logs-control-tab" aria-controls="bgd-logs-table-panel" aria-selected={activeList === 'control'} tabIndex={activeList === 'control' ? 0 : -1} disabled={measurementDirty && activeList !== 'control'} onKeyDown={(event) => moveTabFocus(event, 'control')} onClick={() => setActiveList('control')}>Контрольные каротажи <span>{controlRuns.length}</span></button>
        <button ref={allTabRef} type="button" role="tab" id="bgd-logs-all-tab" aria-controls="bgd-logs-table-panel" aria-selected={activeList === 'all'} tabIndex={activeList === 'all' ? 0 : -1} disabled={measurementDirty && activeList !== 'all'} onKeyDown={(event) => moveTabFocus(event, 'all')} onClick={() => setActiveList('all')}>Все каротажи <span>{workspace.runs.length}</span></button>
      </div>
      <div className="bgd-log-toolbar__actions">
        <Button size="sm" disabled={!canEdit || save.isPending || measurementDirty} onClick={() => setEditorRun('new')}><Plus size={15} /> Добавить</Button>
        <Button size="sm" variant="secondary" disabled={!canEdit || measurementDirty}><FileUp size={15} /> Загрузить LAS</Button>
      </div>
    </header>

    <div className="bgd-log-table-scroll" id="bgd-logs-table-panel" role="tabpanel" aria-labelledby={activeList === 'control' ? 'bgd-logs-control-tab' : 'bgd-logs-all-tab'}>
      <table className="bgd-log-table" aria-label={activeList === 'control' ? 'Контрольные каротажи скважины' : 'Все каротажи скважины'}>
        <thead><tr><th scope="col">Тип каротажа</th><th scope="col">Дата</th><th scope="col">Оператор</th><th scope="col">Прибор</th><th scope="col">Зонд</th><th scope="col">Основной</th><th scope="col">Глубина, м</th><th scope="col">Шаг, м</th><th scope="col">Множитель значения</th><th scope="col">Коэффициент</th><th scope="col">Комментарий</th><th scope="col">Состояние</th></tr></thead>
        <tbody>{visibleRuns.map((run) => {
          const survey = getLogSurveyMetadata(run)
          const status = statusPresentation[run.status]
          return <tr key={run.id} className={`${run.id === selected?.id ? 'is-selected' : ''} ${measurementDirty && run.id !== selected?.id ? 'is-disabled' : ''}`} aria-selected={run.id === selected?.id} tabIndex={measurementDirty && run.id !== selected?.id ? -1 : 0} onClick={() => { if (!measurementDirty || run.id === selected?.id) setSelectedId(run.id) }} onKeyDown={(event) => { if ((event.key === 'Enter' || event.key === ' ') && (!measurementDirty || run.id === selected?.id)) { event.preventDefault(); setSelectedId(run.id) } }}>
            <th scope="row"><span className="bgd-log-table__select">{run.name}</span><small>{run.id}</small></th>
            <td>{survey.measuredAt ? formatDate(survey.measuredAt) : '—'}</td>
            <td>{survey.operator || '—'}</td>
            <td>{survey.instrument || '—'}</td>
            <td>{survey.probe || '—'}</td>
            <td>{survey.isPrimary ? <span className="bgd-log-main-flag"><Star size={14} /> Да</span> : '—'}</td>
            <td className="is-numeric">{formatNumber(run.to)}</td>
            <td className="is-numeric">{formatNumber(run.step)}</td>
            <td className="is-numeric">{formatNumber(survey.valueMultiplier, 6)}</td>
            <td className="is-numeric">{formatNumber(survey.coefficient, 6)}</td>
            <td><span className="bgd-log-table__comment" title={survey.comment}>{survey.comment || '—'}</span></td>
            <td><Badge tone={status.tone}>{status.label}</Badge></td>
          </tr>
        })}</tbody>
      </table>
      {!visibleRuns.length && <div className="geobase-empty bgd-log-table-empty"><RadioTower size={22} /><strong>{activeList === 'control' ? 'Контрольных каротажей пока нет' : 'Каротажей пока нет'}</strong><span>{activeList === 'control' ? 'Отметьте набор как контрольный при добавлении или редактировании.' : 'Добавьте первый набор каротажа.'}</span></div>}
    </div>

    {selected ? <LogInspector run={selected} measurements={measurementDraft} onMeasurementsChange={(points) => setMeasurementDraftState({ runId: selected.id, points })} onSaveMeasurements={() => { void saveMeasurementDraft() }} onDiscardMeasurements={discardMeasurementDraft} canEdit={canEdit} pending={save.isPending} dirty={measurementDirty} onEdit={() => setEditorRun(selected)} onPrimary={() => setPrimary(selected)} onDelete={() => deleteRun(selected)} /> : <Panel className="bgd-log-inspector" title="Данные измерений" description="Выберите каротаж или добавьте новый."><p className="bgd-log-empty-hint">Результаты измерений появятся здесь в табличном виде.</p></Panel>}

    {editorRun && <LogSurveyDialog
      key={editorRun === 'new' ? 'new' : editorRun.id}
      initial={editorRun === 'new' ? emptyLogDraft(well) : logDraft(editorRun)}
      title={editorRun === 'new' ? 'Добавить каротаж' : 'Редактировать каротаж'}
      wellDepth={well.depth}
      pending={save.isPending}
      onClose={() => setEditorRun(null)}
      onSave={(draft) => saveEditor(draft, editorRun)}
    />}
  </div>
}

function LogInspector({ run, measurements, onMeasurementsChange, onSaveMeasurements, onDiscardMeasurements, canEdit, pending, dirty, onEdit, onPrimary, onDelete }: { run: LogRunV2; measurements: LogMeasurementPoint[]; onMeasurementsChange: (points: LogMeasurementPoint[]) => void; onSaveMeasurements: () => void; onDiscardMeasurements: () => void; canEdit: boolean; pending: boolean; dirty: boolean; onEdit: () => void; onPrimary: () => void; onDelete: () => void }) {
  const survey = getLogSurveyMetadata(run)
  const status = statusPresentation[run.status]
  const updatePoint = (pointId: string, patch: Partial<LogMeasurementPoint>) => onMeasurementsChange(measurements.map((point) => point.id === pointId ? { ...point, ...patch } : point))
  const addPoint = () => {
    const depth = Number(((measurements.at(-1)?.depth ?? run.from - run.step) + run.step).toFixed(2))
    const values = Object.fromEntries(run.curves.map((curve) => [curve.id, null]))
    onMeasurementsChange([...measurements, { id: `${run.id}-POINT-${crypto.randomUUID()}`, depth, values }])
  }
  return <Panel className="bgd-log-inspector" title="Данные выбранного каротажа" description={`${run.name} · ${run.id}`} action={<Badge tone={status.tone} dot>{status.label}</Badge>}>
    <div className="bgd-log-selected-toolbar">
      <span>{survey.isControl ? 'Контрольный набор' : 'Обычный набор'} · {survey.zone || 'Ствол скважины'} · {run.source}</span>
      <div className="bgd-log-inspector__actions">
        {canEdit && <><Button size="sm" variant="secondary" disabled={pending || dirty || survey.isPrimary} onClick={onPrimary}><Star size={15} /> {survey.isPrimary ? 'Основной' : 'Сделать основным'}</Button><Button size="sm" variant="secondary" disabled={pending || dirty} onClick={onEdit}><Pencil size={15} /> Изменить</Button><Button size="sm" variant="quiet" disabled={pending || dirty} onClick={onDelete}><Trash2 size={15} /> Удалить</Button></>}
      </div>
    </div>
    <div className="bgd-log-comment"><strong>Комментарий</strong><p>{survey.comment || 'Комментарий не добавлен.'}</p></div>
    <div className="bgd-log-measurements-toolbar"><span>{measurements.length} точек измерения</span>{canEdit && <div><Button size="sm" variant="secondary" disabled={pending} onClick={addPoint}><Plus size={14} /> Добавить строку</Button><Button size="sm" variant="secondary" disabled={pending || !dirty} onClick={onDiscardMeasurements}>Отменить</Button><Button size="sm" disabled={pending || !dirty} onClick={onSaveMeasurements}><Save size={14} /> Сохранить значения</Button></div>}</div>
    <div className="bgd-log-measurements-scroll">
      <table className="bgd-log-measurements" aria-label={`Измерения каротажа ${run.name}`}>
        <caption>Значения измерений</caption>
        <thead><tr><th scope="col">Глубина, м</th>{run.curves.map((curve) => <th scope="col" key={curve.id}>{curve.code}<small>{curve.unit}</small></th>)}{canEdit && <th scope="col">Действие</th>}</tr></thead>
        <tbody>{measurements.length ? measurements.map((point, index) => <tr key={point.id}>
          <th scope="row" className="is-numeric">{canEdit ? <input aria-label={`Глубина, м, строка ${index + 1}`} type="number" step="any" disabled={pending} value={point.depth} onChange={(event) => { if (event.target.value !== '' && Number.isFinite(Number(event.target.value))) updatePoint(point.id, { depth: Number(event.target.value) }) }} /> : formatNumber(point.depth)}</th>
          {run.curves.map((curve) => <td key={curve.id} className="is-numeric">{canEdit ? <input aria-label={`${curve.code}, строка ${index + 1}`} type="number" step="any" disabled={pending} value={point.values[curve.id] ?? ''} onChange={(event) => { const value = event.target.value; const parsed = value === '' ? null : Number(value); if (parsed === null || Number.isFinite(parsed)) updatePoint(point.id, { values: { ...point.values, [curve.id]: parsed } }) }} /> : formatNumber(point.values[curve.id])}</td>)}
          {canEdit && <td className="bgd-log-row-action"><Button size="sm" variant="quiet" disabled={pending} aria-label={`Удалить строку измерения ${index + 1}`} onClick={() => onMeasurementsChange(measurements.filter((item) => item.id !== point.id))}><Trash2 size={14} /></Button></td>}
        </tr>) : <tr><td className="bgd-log-empty-cell" colSpan={run.curves.length + (canEdit ? 2 : 1)}>Измерения не добавлены. Добавьте строку, чтобы внести первое значение.</td></tr>}</tbody>
      </table>
    </div>
  </Panel>
}

function LogSurveyDialog({ initial, title, wellDepth, pending, onClose, onSave }: { initial: BgdWellLogDraft; title: string; wellDepth: number; pending: boolean; onClose: () => void; onSave: (draft: BgdWellLogDraft) => Promise<boolean> }) {
  const [draft, setDraft] = useState(initial)
  const [errors, setErrors] = useState<string[]>([])
  const update = <Key extends keyof BgdWellLogDraft>(key: Key, value: BgdWellLogDraft[Key]) => setDraft((current) => ({ ...current, [key]: value }))
  const saveDraft = async () => {
    const nextErrors = validateBgdWellLogDraft(draft, wellDepth)
    setErrors(nextErrors)
    if (nextErrors.length) return false
    return onSave(draft)
  }
  useReportUnsavedChanges(JSON.stringify(draft) !== JSON.stringify(initial), undefined, { save: saveDraft, discard: onClose })
  const submit = () => { void saveDraft().catch(() => undefined) }
  const dialogRef = useModalFocus(onClose, pending)

  return <div className="geobase-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !pending) onClose() }}>
    <section ref={dialogRef} className="geobase-dialog geobase-dialog--log" role="dialog" aria-modal="true" aria-labelledby="log-editor-title">
      <header><div><span><RadioTower size={20} /></span><div><h2 id="log-editor-title">{title}</h2><p>Реквизиты набора и параметры замера.</p></div></div><button type="button" onClick={onClose} disabled={pending} aria-label="Закрыть форму каротажа"><X size={19} /></button></header>
      <div className="geobase-dialog__body bgd-log-form">
        {errors.length > 0 && <div className="form-alert form-alert--error" role="alert"><AlertTriangle size={17} /><span>{errors.map((error) => <small key={error}>{error}</small>)}</span></div>}
        <div className="form-grid bgd-well-form-grid">
          <label className="field bgd-well-form-wide"><span className="field__label">Название каротажа <em>*</em></span><input autoFocus disabled={pending} value={draft.name} onChange={(event) => update('name', event.target.value)} placeholder="Например, Комплекс ГК + ПС" /></label>
          <label className="field"><span className="field__label">Дата <em>*</em></span><input type="date" disabled={pending} value={draft.measuredAt} onChange={(event) => update('measuredAt', event.target.value)} /></label>
          <label className="field"><span className="field__label">Оператор <em>*</em></span><input disabled={pending} value={draft.operator} onChange={(event) => update('operator', event.target.value)} placeholder="ФИО специалиста" /></label>
          <label className="field"><span className="field__label">Прибор <em>*</em></span><input disabled={pending} value={draft.instrument} onChange={(event) => update('instrument', event.target.value)} placeholder="Например, РКС-3" /></label>
          <label className="field"><span className="field__label">Зонд</span><input disabled={pending} value={draft.probe} onChange={(event) => update('probe', event.target.value)} placeholder="Тип зонда" maxLength={255} /></label>
          <label className="field"><span className="field__label">Зона</span><input disabled={pending} value={draft.zone} onChange={(event) => update('zone', event.target.value)} /></label>
          <label className="field"><span className="field__label">Источник</span><select disabled={pending} value={draft.source} onChange={(event) => update('source', event.target.value as LogRunV2['source'])}><option value="station">Ручной ввод / станция</option><option value="LAS">LAS</option><option value="DAT">DAT</option></select></label>
          <label className="field"><span className="field__label">Начальная глубина, м <em>*</em></span><input type="number" min="0" step="any" disabled={pending} value={draft.from} onChange={(event) => update('from', Number(event.target.value))} /></label>
          <label className="field"><span className="field__label">Глубина до, м <em>*</em></span><input type="number" min="0" step="any" disabled={pending} value={draft.to} onChange={(event) => update('to', Number(event.target.value))} /></label>
          <label className="field"><span className="field__label">Шаг, м <em>*</em></span><input type="number" min="0.01" step="0.01" disabled={pending} value={draft.step} onChange={(event) => update('step', Number(event.target.value))} /></label>
          <label className="field"><span className="field__label">Множитель значения</span><input type="number" step="any" disabled={pending} value={draft.valueMultiplier ?? ''} onChange={(event) => update('valueMultiplier', event.target.value === '' ? null : Number(event.target.value))} /></label>
          <label className="field"><span className="field__label">Коэффициент</span><input type="number" step="any" disabled={pending} value={draft.coefficient ?? ''} onChange={(event) => update('coefficient', event.target.value === '' ? null : Number(event.target.value))} /></label>
        </div>
        <fieldset className="bgd-log-curve-picker"><legend>Измеряемые кривые <em>*</em></legend>{editableCurveCodes.map((code) => <label key={code}><input type="checkbox" checked={draft.curveCodes.includes(code)} disabled={pending} onChange={(event) => update('curveCodes', event.target.checked ? [...draft.curveCodes, code] : draft.curveCodes.filter((item) => item !== code))} /><span><i style={{ background: curveCatalog[code].color }} /><strong>{code}</strong><small>{curveCatalog[code].label}</small></span></label>)}</fieldset>
        <label className="field"><span className="field__label">Комментарий</span><textarea rows={3} disabled={pending} value={draft.comment} onChange={(event) => update('comment', event.target.value)} placeholder="Уточнения по прибору, качеству или условиям измерения" /></label>
        <label className="bgd-log-primary-check"><input type="checkbox" checked={draft.isPrimary} disabled={pending} onChange={(event) => update('isPrimary', event.target.checked)} /><Star size={16} /><span><strong>Основной каротаж</strong><small>Использовать как приоритетный набор скважины</small></span></label>
        <label className="bgd-log-primary-check"><input type="checkbox" checked={draft.isControl} disabled={pending} onChange={(event) => update('isControl', event.target.checked)} /><span><strong>Контрольный каротаж</strong><small>Показывать набор во вкладке контрольных каротажей</small></span></label>
      </div>
      <footer><Button variant="secondary" disabled={pending} onClick={onClose}>Отмена</Button><Button disabled={pending} onClick={submit}><Save size={15} /> Сохранить</Button></footer>
    </section>
  </div>
}
