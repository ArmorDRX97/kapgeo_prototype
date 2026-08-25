import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Check, CircleAlert, GitBranch, MapPin, Plus, Redo2, RefreshCw, Save, ShieldCheck, Trash2, Undo2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { validateDepthIntervals } from '../../../entities/well/lib/validateDepthIntervals'
import type { ConstructionInterval, Well } from '../../../entities/well/model/types'
import type { WellPassportData } from '../../../entities/well-passport/model/types'
import { fetchWellPassportWorkspace, previewWellPassportImpact, saveWellPassport } from '../../../repository/api'
import { GeologyRepositoryError, type WellPassportWorkspace as WellPassportWorkspaceData } from '../../../repository/contracts/geology'
import { crsFromId, formatCrs, validateGeometry } from '../../../shared/scientific/geometry'
import { Badge } from '../../../shared/ui/Badge'
import { Button } from '../../../shared/ui/Button'
import { Panel } from '../../../shared/ui/Panel'

type PassportForm = WellPassportData

export function WellPassportWorkspace({ well }: { well: Well }) {
  const { data, isLoading } = useQuery({ queryKey: ['well-passport-workspace', well.id], queryFn: () => fetchWellPassportWorkspace(well.id) })
  if (isLoading || !data) return <div className="page-loading page-loading--inline"><span /><p>Загружаем паспорт и конструкцию…</p></div>
  return <PassportEditor well={well} workspace={data} />
}

function PassportEditor({ well, workspace }: { well: Well; workspace: WellPassportWorkspaceData }) {
  const initialForm: PassportForm = structuredClone(workspace.passport.data)
  const initialConstruction = structuredClone(workspace.construction.data.intervals)
  const [form, setForm] = useState(initialForm)
  const [construction, setConstruction] = useState(initialConstruction)
  const [constructionUndo, setConstructionUndo] = useState<ConstructionInterval[][]>([])
  const [constructionRedo, setConstructionRedo] = useState<ConstructionInterval[][]>([])
  const [baseline, setBaseline] = useState({
    form: initialForm,
    construction: initialConstruction,
    passportVersion: workspace.passport.version,
    constructionVersion: workspace.construction.version,
  })
  const [reason, setReason] = useState('')
  const [savedVersion, setSavedVersion] = useState<{ passport: number; construction: number; requestId: string } | null>(null)
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: (idempotencyKey: string) => saveWellPassport({
      wellId: well.id,
      passport: form,
      construction: { intervals: construction },
      expectedPassportVersion: baseline.passportVersion,
      expectedConstructionVersion: baseline.constructionVersion,
      idempotencyKey,
      reason: reason.trim() || undefined,
    }),
    onSuccess: async ({ well: updatedWell, workspace: updatedWorkspace, requestId }) => {
      queryClient.setQueryData(['well', well.id], updatedWell)
      queryClient.setQueryData(['well-passport-workspace', well.id], updatedWorkspace)
      await queryClient.invalidateQueries({ queryKey: ['well-technical', well.id] })
      await queryClient.invalidateQueries({ queryKey: ['wells'] })
      setBaseline({
        form: structuredClone(updatedWorkspace.passport.data),
        construction: structuredClone(updatedWorkspace.construction.data.intervals),
        passportVersion: updatedWorkspace.passport.version,
        constructionVersion: updatedWorkspace.construction.version,
      })
      setSavedVersion({ passport: updatedWorkspace.passport.version, construction: updatedWorkspace.construction.version, requestId })
      setReason('')
    },
  })
  const dirty = JSON.stringify({ form, construction }) !== JSON.stringify({ form: baseline.form, construction: baseline.construction })
  const sensitiveChange = form.depth !== baseline.form.depth
    || form.location.coordinates[0] !== baseline.form.location.coordinates[0]
    || form.location.coordinates[1] !== baseline.form.location.coordinates[1]
    || form.profile !== baseline.form.profile
    || form.location.crs.id !== baseline.form.location.crs.id
    || form.casingDiameter !== baseline.form.casingDiameter
    || JSON.stringify(construction) !== JSON.stringify(baseline.construction)
  const impactQuery = useQuery({
    queryKey: ['well-passport-impact', well.id, form, construction],
    queryFn: () => previewWellPassportImpact({ wellId: well.id, passport: form, construction: { intervals: construction } }),
    enabled: dirty,
  })
  const impact = dirty ? impactQuery.data ?? [] : []
  const issues = useMemo(() => validateDepthIntervals(construction, form.depth, true), [construction, form.depth])
  const geometryIssues = useMemo(() => validateGeometry(form.location), [form.location])
  const blockingIssues = [...issues, ...geometryIssues].filter((issue) => issue.severity === 'error')
  const requiresReason = sensitiveChange && workspace.passport.status !== 'draft'
  const canSave = dirty && blockingIssues.length === 0 && (!requiresReason || reason.trim().length >= 10) && !mutation.isPending

  const reloadLatest = async () => {
    const latest = await queryClient.fetchQuery({
      queryKey: ['well-passport-workspace', well.id],
      queryFn: () => fetchWellPassportWorkspace(well.id),
      staleTime: 0,
    })
    setForm(structuredClone(latest.passport.data))
    setConstruction(structuredClone(latest.construction.data.intervals))
    setBaseline({
      form: structuredClone(latest.passport.data),
      construction: structuredClone(latest.construction.data.intervals),
      passportVersion: latest.passport.version,
      constructionVersion: latest.construction.version,
    })
    setReason('')
    mutation.reset()
  }

  const commitConstruction = (next: ConstructionInterval[]) => { setConstructionUndo((items) => [...items, structuredClone(construction)]); setConstruction(next); setConstructionRedo([]) }
  const undoConstruction = () => { const previous = constructionUndo.at(-1); if (!previous) return; setConstructionRedo((items) => [...items, structuredClone(construction)]); setConstruction(structuredClone(previous)); setConstructionUndo((items) => items.slice(0, -1)) }
  const redoConstruction = () => { const next = constructionRedo.at(-1); if (!next) return; setConstructionUndo((items) => [...items, structuredClone(construction)]); setConstruction(structuredClone(next)); setConstructionRedo((items) => items.slice(0, -1)) }
  const updateConstruction = (id: string, patch: Partial<ConstructionInterval>) => commitConstruction(construction.map((item) => item.id === id ? { ...item, ...patch } : item))
  const updateCoordinate = (axis: 0 | 1, value: number) => setForm((current) => {
    const coordinates: [number, number] = [...current.location.coordinates]
    coordinates[axis] = value
    return { ...current, location: { ...current.location, coordinates } }
  })
  const addSection = () => {
    const last = construction.at(-1)
    if (!last) return commitConstruction([{ id: `CONST-${Date.now()}`, from: 0, to: form.depth, diameter: form.casingDiameter, material: 'ПВХ', element: 'Эксплуатационная колонна' }])
    const splitAt = Math.max(last.from + 1, Number((last.to - Math.min(20, (last.to - last.from) / 2)).toFixed(1)))
    commitConstruction([...construction.slice(0, -1), { ...last, to: splitAt }, { id: `CONST-${Date.now()}`, from: splitAt, to: last.to, diameter: Math.max(90, last.diameter - 22), material: 'Фильтр', element: 'Фильтровая колонна' }])
  }
  const addPoint = () => {
    const depth = Math.min(form.depth, Math.max(0, Number((form.depth / 2).toFixed(1))))
    commitConstruction([...construction, { id: `CONST-POINT-${Date.now()}`, kind: 'point', from: depth, to: depth, diameter: 0, material: 'Сталь', element: 'Направление' }])
  }

  return (
    <div className="object-workspace">
      {savedVersion && <div className="success-banner"><Check size={17} /><span><strong>Версии сохранены</strong>Паспорт v{savedVersion.passport}, конструкция v{savedVersion.construction} · запрос {savedVersion.requestId}.</span><button type="button" onClick={() => setSavedVersion(null)}>Закрыть</button></div>}
      {mutation.error instanceof GeologyRepositoryError && <div className="validation-list" role="alert">
        <div className="validation-item validation-item--error"><CircleAlert size={15} /><span><strong>{mutation.error.code === 'VERSION_CONFLICT' ? 'Конфликт версий.' : 'Сохранение отклонено.'}</strong> {mutation.error.message}</span></div>
        {mutation.error.code === 'VERSION_CONFLICT' && <Button variant="secondary" size="sm" onClick={() => void reloadLatest()}><RefreshCw size={14} /> Загрузить актуальные версии</Button>}
      </div>}
      <div className="passport-layout">
        <div className="passport-layout__main">
          <Panel title="Паспорт скважины" description={`GEO-06 · агрегат ${workspace.passport.objectId} · v${baseline.passportVersion}`} action={<Badge tone={dirty ? 'warning' : 'success'} dot>{dirty ? 'Есть изменения' : 'Синхронизировано'}</Badge>}>
            <div className="form-grid passport-form-grid">
              <label className="field"><span className="field__label">Назначение</span><select value={form.purpose} onChange={(event) => setForm((value) => ({ ...value, purpose: event.target.value as Well['purpose'] }))}><option>Эксплуатационная</option><option>Разведочная</option><option>Наблюдательная</option></select></label>
              <label className="field"><span className="field__label">Профиль</span><input value={form.profile} onChange={(event) => setForm((value) => ({ ...value, profile: event.target.value.toUpperCase() }))} /></label>
              <label className="field"><span className="field__label">X / Easting, м</span><input type="number" value={form.location.coordinates[0]} onChange={(event) => updateCoordinate(0, Number(event.target.value))} /></label>
              <label className="field"><span className="field__label">Y / Northing, м</span><input type="number" value={form.location.coordinates[1]} onChange={(event) => updateCoordinate(1, Number(event.target.value))} /></label>
              <label className="field"><span className="field__label">Система координат</span><select value={form.location.crs.id} onChange={(event) => setForm((value) => ({ ...value, location: { ...value.location, crs: crsFromId(event.target.value) } }))}><option value="EPSG:32642">EPSG:32642</option><option value="LOCAL:SARYTAU">Локальная Сарытау</option></select></label>
              <label className="field"><span className="field__label">Фактическая глубина, м</span><input type="number" value={form.depth} onChange={(event) => setForm((value) => ({ ...value, depth: Number(event.target.value) }))} /></label>
            </div>
            {geometryIssues.length > 0 && <div className="validation-list" aria-label="Проверка геометрии устья">{geometryIssues.map((issue) => <div key={`${issue.code}-${issue.path ?? ''}`} className={`validation-item validation-item--${issue.severity}`}>{issue.severity === 'error' ? <CircleAlert size={15} /> : <AlertTriangle size={15} />}<span>{issue.message}</span></div>)}</div>}
            {form.location.crs.id !== baseline.form.location.crs.id && <div className="validation-list" aria-label="Предупреждение о смене CRS"><div className="validation-item validation-item--warning"><AlertTriangle size={15} /><span>CRS изменена без пересчёта координат. Проверьте X/Y: автоматическая трансформация доступна только через утверждённый adapter.</span></div></div>}
          </Panel>

          <Panel title="Конструкция" description={`Независимый агрегат · v${baseline.constructionVersion} · интервалы и точки проверяются по глубине`} action={<><Button variant="quiet" size="sm" disabled={!constructionUndo.length} onClick={undoConstruction}><Undo2 size={14} /> Undo</Button><Button variant="quiet" size="sm" disabled={!constructionRedo.length} onClick={redoConstruction}><Redo2 size={14} /> Redo</Button><Button variant="quiet" size="sm" onClick={addPoint}><Plus size={14} /> Добавить точку</Button><Button variant="secondary" size="sm" onClick={addSection}><Plus size={14} /> Добавить секцию</Button></>}>
            <div className="construction-table">
              <div className="construction-table__head"><span>Элемент</span><span>Тип</span><span>От, м</span><span>До, м</span><span>Ø, мм</span><span>Материал</span><span /></div>
              {construction.map((item) => (
                <div className="construction-table__row" key={item.id}>
                  <select aria-label={`Элемент ${item.id}`} value={item.element} onChange={(event) => updateConstruction(item.id, { element: event.target.value as ConstructionInterval['element'] })}><option>Направление</option><option>Кондуктор</option><option>Эксплуатационная колонна</option><option>Фильтровая колонна</option></select>
                  <select aria-label={`Тип ${item.id}`} value={item.kind ?? 'interval'} onChange={(event) => { const kind = event.target.value as NonNullable<ConstructionInterval['kind']>; updateConstruction(item.id, kind === 'point' ? { kind, to: item.from, diameter: 0 } : { kind }) }}><option value="interval">Интервал</option><option value="point">Точка</option></select>
                  <input aria-label={`Начало ${item.id}`} type="number" value={item.from} onChange={(event) => updateConstruction(item.id, { from: Number(event.target.value), ...(item.kind === 'point' ? { to: Number(event.target.value) } : {}) })} />
                  <input aria-label={`Окончание ${item.id}`} type="number" value={item.to} disabled={item.kind === 'point'} onChange={(event) => updateConstruction(item.id, { to: Number(event.target.value) })} />
                  <input aria-label={`Диаметр ${item.id}`} type="number" value={item.diameter} disabled={item.kind === 'point'} onChange={(event) => updateConstruction(item.id, { diameter: Number(event.target.value) })} />
                  <select aria-label={`Материал ${item.id}`} value={item.material} onChange={(event) => updateConstruction(item.id, { material: event.target.value as ConstructionInterval['material'] })}><option>Сталь</option><option>ПВХ</option><option>Фильтр</option></select>
                  <button type="button" aria-label={`Удалить ${item.id}`} disabled={construction.length === 1} onClick={() => commitConstruction(construction.filter((candidate) => candidate.id !== item.id))}><Trash2 size={15} /></button>
                </div>
              ))}
            </div>
            {JSON.stringify(construction) !== JSON.stringify(baseline.construction) && <p className="field__hint">В черновике изменена конструкция: после сохранения будет создана отдельная версия, а исходная останется доступна для сравнения.</p>}
            {issues.length > 0 && <div className="validation-list">{issues.map((issue, index) => <div key={`${issue.code}-${index}`} className={`validation-item validation-item--${issue.severity}`}>{issue.severity === 'error' ? <CircleAlert size={15} /> : <AlertTriangle size={15} />}<span>{issue.message}</span></div>)}</div>}
          </Panel>
        </div>

        <aside className="passport-layout__aside">
          <Panel title="Контроль версии" description="Impact preview до сохранения">
            <div className="version-impact">
              <span className="version-impact__icon"><GitBranch size={20} /></span>
              <div><strong>{impact.length > 0 ? `Затронуто объектов: ${impact.length}` : dirty ? 'Изменения не затрагивают downstream snapshots' : 'Изменений нет'}</strong><p>{impact.length > 0 ? 'После сохранения будут созданы явные stale-записи; автоматического пересчёта не будет.' : 'Последствия вычисляются по графу точных версий.'}</p></div>
              {impact.length > 0 && <ul>{impact.map((item) => <li key={item.dependency.id}><AlertTriangle size={13} /> {item.dependency.label}: {item.changedFields.join(', ')}</li>)}<li><ShieldCheck size={13} /> Опубликованные исходные версии останутся неизменными</li></ul>}
            </div>
            {requiresReason && <label className="field"><span className="field__label">Причина изменения <em>*</em></span><textarea rows={4} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Минимум 10 символов…" /><span className="field__hint">Обязательна для координат и фактической глубины утверждённого объекта.</span></label>}
            {workspace.staleness.length > 0 && <div className="validation-list" aria-label="Устаревшие зависимости">{workspace.staleness.map((item) => <div key={item.id} className="validation-item validation-item--warning"><AlertTriangle size={15} /><span><strong>{item.label}</strong> · {item.reason}. Версия {item.downstreamVersionId} сохранена для аудита.</span></div>)}</div>}
            <div className="passport-save-summary"><MapPin size={16} /><span><strong>{formatCrs(form.location.crs)} · geometry v1</strong><small>Источник: {workspace.passport.id} · hash {workspace.passport.contentHash}</small></span></div>
            <Button disabled={!canSave} onClick={() => mutation.mutate(globalThis.crypto?.randomUUID?.() ?? `GEO-${well.id}-${Date.now()}`)}><Save size={16} /> {mutation.isPending ? 'Сохраняем…' : workspace.passport.status === 'draft' ? 'Сохранить черновик' : 'Создать новые версии'}</Button>
            {!dirty && <p className="save-hint">Измените поле или секцию конструкции, чтобы сохранить новую версию.</p>}
          </Panel>
        </aside>
      </div>
    </div>
  )
}
