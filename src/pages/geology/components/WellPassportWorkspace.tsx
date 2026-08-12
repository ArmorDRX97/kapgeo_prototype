import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Check, CircleAlert, GitBranch, MapPin, Plus, Save, ShieldCheck, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { validateDepthIntervals } from '../../../entities/well/lib/validateDepthIntervals'
import type { ConstructionInterval, Well } from '../../../entities/well/model/types'
import { fetchWellTechnicalData, saveWellPassport } from '../../../repository/api'
import { Badge } from '../../../shared/ui/Badge'
import { Button } from '../../../shared/ui/Button'
import { Panel } from '../../../shared/ui/Panel'

type PassportForm = Pick<Well, 'purpose' | 'profile' | 'coordinates' | 'crs' | 'depth' | 'casingDiameter'>

export function WellPassportWorkspace({ well }: { well: Well }) {
  const { data, isLoading } = useQuery({ queryKey: ['well-technical', well.id], queryFn: () => fetchWellTechnicalData(well.id) })
  if (isLoading || !data) return <div className="page-loading page-loading--inline"><span /><p>Загружаем паспорт и конструкцию…</p></div>
  return <PassportEditor well={well} initialConstruction={data.construction} />
}

function PassportEditor({ well, initialConstruction }: { well: Well; initialConstruction: ConstructionInterval[] }) {
  const initialForm: PassportForm = { purpose: well.purpose, profile: well.profile, coordinates: { ...well.coordinates }, crs: well.crs, depth: well.depth, casingDiameter: well.casingDiameter }
  const [form, setForm] = useState(initialForm)
  const [construction, setConstruction] = useState(initialConstruction)
  const [baseline, setBaseline] = useState({ form: initialForm, construction: initialConstruction })
  const [reason, setReason] = useState('')
  const [savedVersion, setSavedVersion] = useState<number | null>(null)
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: () => saveWellPassport(well.id, form, construction),
    onSuccess: async ({ well: updatedWell, technical }) => {
      queryClient.setQueryData(['well', well.id], updatedWell)
      queryClient.setQueryData(['well-technical', well.id], technical)
      await queryClient.invalidateQueries({ queryKey: ['wells'] })
      setBaseline({ form: { ...form, coordinates: { ...form.coordinates } }, construction: construction.map((item) => ({ ...item })) })
      setSavedVersion(updatedWell.version ?? 1)
      setReason('')
    },
  })
  const dirty = JSON.stringify({ form, construction }) !== JSON.stringify(baseline)
  const sensitiveChange = form.depth !== baseline.form.depth || form.coordinates.x !== baseline.form.coordinates.x || form.coordinates.y !== baseline.form.coordinates.y
  const issues = useMemo(() => validateDepthIntervals(construction, form.depth, true), [construction, form.depth])
  const blockingIssues = issues.filter((issue) => issue.severity === 'error')
  const requiresReason = sensitiveChange && !(well.version === 1 && well.updatedAt === 'Только что')
  const canSave = dirty && blockingIssues.length === 0 && (!requiresReason || reason.trim().length >= 10) && !mutation.isPending

  const updateConstruction = (id: string, patch: Partial<ConstructionInterval>) => setConstruction((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item))
  const addSection = () => setConstruction((items) => {
    const last = items.at(-1)
    if (!last) return [{ id: `CONST-${Date.now()}`, from: 0, to: form.depth, diameter: form.casingDiameter, material: 'ПВХ', element: 'Эксплуатационная колонна' }]
    const splitAt = Math.max(last.from + 1, Number((last.to - Math.min(20, (last.to - last.from) / 2)).toFixed(1)))
    return [...items.slice(0, -1), { ...last, to: splitAt }, { id: `CONST-${Date.now()}`, from: splitAt, to: last.to, diameter: Math.max(90, last.diameter - 22), material: 'Фильтр', element: 'Фильтровая колонна' }]
  })

  return (
    <div className="object-workspace">
      {savedVersion && <div className="success-banner"><Check size={17} /><span><strong>Паспорт сохранён</strong>Версия {savedVersion} создана в статусе «На проверке».</span><button type="button" onClick={() => setSavedVersion(null)}>Закрыть</button></div>}
      <div className="passport-layout">
        <div className="passport-layout__main">
          <Panel title="Паспорт скважины" description="GEO-06 · идентификационные и пространственные данные" action={<Badge tone={dirty ? 'warning' : 'success'} dot>{dirty ? 'Есть изменения' : 'Синхронизировано'}</Badge>}>
            <div className="form-grid passport-form-grid">
              <label className="field"><span className="field__label">Назначение</span><select value={form.purpose} onChange={(event) => setForm((value) => ({ ...value, purpose: event.target.value as Well['purpose'] }))}><option>Эксплуатационная</option><option>Разведочная</option><option>Наблюдательная</option></select></label>
              <label className="field"><span className="field__label">Профиль</span><input value={form.profile} onChange={(event) => setForm((value) => ({ ...value, profile: event.target.value.toUpperCase() }))} /></label>
              <label className="field"><span className="field__label">X / Easting, м</span><input type="number" value={form.coordinates.x} onChange={(event) => setForm((value) => ({ ...value, coordinates: { ...value.coordinates, x: Number(event.target.value) } }))} /></label>
              <label className="field"><span className="field__label">Y / Northing, м</span><input type="number" value={form.coordinates.y} onChange={(event) => setForm((value) => ({ ...value, coordinates: { ...value.coordinates, y: Number(event.target.value) } }))} /></label>
              <label className="field"><span className="field__label">Система координат</span><select value={form.crs} onChange={(event) => setForm((value) => ({ ...value, crs: event.target.value }))}><option>EPSG:32642</option><option>Локальная Сарытау</option></select></label>
              <label className="field"><span className="field__label">Фактическая глубина, м</span><input type="number" value={form.depth} onChange={(event) => setForm((value) => ({ ...value, depth: Number(event.target.value) }))} /></label>
            </div>
          </Panel>

          <Panel title="Конструкция" description="Интервалы проверяются относительно фактической глубины" action={<Button variant="secondary" size="sm" onClick={addSection}><Plus size={14} /> Добавить секцию</Button>}>
            <div className="construction-table">
              <div className="construction-table__head"><span>Элемент</span><span>От, м</span><span>До, м</span><span>Ø, мм</span><span>Материал</span><span /></div>
              {construction.map((item) => (
                <div className="construction-table__row" key={item.id}>
                  <select aria-label={`Элемент ${item.id}`} value={item.element} onChange={(event) => updateConstruction(item.id, { element: event.target.value as ConstructionInterval['element'] })}><option>Направление</option><option>Кондуктор</option><option>Эксплуатационная колонна</option><option>Фильтровая колонна</option></select>
                  <input aria-label={`Начало ${item.id}`} type="number" value={item.from} onChange={(event) => updateConstruction(item.id, { from: Number(event.target.value) })} />
                  <input aria-label={`Окончание ${item.id}`} type="number" value={item.to} onChange={(event) => updateConstruction(item.id, { to: Number(event.target.value) })} />
                  <input aria-label={`Диаметр ${item.id}`} type="number" value={item.diameter} onChange={(event) => updateConstruction(item.id, { diameter: Number(event.target.value) })} />
                  <select aria-label={`Материал ${item.id}`} value={item.material} onChange={(event) => updateConstruction(item.id, { material: event.target.value as ConstructionInterval['material'] })}><option>Сталь</option><option>ПВХ</option><option>Фильтр</option></select>
                  <button type="button" aria-label={`Удалить ${item.id}`} disabled={construction.length === 1} onClick={() => setConstruction((items) => items.filter((candidate) => candidate.id !== item.id))}><Trash2 size={15} /></button>
                </div>
              ))}
            </div>
            {issues.length > 0 && <div className="validation-list">{issues.map((issue, index) => <div key={`${issue.code}-${index}`} className={`validation-item validation-item--${issue.severity}`}>{issue.severity === 'error' ? <CircleAlert size={15} /> : <AlertTriangle size={15} />}<span>{issue.message}</span></div>)}</div>}
          </Panel>
        </div>

        <aside className="passport-layout__aside">
          <Panel title="Контроль версии" description="Impact preview до сохранения">
            <div className="version-impact">
              <span className="version-impact__icon"><GitBranch size={20} /></span>
              <div><strong>{sensitiveChange ? 'Изменяются критичные поля' : dirty ? 'Локальные изменения паспорта' : 'Изменений нет'}</strong><p>{sensitiveChange ? 'Координаты или глубина влияют на зависимые представления.' : 'Начните редактирование — последствия появятся здесь.'}</p></div>
              {sensitiveChange && <ul><li><AlertTriangle size={13} /> Разрез SECTION-NORTH-03 станет устаревшим</li><li><AlertTriangle size={13} /> MODEL-NORTH-BASE потребует проверки</li><li><ShieldCheck size={13} /> Исходные версии сохранятся в аудите</li></ul>}
            </div>
            {requiresReason && <label className="field"><span className="field__label">Причина изменения <em>*</em></span><textarea rows={4} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Минимум 10 символов…" /><span className="field__hint">Обязательна для координат и фактической глубины утверждённого объекта.</span></label>}
            <div className="passport-save-summary"><MapPin size={16} /><span><strong>{well.crs}</strong><small>Источник: паспорт версии {well.version ?? 7}</small></span></div>
            <Button disabled={!canSave} onClick={() => mutation.mutate()}><Save size={16} /> {mutation.isPending ? 'Сохраняем…' : well.version === 1 ? 'Сохранить черновик' : 'Создать новую версию'}</Button>
            {!dirty && <p className="save-hint">Измените поле или секцию конструкции, чтобы сохранить новую версию.</p>}
          </Panel>
        </aside>
      </div>
    </div>
  )
}
