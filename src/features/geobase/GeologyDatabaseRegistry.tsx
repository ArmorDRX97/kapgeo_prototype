import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CircleAlert, Database, Eye, EyeOff, Layers3, MapPinned, Pencil, Plus, Save, Search, ShieldCheck, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { CreateDepositInput, Deposit, DepositObjectType, DepositOccurrence, UpdateDepositPatch } from '../../entities/geology-master/model/types'
import { useSession } from '../../entities/session/model/sessionContext'
import { createDeposit, fetchGeologicalMasterData } from '../../repository/api'
import { hasPermission } from '../../shared/auth/permissions'
import { Badge } from '../../shared/ui/Badge'
import { Button } from '../../shared/ui/Button'
import { PageHeader } from '../../shared/ui/PageHeader'
import { Panel } from '../../shared/ui/Panel'
import type { BgdSearch, BgdVisibilityFilter } from './model/bgdSearch'
import './geobase.css'

const objectTypeLabels: Record<DepositObjectType, string> = {
  field: 'Месторождение',
  area: 'Площадь',
  custom: 'Другой тип',
}

type DepositFormState = {
  numericId: string
  code: string
  objectType: DepositObjectType
  customType: string
  name: string
  crs: string
  coordinateSystemDescription: string
  description: string
  isHidden: boolean
  occurrences: DepositOccurrence[]
}

function formFromDeposit(deposit: Deposit): DepositFormState {
  return {
    numericId: String(deposit.numericId),
    code: deposit.code,
    objectType: deposit.objectType,
    customType: deposit.customType ?? '',
    name: deposit.name,
    crs: deposit.crs,
    coordinateSystemDescription: deposit.coordinateSystemDescription,
    description: deposit.description,
    isHidden: deposit.isHidden,
    occurrences: deposit.occurrences.map((item) => ({ ...item })),
  }
}

function createForm(nextNumericId: number): DepositFormState {
  return {
    numericId: String(nextNumericId),
    code: `FIELD-${nextNumericId}`,
    objectType: 'field',
    customType: '',
    name: '',
    crs: 'EPSG:32642',
    coordinateSystemDescription: 'WGS 84 / UTM zone 42N · демонстрационная система координат',
    description: '',
    isHidden: false,
    occurrences: [],
  }
}

function formValid(form: DepositFormState) {
  return Number.isInteger(Number(form.numericId))
    && Number(form.numericId) > 0
    && /^[A-Z0-9-]{3,24}$/.test(form.code)
    && form.name.trim().length >= 2
    && Boolean(form.crs.trim())
    && (form.objectType !== 'custom' || Boolean(form.customType.trim()))
    && form.occurrences.every((item) => item.type.trim() && item.name.trim())
}

function toCreateInput(form: DepositFormState): CreateDepositInput {
  return {
    numericId: Number(form.numericId),
    code: form.code,
    objectType: form.objectType,
    customType: form.customType,
    name: form.name,
    crs: form.crs,
    coordinateSystemDescription: form.coordinateSystemDescription,
    description: form.description,
    isHidden: form.isHidden,
    occurrences: form.occurrences,
  }
}

function toUpdatePatch(form: DepositFormState): UpdateDepositPatch {
  return {
    objectType: form.objectType,
    customType: form.customType || undefined,
    name: form.name,
    crs: form.crs,
    coordinateSystemDescription: form.coordinateSystemDescription,
    description: form.description,
    isHidden: form.isHidden,
    occurrences: form.occurrences,
  }
}

export function GeologyDatabaseRegistry({ search, onSearchChange, onOpenDeposit }: {
  search: BgdSearch
  onSearchChange: (patch: Partial<BgdSearch>) => void
  onOpenDeposit: (depositId: string) => void
}) {
  const { persona } = useSession()
  const canEdit = hasPermission(persona, 'geology.well-master.edit')
  const queryClient = useQueryClient()
  const masterQuery = useQuery({ queryKey: ['geology-master'], queryFn: fetchGeologicalMasterData })
  const [createOpen, setCreateOpen] = useState(false)

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['geology-master'] })
  const createMutation = useMutation({
    mutationFn: createDeposit,
    onSuccess: async (created) => {
      await refresh()
      setCreateOpen(false)
      onOpenDeposit(created.id)
    },
  })
  const data = masterQuery.data
  const visibility = search.visibility ?? 'visible'
  const filtered = useMemo(() => {
    const query = search.q?.trim().toLocaleLowerCase('ru') ?? ''
    return (data?.deposits ?? []).filter((item) => {
      if (visibility === 'visible' && item.isHidden) return false
      if (visibility === 'hidden' && !item.isHidden) return false
      if (search.type && item.objectType !== search.type) return false
      return !query || `${item.numericId} ${item.code} ${item.name} ${item.description} ${item.crs}`.toLocaleLowerCase('ru').includes(query)
    })
  }, [data?.deposits, search.q, search.type, visibility])
  const nextNumericId = Math.max(0, ...(data?.deposits.map((item) => item.numericId) ?? [])) + 1
  const hiddenCount = data?.deposits.filter((item) => item.isHidden).length ?? 0
  const occurrenceCount = data?.deposits.reduce((sum, item) => sum + item.occurrences.length, 0) ?? 0
  const currentError = masterQuery.error ?? createMutation.error

  const setSearch = (patch: Partial<BgdSearch>) => {
    onSearchChange(patch)
  }

  if (masterQuery.isLoading || !data) return <div className="page-loading"><span /><p>Открываем базу геологических данных…</p></div>

  return <div className="page-stack geobase-page">
    <PageHeader
      eyebrow="Геологический модуль"
      title="База геологических данных"
      description="Реестр месторождений — корневых объектов для последующих залежей, участков, скважин и геологических данных."
      actions={<Button data-geology-tour="bgd-create" disabled={!canEdit} onClick={() => setCreateOpen(true)}><Plus size={16} /> Создать месторождение</Button>}
    />

    {!canEdit && <div className="form-alert"><ShieldCheck size={17} /><span>Доступ только для чтения. Создание, изменение и удаление доступны пользователям с разрешением управления геологическими объектами.</span></div>}
    {currentError && <div className="form-alert form-alert--error" role="alert"><CircleAlert size={17} /><span>{currentError.message}</span></div>}

    <section className="geobase-summary" aria-label="Сводка БГД">
      <article><Database size={19} /><span><strong>{data.deposits.length}</strong><small>месторождения и площади</small></span></article>
      <article><Eye size={19} /><span><strong>{data.deposits.length - hiddenCount}</strong><small>доступно в выборе</small></span></article>
      <article><EyeOff size={19} /><span><strong>{hiddenCount}</strong><small>скрыто без удаления</small></span></article>
      <article><Layers3 size={19} /><span><strong>{occurrenceCount}</strong><small>залежей в описании</small></span></article>
    </section>

    <Panel className="geobase-registry" title="Реестр месторождений" description="ID и код неизменяемы после создания; скрытые объекты сохраняют все данные и историю.">
      <div className="geobase-filters" data-geology-tour="bgd-filters">
        <label><Search size={16} /><input value={search.q ?? ''} onChange={(event) => setSearch({ q: event.target.value || undefined })} placeholder="Название, ID, код или CRS" aria-label="Поиск месторождения" /></label>
        <select value={search.type ?? ''} onChange={(event) => setSearch({ type: (event.target.value || undefined) as DepositObjectType | undefined })} aria-label="Фильтр по типу">
          <option value="">Все типы</option>
          <option value="field">Месторождение</option>
          <option value="area">Площадь</option>
          <option value="custom">Другой тип</option>
        </select>
        <select value={visibility} onChange={(event) => setSearch({ visibility: event.target.value as BgdVisibilityFilter })} aria-label="Фильтр по видимости">
          <option value="visible">Используемые</option>
          <option value="hidden">Скрытые</option>
          <option value="all">Все</option>
        </select>
        <span><strong>{filtered.length}</strong> из {data.deposits.length}</span>
      </div>

      <div className="geobase-table" data-geology-tour="bgd-registry">
        <div className="geobase-table__head"><span>ID / код</span><span>Название</span><span>Тип</span><span>Система координат</span><span>Состояние</span><span>Действия</span></div>
        {filtered.length ? filtered.map((item) => <article key={item.id}>
          <button type="button" className="geobase-table__select" onClick={() => onOpenDeposit(item.id)} aria-label={`Открыть ${item.name}`}>
            <span><strong>№ {item.numericId}</strong><small>{item.code} · v{item.version}</small></span>
            <span><strong>{item.name}</strong><small>{item.description || 'Описание не задано'}</small></span>
            <span>{item.objectType === 'custom' ? item.customType : objectTypeLabels[item.objectType]}</span>
            <span><strong>{item.crs}</strong><small>{item.coordinateSystemDescription || 'Без пояснения'}</small></span>
            <span><Badge tone={item.isHidden ? 'neutral' : 'success'}>{item.isHidden ? 'Скрыто' : 'Используется'}</Badge></span>
          </button>
          <div className="geobase-table__actions"><Button size="sm" variant="quiet" onClick={() => onOpenDeposit(item.id)}><Pencil size={14} /> Открыть</Button></div>
        </article>) : <div className="geobase-empty"><Database size={22} /><strong>Месторождения не найдены</strong><span>Измените фильтры или создайте новый объект БГД.</span></div>}
      </div>
    </Panel>

    {createOpen && <CreateDepositDialog
      nextNumericId={nextNumericId}
      existingNumericIds={data.deposits.map((item) => item.numericId)}
      existingCodes={data.deposits.map((item) => item.code)}
      pending={createMutation.isPending}
      error={createMutation.error?.message}
      onClose={() => setCreateOpen(false)}
      onSubmit={(input) => createMutation.mutate(input)}
    />}
  </div>
}

export function DepositEditor({ deposit, canEdit, pending, dependencies, onSave, onDelete }: {
  deposit: Deposit
  canEdit: boolean
  pending: boolean
  dependencies: { sites: number; lenses: number; conditions: number }
  onSave: (patch: UpdateDepositPatch) => void
  onDelete: () => void
}) {
  const [form, setForm] = useState(() => formFromDeposit(deposit))
  const baseline = formFromDeposit(deposit)
  const dirty = JSON.stringify(form) !== JSON.stringify(baseline)
  const readOnly = !canEdit || deposit.status === 'archived'
  const dependencyTotal = dependencies.sites + dependencies.lenses + dependencies.conditions

  return <Panel
    className="geobase-editor"
    title={`Месторождение № ${deposit.numericId} · ${deposit.name}`}
    description={`${deposit.code} · ID и код доступны только для чтения · версия ${deposit.version}`}
    action={<Badge tone={deposit.isHidden ? 'neutral' : 'success'}>{deposit.isHidden ? 'Скрыто' : 'Используется'}</Badge>}
    data-geology-tour="bgd-editor"
  >
    <DepositForm form={form} onChange={setForm} disabled={readOnly || pending} immutable />
    <div className="geobase-dependencies">
      <MapPinned size={18} />
      <div><strong>Проверка связей перед удалением</strong><span>Участки: {dependencies.sites} · Залежи иерархии: {dependencies.lenses} · Наборы кондиций: {dependencies.conditions}</span></div>
      <Badge tone={dependencyTotal ? 'warning' : 'success'}>{dependencyTotal ? 'Удаление заблокировано' : 'Можно удалить'}</Badge>
    </div>
    <div className="geobase-editor__actions">
      <Button variant="danger" disabled={readOnly || pending} onClick={onDelete}><Trash2 size={15} /> Удалить</Button>
      <span />
      <Button variant="secondary" disabled={readOnly || pending || !dirty} onClick={() => setForm(baseline)}>Отменить изменения</Button>
      <Button disabled={readOnly || pending || !dirty || !formValid(form)} onClick={() => onSave(toUpdatePatch(form))}><Save size={15} /> Сохранить изменения</Button>
    </div>
  </Panel>
}

function DepositForm({ form, onChange, disabled, immutable = false }: { form: DepositFormState; onChange: (next: DepositFormState) => void; disabled: boolean; immutable?: boolean }) {
  const set = <K extends keyof DepositFormState>(key: K, value: DepositFormState[K]) => onChange({ ...form, [key]: value })
  const updateOccurrence = (index: number, patch: Partial<DepositOccurrence>) => set('occurrences', form.occurrences.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item))
  const addOccurrence = () => set('occurrences', [...form.occurrences, { id: '', type: 'рудная залежь', name: '' }])
  const removeOccurrence = (index: number) => set('occurrences', form.occurrences.filter((_, itemIndex) => itemIndex !== index))

  return <div className="geobase-form">
    <div className="geobase-form__grid">
      <label className="field"><span className="field__label">Числовой ID <em>*</em></span><input disabled={disabled || immutable} type="number" min="1" step="1" value={form.numericId} onChange={(event) => set('numericId', event.target.value)} /><span className="field__hint">Уникален между БГД и не меняется обычным редактированием.</span></label>
      <label className="field"><span className="field__label">Код <em>*</em></span><input disabled={disabled || immutable} value={form.code} onChange={(event) => set('code', event.target.value.toUpperCase())} /><span className="field__hint">3–24 символа: A–Z, цифры и дефис.</span></label>
      <label className="field"><span className="field__label">Название <em>*</em></span><input disabled={disabled} value={form.name} onChange={(event) => set('name', event.target.value)} /></label>
      <label className="field"><span className="field__label">Тип объекта <em>*</em></span><select disabled={disabled} value={form.objectType} onChange={(event) => set('objectType', event.target.value as DepositObjectType)}><option value="field">Месторождение</option><option value="area">Площадь</option><option value="custom">Другой тип</option></select></label>
      {form.objectType === 'custom' && <label className="field geobase-form__wide"><span className="field__label">Наименование пользовательского типа <em>*</em></span><input disabled={disabled} value={form.customType} onChange={(event) => set('customType', event.target.value)} /></label>}
      <label className="field"><span className="field__label">Код системы координат <em>*</em></span><input disabled={disabled} value={form.crs} onChange={(event) => set('crs', event.target.value.toUpperCase())} placeholder="EPSG:32642" /></label>
      <label className="field"><span className="field__label">Описание системы координат</span><input disabled={disabled} value={form.coordinateSystemDescription} onChange={(event) => set('coordinateSystemDescription', event.target.value)} /></label>
      <label className="field geobase-form__wide"><span className="field__label">Описание / комментарий</span><textarea disabled={disabled} rows={3} value={form.description} onChange={(event) => set('description', event.target.value)} /></label>
      <label className="geobase-visibility geobase-form__wide"><input disabled={disabled} type="checkbox" checked={!form.isHidden} onChange={(event) => set('isHidden', !event.target.checked)} /><span><strong>Использовать месторождение</strong><small>Если выключить, объект исчезнет из обычных списков выбора, но сохранит данные и историю.</small></span></label>
    </div>

    <section className="geobase-occurrences">
      <header><div><strong>Список залежей</strong><small>Можно задать при создании или дополнить позже в свойствах месторождения.</small></div><Button size="sm" variant="secondary" disabled={disabled} onClick={addOccurrence}><Plus size={14} /> Добавить залежь</Button></header>
      {form.occurrences.length ? <div className="geobase-occurrences__rows">{form.occurrences.map((item, index) => <div key={`${item.id || 'new'}-${index}`}>
        <span>{index + 1}</span>
        <label><small>Тип</small><input disabled={disabled} value={item.type} onChange={(event) => updateOccurrence(index, { type: event.target.value })} /></label>
        <label><small>Название</small><input disabled={disabled} value={item.name} onChange={(event) => updateOccurrence(index, { name: event.target.value })} /></label>
        <Button size="sm" variant="quiet" disabled={disabled} aria-label={`Удалить залежь ${index + 1}`} onClick={() => removeOccurrence(index)}><X size={15} /></Button>
      </div>)}</div> : <div className="geobase-occurrences__empty">Залежи пока не заданы. Месторождение можно создать без них.</div>}
    </section>
  </div>
}

function CreateDepositDialog({ nextNumericId, existingNumericIds, existingCodes, pending, error, onClose, onSubmit }: {
  nextNumericId: number
  existingNumericIds: number[]
  existingCodes: string[]
  pending: boolean
  error?: string
  onClose: () => void
  onSubmit: (input: CreateDepositInput) => void
}) {
  const [form, setForm] = useState(() => createForm(nextNumericId))
  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape' && !pending) onClose() }
    document.addEventListener('keydown', close)
    return () => document.removeEventListener('keydown', close)
  }, [onClose, pending])
  const duplicateNumericId = existingNumericIds.includes(Number(form.numericId))
  const duplicateCode = existingCodes.includes(form.code)

  return <div className="geobase-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !pending) onClose() }}>
    <section className="geobase-dialog" role="dialog" aria-modal="true" aria-labelledby="create-deposit-title">
      <header><div><span><Database size={20} /></span><div><h2 id="create-deposit-title">Новое месторождение</h2><p>Создайте корневой объект БГД. Скважины и остальные наборы данных будут привязываться к нему позже.</p></div></div><button type="button" onClick={onClose} disabled={pending} aria-label="Закрыть форму"><X size={19} /></button></header>
      <div className="geobase-dialog__body"><DepositForm form={form} onChange={setForm} disabled={pending} />{duplicateNumericId && <span className="field__error">Такой числовой ID уже используется.</span>}{duplicateCode && <span className="field__error">Такой код уже используется.</span>}{error && <div className="form-alert form-alert--error" role="alert">{error}</div>}</div>
      <footer><Button variant="secondary" disabled={pending} onClick={onClose}>Отмена</Button><Button disabled={pending || !formValid(form) || duplicateNumericId || duplicateCode} onClick={() => onSubmit(toCreateInput(form))}><Database size={15} /> Создать месторождение</Button></footer>
    </section>
  </div>
}

export function DeleteDepositDialog({ deposit, dependencies, pending, error, onClose, onConfirm }: {
  deposit: Deposit
  dependencies: { sites: number; lenses: number; conditions: number }
  pending: boolean
  error?: string
  onClose: () => void
  onConfirm: () => void
}) {
  const dependencyTotal = dependencies.sites + dependencies.lenses + dependencies.conditions
  return <div className="geobase-dialog-backdrop" role="presentation">
    <section className="geobase-dialog geobase-dialog--confirm" role="alertdialog" aria-modal="true" aria-labelledby="delete-deposit-title">
      <header><div><span className="is-danger"><Trash2 size={20} /></span><div><h2 id="delete-deposit-title">Удалить «{deposit.name}»?</h2><p>Удаление необратимо для записи месторождения. Аудит операции сохранится.</p></div></div><button type="button" onClick={onClose} disabled={pending} aria-label="Закрыть подтверждение"><X size={19} /></button></header>
      <div className="geobase-dialog__body">
        <div className={`geobase-delete-check${dependencyTotal ? ' is-blocked' : ''}`}><CircleAlert size={18} /><span><strong>{dependencyTotal ? 'Удаление заблокировано зависимостями' : 'Связанные объекты не найдены'}</strong><small>Участки: {dependencies.sites} · Залежи иерархии: {dependencies.lenses} · Кондиции: {dependencies.conditions}</small></span></div>
        {dependencyTotal > 0 && <p className="field__hint">Чтобы сохранить целостность БГД, используйте признак «Скрыто» либо сначала перенесите дочерние объекты.</p>}
        {error && <div className="form-alert form-alert--error" role="alert">{error}</div>}
      </div>
      <footer><Button variant="secondary" disabled={pending} onClick={onClose}>Отмена</Button><Button variant="danger" disabled={pending || dependencyTotal > 0} onClick={onConfirm}><Trash2 size={15} /> Удалить безвозвратно</Button></footer>
    </section>
  </div>
}
