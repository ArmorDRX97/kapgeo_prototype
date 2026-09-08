import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, CalendarDays, CheckCircle2, FileUp, Gauge, Pencil, Plus, RadioTower, Save, ScanLine, ShieldCheck, Star, Trash2, UserRound, Wrench, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { LogCurve, LogCurveCode, LogRunV2, WellLogWorkspace } from '../../../entities/well-log/model/types'
import type { Well } from '../../../entities/well/model/types'
import { getLogSurveyMetadata, validateBgdWellLogDraft, type BgdWellLogDraft } from '../../../features/geobase/model/bgdWellLog'
import { applyWellLogImport, beginWellLogImport, fetchWellLogWorkspace, saveWellLogWorkspace } from '../../../repository/api'
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
  GR: { label: 'Гамма-каротаж', unit: 'API', range: '0–150', color: '#138b7a', scale: 'linear' },
  SP: { label: 'Потенциал собственной поляризации', unit: 'мВ', range: '−80–40', color: '#3969c8', scale: 'linear' },
  RES: { label: 'Кажущееся сопротивление', unit: 'Ом·м', range: '0–120', color: '#aa6a17', scale: 'log' },
  CALI: { label: 'Кавернометрия', unit: 'мм', range: '80–260', color: '#7c3aed', scale: 'linear' },
}

const editableCurveCodes: Array<keyof typeof curveCatalog> = ['GR', 'SP', 'RES', 'CALI']

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('ru-RU')
}

function logDraft(run: LogRunV2): BgdWellLogDraft {
  return {
    ...getLogSurveyMetadata(run),
    name: run.name,
    source: run.source,
    from: run.from,
    to: run.to,
    step: run.step,
    curveCodes: run.curves.map((curve) => curve.code).filter((code): code is keyof typeof curveCatalog => code in curveCatalog),
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
    comment: '',
    source: 'station',
    from: 0,
    to: well.depth,
    step: 0.2,
    curveCodes: ['GR'],
  }
}

function buildCurves(codes: LogCurveCode[], runId: string, existing: LogCurve[] = []): LogCurve[] {
  return codes.flatMap((code) => {
    if (!(code in curveCatalog)) return []
    const found = existing.find((curve) => curve.code === code)
    if (found) return [found]
    const spec = curveCatalog[code as keyof typeof curveCatalog]
    return [{ id: `CURVE-${runId}-${code}`, code, label: spec.label, unit: spec.unit, scale: spec.scale, color: spec.color, version: 1 }]
  })
}

export function BgdWellLogsTab({ well, canEdit }: { well: Well; canEdit: boolean }) {
  const client = useQueryClient()
  const query = useQuery({ queryKey: ['well-log-v2', well.id], queryFn: () => fetchWellLogWorkspace(well.id) })
  const [selectedId, setSelectedId] = useState('')
  const [editorRun, setEditorRun] = useState<LogRunV2 | 'new' | null>(null)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [notice, setNotice] = useState('')

  const save = useMutation({
    mutationFn: ({ current, next, eventType }: { current: WellLogWorkspace; next: WellLogWorkspace; eventType: string }) => saveWellLogWorkspace(well.id, current, next, eventType),
    onSuccess: (next) => client.setQueryData(['well-log-v2', well.id], next),
  })
  const importDemo = useMutation({
    mutationFn: async (current: WellLogWorkspace) => {
      const parsed = await beginWellLogImport(well.id, current, 'bundled fixture')
      const reviewed = await saveWellLogWorkspace(well.id, parsed, { ...parsed, staging: parsed.staging ? { ...parsed.staging, state: 'qc_ready' } : undefined }, 'log.qc.confirmed')
      return applyWellLogImport(well.id, reviewed)
    },
    onSuccess: (next) => {
      client.setQueryData(['well-log-v2', well.id], next)
      setSelectedId(next.runs.at(-1)?.id ?? '')
      setNotice('Демонстрационный LAS-файл загружен, сопоставлен и добавлен после QC-проверки.')
    },
  })

  const workspace = query.data
  const selected = workspace?.runs.find((run) => run.id === selectedId) ?? workspace?.runs[0]
  const primary = workspace?.runs.find((run) => getLogSurveyMetadata(run).isPrimary)
  const curveCount = useMemo(() => new Set(workspace?.runs.flatMap((run) => run.curves.map((curve) => curve.code)) ?? []).size, [workspace?.runs])
  const error = query.error ?? save.error ?? importDemo.error

  if (query.isLoading || !workspace) return <div className="page-loading page-loading--inline"><span /><p>Загружаем каротажи…</p></div>

  const saveEditor = (draft: BgdWellLogDraft, currentRun: LogRunV2 | 'new') => {
    if (validateBgdWellLogDraft(draft, well.depth).length) return
    const runId = currentRun === 'new' ? `LOGV2-${well.id}-MANUAL-${workspace.version + 1}` : currentRun.id
    const nextRun: LogRunV2 = currentRun === 'new'
      ? { id: runId, name: draft.name.trim(), source: draft.source, from: draft.from, to: draft.to, step: draft.step, status: 'draft', version: 1, curves: buildCurves(draft.curveCodes, runId), rawArtifactId: `RAW-${runId}`, parserProfile: draft.source === 'LAS' ? 'LAS 2.0' : draft.source === 'DAT' ? 'DAT station' : 'station table', survey: { measuredAt: draft.measuredAt, operator: draft.operator.trim(), instrument: draft.instrument.trim(), zone: draft.zone.trim(), isPrimary: draft.isPrimary, comment: draft.comment.trim() } }
      : { ...currentRun, name: draft.name.trim(), source: draft.source, from: draft.from, to: draft.to, step: draft.step, version: currentRun.version + 1, curves: buildCurves(draft.curveCodes, runId, currentRun.curves), parserProfile: draft.source === 'LAS' ? 'LAS 2.0' : draft.source === 'DAT' ? 'DAT station' : 'station table', survey: { measuredAt: draft.measuredAt, operator: draft.operator.trim(), instrument: draft.instrument.trim(), zone: draft.zone.trim(), isPrimary: draft.isPrimary, comment: draft.comment.trim() } }
    const others = workspace.runs.map((run) => draft.isPrimary && run.id !== runId ? { ...run, survey: { ...getLogSurveyMetadata(run), isPrimary: false } } : run)
    const nextRuns = currentRun === 'new' ? [...others, nextRun] : others.map((run) => run.id === runId ? nextRun : run)
    save.mutate({ current: workspace, next: { ...workspace, runs: nextRuns }, eventType: currentRun === 'new' ? 'log.run.created' : 'log.run.updated' }, {
      onSuccess: () => {
        setSelectedId(runId)
        setEditorRun(null)
        setNotice(currentRun === 'new' ? 'Каротаж добавлен в карточку скважины.' : 'Каротаж сохранён как новая версия.')
      },
    })
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
        setViewerOpen(false)
        setNotice('Каротаж удалён. Операция записана в аудит.')
      },
    })
  }

  return <div className="bgd-well-stack bgd-logs-workspace" data-geology-tour="bgd-well-logs">
    {error && <div className="form-alert form-alert--error" role="alert"><AlertTriangle size={17} /><span><strong>Не удалось обновить каротажи</strong>{String(error.message ?? error).split('\n').map((line) => <small key={line}>{line}</small>)}</span></div>}
    {notice && <div className="success-message" role="status"><CheckCircle2 size={17} /><span><strong>Каротажи обновлены</strong>{notice}</span></div>}

    <section className="bgd-log-summary" aria-label="Сводка по каротажам">
      <article><span><RadioTower size={19} /></span><div><strong>{workspace.runs.length}</strong><small>каротажных набора</small></div></article>
      <article><span><ScanLine size={19} /></span><div><strong>{curveCount}</strong><small>типов каналов</small></div></article>
      <article><span><Star size={19} /></span><div><strong>{primary?.name ?? 'Не выбран'}</strong><small>основной каротаж</small></div></article>
      <article><span><Gauge size={19} /></span><div><strong>v{workspace.version}</strong><small>версия workspace</small></div></article>
    </section>

    <div className="bgd-logs-layout">
      <Panel className="bgd-log-registry" title="Каротажи" description="Исследования этой скважины и их состояние." action={<Button size="sm" disabled={!canEdit || save.isPending} onClick={() => setEditorRun('new')}><Plus size={15} /> Добавить</Button>}>
        {workspace.runs.length ? <div className="bgd-log-list">{workspace.runs.map((run) => {
          const survey = getLogSurveyMetadata(run)
          const status = statusPresentation[run.status]
          return <button type="button" key={run.id} className={run.id === selected?.id ? 'is-selected' : ''} onClick={() => { setSelectedId(run.id); setViewerOpen(false) }}>
            <span className="bgd-log-list__icon"><RadioTower size={18} /></span>
            <span><strong>{run.name}</strong><small>{formatDate(survey.measuredAt)} · {survey.instrument}</small><em>{run.from.toLocaleString('ru-RU')}–{run.to.toLocaleString('ru-RU')} м · {run.curves.length} канала</em></span>
            <span className="bgd-log-list__status">{survey.isPrimary && <Star size={14} aria-label="Основной каротаж" />}<Badge tone={status.tone}>{status.label}</Badge></span>
          </button>
        })}</div> : <div className="geobase-empty"><RadioTower size={22} /><strong>Каротажей пока нет</strong><span>Добавьте первый набор вручную или загрузите демонстрационный LAS.</span></div>}
        <div className="bgd-log-import"><span><FileUp size={18} /><span><strong>Импорт каротажа</strong><small>Детерминированный LAS-файл для кликабельного прототипа</small></span></span><Button size="sm" variant="secondary" disabled={!canEdit || importDemo.isPending} onClick={() => importDemo.mutate(workspace)}>{importDemo.isPending ? 'Обрабатываем…' : 'Загрузить демо LAS'}</Button></div>
      </Panel>

      {selected ? <LogInspector
        run={selected}
        canEdit={canEdit}
        pending={save.isPending}
        viewerOpen={viewerOpen}
        onToggleViewer={() => setViewerOpen((current) => !current)}
        onEdit={() => setEditorRun(selected)}
        onPrimary={() => setPrimary(selected)}
        onDelete={() => deleteRun(selected)}
      /> : <Panel className="bgd-log-inspector" title="Сведения о каротаже" description="Выберите или добавьте каротаж."><div className="geobase-empty"><ScanLine size={22} /><strong>Нет выбранного набора</strong><span>Подробности и каналы появятся здесь.</span></div></Panel>}
    </div>

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

function LogInspector({ run, canEdit, pending, viewerOpen, onToggleViewer, onEdit, onPrimary, onDelete }: { run: LogRunV2; canEdit: boolean; pending: boolean; viewerOpen: boolean; onToggleViewer: () => void; onEdit: () => void; onPrimary: () => void; onDelete: () => void }) {
  const survey = getLogSurveyMetadata(run)
  const status = statusPresentation[run.status]
  return <Panel className="bgd-log-inspector" title={run.name} description={`${run.id} · версия ${run.version}`} action={<Badge tone={status.tone} dot>{status.label}</Badge>}>
    <div className="bgd-log-facts">
      <article><CalendarDays size={17} /><span><small>Дата</small><strong>{formatDate(survey.measuredAt)}</strong></span></article>
      <article><UserRound size={17} /><span><small>Оператор</small><strong>{survey.operator}</strong></span></article>
      <article><Wrench size={17} /><span><small>Прибор</small><strong>{survey.instrument}</strong></span></article>
      <article><Gauge size={17} /><span><small>Интервал и шаг</small><strong>{run.from}–{run.to} м · {run.step} м</strong></span></article>
      <article><ScanLine size={17} /><span><small>Зона</small><strong>{survey.zone}</strong></span></article>
      <article><FileUp size={17} /><span><small>Источник</small><strong>{run.source} · {run.parserProfile}</strong></span></article>
    </div>
    <div className="bgd-log-comment"><strong>Комментарий</strong><p>{survey.comment || 'Комментарий не добавлен.'}</p></div>
    <div className="bgd-log-curves" role="table" aria-label="Каналы выбранного каротажа">
      <div className="bgd-log-curves__head" role="row"><span>Канал</span><span>Данные</span><span>Диапазон</span><span>Шкала</span></div>
      {run.curves.map((curve) => {
        const spec = curve.code in curveCatalog ? curveCatalog[curve.code as keyof typeof curveCatalog] : { label: curve.label, unit: curve.unit, range: '—', color: curve.color, scale: curve.scale }
        return <div role="row" key={curve.id}><span role="cell"><i style={{ background: curve.color }} /> <strong>{curve.code}</strong></span><span role="cell">{spec.label}<small>{curve.unit}</small></span><span role="cell">{spec.range} {curve.unit}</span><span role="cell">{curve.scale === 'log' ? 'Логарифмическая' : 'Линейная'}</span></div>
      })}
    </div>
    <div className="bgd-log-inspector__actions">
      <Button size="sm" variant="secondary" onClick={onToggleViewer}><ScanLine size={15} /> {viewerOpen ? 'Скрыть кривые' : 'Показать кривые'}</Button>
      {canEdit && <><Button size="sm" variant="secondary" disabled={pending || survey.isPrimary} onClick={onPrimary}><Star size={15} /> {survey.isPrimary ? 'Основной' : 'Сделать основным'}</Button><Button size="sm" variant="secondary" disabled={pending} onClick={onEdit}><Pencil size={15} /> Изменить</Button><Button size="sm" variant="quiet" disabled={pending} onClick={onDelete}><Trash2 size={15} /> Удалить</Button></>}
    </div>
    {viewerOpen && <LogCurvePreview run={run} />}
  </Panel>
}

function LogCurvePreview({ run }: { run: LogRunV2 }) {
  const [depth, setDepth] = useState(Math.min(run.to, Math.max(run.from, run.from + (run.to - run.from) * .68)))
  const lines = ['M48 0 C20 60 78 120 43 180 S78 300 28 350 S80 465 45 600', 'M70 0 C42 60 78 130 35 200 S75 320 40 420 S69 510 30 600', 'M28 0 C72 70 35 130 75 205 S22 310 68 400 S32 520 66 600', 'M38 0 C60 90 24 150 68 230 S35 350 74 430 S25 520 54 600']
  const ratio = run.to === run.from ? 0 : (depth - run.from) / (run.to - run.from)
  return <section className="bgd-log-viewer" aria-label="Просмотр каротажных кривых">
    <header><span><ScanLine size={16} /> Курсор: <strong>{depth.toFixed(1)} м</strong></span><input aria-label="Глубина просмотра" type="range" min={run.from} max={run.to} step={run.step} value={depth} onChange={(event) => setDepth(Number(event.target.value))} /></header>
    <div className="bgd-log-viewer__canvas" style={{ gridTemplateColumns: `54px repeat(${run.curves.length}, minmax(100px, 1fr))` }}>
      <div className="bgd-log-viewer__ruler">{[0, .25, .5, .75, 1].map((mark) => <span key={mark} style={{ top: `${mark * 100}%` }}>{Math.round(run.from + (run.to - run.from) * mark)} м</span>)}</div>
      {run.curves.map((curve, index) => <div className="bgd-log-viewer__track" key={curve.id}><strong>{curve.code}<small>{curve.label} · {curve.unit}</small></strong><svg viewBox="0 0 100 600" preserveAspectRatio="none"><path stroke={curve.color} d={lines[index % lines.length]} /></svg></div>)}
      <div className="bgd-log-viewer__cursor" style={{ top: `${ratio * 100}%` }}><span>{depth.toFixed(1)} м</span></div>
    </div>
  </section>
}

function LogSurveyDialog({ initial, title, wellDepth, pending, onClose, onSave }: { initial: BgdWellLogDraft; title: string; wellDepth: number; pending: boolean; onClose: () => void; onSave: (draft: BgdWellLogDraft) => void }) {
  const [draft, setDraft] = useState(initial)
  const [errors, setErrors] = useState<string[]>([])
  const update = <Key extends keyof BgdWellLogDraft>(key: Key, value: BgdWellLogDraft[Key]) => setDraft((current) => ({ ...current, [key]: value }))
  const submit = () => {
    const nextErrors = validateBgdWellLogDraft(draft, wellDepth)
    setErrors(nextErrors)
    if (!nextErrors.length) onSave(draft)
  }
  return <div className="geobase-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !pending) onClose() }}>
    <section className="geobase-dialog geobase-dialog--log" role="dialog" aria-modal="true" aria-labelledby="log-editor-title">
      <header><div><span><RadioTower size={20} /></span><div><h2 id="log-editor-title">{title}</h2><p>Сведения об исследовании, интервале и каналах данных.</p></div></div><button type="button" onClick={onClose} disabled={pending} aria-label="Закрыть форму каротажа"><X size={19} /></button></header>
      <div className="geobase-dialog__body bgd-log-form">
        {errors.length > 0 && <div className="form-alert form-alert--error" role="alert"><AlertTriangle size={17} /><span>{errors.map((error) => <small key={error}>{error}</small>)}</span></div>}
        <div className="form-grid bgd-well-form-grid">
          <label className="field bgd-well-form-wide"><span className="field__label">Название каротажа <em>*</em></span><input autoFocus disabled={pending} value={draft.name} onChange={(event) => update('name', event.target.value)} placeholder="Например, Комплекс ГК + ПС" /></label>
          <label className="field"><span className="field__label">Дата <em>*</em></span><input type="date" disabled={pending} value={draft.measuredAt} onChange={(event) => update('measuredAt', event.target.value)} /></label>
          <label className="field"><span className="field__label">Оператор <em>*</em></span><input disabled={pending} value={draft.operator} onChange={(event) => update('operator', event.target.value)} placeholder="ФИО специалиста" /></label>
          <label className="field"><span className="field__label">Прибор <em>*</em></span><input disabled={pending} value={draft.instrument} onChange={(event) => update('instrument', event.target.value)} placeholder="Например, РКС-3" /></label>
          <label className="field"><span className="field__label">Зона</span><input disabled={pending} value={draft.zone} onChange={(event) => update('zone', event.target.value)} /></label>
          <label className="field"><span className="field__label">Источник</span><select disabled={pending} value={draft.source} onChange={(event) => update('source', event.target.value as LogRunV2['source'])}><option value="station">Ручной ввод / станция</option><option value="LAS">LAS</option><option value="DAT">DAT</option></select></label>
          <label className="field"><span className="field__label">От, м <em>*</em></span><input type="number" min="0" step="any" disabled={pending} value={draft.from} onChange={(event) => update('from', Number(event.target.value))} /></label>
          <label className="field"><span className="field__label">До, м <em>*</em></span><input type="number" min="0" step="any" disabled={pending} value={draft.to} onChange={(event) => update('to', Number(event.target.value))} /></label>
          <label className="field"><span className="field__label">Шаг, м <em>*</em></span><input type="number" min="0.01" step="0.01" disabled={pending} value={draft.step} onChange={(event) => update('step', Number(event.target.value))} /></label>
        </div>
        <fieldset className="bgd-log-channel-picker"><legend>Каналы данных <em>*</em></legend>{editableCurveCodes.map((code) => <label key={code}><input type="checkbox" checked={draft.curveCodes.includes(code)} disabled={pending} onChange={(event) => update('curveCodes', event.target.checked ? [...draft.curveCodes, code] : draft.curveCodes.filter((item) => item !== code))} /><span><i style={{ background: curveCatalog[code].color }} /><strong>{code}</strong><small>{curveCatalog[code].label}</small></span></label>)}</fieldset>
        <label className="field"><span className="field__label">Комментарий</span><textarea rows={3} disabled={pending} value={draft.comment} onChange={(event) => update('comment', event.target.value)} placeholder="Уточнения по прибору, качеству или условиям измерения" /></label>
        <label className="bgd-log-primary-check"><input type="checkbox" checked={draft.isPrimary} disabled={pending} onChange={(event) => update('isPrimary', event.target.checked)} /><Star size={16} /><span><strong>Основной каротаж</strong><small>Использовать как приоритетный набор скважины</small></span></label>
      </div>
      <footer><span><ShieldCheck size={15} /> Изменение создаст новую версию и запись аудита.</span><Button variant="secondary" disabled={pending} onClick={onClose}>Отмена</Button><Button disabled={pending} onClick={submit}><Save size={15} /> Сохранить</Button></footer>
    </section>
  </div>
}
