import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Database,
  Eye,
  EyeOff,
  Layers3,
  MapPinned,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
  getDepositDescription,
  getDepositName,
  type CreateDepositInput,
  type Deposit,
  type DepositObjectType,
  type DepositOccurrence,
  type UpdateDepositPatch,
} from '../../entities/geology-master/model/types'
import { useSession } from '../../entities/session/model/sessionContext'
import {
  createDeposit,
  fetchGeologicalMasterData,
  fetchPlatformPreferences,
  savePlatformPreferences,
} from '../../repository/api'
import { hasDepositPermission } from '../../shared/auth/permissions'
import { Badge } from '../../shared/ui/Badge'
import { Button } from '../../shared/ui/Button'
import { PageHeader } from '../../shared/ui/PageHeader'
import { Panel } from '../../shared/ui/Panel'
import type { BgdSearch, BgdSort, BgdVisibilityFilter } from './model/bgdSearch'
import './geobase.css'

const objectTypeLabels: Record<DepositObjectType, string> = {
  field: 'Месторождение',
  area: 'Площадь',
  custom: 'Другой тип',
}

type DepositFormState = {
  code: string
  objectType: DepositObjectType
  customType: string
  nameRu: string
  nameKk: string
  nameEn: string
  descriptionRu: string
  descriptionKk: string
  descriptionEn: string
  coordinateSystem: string
  isHidden: boolean
  occurrences: DepositOccurrence[]
}

export type DepositDependencies = {
  sites: number
  lenses: number
  conditions: number
  occurrences: number
}

function formFromDeposit(deposit: Deposit): DepositFormState {
  return {
    code: String(deposit.code),
    objectType: deposit.objectType,
    customType: deposit.customType ?? '',
    nameRu: deposit.nameRu,
    nameKk: deposit.nameKk,
    nameEn: deposit.nameEn,
    descriptionRu: deposit.descriptionRu,
    descriptionKk: deposit.descriptionKk,
    descriptionEn: deposit.descriptionEn,
    coordinateSystem: deposit.coordinateSystem,
    isHidden: deposit.isHidden,
    occurrences: deposit.occurrences.map((item) => ({ ...item })),
  }
}

function createForm(nextCode: number): DepositFormState {
  return {
    code: String(nextCode),
    objectType: 'field',
    customType: '',
    nameRu: '',
    nameKk: '',
    nameEn: '',
    descriptionRu: '',
    descriptionKk: '',
    descriptionEn: '',
    coordinateSystem: '',
    isHidden: false,
    occurrences: [],
  }
}

function formValid(form: DepositFormState) {
  return Number.isInteger(Number(form.code))
    && Number(form.code) > 0
    && Boolean(form.nameRu.trim())
    && Boolean(form.nameKk.trim())
    && Boolean(form.nameEn.trim())
    && (form.objectType !== 'custom' || Boolean(form.customType.trim()))
    && form.occurrences.every((item) => item.type.trim() && item.nameRu.trim() && item.nameKk.trim() && item.nameEn.trim())
}

function toCreateInput(form: DepositFormState): CreateDepositInput {
  return {
    code: Number(form.code),
    objectType: form.objectType,
    customType: form.customType || undefined,
    nameRu: form.nameRu,
    nameKk: form.nameKk,
    nameEn: form.nameEn,
    descriptionRu: form.descriptionRu,
    descriptionKk: form.descriptionKk,
    descriptionEn: form.descriptionEn,
    coordinateSystem: form.coordinateSystem,
    isHidden: form.isHidden,
    occurrences: form.occurrences,
  }
}

function toUpdatePatch(form: DepositFormState): UpdateDepositPatch {
  return {
    objectType: form.objectType,
    customType: form.customType || undefined,
    nameRu: form.nameRu,
    nameKk: form.nameKk,
    nameEn: form.nameEn,
    descriptionRu: form.descriptionRu,
    descriptionKk: form.descriptionKk,
    descriptionEn: form.descriptionEn,
    coordinateSystem: form.coordinateSystem,
    isHidden: form.isHidden,
    occurrences: form.occurrences,
  }
}

function sortValue(deposit: Deposit, sort: BgdSort): string | number {
  if (sort === 'code') return deposit.code
  if (sort === 'name') return deposit.nameRu
  if (sort === 'type') return deposit.objectType === 'custom' ? deposit.customType ?? '' : objectTypeLabels[deposit.objectType]
  if (sort === 'coordinateSystem') return deposit.coordinateSystem
  if (sort === 'visibility') return deposit.isHidden ? 1 : 0
  return deposit.updatedAt
}

export function GeologyDatabaseRegistry({ search, onSearchChange, onOpenDeposit }: {
  search: BgdSearch
  onSearchChange: (patch: Partial<BgdSearch>) => void
  onOpenDeposit: (depositId: string) => void
}) {
  const { persona } = useSession()
  const canCreate = hasDepositPermission(persona, 'geology.bgd.create')
  const queryClient = useQueryClient()
  const masterQuery = useQuery({ queryKey: ['geology-master'], queryFn: fetchGeologicalMasterData })
  const preferencesQuery = useQuery({ queryKey: ['platform-preferences'], queryFn: fetchPlatformPreferences })
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
  const currentDepositMutation = useMutation({
    mutationFn: async (depositId: string) => {
      const preferences = preferencesQuery.data
      if (!preferences) throw new Error('Не удалось загрузить пользовательские настройки.')
      return savePlatformPreferences({
        locale: preferences.locale,
        density: preferences.density,
        contrast: preferences.contrast,
        reducedMotion: preferences.reducedMotion,
        performanceProfile: preferences.performanceProfile,
        browserWidths: preferences.browserWidths,
        helpSeen: preferences.helpSeen,
        currentDepositId: depositId,
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['platform-preferences'] })
    },
  })
  const data = masterQuery.data
  const visibility = search.visibility ?? 'visible'
  const sort = search.sort ?? 'name'
  const direction = search.direction ?? 'asc'
  const pageSize = search.pageSize ?? 10
  const page = search.page ?? 1
  const filtered = useMemo(() => {
    const query = search.q?.trim().toLocaleLowerCase('ru') ?? ''
    const next = (data?.deposits ?? []).filter((item) => {
      if (visibility === 'visible' && item.isHidden) return false
      if (visibility === 'hidden' && !item.isHidden) return false
      if (search.type && item.objectType !== search.type) return false
      const haystack = [
        item.code,
        item.nameRu,
        item.nameKk,
        item.nameEn,
        item.descriptionRu,
        item.descriptionKk,
        item.descriptionEn,
        item.coordinateSystem,
        item.customType,
        ...item.occurrences.flatMap((occurrence) => [occurrence.nameRu, occurrence.nameKk, occurrence.nameEn, occurrence.type]),
      ].filter(Boolean).join(' ').toLocaleLowerCase('ru')
      return !query || haystack.includes(query)
    })
    next.sort((left, right) => {
      const leftValue = sortValue(left, sort)
      const rightValue = sortValue(right, sort)
      const result = typeof leftValue === 'number' && typeof rightValue === 'number'
        ? leftValue - rightValue
        : String(leftValue).localeCompare(String(rightValue), 'ru', { numeric: true, sensitivity: 'base' })
      return direction === 'asc' ? result : -result
    })
    return next
  }, [data?.deposits, direction, search.q, search.type, sort, visibility])
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const activePage = Math.min(page, totalPages)
  const pageItems = filtered.slice((activePage - 1) * pageSize, activePage * pageSize)
  const nextCode = Math.max(0, ...(data?.deposits.map((item) => item.code) ?? [])) + 1
  const hiddenCount = data?.deposits.filter((item) => item.isHidden).length ?? 0
  const occurrenceCount = data?.deposits.reduce((sum, item) => sum + item.occurrences.length, 0) ?? 0
  const currentError = masterQuery.error ?? createMutation.error ?? currentDepositMutation.error

  useEffect(() => {
    if (page > totalPages) onSearchChange({ page: totalPages })
  }, [onSearchChange, page, totalPages])

  const setFilter = (patch: Partial<BgdSearch>) => onSearchChange({ ...patch, page: 1 })
  const changeSort = (field: BgdSort) => onSearchChange({
    sort: field,
    direction: sort === field && direction === 'asc' ? 'desc' : 'asc',
    page: 1,
  })
  const resetFilters = () => onSearchChange({ q: undefined, type: undefined, visibility: undefined, sort: undefined, direction: undefined, page: undefined, pageSize: undefined })

  if (masterQuery.isLoading || !data) return <div className="page-loading"><span /><p>Открываем базу геологических данных…</p></div>

  return <div className="page-stack geobase-page">
    <PageHeader
      eyebrow="Геологический модуль"
      title="База геологических данных"
      description="Реестр месторождений — корневых объектов для участков, залежей, скважин и связанных геологических данных."
      actions={<Button data-geology-tour="bgd-create" disabled={!canCreate} onClick={() => setCreateOpen(true)}><Plus size={16} /> Создать месторождение</Button>}
    />

    {!canCreate && <div className="form-alert"><ShieldCheck size={17} /><span>Реестр открыт только для чтения. Создание доступно геологу с назначенным разрешением или администратору.</span></div>}
    {currentError && <div className="form-alert form-alert--error" role="alert"><CircleAlert size={17} /><span>{currentError.message}</span></div>}

    <section className="geobase-summary" aria-label="Сводка БГД">
      <article><Database size={19} /><span><strong>{data.deposits.length}</strong><small>месторождения и площади</small></span></article>
      <article><Eye size={19} /><span><strong>{data.deposits.length - hiddenCount}</strong><small>доступно в выборе</small></span></article>
      <article><EyeOff size={19} /><span><strong>{hiddenCount}</strong><small>скрыто без удаления</small></span></article>
      <article><Layers3 size={19} /><span><strong>{occurrenceCount}</strong><small>залежей в карточках</small></span></article>
    </section>

    <Panel className="geobase-registry" title="Реестр месторождений" description="Код создаётся один раз и не изменяется; названия ведутся на русском, казахском и английском языках.">
      <div className="geobase-filters" data-geology-tour="bgd-filters">
        <label><Search size={16} /><input value={search.q ?? ''} onChange={(event) => setFilter({ q: event.target.value || undefined })} placeholder="Код или название на любом языке" aria-label="Поиск месторождения" /></label>
        <select value={search.type ?? ''} onChange={(event) => setFilter({ type: (event.target.value || undefined) as DepositObjectType | undefined })} aria-label="Фильтр по типу">
          <option value="">Все типы</option>
          <option value="field">Месторождение</option>
          <option value="area">Площадь</option>
          <option value="custom">Другой тип</option>
        </select>
        <select value={visibility} onChange={(event) => setFilter({ visibility: event.target.value as BgdVisibilityFilter })} aria-label="Фильтр по видимости">
          <option value="visible">Используемые</option>
          <option value="hidden">Скрытые</option>
          <option value="all">Все</option>
        </select>
        <Button size="sm" variant="quiet" onClick={resetFilters}><RotateCcw size={14} /> Сбросить</Button>
        <span><strong>{filtered.length}</strong> из {data.deposits.length}</span>
      </div>

      <div className="geobase-table" data-geology-tour="bgd-registry">
        <div className="geobase-table__head">
          <SortButton label="Код" field="code" active={sort} direction={direction} onSort={changeSort} />
          <SortButton label="Название" field="name" active={sort} direction={direction} onSort={changeSort} />
          <SortButton label="Тип" field="type" active={sort} direction={direction} onSort={changeSort} />
          <SortButton label="Система координат" field="coordinateSystem" active={sort} direction={direction} onSort={changeSort} />
          <SortButton label="Состояние" field="visibility" active={sort} direction={direction} onSort={changeSort} />
          <span>Действия</span>
        </div>
        {pageItems.length ? pageItems.map((item) => {
          const current = preferencesQuery.data?.currentDepositId === item.id
          return <article key={item.id}>
            <button type="button" className="geobase-table__select" onClick={() => onOpenDeposit(item.id)} aria-label={`Открыть ${getDepositName(item)}`}>
              <span><strong>№ {item.code}</strong><small>v{item.version} · {new Date(item.updatedAt).toLocaleDateString('ru-RU')}</small></span>
              <span><strong>{item.nameRu}</strong><small>{item.nameKk} · {item.nameEn}</small></span>
              <span>{item.objectType === 'custom' ? item.customType : objectTypeLabels[item.objectType]}</span>
              <span><strong>{item.coordinateSystem || 'Не указана'}</strong><small>{getDepositDescription(item) || 'Описание не задано'}</small></span>
              <span><Badge tone={item.isHidden ? 'neutral' : 'success'}>{item.isHidden ? 'Скрыто' : 'Используется'}</Badge></span>
            </button>
            <div className="geobase-table__actions">
              <Button size="sm" variant={current ? 'secondary' : 'quiet'} disabled={current || currentDepositMutation.isPending} onClick={() => currentDepositMutation.mutate(item.id)} aria-label={`Выбрать ${item.nameRu} текущим`}><CheckCircle2 size={14} /> {current ? 'Текущее' : 'Выбрать'}</Button>
              <Button size="sm" variant="quiet" onClick={() => onOpenDeposit(item.id)}><Pencil size={14} /> Открыть</Button>
            </div>
          </article>
        }) : <div className="geobase-empty"><Database size={22} /><strong>{data.deposits.length ? 'Месторождения не найдены' : 'Реестр пока пуст'}</strong><span>{data.deposits.length ? 'Измените условия поиска или сбросьте фильтры.' : 'Создайте первое месторождение, чтобы начать наполнение БГД.'}</span></div>}
      </div>

      {filtered.length > 0 && <div className="geobase-pagination" aria-label="Пагинация реестра">
        <span>Страница <strong>{activePage}</strong> из {totalPages}</span>
        <label>Строк на странице <select value={pageSize} onChange={(event) => onSearchChange({ pageSize: Number(event.target.value), page: 1 })}><option value="5">5</option><option value="10">10</option><option value="20">20</option><option value="50">50</option></select></label>
        <Button size="sm" variant="quiet" disabled={page <= 1} onClick={() => onSearchChange({ page: page - 1 })} aria-label="Предыдущая страница"><ChevronLeft size={15} /></Button>
        <Button size="sm" variant="quiet" disabled={page >= totalPages} onClick={() => onSearchChange({ page: page + 1 })} aria-label="Следующая страница"><ChevronRight size={15} /></Button>
      </div>}
    </Panel>

    {createOpen && <CreateDepositDialog
      nextCode={nextCode}
      existingCodes={data.deposits.map((item) => item.code)}
      pending={createMutation.isPending}
      error={createMutation.error?.message}
      onClose={() => setCreateOpen(false)}
      onSubmit={(input) => createMutation.mutate(input)}
    />}
  </div>
}

function SortButton({ label, field, active, direction, onSort }: { label: string; field: BgdSort; active: BgdSort; direction: 'asc' | 'desc'; onSort: (field: BgdSort) => void }) {
  return <button type="button" className={active === field ? 'is-active' : ''} onClick={() => onSort(field)}>{label}{active === field && (direction === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />)}</button>
}

export function DepositEditor({ deposit, canEdit, canDelete, pending, dependencies, onSave, onDelete }: {
  deposit: Deposit
  canEdit: boolean
  canDelete: boolean
  pending: boolean
  dependencies: DepositDependencies
  onSave: (patch: UpdateDepositPatch) => void
  onDelete: () => void
}) {
  const [form, setForm] = useState(() => formFromDeposit(deposit))
  const baseline = useMemo(() => formFromDeposit(deposit), [deposit])
  const dirty = JSON.stringify(form) !== JSON.stringify(baseline)
  const readOnly = !canEdit || deposit.status === 'archived'
  const dependencyTotal = dependencies.sites + dependencies.lenses + dependencies.conditions + dependencies.occurrences

  return <Panel
    className="geobase-editor"
    title={`Месторождение № ${deposit.code} · ${deposit.nameRu}`}
    description={`Код доступен только для чтения · версия ${deposit.version} · изменил(а) ${deposit.updatedBy}`}
    action={<Badge tone={deposit.isHidden ? 'neutral' : 'success'}>{deposit.isHidden ? 'Скрыто' : 'Используется'}</Badge>}
    data-geology-tour="bgd-editor"
  >
    <DepositForm form={form} onChange={setForm} disabled={readOnly || pending} immutable />
    <div className="geobase-dependencies">
      <MapPinned size={18} />
      <div><strong>Проверка связей перед удалением</strong><span>Участки: {dependencies.sites} · Залежи: {dependencies.lenses + dependencies.occurrences} · Наборы кондиций: {dependencies.conditions}</span></div>
      <Badge tone={dependencyTotal ? 'warning' : 'success'}>{dependencyTotal ? 'Удаление заблокировано' : 'Можно удалить'}</Badge>
    </div>
    <div className="geobase-editor__actions">
      <Button variant="danger" disabled={!canDelete || deposit.status === 'archived' || pending} onClick={onDelete}><Trash2 size={15} /> Удалить</Button>
      <span />
      <Button variant="secondary" disabled={readOnly || pending || !dirty} onClick={() => setForm(baseline)}>Отменить изменения</Button>
      <Button disabled={readOnly || pending || !dirty || !formValid(form)} onClick={() => onSave(toUpdatePatch(form))}><Save size={15} /> Сохранить изменения</Button>
    </div>
  </Panel>
}

function DepositForm({ form, onChange, disabled, immutable = false }: { form: DepositFormState; onChange: (next: DepositFormState) => void; disabled: boolean; immutable?: boolean }) {
  const set = <K extends keyof DepositFormState>(key: K, value: DepositFormState[K]) => onChange({ ...form, [key]: value })
  const updateOccurrence = (index: number, patch: Partial<DepositOccurrence>) => set('occurrences', form.occurrences.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item))
  const addOccurrence = () => set('occurrences', [...form.occurrences, { id: '', type: 'Рудная залежь', nameRu: '', nameKk: '', nameEn: '' }])
  const removeOccurrence = (index: number) => set('occurrences', form.occurrences.filter((_, itemIndex) => itemIndex !== index))

  return <div className="geobase-form">
    <div className="geobase-form__grid">
      <label className="field"><span className="field__label">Код (ID) <em>*</em></span><input disabled={disabled || immutable} type="number" min="1" step="1" value={form.code} onChange={(event) => set('code', event.target.value)} /><span className="field__hint">Уникальный числовой код. После создания не изменяется.</span></label>
      <label className="field"><span className="field__label">Тип объекта <em>*</em></span><select disabled={disabled} value={form.objectType} onChange={(event) => set('objectType', event.target.value as DepositObjectType)}><option value="field">Месторождение</option><option value="area">Площадь</option><option value="custom">Другой тип</option></select></label>
      {form.objectType === 'custom' && <label className="field geobase-form__wide"><span className="field__label">Наименование пользовательского типа <em>*</em></span><input disabled={disabled} value={form.customType} onChange={(event) => set('customType', event.target.value)} /></label>}
      <label className="field"><span className="field__label">Название (RU) <em>*</em></span><input disabled={disabled} value={form.nameRu} onChange={(event) => set('nameRu', event.target.value)} /></label>
      <label className="field"><span className="field__label">Название (KZ) <em>*</em></span><input disabled={disabled} value={form.nameKk} onChange={(event) => set('nameKk', event.target.value)} /></label>
      <label className="field geobase-form__wide"><span className="field__label">Название (EN) <em>*</em></span><input disabled={disabled} value={form.nameEn} onChange={(event) => set('nameEn', event.target.value)} /></label>
      <label className="field geobase-form__wide"><span className="field__label">Система координат</span><input disabled={disabled} value={form.coordinateSystem} onChange={(event) => set('coordinateSystem', event.target.value)} placeholder="Например: WGS 84 / UTM zone 42N (EPSG:32642)" /><span className="field__hint">Необязательное текстовое поле.</span></label>
      <label className="field"><span className="field__label">Описание (RU)</span><textarea disabled={disabled} rows={3} value={form.descriptionRu} onChange={(event) => set('descriptionRu', event.target.value)} /></label>
      <label className="field"><span className="field__label">Описание (KZ)</span><textarea disabled={disabled} rows={3} value={form.descriptionKk} onChange={(event) => set('descriptionKk', event.target.value)} /></label>
      <label className="field geobase-form__wide"><span className="field__label">Описание (EN)</span><textarea disabled={disabled} rows={3} value={form.descriptionEn} onChange={(event) => set('descriptionEn', event.target.value)} /></label>
      <label className="geobase-visibility geobase-form__wide"><input disabled={disabled} type="checkbox" checked={!form.isHidden} onChange={(event) => set('isHidden', !event.target.checked)} /><span><strong>Использовать месторождение</strong><small>Если выключить, объект исчезнет из обычных списков выбора, но сохранит данные и историю.</small></span></label>
    </div>

    <section className="geobase-occurrences">
      <header><div><strong>Список залежей</strong><small>Тип и названия на трёх языках можно задать сразу или добавить позднее.</small></div><Button size="sm" variant="secondary" disabled={disabled} onClick={addOccurrence}><Plus size={14} /> Добавить залежь</Button></header>
      {form.occurrences.length ? <div className="geobase-occurrences__rows">{form.occurrences.map((item, index) => <div key={`${item.id || 'new'}-${index}`}>
        <span>{index + 1}</span>
        <label><small>Тип</small><input disabled={disabled} value={item.type} onChange={(event) => updateOccurrence(index, { type: event.target.value })} /></label>
        <label><small>Название (RU)</small><input disabled={disabled} value={item.nameRu} onChange={(event) => updateOccurrence(index, { nameRu: event.target.value })} /></label>
        <label><small>Название (KZ)</small><input disabled={disabled} value={item.nameKk} onChange={(event) => updateOccurrence(index, { nameKk: event.target.value })} /></label>
        <label><small>Название (EN)</small><input disabled={disabled} value={item.nameEn} onChange={(event) => updateOccurrence(index, { nameEn: event.target.value })} /></label>
        <Button size="sm" variant="quiet" disabled={disabled} aria-label={`Удалить залежь ${index + 1}`} onClick={() => removeOccurrence(index)}><X size={15} /></Button>
      </div>)}</div> : <div className="geobase-occurrences__empty">Залежи пока не заданы. Месторождение можно создать без них.</div>}
    </section>
  </div>
}

function CreateDepositDialog({ nextCode, existingCodes, pending, error, onClose, onSubmit }: {
  nextCode: number
  existingCodes: number[]
  pending: boolean
  error?: string
  onClose: () => void
  onSubmit: (input: CreateDepositInput) => void
}) {
  const [form, setForm] = useState(() => createForm(nextCode))
  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape' && !pending) onClose() }
    document.addEventListener('keydown', close)
    return () => document.removeEventListener('keydown', close)
  }, [onClose, pending])
  const duplicateCode = existingCodes.includes(Number(form.code))

  return <div className="geobase-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !pending) onClose() }}>
    <section className="geobase-dialog" role="dialog" aria-modal="true" aria-labelledby="create-deposit-title">
      <header><div><span><Database size={20} /></span><div><h2 id="create-deposit-title">Новое месторождение</h2><p>Создайте корневой объект БГД. Код будет зафиксирован, а названия сохранятся на трёх языках.</p></div></div><button type="button" onClick={onClose} disabled={pending} aria-label="Закрыть форму"><X size={19} /></button></header>
      <div className="geobase-dialog__body"><DepositForm form={form} onChange={setForm} disabled={pending} />{duplicateCode && <span className="field__error">Такой код уже используется.</span>}{error && <div className="form-alert form-alert--error" role="alert">{error}</div>}</div>
      <footer><Button variant="secondary" disabled={pending} onClick={onClose}>Отмена</Button><Button disabled={pending || !formValid(form) || duplicateCode} onClick={() => onSubmit(toCreateInput(form))}><Database size={15} /> Создать месторождение</Button></footer>
    </section>
  </div>
}

export function DeleteDepositDialog({ deposit, dependencies, pending, error, onClose, onConfirm }: {
  deposit: Deposit
  dependencies: DepositDependencies
  pending: boolean
  error?: string
  onClose: () => void
  onConfirm: () => void
}) {
  const dependencyTotal = dependencies.sites + dependencies.lenses + dependencies.conditions + dependencies.occurrences
  return <div className="geobase-dialog-backdrop" role="presentation">
    <section className="geobase-dialog geobase-dialog--confirm" role="alertdialog" aria-modal="true" aria-labelledby="delete-deposit-title">
      <header><div><span className="is-danger"><Trash2 size={20} /></span><div><h2 id="delete-deposit-title">Удалить «{deposit.nameRu}»?</h2><p>Удаление необратимо для записи месторождения. Сведения об операции сохранятся в аудите.</p></div></div><button type="button" onClick={onClose} disabled={pending} aria-label="Закрыть подтверждение"><X size={19} /></button></header>
      <div className="geobase-dialog__body">
        <div className={`geobase-delete-check${dependencyTotal ? ' is-blocked' : ''}`}><CircleAlert size={18} /><span><strong>{dependencyTotal ? 'Удаление заблокировано зависимостями' : 'Связанные объекты не найдены'}</strong><small>Участки: {dependencies.sites} · Залежи: {dependencies.lenses + dependencies.occurrences} · Кондиции: {dependencies.conditions}</small></span></div>
        {dependencyTotal > 0 && <p className="field__hint">Чтобы сохранить целостность БГД, скройте месторождение либо сначала перенесите дочерние объекты.</p>}
        {error && <div className="form-alert form-alert--error" role="alert">{error}</div>}
      </div>
      <footer><Button variant="secondary" disabled={pending} onClick={onClose}>Отмена</Button><Button variant="danger" disabled={pending || dependencyTotal > 0} onClick={onConfirm}><Trash2 size={15} /> Удалить безвозвратно</Button></footer>
    </section>
  </div>
}
