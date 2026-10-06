import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { ArrowLeft, BookOpen, ChevronRight, Download, History, Plus, Search, Trash2, X } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { referenceDefinitions, referenceDefinition } from '../../entities/reference-data/model/catalog'
import { referenceEntryLabel, type ReferenceEntry, type ReferenceDefinition, type ReferenceValue, type ReferenceWorkspace } from '../../entities/reference-data/model/types'
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
const tabs = [{ id: 'all', label: 'Все' }, { id: 'ordinary', label: 'Обычные' }, { id: 'reff', label: 'Reff справочники' }]
const historyValue = (entry: ReferenceEntry | null, key: string) => key === 'active' ? entry ? entry.active ? 'Активный' : 'Неактивный' : '—' : String(entry?.values[key] ?? '—')

export function ReferenceDataPage() {
  const { persona } = useSession()
  const client = useQueryClient()
  const navigate = useNavigate()
  const search = useSearch({ from: '/admin/references' })
  const definition = referenceDefinition(search.dictionary ?? '')
  const query = useQuery({ queryKey: ['reference-data'], queryFn: () => referenceDataRepository.get(), enabled: hasPermission(persona, 'administration.references.view') })
  const [kind, setKind] = useState('all')
  const [text, setText] = useState('')
  const [newEntry, setNewEntry] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [revision, setRevision] = useState(0)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const [confirm, setConfirm] = useState<ReferenceCommand | null>(null)
  const canCreate = hasPermission(persona, 'administration.references.create')
  const canUpdate = hasPermission(persona, 'administration.references.update')
  const canStatus = hasPermission(persona, 'administration.references.status')
  const canDelete = hasPermission(persona, 'administration.references.delete')
  const mutation = useMutation({
    mutationFn: (command: ReferenceCommand) => referenceDataRepository.execute(command, persona),
    onSuccess: (workspace, command) => {
      client.setQueryData(['reference-data'], workspace)
      setDirty(false); setNewEntry(false); setConfirm(null); setRevision((value) => value + 1)
      setNotice(operations[command.operation] + ' выполнено. Данные сохранены.')
      if (command.operation === 'created') void navigate({ to: '/admin/references', search: { dictionary: command.dictionaryId, entry: workspace.changes.at(-1)?.after?.id } })
      else if (command.operation !== 'deleted') void navigate({ to: '/admin/references', search: { dictionary: command.dictionaryId, entry: command.entryId } })
      if (command.operation === 'deleted') void navigate({ to: '/admin/references', search: { dictionary: command.dictionaryId } })
    },
  })
  const discard = () => !dirty || window.confirm('Есть несохранённые изменения. Отменить их и продолжить?')
  const resetEditor = () => { setDirty(false); setNewEntry(false); setHistoryOpen(false); setNotice(''); mutation.reset(); setRevision((value) => value + 1) }
  const selectDictionary = (id: string) => { if (mutation.isPending || !discard()) return; resetEditor(); void navigate({ to: '/admin/references', search: { dictionary: id } }) }
  if (!hasPermission(persona, 'administration.references.view')) return <Panel title="Доступ ограничен">Нет права просмотра справочников.</Panel>
  if (query.error) return <Panel title="Не удалось загрузить справочники"><p role="alert">{query.error.message}</p><Button onClick={() => void query.refetch()}>Повторить</Button></Panel>
  if (query.isLoading || !query.data) return <div className="page-loading"><span /><p>Загружаем справочники…</p></div>
  const workspace = query.data
  const entries = workspace.entries.filter((entry) => entry.dictionaryId === definition?.id)
  const selected = newEntry ? undefined : search.entry ? entries.find((entry) => entry.id === search.entry) : entries[0]
  const catalog = referenceDefinitions.filter((item) => (kind === 'all' || item.kind === kind) && (item.label + ' ' + item.id).toLocaleLowerCase('ru').includes(text.toLocaleLowerCase('ru')))
  const changes = workspace.changes.filter((change) => change.dictionaryId === definition?.id).reverse()
  const exportData = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ synthetic: true, dictionaryId: definition?.id, entries }, null, 2)], { type: 'application/json' }))
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = (definition?.id ?? 'references') + '.json'; anchor.click(); URL.revokeObjectURL(url)
  }
  return <div className="page-stack reference-page">
    <PageHeader eyebrow="Администрирование · ADM-02" title="Справочники" description="Выберите справочник и измените значения в панели справа." actions={<Link to="/admin" className="button button--secondary button--md"><ArrowLeft size={16} /> Администрирование</Link>} />
    <div className="reference-workbench">
      <section className="reference-directory" aria-label="Перечень справочников">
        <div className="reference-directory-toolbar">
          <div className="reference-tabs" role="tablist" aria-label="Тип справочника">{tabs.map((tab, index) => <button key={tab.id} type="button" role="tab" id={'reference-tab-' + tab.id} aria-selected={kind === tab.id} aria-controls="reference-directory-list" tabIndex={kind === tab.id ? 0 : -1} onClick={() => setKind(tab.id)} onKeyDown={(event) => { const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : null; if (next !== null) { event.preventDefault(); setKind(tabs[next]!.id); document.getElementById('reference-tab-' + tabs[next]!.id)?.focus() } }}>{tab.label}<span>{referenceDefinitions.filter((item) => tab.id === 'all' || item.kind === tab.id).length}</span></button>)}</div>
          <label className="reference-search"><Search size={17} /><input aria-label="Поиск справочника" placeholder="Найти по названию или коду…" value={text} onChange={(event) => setText(event.target.value)} /></label>
        </div>
        <div className="reference-list-caption"><span>Название справочника</span><span>Тип / записи</span></div>
        <div id="reference-directory-list" role="tabpanel" aria-labelledby={'reference-tab-' + kind} className="reference-directory-list">
          {catalog.map((item) => <button className={'reference-directory-row' + (item.id === definition?.id ? ' is-active' : '')} key={item.id} type="button" aria-pressed={item.id === definition?.id} onClick={() => selectDictionary(item.id)}><span className="reference-row-icon"><BookOpen size={18} /></span><span className="reference-row-title"><strong>{item.label}</strong><small>{item.id}</small></span><Badge tone={item.kind === 'reff' ? 'info' : 'neutral'}>{item.kind === 'reff' ? 'Reff' : 'Обычный'}</Badge><span className="reference-row-count" title="Количество записей">{workspace.entries.filter((entry) => entry.dictionaryId === item.id).length}</span><ChevronRight size={16} /></button>)}
          {!catalog.length && <div className="reference-empty"><Search size={28} /><strong>Справочники не найдены</strong><span>Измените поиск или выберите другой таб.</span></div>}
        </div>

      </section>
      <aside className="reference-inspector" aria-label="Поля справочника">
        {!definition ? <div className="reference-empty"><BookOpen size={32} /><strong>{search.dictionary ? 'Справочник не найден' : 'Выберите справочник'}</strong><span>Его поля и записи появятся здесь.</span></div> : <>
          <header className="reference-inspector-header"><Badge tone={definition.kind === 'reff' ? 'info' : 'neutral'}>{definition.kind === 'reff' ? 'Reff справочник' : 'Обычный справочник'}</Badge><h2>{definition.label}</h2><small>{definition.id}</small></header>
          {!historyOpen && definition.provisional && <div className="form-alert">Предварительная схема: поля отсутствуют в переданном HTML и требуют согласования.</div>}
          {!historyOpen && !canUpdate && <div className="form-alert">Только просмотр</div>}
          <div className="reference-inspector-actions reference-inspector-toolbar">
            <div className="reference-primary-actions" hidden={historyOpen}><Button size="sm" variant="secondary" onClick={exportData}><Download size={15} /> Экспорт</Button>{canCreate && <Button size="sm" disabled={mutation.isPending} onClick={() => { if (discard()) { resetEditor(); setNewEntry(true) } }}><Plus size={15} /> Запись</Button>}</div>
            <Button className="reference-history-toggle" size="sm" variant="secondary" aria-expanded={historyOpen} aria-controls="reference-history" onClick={() => setHistoryOpen((value) => !value)}>{historyOpen ? <X size={15} /> : <History size={15} />}{historyOpen ? 'Закрыть историю' : 'История'}</Button>
          </div>
          <div hidden={historyOpen} className="reference-editor-content">
          <label className="field"><span className="field__label">Запись справочника</span><select aria-label="Запись справочника" disabled={mutation.isPending} value={newEntry ? 'new' : selected?.id ?? ''} onChange={(event) => { if (!discard()) return; resetEditor(); void navigate({ to: '/admin/references', search: { dictionary: definition.id, entry: event.target.value } }) }}><option value="" disabled>Выберите запись</option>{newEntry && <option value="new">Новая запись</option>}{entries.map((entry) => <option key={entry.id} value={entry.id}>{referenceEntryLabel(entry)}{entry.active ? '' : ' · неактивная'}</option>)}</select></label>
          {notice && <div className="success-message" role="status">{notice}</div>}
          {mutation.error && !confirm && <div className="form-alert form-alert--error" role="alert">{mutation.error.message}<Button size="sm" variant="secondary" onClick={() => void query.refetch()}>Обновить данные</Button></div>}
          {(selected || newEntry) ? <ReferenceEntryEditor key={definition.id + ':' + (selected?.id ?? 'new') + ':' + revision} definition={definition} entry={selected} workspace={workspace} pending={mutation.isPending} canStatus={canStatus} readOnly={newEntry ? !canCreate : !canUpdate} onDirty={() => setDirty(true)} onClose={resetEditor} onSave={(values, active) => mutation.mutate({ dictionaryId: definition.id, entryId: selected?.id, operation: newEntry ? 'created' : 'updated', values, active, expectedVersion: workspace.version })} /> : <div className="reference-empty"><strong>{search.entry ? 'Запись не найдена' : 'Нет записей'}</strong><span>Выберите существующую или добавьте новую запись.</span></div>}
          {dirty && <small className="reference-draft-note" role="status">Есть несохранённые изменения</small>}
          {selected && <div className="reference-inspector-actions reference-danger-actions">{canStatus && <Button size="sm" variant="secondary" disabled={mutation.isPending || dirty} onClick={() => { mutation.reset(); setConfirm({ operation: selected.active ? 'deactivated' : 'activated', dictionaryId: definition.id, entryId: selected.id, expectedVersion: workspace.version }) }}>{selected.active ? 'Деактивировать' : 'Активировать'}</Button>}{canDelete && <Button size="sm" variant="danger" disabled={mutation.isPending || dirty} onClick={() => { mutation.reset(); setConfirm({ operation: 'deleted', dictionaryId: definition.id, entryId: selected.id, expectedVersion: workspace.version }) }}><Trash2 size={15} /> Удалить</Button>}</div>}
          </div>
          {historyOpen && <section id="reference-history" className="reference-history"><h3>История изменений</h3>{!changes.length && <p>Изменений пока нет.</p>}{changes.map((change) => <article key={change.id}><strong>{operations[change.operation]} · {referenceEntryLabel(change.after ?? change.before!)}</strong><small>{change.actor} · {new Date(change.occurredAt).toLocaleString('ru-RU')}</small><dl>{['active', ...definition.fields.map((field) => field.key)].filter((key) => historyValue(change.before, key) !== historyValue(change.after, key)).map((key) => <div key={key}><dt>{key === 'active' ? 'Статус' : definition.fields.find((field) => field.key === key)?.label}</dt><dd>{historyValue(change.before, key)} → {historyValue(change.after, key)}</dd></div>)}</dl></article>)}</section>}
        </>}
      </aside>
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
  return <div className="reference-dialog-backdrop" onMouseDown={(event) => { if (!pending && event.target === event.currentTarget) onClose() }}><section ref={ref} className="reference-dialog" role="dialog" aria-modal="true" aria-labelledby="reference-dialog-title" tabIndex={-1} onKeyDown={(event) => {
    if (event.key === 'Escape' && !pending) { event.stopPropagation(); onClose() }
    if (event.key === 'Tab') {
      const elements = [...(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)') ?? [])]
      const first = elements[0]; const last = elements.at(-1)
      if (event.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === ref.current)) { event.preventDefault(); first?.focus() }
    }
  }}><header><div><h2 id="reference-dialog-title">{title}</h2></div><Button variant="quiet" disabled={pending} onClick={onClose} aria-label="Закрыть форму"><X size={20} /></Button></header>{children}</section></div>
}

export function ReferenceEntryEditor({ definition, entry, workspace, pending, error, canStatus, readOnly, onDirty, onClose, onSave }: { definition: ReferenceDefinition; entry?: ReferenceEntry; workspace: ReferenceWorkspace; pending: boolean; error?: string; canStatus: boolean; readOnly: boolean; onDirty: () => void; onClose: () => void; onSave: (values: Record<string, ReferenceValue>, active: boolean) => void }) {
  const [values, setValues] = useState<Record<string, ReferenceValue>>(() => entry ? { ...entry.values } : Object.fromEntries(definition.fields.map((field) => [field.key, field.type === 'boolean' ? false : null])))
  const [active, setActive] = useState(entry?.active ?? true)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const setValue = (key: string, value: ReferenceValue) => { onDirty(); setValues((current) => ({ ...current, [key]: value })) }
  const submit = () => {
    const normalized = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value]))
    const nextErrors = validateReferenceValues(definition.id, normalized, workspace, entry?.id)
    setErrors(nextErrors)
    if (!Object.keys(nextErrors).length) onSave(normalized, active)
  }
  return <form className="reference-entry-form" onSubmit={(event) => { event.preventDefault(); if (!readOnly && !pending) submit() }}>
    <label className="field"><span className="field__label">ID</span><input aria-label="ID записи" readOnly value={entry?.id ?? 'Будет присвоен при сохранении'} /></label><p className="reference-form-hint">Фиксированная структура. ID присваивается автоматически и не изменяется.</p>
    {error && <div className="form-alert form-alert--error" role="alert">{error}</div>}
    {Object.keys(errors).length > 0 && <div className="form-alert form-alert--error" role="alert">Проверьте отмеченные поля. Значения сохранены в форме.</div>}
    <div className="reference-form-grid">
      {definition.fields.filter((field) => field.key !== 'is_active').map((field) => {
        const value = values[field.key]
        const controlProps = { id: `reference-field-${field.key}`, disabled: pending || readOnly, 'aria-invalid': Boolean(errors[field.key]), 'aria-describedby': errors[field.key] ? `reference-error-${field.key}` : undefined }
        return <div className={`field${field.type === 'textarea' || field.type === 'json' ? ' reference-field-wide' : ''}`} key={field.key}>
          <label className="field__label" htmlFor={controlProps.id}>{field.label}{field.required && <span aria-label="обязательно"> *</span>}<small>{field.key}</small></label>
          {field.type === 'reference' ? <select {...controlProps} value={String(value ?? '')} onChange={(event) => setValue(field.key, event.target.value || null)}><option value="">Не выбрано</option>{workspace.entries.filter((item) => item.dictionaryId === field.reference && (item.active || item.id === value) && (field.key !== 'parent_id' || item.id !== entry?.id)).map((item) => <option key={item.id} value={item.id}>{referenceEntryLabel(item)}{item.active ? '' : ' · неактивный'}</option>)}</select> : field.type === 'boolean' ? <select {...controlProps} value={String(value ?? false)} onChange={(event) => setValue(field.key, event.target.value === 'true')}><option value="false">Нет</option><option value="true">Да</option></select> : field.type === 'json' || field.type === 'textarea' ? <textarea {...controlProps} rows={3} maxLength={field.maxLength} value={String(value ?? '')} onChange={(event) => setValue(field.key, event.target.value)} /> : <input {...controlProps} type={field.type === 'number' || field.type === 'integer' ? 'number' : 'text'} step={field.type === 'integer' ? 1 : 'any'} maxLength={field.maxLength} value={value === null || value === undefined ? '' : String(value)} onChange={(event) => setValue(field.key, field.type === 'number' || field.type === 'integer' ? event.target.value === '' ? null : Number(event.target.value) : event.target.value)} />}
          {errors[field.key] && <small id={`reference-error-${field.key}`} className="reference-field-error">{errors[field.key]}</small>}
        </div>
      })}
      <label className="field"><span className="field__label">Статус</span><select value={active ? 'active' : 'inactive'} disabled={pending || readOnly || !canStatus} onChange={(event) => { onDirty(); setActive(event.target.value === 'active') }}><option value="active">Активный</option><option value="inactive">Неактивный</option></select></label>
    </div>
    {!readOnly && <footer><Button variant="secondary" disabled={pending} onClick={onClose}>Отменить</Button><Button type="submit" disabled={pending}>{pending ? 'Сохраняем…' : 'Сохранить'}</Button></footer>}
  </form>
}
