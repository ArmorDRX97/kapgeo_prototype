import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Calculator, CalendarDays, CheckCircle2, Compass, FileUp, Gauge, Pencil, Plus, Route, Ruler, ShieldCheck, Star, Trash2, UserRound, Wrench, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { DeviationSurvey, WellDeviationWorkspace } from '../../../entities/well-deviation/model/types'
import type { Well } from '../../../entities/well/model/types'
import { calculateDeviationSurvey, azimuthKindLabels, createDeviationSurveyDraft, deviationSurveyDraft, type DeviationPointDraft, type DeviationSurveyDraft, validateDeviationSurveyDraft } from '../../../features/geobase/model/bgdWellDeviation'
import { fetchWellDeviationWorkspace, saveWellDeviationWorkspace } from '../../../repository/api'
import { Badge } from '../../../shared/ui/Badge'
import { Button } from '../../../shared/ui/Button'
import { Panel } from '../../../shared/ui/Panel'

type DeviationDefaults = {
  trueCorrection: number
  magneticCorrection: number
  minZenithAngle: number
}

const devices = ['ИЭМ-36 №10', 'ИЭМ-36 №15', 'ИЭМ-36 №10 + ИЭМ-36 №15', 'ГИ-42', 'Цифровая каротажная станция']

const formatDateTime = (value: string) => new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
const metric = (value: number | null, unit: string) => value === null ? 'Не рассчитано' : `${value.toLocaleString('ru-RU', { maximumFractionDigits: 3 })} ${unit}`

export function BgdWellDeviationTab({ well, canEdit, canAdminister, defaults }: { well: Well; canEdit: boolean; canAdminister: boolean; defaults: DeviationDefaults }) {
  const client = useQueryClient()
  const query = useQuery({ queryKey: ['well-deviation', well.id], queryFn: () => fetchWellDeviationWorkspace(well.id) })
  const [selectedId, setSelectedId] = useState('')
  const [editorSurvey, setEditorSurvey] = useState<DeviationSurvey | 'new' | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [notice, setNotice] = useState('')

  const save = useMutation({
    mutationFn: ({ current, next, eventType }: { current: WellDeviationWorkspace; next: WellDeviationWorkspace; eventType: string }) => saveWellDeviationWorkspace(well.id, current, next, eventType),
    onSuccess: (next) => {
      client.setQueryData(['well-deviation', well.id], next)
      void client.invalidateQueries({ queryKey: ['well', well.id] })
      void client.invalidateQueries({ queryKey: ['wells'] })
      void client.invalidateQueries({ queryKey: ['demo-audit-events'] })
    },
  })

  const workspace = query.data
  const selected = workspace?.surveys.find((item) => item.id === selectedId) ?? workspace?.surveys[0]
  const primary = workspace?.surveys.find((item) => item.isPrimary)
  const pointCount = useMemo(() => workspace?.surveys.reduce((sum, item) => sum + item.points.length, 0) ?? 0, [workspace?.surveys])
  const error = query.error ?? save.error

  if (query.isLoading || !workspace) return <div className="page-loading page-loading--inline"><span /><p>Загружаем инклинометрию…</p></div>

  const persistSurvey = (draft: DeviationSurveyDraft, currentSurvey: DeviationSurvey | 'new') => {
    const errors = validateDeviationSurveyDraft(draft, well.depth)
    if (errors.length) return errors
    const surveyId = currentSurvey === 'new' ? `DEVIATION-${well.id}-MANUAL-${workspace.version + 1}` : currentSurvey.id
    const points = [...draft.points]
      .sort((left, right) => left.depth - right.depth)
      .map((point, index) => ({
        ...point,
        id: currentSurvey === 'new'
          ? `${surveyId}-POINT-${String(index + 1).padStart(2, '0')}`
          : point.id.startsWith('POINT-DRAFT-')
            ? `${surveyId}-POINT-NEW-${workspace.version + 1}-${String(index + 1).padStart(2, '0')}`
            : point.id,
        dx: null,
        dy: null,
        dz: null,
      }))
    const nextSurvey: DeviationSurvey = {
      id: surveyId,
      wellId: well.id,
      surveyDate: draft.surveyDate,
      azimuthKind: draft.azimuthKind,
      correctionAngle: draft.correctionAngle,
      isPrimary: canAdminister && draft.isPrimary,
      operatorId: draft.operatorId.trim(),
      device: draft.device,
      minZenithAngle: draft.minZenithAngle,
      comment: draft.comment.trim(),
      planDistance: null,
      zenithTopBottom: null,
      bearingTopBottom: null,
      points,
      version: currentSurvey === 'new' ? 1 : currentSurvey.version + 1,
    }
    const others = workspace.surveys.map((item) => nextSurvey.isPrimary && item.id !== surveyId ? { ...item, isPrimary: false } : item)
    const surveys = currentSurvey === 'new' ? [...others, nextSurvey] : others.map((item) => item.id === surveyId ? nextSurvey : item)
    save.mutate({ current: workspace, next: { ...workspace, surveys }, eventType: currentSurvey === 'new' ? 'deviation.survey.created' : 'deviation.survey.updated' }, {
      onSuccess: () => {
        setSelectedId(surveyId)
        setEditorSurvey(null)
        setNotice(currentSurvey === 'new' ? 'Промер добавлен. Выполните расчёт хода ствола.' : 'Промер сохранён. Расчётные значения очищены и требуют пересчёта.')
      },
    })
    return []
  }

  const calculate = (survey: DeviationSurvey) => {
    const calculation = calculateDeviationSurvey({ correctionAngle: survey.correctionAngle, minZenithAngle: survey.minZenithAngle, points: survey.points })
    const updated = { ...survey, ...calculation, calculatedAt: new Date().toISOString(), version: survey.version + 1 }
    save.mutate({ current: workspace, next: { ...workspace, surveys: workspace.surveys.map((item) => item.id === survey.id ? updated : item) }, eventType: 'deviation.calculated' }, {
      onSuccess: () => setNotice(`Промер от ${formatDateTime(survey.surveyDate)} рассчитан методом среднего угла.`),
    })
  }

  const setPrimary = (survey: DeviationSurvey) => {
    save.mutate({ current: workspace, next: { ...workspace, surveys: workspace.surveys.map((item) => ({ ...item, isPrimary: item.id === survey.id })) }, eventType: 'deviation.primary.selected' }, {
      onSuccess: () => setNotice('Основной промер изменён. Он будет использоваться для геометрии ствола скважины.'),
    })
  }

  const deleteSurvey = (survey: DeviationSurvey) => {
    if (!window.confirm(`Удалить промер от ${formatDateTime(survey.surveyDate)} вместе с точками?`)) return
    save.mutate({ current: workspace, next: { ...workspace, surveys: workspace.surveys.filter((item) => item.id !== survey.id) }, eventType: 'deviation.survey.deleted' }, {
      onSuccess: (next) => {
        setSelectedId(next.surveys[0]?.id ?? '')
        setNotice('Промер и связанные точки удалены. Операция записана в аудит.')
      },
    })
  }

  const importFixture = () => {
    const surveyId = `DEVIATION-${well.id}-IMPORT-${workspace.version + 1}`
    const maxDepth = Math.max(50, well.depth)
    const draft: DeviationSurveyDraft = {
      surveyDate: '2026-07-05T08:00', azimuthKind: 'magnetic', correctionAngle: defaults.magneticCorrection,
      isPrimary: false, operatorId: 'Аскар Аскаров · synthetic', device: 'ИЭМ-36 №15', minZenithAngle: defaults.minZenithAngle,
      comment: 'Демонстрационный импорт цифровой каротажной станции.',
      points: [0, .25, .5, .75, 1].map((ratio, index) => ({ id: `${surveyId}-POINT-${index + 1}`, depth: Number((maxDepth * ratio).toFixed(1)), azimuth: [181, 205, 238, 262, 279][index]!, zenithAngle: [.2, .8, 1.3, 1.1, .7][index]! })),
    }
    const calculation = calculateDeviationSurvey(draft)
    const nextSurvey: DeviationSurvey = { ...draft, ...calculation, id: surveyId, wellId: well.id, calculatedAt: new Date().toISOString(), version: 1 }
    save.mutate({ current: workspace, next: { ...workspace, surveys: [...workspace.surveys, nextSurvey] }, eventType: 'deviation.import.applied' }, {
      onSuccess: () => {
        setImportOpen(false)
        setSelectedId(surveyId)
        setNotice('Демонстрационный файл выбран, распознан и импортирован в новый промер.')
      },
    })
  }

  const newDraft = createDeviationSurveyDraft({ correctionAngle: defaults.trueCorrection, minZenithAngle: defaults.minZenithAngle })

  return <div className="bgd-well-stack bgd-deviation-workspace">
    {error && <div className="form-alert form-alert--error" role="alert"><AlertTriangle size={17} /><span><strong>Не удалось обновить инклинометрию</strong>{String(error.message ?? error).split('\n').map((line) => <small key={line}>{line}</small>)}</span></div>}
    {notice && <div className="success-message" role="status"><CheckCircle2 size={17} /><span><strong>Инклинометрия обновлена</strong>{notice}</span></div>}

    <section className="bgd-log-summary" aria-label="Сводка по инклинометрии">
      <article><span><Compass size={19} /></span><div><strong>{workspace.surveys.length}</strong><small>промеров</small></div></article>
      <article><span><Route size={19} /></span><div><strong>{pointCount}</strong><small>точек измерения</small></div></article>
      <article><span><Star size={19} /></span><div><strong>{primary ? formatDateTime(primary.surveyDate) : 'Не выбран'}</strong><small>основной промер</small></div></article>
      <article><span><Gauge size={19} /></span><div><strong>v{workspace.version}</strong><small>версия набора</small></div></article>
    </section>

    <div className="bgd-deviation-layout">
      <Panel className="bgd-deviation-registry" title="Промеры" description="Наборы измерений выбранной скважины." action={canEdit && <Button size="sm" disabled={save.isPending} onClick={() => setEditorSurvey('new')}><Plus size={15} /> Добавить</Button>}>
        {workspace.surveys.length ? <div className="bgd-deviation-list">{workspace.surveys.map((survey) => <button type="button" key={survey.id} className={survey.id === selected?.id ? 'is-selected' : ''} onClick={() => setSelectedId(survey.id)}>
          <span className="bgd-deviation-list__icon"><Compass size={18} /></span>
          <span><strong>{formatDateTime(survey.surveyDate)}</strong><small>{azimuthKindLabels[survey.azimuthKind]} азимут · {survey.device || 'Прибор не указан'}</small><em>{survey.points.length} точек · {survey.planDistance === null ? 'требует расчёта' : `R ${survey.planDistance} м`}</em></span>
          <span className="bgd-deviation-list__badges">{survey.isPrimary && <Badge tone="info"><Star size={12} /> Основной</Badge>}{survey.planDistance === null ? <Badge tone="warning">Не рассчитан</Badge> : <Badge tone="success">Рассчитан</Badge>}</span>
        </button>)}</div> : <div className="geobase-empty"><Compass size={22} /><strong>Промеров пока нет</strong><span>Добавьте первый набор инклинометрических измерений.</span></div>}
        {canAdminister && <div className="bgd-deviation-import"><span><FileUp size={18} /><span><strong>Импорт инклинометрии</strong><small>Макет будущего сценария с детерминированным demo-файлом</small></span></span><Button size="sm" variant="secondary" onClick={() => setImportOpen(true)}>Открыть импорт</Button></div>}
      </Panel>

      {selected ? <DeviationInspector survey={selected} canEdit={canEdit} canAdminister={canAdminister} pending={save.isPending} onCalculate={() => calculate(selected)} onEdit={() => setEditorSurvey(selected)} onPrimary={() => setPrimary(selected)} onDelete={() => deleteSurvey(selected)} /> : <Panel title="Сведения о промере" description="Выберите или добавьте промер."><div className="geobase-empty"><Route size={22} /><strong>Нет выбранного промера</strong><span>Описание, точки и результаты расчёта появятся здесь.</span></div></Panel>}
    </div>

    {editorSurvey && <DeviationSurveyDialog
      key={editorSurvey === 'new' ? 'new' : editorSurvey.id}
      initial={editorSurvey === 'new' ? newDraft : deviationSurveyDraft(editorSurvey)}
      title={editorSurvey === 'new' ? 'Добавить промер' : 'Редактировать промер'}
      wellDepth={well.depth}
      defaults={defaults}
      allowPrimary={canAdminister}
      pending={save.isPending}
      onClose={() => setEditorSurvey(null)}
      onSave={(draft, setErrors) => {
        const errors = persistSurvey(draft, editorSurvey)
        setErrors(errors)
      }}
    />}
    {importOpen && <DeviationImportDialog well={well} pending={save.isPending} onClose={() => setImportOpen(false)} onImport={importFixture} />}
  </div>
}

function DeviationInspector({ survey, canEdit, canAdminister, pending, onCalculate, onEdit, onPrimary, onDelete }: { survey: DeviationSurvey; canEdit: boolean; canAdminister: boolean; pending: boolean; onCalculate: () => void; onEdit: () => void; onPrimary: () => void; onDelete: () => void }) {
  return <Panel className="bgd-deviation-inspector" title={`Промер от ${formatDateTime(survey.surveyDate)}`} description={`${survey.id} · версия ${survey.version}`} action={survey.isPrimary ? <Badge tone="info"><Star size={12} /> Основной</Badge> : undefined}>
    <div className="bgd-log-facts">
      <article><CalendarDays size={17} /><span><small>Дата проведения</small><strong>{formatDateTime(survey.surveyDate)}</strong></span></article>
      <article><Compass size={17} /><span><small>Азимут</small><strong>{azimuthKindLabels[survey.azimuthKind]} · поправка {survey.correctionAngle}°</strong></span></article>
      <article><Gauge size={17} /><span><small>Мин. зенитный угол</small><strong>{survey.minZenithAngle}°</strong></span></article>
      <article><UserRound size={17} /><span><small>Оператор</small><strong>{survey.operatorId || 'Не указан'}</strong></span></article>
      <article><Wrench size={17} /><span><small>Прибор</small><strong>{survey.device || 'Не указан'}</strong></span></article>
      <article><Route size={17} /><span><small>Расчёт</small><strong>{survey.calculatedAt ? formatDateTime(survey.calculatedAt) : 'Требуется'}</strong></span></article>
    </div>
    <div className="bgd-deviation-comment"><strong>Комментарий</strong><p>{survey.comment || 'Комментарий не добавлен.'}</p></div>
    <section className="bgd-deviation-integrals" aria-label="Интегральные характеристики">
      <article><Ruler size={18} /><span><small>R · плановое расстояние</small><strong>{metric(survey.planDistance, 'м')}</strong></span></article>
      <article><Gauge size={18} /><span><small>UK · угол устье—забой</small><strong>{metric(survey.zenithTopBottom, '°')}</strong></span></article>
      <article><Compass size={18} /><span><small>AK · направление устье—забой</small><strong>{metric(survey.bearingTopBottom, '°')}</strong></span></article>
    </section>
    <div className="bgd-deviation-toolbar">
      {canEdit && <Button size="sm" disabled={pending} onClick={onCalculate}><Calculator size={15} /> Рассчитать</Button>}
      {canAdminister && <Button size="sm" variant="secondary" disabled={pending || survey.isPrimary} onClick={onPrimary}><Star size={15} /> {survey.isPrimary ? 'Основной' : 'Сделать основным'}</Button>}
      {canEdit && <Button size="sm" variant="secondary" disabled={pending} onClick={onEdit}><Pencil size={15} /> Изменить</Button>}
      {canAdminister && <Button size="sm" variant="quiet" disabled={pending} onClick={onDelete}><Trash2 size={15} /> Удалить</Button>}
    </div>
    <div className="bgd-deviation-table" role="table" aria-label="Точки инклинометрического промера">
      <div className="bgd-deviation-table__head" role="row"><span>Глубина, м</span><span>Азимут, °</span><span>Зенит, °</span><span>dX, м</span><span>dY, м</span><span>dZ, м</span></div>
      {survey.points.map((point) => <div role="row" key={point.id}><span role="cell"><strong>{point.depth}</strong></span><span role="cell">{point.azimuth}</span><span role="cell">{point.zenithAngle}</span><span role="cell">{point.dx ?? '—'}</span><span role="cell">{point.dy ?? '—'}</span><span role="cell">{point.dz ?? '—'}</span></div>)}
    </div>
  </Panel>
}

function DeviationSurveyDialog({ initial, title, wellDepth, defaults, allowPrimary, pending, onClose, onSave }: { initial: DeviationSurveyDraft; title: string; wellDepth: number; defaults: DeviationDefaults; allowPrimary: boolean; pending: boolean; onClose: () => void; onSave: (draft: DeviationSurveyDraft, setErrors: (errors: string[]) => void) => void }) {
  const [draft, setDraft] = useState(initial)
  const [errors, setErrors] = useState<string[]>([])
  const expectedCorrection = draft.azimuthKind === 'true' ? defaults.trueCorrection : defaults.magneticCorrection
  const correctionMismatch = draft.correctionAngle !== expectedCorrection
  const update = <Key extends keyof DeviationSurveyDraft>(key: Key, value: DeviationSurveyDraft[Key]) => setDraft((current) => ({ ...current, [key]: value }))
  const updatePoint = (id: string, key: keyof Omit<DeviationPointDraft, 'id'>, value: number) => update('points', draft.points.map((item) => item.id === id ? { ...item, [key]: value } : item))
  const addPoint = () => {
    let index = 1
    while (draft.points.some((point) => point.id === `POINT-DRAFT-${index}`)) index += 1
    update('points', [...draft.points, { id: `POINT-DRAFT-${index}`, depth: Math.min(wellDepth, (draft.points.at(-1)?.depth ?? 0) + 25), azimuth: draft.points.at(-1)?.azimuth ?? 0, zenithAngle: draft.points.at(-1)?.zenithAngle ?? 0 }])
  }
  const submit = () => {
    const nextErrors = validateDeviationSurveyDraft(draft, wellDepth)
    setErrors(nextErrors)
    if (!nextErrors.length) onSave(draft, setErrors)
  }
  return <div className="geobase-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !pending) onClose() }}>
    <section className="geobase-dialog geobase-dialog--deviation" role="dialog" aria-modal="true" aria-labelledby="deviation-editor-title">
      <header><div><span><Compass size={20} /></span><div><h2 id="deviation-editor-title">{title}</h2><p>Описание промера и результаты измерений по глубине.</p></div></div><button type="button" onClick={onClose} disabled={pending} aria-label="Закрыть форму промера"><X size={19} /></button></header>
      <div className="geobase-dialog__body bgd-deviation-form">
        {errors.length > 0 && <div className="form-alert form-alert--error" role="alert"><AlertTriangle size={17} /><span>{errors.map((error) => <small key={error}>{error}</small>)}</span></div>}
        <div className="form-grid bgd-well-form-grid">
          <label className="field"><span className="field__label">Дата проведения <em>*</em></span><input autoFocus type="datetime-local" disabled={pending} value={draft.surveyDate} onChange={(event) => update('surveyDate', event.target.value)} /></label>
          <label className="field"><span className="field__label">Тип азимута <em>*</em></span><select disabled={pending} value={draft.azimuthKind} onChange={(event) => update('azimuthKind', event.target.value as DeviationSurveyDraft['azimuthKind'])}><option value="true">Истинный</option><option value="magnetic">Магнитный</option></select></label>
          <label className="field"><span className="field__label">Поправочный угол, ° <em>*</em></span><input type="number" step="any" disabled={pending} value={draft.correctionAngle} onChange={(event) => update('correctionAngle', Number(event.target.value))} /></label>
          <label className="field"><span className="field__label">Мин. зенитный угол, °</span><input type="number" min="0" step="any" disabled={pending} value={draft.minZenithAngle} onChange={(event) => update('minZenithAngle', Number(event.target.value))} /></label>
          <label className="field"><span className="field__label">Оператор</span><input list="bgd-well-people" disabled={pending} value={draft.operatorId} onChange={(event) => update('operatorId', event.target.value)} placeholder="Выберите специалиста" /></label>
          <label className="field"><span className="field__label">Прибор</span><select disabled={pending} value={draft.device} onChange={(event) => update('device', event.target.value)}><option value="">Не выбран</option>{devices.map((device) => <option key={device} value={device}>{device}</option>)}</select></label>
        </div>
        {correctionMismatch && <div className="bgd-deviation-correction"><AlertTriangle size={17} /><span><strong>Поправка отличается от кондиционного лимита</strong><small>Для {draft.azimuthKind === 'true' ? 'истинного' : 'магнитного'} азимута установлено {expectedCorrection}°.</small></span><Button size="sm" variant="secondary" onClick={() => update('correctionAngle', expectedCorrection)}>Подставить {expectedCorrection}°</Button></div>}
        <label className="field"><span className="field__label">Комментарий <small>{draft.comment.length}/255</small></span><textarea rows={2} maxLength={255} disabled={pending} value={draft.comment} onChange={(event) => update('comment', event.target.value)} /></label>
        {allowPrimary && <label className="bgd-deviation-primary-check"><input type="checkbox" checked={draft.isPrimary} disabled={pending} onChange={(event) => update('isPrimary', event.target.checked)} /><Star size={16} /><span><strong>Основной промер</strong><small>Использовать для расчёта геометрии ствола скважины</small></span></label>}
        <section className="bgd-deviation-point-editor">
          <header><span><strong>Точки измерения</strong><small>Строки сохраняются по возрастанию глубины; dX/dY/dZ появятся после расчёта.</small></span><Button size="sm" variant="secondary" disabled={pending} onClick={addPoint}><Plus size={14} /> Добавить точку</Button></header>
          <div className="bgd-deviation-point-editor__head"><span>Глубина, м</span><span>Азимут, °</span><span>Зенит, °</span><span /></div>
          {draft.points.map((point, index) => <div key={point.id}>
            <label><span className="sr-only">Глубина, строка {index + 1}</span><input aria-label={`Глубина, строка ${index + 1}`} type="number" min="0" max={wellDepth} step="any" disabled={pending} value={point.depth} onChange={(event) => updatePoint(point.id, 'depth', Number(event.target.value))} /></label>
            <label><span className="sr-only">Азимут, строка {index + 1}</span><input aria-label={`Азимут, строка ${index + 1}`} type="number" min="0" max="360" step="any" disabled={pending} value={point.azimuth} onChange={(event) => updatePoint(point.id, 'azimuth', Number(event.target.value))} /></label>
            <label><span className="sr-only">Зенит, строка {index + 1}</span><input aria-label={`Зенит, строка ${index + 1}`} type="number" min="0" step="any" disabled={pending} value={point.zenithAngle} onChange={(event) => updatePoint(point.id, 'zenithAngle', Number(event.target.value))} /></label>
            <button type="button" disabled={pending || draft.points.length <= 2} onClick={() => update('points', draft.points.filter((item) => item.id !== point.id))} aria-label={`Удалить точку ${index + 1}`}><Trash2 size={15} /></button>
          </div>)}
        </section>
      </div>
      <footer><span><ShieldCheck size={15} /> Сохранение создаст версию и запись аудита.</span><Button variant="secondary" disabled={pending} onClick={onClose}>Отмена</Button><Button disabled={pending} onClick={submit}>Сохранить промер</Button></footer>
    </section>
  </div>
}

function DeviationImportDialog({ well, pending, onClose, onImport }: { well: Well; pending: boolean; onClose: () => void; onImport: () => void }) {
  const [fileSelected, setFileSelected] = useState(false)
  return <div className="geobase-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !pending) onClose() }}>
    <section className="geobase-dialog geobase-dialog--deviation-import" role="dialog" aria-modal="true" aria-labelledby="deviation-import-title">
      <header><div><span><FileUp size={20} /></span><div><h2 id="deviation-import-title">Импорт инклинометрии по скважине</h2><p>Предварительный макет отдельного сценария импорта.</p></div></div><button type="button" onClick={onClose} disabled={pending} aria-label="Закрыть импорт"><X size={19} /></button></header>
      <div className="geobase-dialog__body bgd-deviation-import-dialog">
        <div className="form-alert"><ShieldCheck size={17} /><span><strong>Демонстрационный режим</strong><small>Production-парсер и загрузка произвольных файлов не входят в текущую постановку. Здесь используется безопасный synthetic fixture.</small></span></div>
        <div className="form-grid bgd-well-form-grid">
          <label className="field"><span className="field__label">Тип внешних данных</span><select disabled={pending}><option>LAS / цифровая станция</option></select></label>
          <label className="field"><span className="field__label">Кодировка</span><select disabled={pending}><option>DOS (CP866)</option><option>Windows-1251</option><option>UTF-8</option></select></label>
        </div>
        <div className="bgd-deviation-import-file">
          <span><FileUp size={22} /><span><strong>{fileSelected ? `${well.code}_INCL_2026-07.LAS` : 'Файл не выбран'}</strong><small>{fileSelected ? '24,6 КБ · checksum demo-c18f · 5 точек' : 'Подставьте детерминированный файл прототипа'}</small></span></span>
          <Button size="sm" variant="secondary" disabled={pending} onClick={() => setFileSelected(true)}>{fileSelected ? 'Выбран' : 'Выбрать демо-файл'}</Button>
        </div>
        {fileSelected && <div className="bgd-deviation-import-preview" role="table" aria-label="Распознанные промеры"><div role="row"><span>Файл</span><span>Скважина</span><span>Дата</span><span>Прибор</span><span>Описание</span></div><div role="row"><span>{well.code}_INCL_2026-07.LAS</span><span>{well.code}</span><span>05.07.2026</span><span>ИЭМ-36 №15</span><span>5 точек, магнитный азимут</span></div></div>}
      </div>
      <footer><Button variant="secondary" disabled={pending} onClick={onClose}>Отмена</Button><Button disabled={pending || !fileSelected} onClick={onImport}><FileUp size={15} /> {pending ? 'Импортируем…' : 'Импортировать'}</Button></footer>
    </section>
  </div>
}
