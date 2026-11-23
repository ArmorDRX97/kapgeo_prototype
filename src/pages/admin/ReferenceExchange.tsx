import { FileUp, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { referenceDefinitions } from '../../entities/reference-data/model/catalog'
import type { ImportResult, ReferenceWorkspace } from '../../entities/reference-data/model/types'
import { dictionaryMetadata } from '../../repository/demo/referenceDataRepository'
import { useUiLocale } from '../../shared/lib/useUiLocale'
import { Button } from '../../shared/ui/Button'
import { referenceImportMessage } from './reference-messages'

export type ExchangeState = { filename: string; pending: boolean; result?: ImportResult }
const pageSize = 10

export function ReferenceExchange({ workspace, state, dictionary, onFile }: {
  workspace: ReferenceWorkspace
  state: ExchangeState | null
  dictionary?: string
  onFile: (file: File, fallback?: string) => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const [fallback, setFallback] = useState<string>()
  const [dragging, setDragging] = useState(false)
  const [page, setPage] = useState(0)
  const locale = useUiLocale()
  const pending = Boolean(state?.pending)
  const target = fallback ?? (referenceDefinitions.some(item => item.id === dictionary && !item.system) ? dictionary : undefined) ?? ''
  const choose = (file?: File) => {
    if (!file || pending) return
    setPage(0)
    onFile(file, target || undefined)
  }
  const result = state?.result
  const errors = result?.errors ?? []
  const pages = Math.ceil(errors.length / pageSize)
  const current = Math.min(page, Math.max(0, pages - 1))
  const options = referenceDefinitions.filter(item => !item.system).map(definition => ({
    id: definition.id, name: dictionaryMetadata(workspace, definition).name,
  })).sort((a, b) => a.name.localeCompare(b.name, 'ru'))
  return <section className="reference-document reference-standalone" aria-label="Импорт справочников">
    <header className="reference-document-header"><h2>Импорт значений справочников</h2></header>
    <div className="reference-exchange-body">
      <div className={`reference-drop${dragging ? ' is-dragging' : ''}`} onDragOver={event => {
        event.preventDefault()
        event.dataTransfer.dropEffect = pending ? 'none' : 'copy'
        if (!pending) setDragging(true)
      }} onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false) }} onDrop={event => {
        event.preventDefault(); setDragging(false); choose(event.dataTransfer.files[0])
      }}>
        <span className="reference-empty-icon"><FileUp size={28} /></span>
        <strong>Перетащите файл сюда</strong>
        <p>XML, JSON, CSV или ZIP с CSV-файлами · до 50 МБ</p>
        <input ref={input} hidden type="file" accept=".xml,.json,.csv,.zip" onChange={event => {
          choose(event.target.files?.[0]); event.target.value = ''
        }} />
        <Button variant="secondary" disabled={pending} onClick={() => input.current?.click()}><Upload size={16} />Выбрать файл</Button>
      </div>
      <label className="field reference-exchange-target"><span className="field__label">Справочник для отдельного CSV</span>
        <select disabled={pending} value={target} onChange={event => setFallback(event.target.value)}>
          <option value="">Определить по имени файла</option>
          {options.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
        </select>
      </label>
      {pending && <section className="reference-import-result" aria-live="polite">
        <h3>Проверка файла</h3><p>{state?.filename}</p><progress aria-label="Загрузка и проверка файла" />
      </section>}
      {result && <section className="reference-import-result" aria-label="Результат импорта">
        <h3 role="status">{errors.length ? 'Файл не загружен' : 'Файл загружен'}</h3>
        <p>{state?.filename}{errors.length > 0 && ' · ни одно значение не добавлено'}</p>
        <div className="reference-table-scroll">{errors.length ? <table className="reference-table">
          <thead><tr><th>Место в файле</th><th>Справочник</th><th>Код значения</th><th>Ошибка</th></tr></thead>
          <tbody>{errors.slice(current * pageSize, (current + 1) * pageSize).map((error, index) => <tr key={index}>
            <td>{error.location || '—'}</td><td>{error.dictionary || '—'}</td><td>{error.item || '—'}</td>
            <td>{referenceImportMessage(error, locale)}<small>{error.code}</small></td>
          </tr>)}</tbody>
        </table> : <table className="reference-table">
          <thead><tr><th>Справочник</th><th>Добавлено</th><th>Пропущено</th></tr></thead>
          <tbody>{result.rows.map(row => <tr key={row.dictionary}><td>{row.dictionary}</td><td>{row.added}</td><td>{row.skipped}</td></tr>)}</tbody>
          <tfoot><tr><th scope="row">Итого</th><td>{result.rows.reduce((sum, row) => sum + row.added, 0)}</td><td>{result.rows.reduce((sum, row) => sum + row.skipped, 0)}</td></tr></tfoot>
        </table>}</div>
        {pages > 1 && <div className="reference-pagination"><Button size="sm" variant="secondary" disabled={!current} onClick={() => setPage(current - 1)}>Назад</Button>
          <span>Страница {current + 1} из {pages}</span><Button size="sm" variant="secondary" disabled={current + 1 >= pages} onClick={() => setPage(current + 1)}>Далее</Button>
        </div>}
      </section>}
    </div>
  </section>
}
