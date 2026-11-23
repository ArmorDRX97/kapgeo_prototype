import { ArrowDownUp, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useState, type CSSProperties } from 'react'
import { colorUsage } from '../../entities/reference-data/lib/validation'
import type { ReferenceColor, ReferenceWorkspace } from '../../entities/reference-data/model/types'
import type { UserPersona } from '../../entities/session/model/types'
import { referenceDataRepository } from '../../repository/demo/referenceDataRepository'
import { hasPermission } from '../../shared/auth/permissions'
import { useUiLocale } from '../../shared/lib/useUiLocale'
import { Button } from '../../shared/ui/Button'
import { ReferenceDialog } from './ReferenceDialog'
import { ReferenceNames } from './ReferenceMetadataForm'
import { referenceMessage } from './reference-messages'

const emptyColor: ReferenceColor = { id: '', code: '', name: '', nameKk: '', nameEn: '', description: '', hex: '#5CA39A' }
const isHex = (value: string) => /^#[0-9a-f]{6}$/i.test(value)
const colorRgb = (hex: string) => isHex(hex) ? [1, 3, 5].map(start => Number.parseInt(hex.slice(start, start + 2), 16)) : []

export function ColorSample({ hex }: { hex: string }) {
  return <span className="reference-color-sample" aria-hidden="true" style={{ '--reference-swatch': isHex(hex) ? hex : 'transparent' } as CSSProperties} />
}

export function ReferenceColors({ workspace, persona, onUpdate }: {
  workspace: ReferenceWorkspace
  persona: UserPersona | null
  onUpdate: (workspace: ReferenceWorkspace) => void
}) {
  const locale = useUiLocale()
  const [term, setTerm] = useState('')
  const [sort, setSort] = useState<{ key: 'name' | 'code' | 'usage'; descending: boolean }>({ key: 'name', descending: false })
  const [draft, setDraft] = useState<ReferenceColor | null>(null)
  const [deleting, setDeleting] = useState<ReferenceColor | null>(null)
  const [draftRevision, setDraftRevision] = useState(0)
  const [deleteRevision, setDeleteRevision] = useState(0)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const canEdit = hasPermission(persona, 'adm.nsi.edit')
  const canDelete = hasPermission(persona, 'adm.nsi.delete')
  const original = workspace.colors?.find(color => color.id === draft?.id)
  const usage = draft?.id ? colorUsage(workspace, draft.id) : 0
  const changedHex = original && isHex(draft!.hex) && original.hex !== draft!.hex.toUpperCase()
  const name = (color: ReferenceColor) => (locale === 'kk' ? color.nameKk : locale === 'en' ? color.nameEn : color.name) || color.name
  const query = term.trim().toLowerCase()
  const colors = (workspace.colors ?? [])
    .filter(color => !color.deleted && (query.length < 2 || [color.code, color.name, color.nameKk, color.nameEn, color.hex].some(value => value.toLowerCase().includes(query))))
    .map(color => ({ color, usage: colorUsage(workspace, color.id) }))
    .sort((left, right) => {
      const order = sort.key === 'usage' ? left.usage - right.usage
        : sort.key === 'code' ? left.color.code.localeCompare(right.color.code, locale, { numeric: true })
          : name(left.color).localeCompare(name(right.color), locale)
      return sort.descending ? -order : order
    })

  const open = (color: ReferenceColor) => { setDraft(color); setDraftRevision(workspace.version); setError(''); setNotice('') }
  const close = () => {
    setDraft(null); setError('')
  }
  const askDelete = (color: ReferenceColor) => { setDeleting(color); setDeleteRevision(workspace.version); setError(''); setNotice('') }
  const commit = async (action: () => Promise<ReferenceWorkspace>, result: string) => {
    setPending(true); setError('')
    try {
      onUpdate(await action())
      setDraft(null); setDeleting(null); setNotice(result)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Не удалось сохранить изменение.')
    } finally { setPending(false) }
  }
  const heading = (key: typeof sort.key, label: string) => <th aria-sort={sort.key === key ? sort.descending ? 'descending' : 'ascending' : 'none'}>
    <button type="button" className="reference-sort" onClick={() => setSort({ key, descending: sort.key === key && !sort.descending })}>{label}<ArrowDownUp size={13} aria-hidden="true" /></button>
  </th>
  return <section className="reference-document reference-standalone" aria-label="Справочник цветов">
    <header className="reference-document-header"><h2>Справочник цветов</h2>{canEdit && <Button size="sm" onClick={() => open(emptyColor)}><Plus size={16} />Добавить цвет</Button>}</header>
    <div className="reference-toolbar"><label className="reference-search"><Search size={16} /><input aria-label="Поиск цвета" placeholder="Код, наименование или HEX" value={term} onChange={event => setTerm(event.target.value)} /></label></div>
    {notice && <div className="reference-notice success-message" role="status">{notice}</div>}
    <div className="reference-table-scroll"><table className="reference-table">
      <thead><tr><th>Цвет</th>{heading('code', 'Код')}{heading('name', 'Наименование')}<th>HEX</th><th>RGB</th>{heading('usage', 'Используется')}<th>Действия</th></tr></thead>
      <tbody>{colors.map(({ color, usage }) => <tr key={color.id}>
        <td><ColorSample hex={color.hex} /></td><td>{color.code}</td>
        <td><button type="button" className="reference-table-link" onClick={() => open(color)}>{name(color)}</button></td>
        <td>{color.hex}</td><td>{colorRgb(color.hex).join(', ')}</td><td>{usage}</td>
        <td><div className="reference-row-actions">
          {canEdit && <Button variant="quiet" size="sm" onClick={() => open(color)} aria-label={`Изменить цвет «${name(color)}»`}><Pencil size={15} /></Button>}
          {canDelete && <Button variant="quiet" size="sm" onClick={() => askDelete(color)} aria-label={`Удалить цвет «${name(color)}»`}><Trash2 size={15} /></Button>}
        </div></td>
      </tr>)}</tbody>
    </table>{!colors.length && <div className="reference-empty"><strong>Цвета не найдены</strong><span>Проверьте запрос или добавьте цвет.</span></div>}</div>
    {draft && !deleting && <ReferenceDialog title={draft.id ? 'Карточка цвета' : 'Новый цвет'} pending={pending} dirty={canEdit && draft !== original && draft !== emptyColor} onClose={close}>
      <form className="reference-modal-form" onSubmit={event => { event.preventDefault(); if (canEdit) void commit(() => referenceDataRepository.saveColor(draft, draftRevision, persona), 'Цвет сохранён.') }}>
        <label className="field"><span className="field__label">Код *</span><input required maxLength={255} readOnly={Boolean(draft.id)} disabled={pending} aria-invalid={error.includes('кодом')} value={draft.code} onChange={event => setDraft({ ...draft, code: event.target.value })} /></label>
        <ReferenceNames value={draft} disabled={!canEdit || pending} onChange={value => setDraft({ ...draft, ...value })} />
        <div className="reference-color-controls">
          <label className="field"><span className="field__label">Выбор цвета</span><input type="color" value={isHex(draft.hex) ? draft.hex : original?.hex ?? emptyColor.hex} disabled={!canEdit || pending} onInput={event => setDraft({ ...draft, hex: event.currentTarget.value.toUpperCase() })} /></label>
          <label className="field"><span className="field__label">HEX *</span><input required maxLength={7} pattern="#[0-9A-Fa-f]{6}" readOnly={!canEdit} disabled={pending} value={draft.hex} onChange={event => setDraft({ ...draft, hex: event.target.value })} /></label>
          {['R', 'G', 'B'].map((channel, index) => <label className="field" key={channel}><span className="field__label">{channel}</span><input value={colorRgb(draft.hex)[index] ?? ''} readOnly /></label>)}
        </div>
        {changedHex && <div className="reference-row-actions"><ColorSample hex={original.hex} />Было<ColorSample hex={draft.hex} />Стало</div>}
        <p>Используется в значениях справочников: <strong>{usage}</strong></p>
        {changedHex && usage > 0 && <p className="reference-color-warning" role="status">Изменение цвета коснётся значений: {usage}</p>}
        {error && <p className="form-alert form-alert--error" role="alert">{referenceMessage(error, locale)}</p>}
        <footer>
          {original && canDelete && <Button variant="danger" onClick={() => askDelete(original)} disabled={pending}>Удалить</Button>}
          <Button variant="secondary" onClick={close} disabled={pending}>{canEdit ? 'Отмена' : 'Закрыть'}</Button>
          {canEdit && <Button type="submit" disabled={pending || draft === original}>Сохранить</Button>}
        </footer>
      </form>
    </ReferenceDialog>}
    {deleting && <ReferenceDialog title="Удалить цвет?" pending={pending} onClose={() => { setDeleting(null); setError('') }}>
      <p>{name(deleting)} · {deleting.hex}</p>
      {error && <p className="form-alert form-alert--error" role="alert">{referenceMessage(error, locale)}</p>}
      <footer><Button variant="secondary" disabled={pending} onClick={() => { setDeleting(null); setError('') }}>Отмена</Button><Button variant="danger" disabled={pending} onClick={() => void commit(() => referenceDataRepository.deleteColor(deleting.id, deleteRevision, persona), 'Цвет удалён.')}>Удалить</Button></footer>
    </ReferenceDialog>}
  </section>
}
