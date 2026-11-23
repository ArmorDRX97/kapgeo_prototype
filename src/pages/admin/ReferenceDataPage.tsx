import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useBlocker, useNavigate, useSearch } from '@tanstack/react-router'
import { ArrowDownUp, ArrowLeft, BookOpen, ChevronRight, Download, History, Pencil, Plus, Power, Search, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { exportReference, type ExchangeFormat } from '../../entities/reference-data/lib/exchange'
import { referenceTree } from '../../entities/reference-data/lib/validation'
import { referenceAttributes, referenceDefinition, referenceDefinitions } from '../../entities/reference-data/model/catalog'
import { referenceDate, referenceEntryLabel, type DictionaryMetadata, type ReferenceEntry, type ReferenceField, type ReferenceWorkspace } from '../../entities/reference-data/model/types'
import { useSession } from '../../entities/session/model/sessionContext'
import { dictionaryMetadata, referenceDataRepository, type ReferenceCommand } from '../../repository/demo/referenceDataRepository'
import { importReferences } from '../../repository/demo/referenceExchange'
import { hasPermission } from '../../shared/auth/permissions'
import { useUiLocale } from '../../shared/lib/useUiLocale'
import { Badge } from '../../shared/ui/Badge'
import { Button } from '../../shared/ui/Button'
import { PageHeader } from '../../shared/ui/PageHeader'
import { Panel } from '../../shared/ui/Panel'
import { ColorSample, ReferenceColors } from './ReferenceColors'
import { ReferenceDialog } from './ReferenceDialog'
import { ReferenceEntryEditor } from './ReferenceEntryEditor'
import { ReferenceExchange, type ExchangeState } from './ReferenceExchange'
import { ReferenceMetadataForm } from './ReferenceMetadataForm'
import { referenceMessage, referenceText } from './reference-messages'
import './reference-data.css'

const queryKey = ['reference-data']
const exchangeQueryKey = ['reference-data', 'exchange-progress']
const defaultDictionary = 'reff_rock_type'
const operations = { created: 'Создание значения', updated: 'Изменение значения', activated: 'Активация значения', deactivated: 'Перевод в недействующие', deleted: 'Удаление значения' }
const activityNames: Record<string, string> = {
  NSI_TYPE_UPDATE: 'Изменение справочника', NSI_COLOR_CREATE: 'Создание цвета', NSI_COLOR_UPDATE: 'Изменение цвета',
  NSI_COLOR_DELETE: 'Удаление цвета', NSI_EXPORT: 'Выгрузка', NSI_IMPORT: 'Импорт', ACCESS_DENIED: 'Отказ в доступе',
}
const dateLabel = (value: unknown) => typeof value === 'string' ? value.split('-').reverse().join('.') : ''
const matches = (query: string, ...values: unknown[]) => query.trim().length < 2 || values.some(value =>
  String(value ?? '').toLocaleLowerCase('ru').includes(query.trim().toLocaleLowerCase('ru')),
)
const period = (entry: ReferenceEntry) => [entry.values.valid_from && `с ${dateLabel(entry.values.valid_from)}`, entry.values.valid_to && `по ${dateLabel(entry.values.valid_to)}`].filter(Boolean).join(' ') || '—'
type Confirmation = { entry: ReferenceEntry; operation: 'activated' | 'deactivated' | 'deleted'; endDate: string }
type Tab = 'colors' | 'exchange'

function localizedName(value: DictionaryMetadata, locale: string) {
  return (locale === 'kk' ? value.nameKk : locale === 'en' ? value.nameEn : value.name) || value.name
}

function valueName(entry: ReferenceEntry, locale: string) {
  return String((locale === 'kk' ? entry.values.name_kk : locale === 'en' ? entry.values.name_en : null) || referenceEntryLabel(entry))
}

function attributeValue(field: ReferenceField, entry: ReferenceEntry, workspace: ReferenceWorkspace, locale: string) {
  const value = entry.values[field.key]
  if (value == null || value === '') return '—'
  if (field.type === 'reference') {
    const target = workspace.entries.find(item => item.id === value)
    return target ? valueName(target, locale) : '—'
  }
  if (field.type === 'color') {
    const color = workspace.colors?.find(item => item.id === value && !item.deleted)
    return color ? <span className="reference-value-color"><ColorSample hex={color.hex} />{localizedName(color, locale)}</span> : '—'
  }
  if (field.type === 'boolean') return value ? 'Да' : 'Нет'
  if (field.type === 'date') return dateLabel(value)
  return String(value)
}

export function ReferenceDataPage() {
  const { persona } = useSession()
  const locale = useUiLocale()
  const search = useSearch({ from: '/admin/references' })
  const navigate = useNavigate()
  const client = useQueryClient()
  const canView = hasPermission(persona, 'adm.nsi.view')
  const canEdit = hasPermission(persona, 'adm.nsi.edit')
  const canDelete = hasPermission(persona, 'adm.nsi.delete')
  const canExchange = hasPermission(persona, 'adm.nsi.exchange')
  const query = useQuery({ queryKey, queryFn: () => referenceDataRepository.get(), enabled: canView || canExchange })
  const definition = referenceDefinition(search.dictionary ?? defaultDictionary)
  const tab = search.tab ?? (canView ? undefined : 'exchange')
  const [directorySearch, setDirectorySearch] = useState('')
  const [valueSearch, setValueSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [date, setDate] = useState('')
  const [sort, setSort] = useState<{ key: 'code' | 'name'; descending: boolean } | null>(null)
  const [dirty, setDirty] = useState(false)
  const [metadataRevision, setMetadataRevision] = useState<number | null>(null)
  const [editorKey, setEditorKey] = useState(0)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)
  const [exportFormat, setExportFormat] = useState<ExchangeFormat | null>(null)
  const { data: exchange } = useQuery({ queryKey: exchangeQueryKey, queryFn: (): ExchangeState | null => null, enabled: false, gcTime: Infinity })
  const [notice, setNotice] = useState('')
  const [actionError, setActionError] = useState('')
  const [busy, setBusy] = useState(false)
  const directory = useRef<HTMLDivElement>(null)
  const canLeave = !dirty && !busy
  useBlocker({
    disabled: canLeave,
    enableBeforeUnload: !canLeave,
    shouldBlockFn: () => busy || !window.confirm('Есть несохранённые изменения. Покинуть карточку?'),
  })
  useEffect(() => {
    const list = directory.current
    const row = list?.querySelector<HTMLElement>('.is-active')
    if (!list || !row) return
    const offset = row.getBoundingClientRect().top - list.getBoundingClientRect().top
    if (offset < 0 || offset + row.offsetHeight > list.clientHeight) list.scrollTop += offset - 8
  }, [query.data, definition?.id, tab])
  const update = (workspace: ReferenceWorkspace) => client.setQueryData(queryKey, workspace)
  const changeLocation = (dictionary?: string, entry?: string, nextTab?: Tab, replace = false) =>
    void navigate({ to: '/admin/references', search: { dictionary, entry, tab: nextTab }, resetScroll: false, replace, ignoreBlocker: true })
  const mutation = useMutation({
    mutationFn: (command: ReferenceCommand) => referenceDataRepository.execute(command, persona),
    onSuccess: (workspace, command) => {
      update(workspace)
      setConfirmation(null)
      setDirty(false)
      setNotice(`${operations[command.operation]}. Данные сохранены.`)
      if (search.entry) changeLocation(command.dictionaryId, undefined, undefined, true)
      if (command.operation === 'created') { setValueSearch(''); setStatus('all'); setDate('') }
    },
  })
  const resetDialog = () => { mutation.reset(); setActionError(''); setNotice(''); setDirty(false) }
  const openEntry = (id?: string) => {
    resetDialog()
    changeLocation(definition?.id, id)
  }
  const closeEntry = () => { resetDialog(); changeLocation(definition?.id, undefined, undefined, true) }
  const chooseDictionary = (id: string) => {
    setValueSearch(''); setStatus('all'); setDate(''); setSort(null)
    resetDialog()
    changeLocation(id)
  }
  const chooseTab = (nextTab?: Tab) => {
    if (dirty && !window.confirm('Есть несохранённые изменения. Закрыть карточку?')) return
    resetDialog()
    changeLocation(search.dictionary, undefined, nextTab)
  }
  const importFile = (file: File, fallback?: string) => {
    if (!persona || !canExchange || exchange?.pending) return
    client.setQueryData<ExchangeState>(exchangeQueryKey, { filename: file.name, pending: true })
    void importReferences(file, fallback, persona).then(({ workspace, result }) => {
      if (workspace) update(workspace)
      client.setQueryData<ExchangeState>(exchangeQueryKey, { filename: file.name, pending: false, result })
    })
  }
  const perform = async (action: () => Promise<void>) => {
    setBusy(true); setActionError('')
    try { await action() }
    catch (error) { setActionError(error instanceof Error ? error.message : 'Операция не выполнена.') }
    finally { setBusy(false) }
  }

  if (!canView && !canExchange) return <Panel title="Доступ ограничен">Нет права просмотра справочников.</Panel>
  if (query.error) return <Panel title="Не удалось загрузить справочники"><p role="alert">{query.error.message}</p><Button onClick={() => void query.refetch()}>Повторить</Button></Panel>
  if (!query.data) return <div className="page-loading"><span /><p>Загружаем справочники…</p></div>
  const workspace = query.data
  const importState = exchange ?? (workspace.lastImport ? { ...workspace.lastImport, pending: false } : null)
  const entries = workspace.entries.filter(entry => entry.dictionaryId === definition?.id)
  const selected = entries.find(entry => entry.id === search.entry)
  const creating = search.entry === 'new' && canEdit
  const catalog = referenceDefinitions.filter(item => !item.system).map(item => ({ item, metadata: dictionaryMetadata(workspace, item) }))
    .filter(({ item, metadata }) => matches(directorySearch, item.id, metadata.name, metadata.nameKk, metadata.nameEn))
    .sort((a, b) => localizedName(a.metadata, locale).localeCompare(localizedName(b.metadata, locale), locale))
  const metadata = definition && dictionaryMetadata(workspace, definition)
  const dictionaryName = metadata ? localizedName(metadata, locale) : ''
  const attributes = definition ? referenceAttributes(definition).filter(field => field.showInList) : []
  const visibleEntries = entries
    .filter(entry => (status === 'all' || entry.active === (status === 'active')) &&
      (!date || entry.active && String(entry.values.valid_from ?? '') <= date && (!entry.values.valid_to || String(entry.values.valid_to) >= date)) &&
      matches(valueSearch, referenceEntryLabel(entry), entry.values.code, entry.values.name_kk, entry.values.name_en, entry.values.st_nak_number))
    .sort((a, b) => {
      if (!sort) return Number(a.values.sort_order ?? 0) - Number(b.values.sort_order ?? 0) || String(a.values.code).localeCompare(String(b.values.code), locale, { numeric: true })
      const order = sort.key === 'code' ? String(a.values.code).localeCompare(String(b.values.code), locale, { numeric: true }) : valueName(a, locale).localeCompare(valueName(b, locale), locale)
      return sort.descending ? -order : order
    })
  const heading = (key: 'code' | 'name', label: string) => <th aria-sort={sort?.key === key ? sort.descending ? 'descending' : 'ascending' : 'none'}>
    <button type="button" className="reference-sort" onClick={() => setSort({ key, descending: sort?.key === key && !sort.descending })}>{label}<ArrowDownUp size={13} aria-hidden="true" /></button>
  </th>
  const rows = definition?.hierarchical && !sort ? referenceTree(visibleEntries) : visibleEntries.map(entry => ({ entry, depth: 0 }))
  const askStatus = (entry: ReferenceEntry) => {
    resetDialog()
    setConfirmation({ entry, operation: entry.active ? 'deactivated' : 'activated', endDate: entry.active ? referenceDate() : '' })
  }
  const askDelete = (entry: ReferenceEntry) => {
    resetDialog()
    setConfirmation({ entry, operation: 'deleted', endDate: '' })
  }

  return <div className="page-stack reference-page">
    <PageHeader eyebrow="Администрирование" title="Справочники" actions={<Link to="/admin" className="button button--secondary button--md"><ArrowLeft size={16} />Администрирование</Link>} />
    <div className="reference-section-bar">
      <nav aria-label="Разделы справочников">
        {canView && <><Button variant={tab === undefined ? 'secondary' : 'quiet'} aria-current={tab === undefined ? 'page' : undefined} onClick={() => chooseTab()}>Справочники</Button>
          <Button variant={tab === 'colors' ? 'secondary' : 'quiet'} aria-current={tab === 'colors' ? 'page' : undefined} onClick={() => chooseTab('colors')}>Цвета</Button></>}
        {canExchange && <Button variant={tab === 'exchange' ? 'secondary' : 'quiet'} aria-current={tab === 'exchange' ? 'page' : undefined} onClick={() => chooseTab('exchange')}>Обмен{exchange?.pending && <span className="reference-progress-dot" />}</Button>}
      </nav>
      {canView && <Button size="sm" variant="quiet" onClick={() => setHistoryOpen(true)}><History size={16} />Журнал изменений</Button>}
    </div>
    {notice && <div className="reference-notice success-message" role="status">{notice}</div>}
    {!tab && search.entry && !selected && !creating && <div className="reference-notice form-alert form-alert--error" role="status">
      {search.entry === 'new' ? 'У вашей роли нет права добавлять значения.' : 'Значение не найдено или удалено.'}
      <Button size="sm" variant="quiet" onClick={closeEntry}>Закрыть</Button>
    </div>}
    {tab === 'colors' && canView ? <ReferenceColors workspace={workspace} persona={persona} onUpdate={update} />
      : tab === 'exchange' && canExchange ? <ReferenceExchange workspace={workspace} state={importState} dictionary={search.dictionary} onFile={importFile} />
        : tab ? <Panel title="Доступ ограничен">У вашей роли нет доступа к этой вкладке.</Panel>
          : <div className="reference-workbench">
            <section className="reference-directory" aria-label="Перечень справочников">
              <div className="reference-directory-toolbar">
                <div className="reference-pane-title"><BookOpen size={17} /><strong>Каталог</strong><span>{catalog.length}</span></div>
                <label className="reference-search"><Search size={16} /><input aria-label="Поиск справочника" placeholder="Наименование или код" value={directorySearch} onChange={event => setDirectorySearch(event.target.value)} /></label>
              </div>
              <div ref={directory} className="reference-directory-list">{catalog.map(({ item, metadata: itemMetadata }) => {
                const active = item.id === definition?.id
                const label = localizedName(itemMetadata, locale)
                return <button key={item.id} type="button" className={`reference-directory-row${active ? ' is-active' : ''}`}
                  aria-current={active ? 'true' : undefined} aria-label={`${label} ${item.id}`} onClick={() => chooseDictionary(item.id)}>
                  <span>{label}</span><span className="reference-row-count" aria-label="Значений">{workspace.entries.filter(entry => entry.dictionaryId === item.id).length}</span>
                  {active && <ChevronRight size={14} />}
                </button>
              })}{!catalog.length && <div className="reference-empty"><strong>Справочники не найдены</strong></div>}</div>
            </section>
            <section className="reference-document" aria-label="Работа со справочником">
              {definition && metadata && !definition.system ? <>
                <header className="reference-document-header"><div>
                  <div className="reference-document-meta"><span>{definition.id}</span><span>Значений: {entries.length}</span></div>
                  <h2>{dictionaryName}</h2>
                  {metadata.description && <p>{metadata.description}</p>}
                </div><div className="reference-document-actions">
                  {canExchange && <Button size="sm" variant="secondary" onClick={() => { setActionError(''); setExportFormat('json') }}><Download size={16} />Выгрузить</Button>}
                  <Button size="sm" variant="secondary" onClick={() => { setActionError(''); setMetadataRevision(workspace.version) }}><Pencil size={15} />{canEdit ? 'Изменить справочник' : 'О справочнике'}</Button>
                  {canEdit && <Button size="sm" onClick={() => openEntry('new')}><Plus size={16} />Добавить значение</Button>}
                </div></header>
                <section className="reference-values" aria-label="Значения справочника">
                  <div className="reference-toolbar">
                    <label className="reference-search"><Search size={16} /><input aria-label="Поиск значения" placeholder="Код или наименование" value={valueSearch} onChange={event => setValueSearch(event.target.value)} /></label>
                    <label className="reference-filter"><span>Статус</span><select value={status} onChange={event => setStatus(event.target.value)}><option value="all">Все</option><option value="active">Действующие</option><option value="inactive">Недействующие</option></select></label>
                    <label className="reference-filter"><span>Действует на дату</span><input type="date" value={date} onChange={event => setDate(event.target.value)} /></label>
                    {date && <Button size="sm" variant="quiet" onClick={() => setDate('')}>Сбросить дату</Button>}
                  </div>
                  <div className="reference-table-scroll"><table className="reference-table">
                    <thead><tr>{heading('code', 'Код')}{heading('name', 'Наименование')}{attributes.map(field => <th key={field.key}>{(locale === 'kk' ? field.labelKk : locale === 'en' ? field.labelEn : field.label) || field.label}</th>)}
                      <th>Цвет</th><th>Период действия</th><th>Статус</th>{(canEdit || canDelete) && <th>Действия</th>}
                    </tr></thead>
                    <tbody>{rows.map(({ entry, depth }) => {
                      const label = valueName(entry, locale)
                      const color = workspace.colors?.find(item => item.id === entry.values.color_id && !item.deleted)
                      return <tr key={entry.id} className={entry.active ? undefined : 'reference-inactive'}>
                        <td>{entry.values.code}</td>
                        <td><button className="reference-table-link" type="button" onClick={() => openEntry(entry.id)}>{entry.values.parent_id ? `${'  '.repeat(Math.min(Math.max(0, depth - 1), 8))}↳ ` : ''}{label}</button>
                          {Boolean(entry.values.is_group) && <small>Группа</small>}</td>
                        {attributes.map(field => <td key={field.key}>{attributeValue(field, entry, workspace, locale)}</td>)}
                        <td>{color ? <span className="reference-value-color" title={localizedName(color, locale)}><ColorSample hex={color.hex} /><span>{localizedName(color, locale)}</span></span> : '—'}</td>
                        <td className="reference-period">{period(entry)}</td>
                        <td><Badge tone={entry.active ? 'success' : 'neutral'}>{entry.active ? 'Действующее' : 'Недействующее'}</Badge></td>
                        {(canEdit || canDelete) && <td><div className="reference-row-actions">
                          {canEdit && <Button variant="quiet" size="sm" aria-label={`Изменить «${label}»`} title="Изменить" onClick={() => openEntry(entry.id)}><Pencil size={15} /></Button>}
                          {canEdit && <Button variant="quiet" size="sm" aria-label={`${entry.active ? 'Перевести в недействующие' : 'Сделать действующим'} «${label}»`} title={entry.active ? 'Перевести в недействующие' : 'Сделать действующим'} onClick={() => askStatus(entry)}><Power size={15} /></Button>}
                          {canDelete && <Button variant="quiet" size="sm" aria-label={`Удалить «${label}»`} title="Удалить" onClick={() => askDelete(entry)}><Trash2 size={15} /></Button>}
                        </div></td>}
                      </tr>
                    })}</tbody>
                  </table>{visibleEntries.length === 0 && <div className="reference-empty"><strong>{entries.length ? 'Значения не найдены' : 'Пока нет значений'}</strong>
                    {entries.length > 0 && <Button size="sm" variant="quiet" onClick={() => { setValueSearch(''); setStatus('all'); setDate('') }}>Сбросить фильтры</Button>}
                  </div>}</div>
                </section>
              </> : <div className="reference-empty reference-document-empty"><span className="reference-empty-icon"><BookOpen size={28} /></span><strong>Справочник не найден</strong><span>Выберите справочник в каталоге.</span></div>}
            </section>
          </div>}
    {!tab && definition && !definition.system && !confirmation && (selected || creating) && <ReferenceDialog title={creating ? 'Новое значение' : 'Карточка значения'} pending={mutation.isPending} wide dirty={dirty} onClose={closeEntry}>
      <ReferenceEntryEditor key={`${selected?.id ?? 'new'}:${editorKey}`} definition={definition} dictionaryName={dictionaryName} entry={selected} workspace={workspace}
        pending={mutation.isPending} error={mutation.error?.message} readOnly={!canEdit} onDirty={setDirty} onClose={closeEntry}
        onSave={(values, expectedRevision) => mutation.mutate({
          operation: creating ? 'created' : 'updated', values, dictionaryId: definition.id, entryId: selected?.id,
          expectedVersion: workspace.version, expectedRevision, expectedSchemaVersion: definition.schemaVersion,
        })}
        onRefresh={mutation.error && /Обновите/.test(mutation.error.message) ? () => {
          if (dirty && !window.confirm('Обновить карточку? Несохранённые изменения будут сброшены.')) return
          void query.refetch().then(response => {
            if (response.isSuccess) { resetDialog(); setEditorKey(key => key + 1) }
          })
        } : undefined}
        onStatus={canEdit && selected ? () => askStatus(selected) : undefined}
        onDelete={canDelete && selected ? () => askDelete(selected) : undefined} />
    </ReferenceDialog>}
    {confirmation && <ReferenceDialog title={confirmation.operation === 'deleted' ? 'Удалить значение?' : confirmation.operation === 'deactivated' ? 'Перевести в недействующие?' : 'Сделать действующим?'} pending={mutation.isPending} dirty={false} onClose={() => { setConfirmation(null); mutation.reset() }}>
      <form className="reference-modal-form" onSubmit={event => {
        event.preventDefault()
        mutation.mutate({ operation: confirmation.operation, dictionaryId: confirmation.entry.dictionaryId, entryId: confirmation.entry.id, expectedVersion: workspace.version, expectedRevision: confirmation.entry.version, endDate: confirmation.endDate || null })
      }}>
        <p><strong>{valueName(confirmation.entry, locale)}</strong></p>
        {confirmation.operation === 'deactivated' && <p>{referenceText(locale,
          'Значение сохранится в ранее введённых данных и перестанет предлагаться для нового выбора.',
          'Мән бұрын енгізілген деректерде сақталады, бірақ таңдауға ұсынылмайды.',
          'The value will remain in previously entered data and will no longer be offered for selection.',
        )}</p>}
        {confirmation.operation !== 'deleted' && <label className="field"><span className="field__label">Действует по</span><input type="date" required={confirmation.operation === 'deactivated'}
          min={String(confirmation.entry.values.valid_from ?? '')} value={confirmation.endDate} onChange={event => setConfirmation({ ...confirmation, endDate: event.target.value })} /></label>}
        {mutation.error && <p role="alert" className="form-alert form-alert--error">{referenceMessage(mutation.error.message, locale)}</p>}
        <footer><Button variant="secondary" disabled={mutation.isPending} onClick={() => { setConfirmation(null); mutation.reset() }}>Отмена</Button>
          <Button type="submit" disabled={mutation.isPending} variant={confirmation.operation === 'deleted' ? 'danger' : 'primary'}>{confirmation.operation === 'deleted' ? 'Удалить' : 'Подтвердить'}</Button></footer>
      </form>
    </ReferenceDialog>}
    {metadataRevision !== null && definition && metadata && <ReferenceMetadataForm definition={definition} initial={metadata} readOnly={!canEdit} pending={busy} error={referenceMessage(actionError, locale)}
      onClose={() => setMetadataRevision(null)} onSave={draft => void perform(async () => {
        update(await referenceDataRepository.updateDictionary(definition.id, draft, metadataRevision, persona))
        setMetadataRevision(null); setNotice('Справочник сохранён.')
      })} />}
    {exportFormat && definition && canExchange && <ReferenceDialog title="Выгрузить справочник" pending={busy} dirty={false} onClose={() => setExportFormat(null)}>
      <form className="reference-modal-form" onSubmit={event => {
        event.preventDefault()
        void perform(async () => {
          if (!persona) return
          const file = exportReference(workspace, definition, exportFormat, persona.name)
          update(await referenceDataRepository.changeWorkspace('adm.nsi.exchange', null, persona, () =>
            [{ action: 'NSI_EXPORT', label: `${dictionaryName} · ${entries.length} · ${exportFormat.toUpperCase()}` }],
          ))
          const url = URL.createObjectURL(new Blob([file.text], { type: file.mime }))
          const anchor = document.createElement('a')
          anchor.href = url; anchor.download = file.name; anchor.click()
          setTimeout(() => URL.revokeObjectURL(url), 1000)
          setExportFormat(null)
        })
      }}>
        <p>{dictionaryName} · значений: {entries.length}</p>
        <label className="field"><span className="field__label">Формат файла</span><select value={exportFormat} onChange={event => setExportFormat(event.target.value as ExchangeFormat)}><option value="json">JSON</option><option value="xml">XML</option><option value="csv">CSV</option></select></label>
        {actionError && <p role="alert" className="form-alert form-alert--error">{referenceMessage(actionError, locale)}</p>}
        <footer><Button variant="secondary" disabled={busy} onClick={() => setExportFormat(null)}>Отмена</Button><Button type="submit" disabled={busy}><Download size={16} />Скачать</Button></footer>
      </form>
    </ReferenceDialog>}
    {historyOpen && <ReferenceHistory workspace={workspace} onClose={() => setHistoryOpen(false)} />}
  </div>
}

function ReferenceHistory({ workspace, onClose }: { workspace: ReferenceWorkspace; onClose: () => void }) {
  const labels: Record<string, string> = { name: 'Наименование', nameKk: 'Наименование на казахском', nameEn: 'Наименование на английском', description: 'Описание', code: 'Код', hex: 'HEX', deleted: 'Удалён', active: 'Статус' }
  const records = [
    ...workspace.changes.map(change => ({
      id: change.id, action: operations[change.operation], actor: change.actor, occurredAt: change.occurredAt,
      label: referenceEntryLabel((change.after ?? change.before)!), dictionaryId: change.dictionaryId,
      before: change.before && { ...change.before.values, active: change.before.active ? 'Действующее' : 'Недействующее' },
      after: change.after && { ...change.after.values, active: change.after.active ? 'Действующее' : 'Недействующее' },
    })),
    ...(workspace.activity ?? []).filter(event => event.action !== 'NSI_ITEM_CREATE').map(event => ({ ...event, action: activityNames[event.action] ?? event.action, dictionaryId: undefined })),
  ].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
  return <ReferenceDialog title="Журнал изменений" wide onClose={onClose}>
    <div className="reference-history">{records.length ? records.map(record => {
      const before = (record.before ?? {}) as Record<string, unknown>, after = (record.after ?? {}) as Record<string, unknown>
      const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].filter(key => key !== 'id' && before[key] !== after[key])
      return <article key={record.id}><div className="reference-history-heading"><span className="reference-history-icon"><History size={16} /></span>
        <div><strong>{record.label}</strong><small>{record.actor} · {new Date(record.occurredAt).toLocaleString('ru-RU')}</small></div><Badge tone="neutral">{record.action}</Badge>
      </div>{keys.length > 0 && <dl>{keys.map(key => <div key={key}>
        <dt>{(record.dictionaryId ? referenceDefinition(record.dictionaryId)?.fields.find(field => field.key === key)?.label : undefined) ?? labels[key] ?? key}</dt>
        <dd><span>{String(before[key] ?? '—')}</span><ChevronRight size={13} /><strong>{String(after[key] ?? '—')}</strong></dd>
      </div>)}</dl>}</article>
    }) : <div className="reference-empty"><strong>Изменений пока нет</strong></div>}</div>
  </ReferenceDialog>
}
