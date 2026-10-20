import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { ArrowLeft, BookOpen, Check, ChevronRight, Download, History, Plus, Save, Search, Trash2, X } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { referenceDefinitions, referenceDefinition } from '../../entities/reference-data/model/catalog'
import { referenceEntryLabel, type ReferenceEntry, type ReferenceDefinition, type ReferenceField, type ReferenceValue, type ReferenceWorkspace } from '../../entities/reference-data/model/types'
import { validateReferenceValues } from '../../entities/reference-data/lib/validation'
import { useSession } from '../../entities/session/model/sessionContext'
import { referenceDataRepository, type ReferenceCommand } from '../../repository/demo/referenceDataRepository'
import { hasPermission } from '../../shared/auth/permissions'
import { Badge } from '../../shared/ui/Badge'
import { Button } from '../../shared/ui/Button'
import { PageHeader } from '../../shared/ui/PageHeader'
import { Panel } from '../../shared/ui/Panel'
import './reference-data.css'

const operations = { created: 'Создание', updated: 'Изменение', activated: 'Активация', deactivated: 'Деактивация', deleted: 'Удаление' }
const tabs = [{ id: 'all', label: 'Все' }, { id: 'ordinary', label: 'Обычные' }, { id: 'reff', label: 'Reff' }]
const languages = [{ id: 'ru', label: 'RU', name: 'Русский' }, { id: 'kk', label: 'KZ', name: 'Қазақша' }, { id: 'en', label: 'EN', name: 'English' }] as const
const historyValue = (entry: ReferenceEntry | null, key: string) => key === 'active' ? entry ? entry.active ? 'Активная' : 'Неактивная' : '—' : String(entry?.values[key] ?? '—')
const fieldLanguage = (field: ReferenceField) => languages.find(language => field.key.endsWith(`_${language.id}`))?.id

function revealSelection(list: HTMLElement | null, selector: string) {
  const row = list?.querySelector<HTMLElement>(selector)
  if (!list || !row) return
  const top = row.getBoundingClientRect().top - list.getBoundingClientRect().top + list.scrollTop
  if (top < list.scrollTop) list.scrollTop = top - 6
  else if (top + row.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = top + row.offsetHeight - list.clientHeight + 6
}

export function ReferenceDataPage() {
  const { persona } = useSession()
  const client = useQueryClient(), navigate = useNavigate(), search = useSearch({ from: '/admin/references' })
  const definition = referenceDefinition(search.dictionary ?? '')
  const query = useQuery({ queryKey: ['reference-data'], queryFn: () => referenceDataRepository.get(), enabled: hasPermission(persona, 'administration.references.view') })
  const [kind, setKind] = useState('all'), [text, setText] = useState('')
  const [entryText, setEntryText] = useState(''), [status, setStatus] = useState('all')
  const [newEntry, setNewEntry] = useState(false), [dirty, setDirty] = useState(false), [revision, setRevision] = useState(0)
  const [historyOpen, setHistoryOpen] = useState(false), [notice, setNotice] = useState('')
  const [confirm, setConfirm] = useState<ReferenceCommand | null>(null)
  const directoryList = useRef<HTMLDivElement>(null), recordList = useRef<HTMLDivElement>(null)
  const canCreate = hasPermission(persona, 'administration.references.create'), canUpdate = hasPermission(persona, 'administration.references.update')
  const canStatus = hasPermission(persona, 'administration.references.status'), canDelete = hasPermission(persona, 'administration.references.delete')
  useEffect(() => {
    revealSelection(directoryList.current, '.is-active')
    if (!historyOpen) revealSelection(recordList.current, '.is-selected')
  }, [query.data, search.dictionary, search.entry, kind, text, entryText, status, historyOpen])
  const mutation = useMutation({
    mutationFn: (command: ReferenceCommand) => referenceDataRepository.execute(command, persona),
    onSuccess: (workspace, command) => {
      client.setQueryData(['reference-data'], workspace)
      setDirty(false); setNewEntry(false); setConfirm(null); setRevision(value => value + 1)
      setNotice(operations[command.operation] + ' выполнено. Данные сохранены.')
      const entry = command.operation === 'created' ? workspace.changes.at(-1)?.after?.id : command.operation === 'deleted' ? undefined : command.entryId
      if (command.operation === 'created') { setEntryText(''); setStatus('all') }
      void navigate({ to: '/admin/references', search: { dictionary: command.dictionaryId, ...(entry ? { entry } : {}) }, resetScroll: false })
    },
  })
  const discard = () => !dirty || window.confirm('Есть несохранённые изменения. Отменить их и продолжить?')
  const resetEditor = () => { setDirty(false); setNewEntry(false); setHistoryOpen(false); setNotice(''); mutation.reset(); setRevision(value => value + 1) }
  const selectDictionary = (id: string) => {
    if (mutation.isPending || !discard()) return
    resetEditor(); setEntryText(''); setStatus('all')
    void navigate({ to: '/admin/references', search: { dictionary: id }, resetScroll: false })
  }
  const selectEntry = (id: string) => {
    if (!definition || mutation.isPending || !discard()) return
    resetEditor()
    void navigate({ to: '/admin/references', search: { dictionary: definition.id, entry: id }, resetScroll: false })
  }
  if (!hasPermission(persona, 'administration.references.view')) return <Panel title="Доступ ограничен">Нет права просмотра справочников.</Panel>
  if (query.error) return <Panel title="Не удалось загрузить справочники"><p role="alert">{query.error.message}</p><Button onClick={() => void query.refetch()}>Повторить</Button></Panel>
  if (query.isLoading || !query.data) return <div className="page-loading"><span /><p>Загружаем справочники…</p></div>
  const workspace = query.data, entries = workspace.entries.filter(entry => entry.dictionaryId === definition?.id)
  const selected = newEntry ? undefined : search.entry ? entries.find(entry => entry.id === search.entry) : entries[0]
  const catalog = referenceDefinitions.filter(item => (kind === 'all' || item.kind === kind) && `${item.label} ${item.id}`.toLocaleLowerCase('ru').includes(text.trim().toLocaleLowerCase('ru')))
  const visibleEntries = entries.filter(entry => (status === 'all' || entry.active === (status === 'active')) && `${referenceEntryLabel(entry)} ${entry.values.code ?? ''} ${entry.values.name_kk ?? ''} ${entry.values.name_en ?? ''}`.toLocaleLowerCase('ru').includes(entryText.trim().toLocaleLowerCase('ru')))
  const changes = workspace.changes.filter(change => change.dictionaryId === definition?.id).reverse()
  const exportData = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ synthetic: true, dictionaryId: definition?.id, entries }, null, 2)], { type: 'application/json' }))
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = (definition?.id ?? 'references') + '.json'; anchor.click(); URL.revokeObjectURL(url)
  }
  return <div className="page-stack reference-page">
    <PageHeader eyebrow="Администрирование" title="Справочники" description="Записи, наименования и параметры справочников системы." actions={<Link to="/admin" className="button button--secondary button--md"><ArrowLeft size={16} /> Администрирование</Link>} />
    <div className="reference-workbench">
      <section className="reference-directory" aria-label="Перечень справочников">
        <div className="reference-directory-toolbar">
          <div className="reference-pane-title"><BookOpen size={17} /><strong>Каталог</strong><span>{referenceDefinitions.length}</span></div>
          <div className="reference-tabs" role="tablist" aria-label="Тип справочника">{tabs.map((tab, index) => <button key={tab.id} type="button" role="tab" id={`reference-tab-${tab.id}`} aria-selected={kind === tab.id} aria-controls="reference-directory-list" tabIndex={kind === tab.id ? 0 : -1} onClick={() => setKind(tab.id)} onKeyDown={event => {
            const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : null
            if (next !== null) { event.preventDefault(); setKind(tabs[next]!.id); document.getElementById(`reference-tab-${tabs[next]!.id}`)?.focus() }
          }}>{tab.label}</button>)}</div>
          <label className="reference-search"><Search size={16} /><input aria-label="Поиск справочника" placeholder="Найти справочник…" value={text} onChange={event => setText(event.target.value)} />{text && <button type="button" aria-label="Очистить поиск справочника" onClick={() => setText('')}><X size={14} /></button>}</label>
        </div>
        <div ref={directoryList} id="reference-directory-list" role="tabpanel" aria-labelledby={`reference-tab-${kind}`} className="reference-directory-list">
          {(['ordinary', 'reff'] as const).map(group => {
            const items = catalog.filter(item => item.kind === group)
            return items.length > 0 && <div className="reference-catalog-group" key={group}><div className="reference-group-title"><span>{group === 'ordinary' ? 'Обычные справочники' : 'Reff справочники'}</span><span>{items.length}</span></div>{items.map(item => <button className={`reference-directory-row${item.id === definition?.id ? ' is-active' : ''}`} key={item.id} type="button" aria-label={`${item.label} ${item.id}`} aria-pressed={item.id === definition?.id} onClick={() => selectDictionary(item.id)} title={item.label}><span>{item.label}</span><span className="reference-row-count" aria-label="Записей">{workspace.entries.filter(entry => entry.dictionaryId === item.id).length}</span>{item.id === definition?.id && <ChevronRight size={14} />}</button>)}</div>
          })}
          {!catalog.length && <div className="reference-empty"><Search size={24} /><strong>Ничего не найдено</strong><span>Измените название или код в поиске.</span></div>}
        </div>
        <div className="reference-directory-footer">Показано {catalog.length} из {referenceDefinitions.length}</div>
      </section>
      <section className="reference-document" aria-label="Работа со справочником">
        {!definition ? <div className="reference-empty reference-document-empty"><span className="reference-empty-icon"><BookOpen size={28} /></span><strong>{search.dictionary ? 'Справочник не найден' : 'Выберите справочник'}</strong><span>Выберите название в каталоге слева.<br />Здесь появятся записи и форма редактирования.</span></div> : <>
          <header className="reference-document-header"><div><div className="reference-document-meta"><Badge tone={definition.kind === 'reff' ? 'info' : 'neutral'}>{definition.kind === 'reff' ? 'Reff' : 'Обычный справочник'}</Badge><span>Записей: {entries.length}</span></div><h2>{definition.label}</h2></div><div className="reference-document-actions"><Button size="sm" variant="secondary" onClick={exportData}><Download size={15} /> Экспорт</Button>{canCreate && <Button size="sm" disabled={mutation.isPending || newEntry} onClick={() => { if (discard()) { resetEditor(); setNewEntry(true) } }}><Plus size={16} /> Добавить запись</Button>}</div></header>
          <div className="reference-document-tabs"><Button size="sm" variant={historyOpen ? 'quiet' : 'secondary'} aria-pressed={!historyOpen} onClick={() => setHistoryOpen(false)}><BookOpen size={15} />Записи<span>{entries.length}</span></Button><Button size="sm" variant={historyOpen ? 'secondary' : 'quiet'} aria-label={historyOpen ? 'Закрыть историю' : 'История'} aria-expanded={historyOpen} aria-controls="reference-history" onClick={() => setHistoryOpen(value => !value)}><History size={15} />История<span>{changes.length}</span></Button>{dirty && <span className="reference-draft-note"><span />Есть несохранённые изменения</span>}</div>
          {notice && <div className="reference-notice success-message" role="status"><Check size={16} />{notice}</div>}
          {mutation.error && !confirm && <div className="reference-notice form-alert form-alert--error" role="alert">{mutation.error.message}<Button size="sm" variant="secondary" onClick={() => void query.refetch()}>Обновить данные</Button></div>}
          <div hidden={historyOpen} className="reference-records-workspace">
            <section className="reference-records" aria-label="Записи справочника">
              <div className="reference-records-toolbar"><div className="reference-pane-title"><strong>Записи</strong><span>{visibleEntries.length} из {entries.length}</span></div><label className="reference-search"><Search size={15} /><input aria-label="Поиск записи" placeholder="Название или код…" value={entryText} onChange={event => setEntryText(event.target.value)} />{entryText && <button type="button" aria-label="Очистить поиск записи" onClick={() => setEntryText('')}><X size={14} /></button>}</label><fieldset className="reference-segmented"><legend className="sr-only">Статус записей</legend>{[{ id: 'all', label: 'Все' }, { id: 'active', label: 'Активные' }, { id: 'inactive', label: 'Неактивные' }].map(option => <label key={option.id}><input type="radio" name="reference-status-filter" value={option.id} checked={status === option.id} onChange={() => setStatus(option.id)} /><span>{option.label}</span></label>)}</fieldset></div>
              <div ref={recordList} className="reference-record-list">
                {newEntry && <div className="reference-record-row is-selected is-new"><Plus size={17} /><span><strong>Новая запись</strong><small>Заполните поля справа</small></span></div>}
                {visibleEntries.map(entry => <button type="button" key={entry.id} className={`reference-record-row${selected?.id === entry.id ? ' is-selected' : ''}`} aria-current={selected?.id === entry.id ? 'true' : undefined} onClick={() => selectEntry(entry.id)}><span><strong>{referenceEntryLabel(entry)}</strong><small>{Boolean(entry.values.code) && <span>{String(entry.values.code)}</span>}<span className={`reference-record-status${entry.active ? ' is-active' : ''}`}><i />{entry.active ? 'Активная' : 'Неактивная'}</span></small></span><ChevronRight size={14} /></button>)}
                {!visibleEntries.length && <div className="reference-empty"><Search size={24} /><strong>{entries.length ? 'Записи не найдены' : 'Пока нет записей'}</strong><span>{entries.length ? 'Попробуйте другое название или статус.' : 'Добавьте первую запись в справочник.'}</span>{entries.length > 0 && <Button variant="quiet" size="sm" onClick={() => { setEntryText(''); setStatus('all') }}>Сбросить фильтры</Button>}</div>}
              </div>
            </section>
            <aside className="reference-inspector" aria-label="Поля справочника">
              {(selected || newEntry) ? <><header className="reference-editor-header"><div><span>{newEntry ? 'Создание записи' : canUpdate ? 'Редактирование записи' : 'Только просмотр'}</span><h3>{newEntry ? 'Новая запись' : referenceEntryLabel(selected!)}</h3></div>{selected && canDelete && <Button size="sm" variant="quiet" aria-label="Удалить запись" title="Удалить запись" disabled={mutation.isPending || dirty} onClick={() => { mutation.reset(); setConfirm({ operation: 'deleted', dictionaryId: definition.id, entryId: selected.id, expectedVersion: workspace.version }) }}><Trash2 size={16} /></Button>}</header><ReferenceEntryEditor key={`${definition.id}:${selected?.id ?? 'new'}:${revision}`} definition={definition} entry={selected} workspace={workspace} pending={mutation.isPending} canStatus={canStatus} readOnly={newEntry ? !canCreate : !canUpdate} onDirty={setDirty} onClose={resetEditor} onSave={(values, active) => mutation.mutate({ dictionaryId: definition.id, entryId: selected?.id, operation: newEntry ? 'created' : 'updated', values, active, expectedVersion: workspace.version })} /></> : <div className="reference-empty"><BookOpen size={28} /><strong>{search.entry ? 'Запись не найдена' : 'Выберите запись'}</strong><span>Откройте запись из списка или добавьте новую.</span></div>}
            </aside>
          </div>
          {historyOpen && <section id="reference-history" className="reference-history"><header><h3>История изменений</h3><p>Изменения всех записей справочника, начиная с последних.</p></header>{!changes.length ? <div className="reference-empty"><History size={28} /><strong>Изменений пока нет.</strong><span>После сохранения здесь появятся автор, время и изменённые значения.</span></div> : changes.map(change => <article key={change.id}><div className="reference-history-heading"><span className="reference-history-icon"><History size={16} /></span><div><strong>{referenceEntryLabel(change.after ?? change.before!)}</strong><small>{change.actor} · {new Date(change.occurredAt).toLocaleString('ru-RU')}</small></div><Badge tone="neutral">{operations[change.operation]}</Badge></div><dl>{['active', ...definition.fields.map(field => field.key)].filter(key => historyValue(change.before, key) !== historyValue(change.after, key)).map(key => <div key={key}><dt>{key === 'active' ? 'Статус' : definition.fields.find(field => field.key === key)?.label}</dt><dd><span>{historyValue(change.before, key)}</span><ChevronRight size={13} /><strong>{historyValue(change.after, key)}</strong></dd></div>)}</dl></article>)}</section>}
        </>}
      </section>
    </div>
    {confirm && <ReferenceDialog title={operations[confirm.operation] + ' записи'} pending={mutation.isPending} onClose={() => setConfirm(null)}><p>{confirm.operation === 'deleted' ? 'Удалить запись? Если она используется в других справочниках этого раздела, удаление будет запрещено. История изменений сохранится.' : 'Изменить статус записи? Существующие связи сохранятся; неактивные записи недоступны для нового выбора.'}</p>{mutation.error && <p role="alert" className="form-alert form-alert--error">{mutation.error.message}</p>}<footer><Button variant="secondary" disabled={mutation.isPending} onClick={() => setConfirm(null)}>Отмена</Button>{mutation.error && confirm.operation === 'deleted' && canStatus && <Button disabled={mutation.isPending} variant="secondary" onClick={() => { mutation.reset(); setConfirm({ ...confirm, operation: 'deactivated' }) }}>Деактивировать вместо удаления</Button>}<Button disabled={mutation.isPending} variant={confirm.operation === 'deleted' ? 'danger' : 'primary'} onClick={() => mutation.mutate(confirm)}>Подтвердить</Button></footer></ReferenceDialog>}
  </div>
}

function ReferenceDialog({ title, children, pending, onClose }: { title: string; children: ReactNode; pending: boolean; onClose: () => void }) {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    ref.current?.focus()
    return () => previous?.focus()
  }, [])
  return <div className="reference-dialog-backdrop" onMouseDown={event => { if (!pending && event.target === event.currentTarget) onClose() }}><section ref={ref} className="reference-dialog" role="dialog" aria-modal="true" aria-labelledby="reference-dialog-title" tabIndex={-1} onKeyDown={event => {
    if (event.key === 'Escape' && !pending) { event.stopPropagation(); onClose() }
    if (event.key === 'Tab') {
      const elements = [...(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)') ?? [])]
      const first = elements[0], last = elements.at(-1)
      if (event.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === ref.current)) { event.preventDefault(); first?.focus() }
    }
  }}><header><h2 id="reference-dialog-title">{title}</h2><Button variant="quiet" disabled={pending} onClick={onClose} aria-label="Закрыть форму"><X size={20} /></Button></header>{children}</section></div>
}

function ReferenceSwitch({ id, label, description, checked, disabled, errorId, onChange }: { id: string; label: string; description?: string; checked: boolean; disabled: boolean; errorId?: string; onChange: (checked: boolean) => void }) {
  return <label className="reference-switch" htmlFor={id}><span className="reference-switch-label"><strong>{label}</strong>{description && <small>{description}</small>}</span><span className="reference-switch-control"><input id={id} type="checkbox" role="switch" aria-label={label} aria-describedby={errorId} aria-invalid={Boolean(errorId)} checked={checked} disabled={disabled} onChange={event => onChange(event.target.checked)} /><span className="reference-switch-track" aria-hidden="true" /><span className="reference-switch-value" aria-hidden="true">{checked ? 'Да' : 'Нет'}</span></span></label>
}

export function ReferenceEntryEditor({ definition, entry, workspace, pending, error, canStatus, readOnly, onDirty, onClose, onSave }: { definition: ReferenceDefinition; entry?: ReferenceEntry; workspace: ReferenceWorkspace; pending: boolean; error?: string; canStatus: boolean; readOnly: boolean; onDirty: (dirty: boolean) => void; onClose: () => void; onSave: (values: Record<string, ReferenceValue>, active: boolean) => void }) {
  const [values, setValues] = useState<Record<string, ReferenceValue>>(() => entry ? { ...entry.values } : Object.fromEntries(definition.fields.map(field => [field.key, field.type === 'boolean' ? false : null])))
  const [active, setActive] = useState(entry?.active ?? true), [errors, setErrors] = useState<Record<string, string>>({})
  const [language, setLanguage] = useState<(typeof languages)[number]['id']>('ru')
  const localized = definition.fields.filter(field => fieldLanguage(field)), basic = definition.fields.filter(field => field.key !== 'is_active' && !fieldLanguage(field))
  const inlineStatus = basic.length === 1 && basic[0]?.key === 'code'
  const modified = !entry || active !== entry.active || JSON.stringify(values) !== JSON.stringify(entry.values)
  useEffect(() => { onDirty(modified) }, [modified, onDirty])
  const setValue = (key: string, value: ReferenceValue) => { setValues(current => ({ ...current, [key]: value })); setErrors(current => ({ ...current, [key]: '' })) }
  const submit = () => {
    const normalized = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value]))
    const nextErrors = validateReferenceValues(definition.id, normalized, workspace, entry?.id)
    setErrors(nextErrors)
    const firstInvalid = definition.fields.find(field => nextErrors[field.key])
    if (firstInvalid) {
      const nextLanguage = fieldLanguage(firstInvalid)
      if (nextLanguage) setLanguage(nextLanguage)
      requestAnimationFrame(() => document.getElementById(`reference-field-${firstInvalid.key}`)?.focus())
    } else if (!Object.keys(nextErrors).length) onSave(normalized, active)
  }
  const renderField = (field: ReferenceField) => {
    const value = values[field.key], errorId = errors[field.key] ? `reference-error-${field.key}` : undefined
    const controlProps = { id: `reference-field-${field.key}`, disabled: pending || readOnly, 'aria-invalid': Boolean(errorId), 'aria-describedby': errorId }
    return <div className={`field${['textarea', 'json', 'boolean'].includes(field.type) || fieldLanguage(field) ? ' reference-field-wide' : ''}`} key={field.key}>
      {field.type === 'boolean' ? <ReferenceSwitch id={controlProps.id} label={field.label} checked={Boolean(value)} disabled={controlProps.disabled} errorId={errorId} onChange={checked => setValue(field.key, checked)} /> : <><label className="field__label" htmlFor={controlProps.id}>{field.label}{field.required && <span aria-label="обязательно"> *</span>}</label>
        {field.type === 'reference' ? <select {...controlProps} value={String(value ?? '')} onChange={event => setValue(field.key, event.target.value || null)}><option value="">Не выбрано</option>{workspace.entries.filter(item => item.dictionaryId === field.reference && (item.active || item.id === value) && (field.key !== 'parent_id' || item.id !== entry?.id)).map(item => <option key={item.id} value={item.id}>{referenceEntryLabel(item)}{item.active ? '' : ' · неактивная'}</option>)}</select> : field.type === 'json' || field.type === 'textarea' ? <textarea {...controlProps} rows={3} maxLength={field.maxLength} value={String(value ?? '')} onChange={event => setValue(field.key, event.target.value)} /> : <input {...controlProps} type={field.type === 'number' || field.type === 'integer' ? 'number' : 'text'} step={field.type === 'integer' ? 1 : 'any'} maxLength={field.maxLength} value={value === null || value === undefined ? '' : String(value)} onChange={event => setValue(field.key, field.type === 'number' || field.type === 'integer' ? event.target.value === '' ? null : Number(event.target.value) : event.target.value)} />}
      </>}
      {errorId && <small id={errorId} className="reference-field-error">{errors[field.key]}</small>}
    </div>
  }
  const statusControl = <ReferenceSwitch id="reference-entry-active" label="Активная запись" description={inlineStatus ? undefined : active ? 'Доступна при выборе значений' : 'Сохраняется в истории, недоступна для нового выбора'} checked={active} disabled={pending || readOnly || !canStatus} onChange={setActive} />
  return <form className="reference-entry-form" onSubmit={event => { event.preventDefault(); if (!readOnly && !pending) submit() }}>
    <div className="reference-form-body">
      {error && <div className="form-alert form-alert--error" role="alert">{error}</div>}
      {Object.values(errors).some(Boolean) && <div className="form-alert form-alert--error" role="alert">Проверьте отмеченные поля. Значения сохранены в форме.</div>}
      {basic.length > 0 && <section className="reference-field-section">{basic.length > 1 && <h4>Основные сведения</h4>}<div className="reference-form-grid">{basic.map(renderField)}{inlineStatus && <div className="reference-status-inline">{statusControl}</div>}</div></section>}
      {localized.length > 0 && <section className="reference-field-section"><div className="reference-language-heading"><h4>Наименования и описания</h4><fieldset className="reference-segmented reference-language-tabs"><legend className="sr-only">Язык полей</legend>{languages.map(option => <label key={option.id} title={option.name}><input type="radio" name="reference-field-language" aria-label={option.name} checked={language === option.id} onChange={() => setLanguage(option.id)} /><span>{option.label}{localized.some(field => fieldLanguage(field) === option.id && errors[field.key]) && <i className="reference-language-error" />}</span></label>)}</fieldset></div>{languages.map(option => <div className="reference-translation-panel" key={option.id} hidden={language !== option.id}>{localized.filter(field => fieldLanguage(field) === option.id).map(renderField)}</div>)}</section>}
      {!inlineStatus && <section className="reference-status-setting">{statusControl}</section>}
      <div className="reference-record-meta"><span>Обязательные поля отмечены *</span>{entry && <span>Версия {entry.version}</span>}</div>
    </div>
    {!readOnly && <footer><span className={modified ? 'reference-unsaved' : ''}>{pending ? 'Сохранение…' : modified ? 'Изменения не сохранены' : 'Все изменения сохранены'}</span><Button variant="secondary" disabled={pending || !modified} onClick={onClose}>Отменить</Button><Button type="submit" disabled={pending || !modified}><Save size={15} />{pending ? 'Сохраняем…' : 'Сохранить'}</Button></footer>}
  </form>
}
