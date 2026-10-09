import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Save, Trash2 } from 'lucide-react'
import { useState } from 'react'
import type { Deposit, DepositOccurrence, GeologicalSite } from '../../entities/geology-master/model/types'
import { createSite, deleteOccurrence, deleteSite, saveOccurrence, updateSite } from '../../repository/api'
import { Badge } from '../../shared/ui/Badge'
import { Button } from '../../shared/ui/Button'
import { Panel } from '../../shared/ui/Panel'
import { RowActions } from '../../shared/ui/RowActions'
import { WorkspaceDialog } from '../../shared/ui/WorkspaceDialog'

type OccurrenceValues = Pick<DepositOccurrence, 'type' | 'nameRu' | 'nameKk' | 'nameEn'>
type Removal = { kind: 'site'; item: GeologicalSite } | { kind: 'occurrence'; item: DepositOccurrence; current: Deposit }

export function DepositCollections({ deposit, sites, canEdit, canDelete }: {
  deposit: Deposit
  sites: GeologicalSite[]
  canEdit: boolean
  canDelete: boolean
}) {
  const queryClient = useQueryClient()
  const [siteEditor, setSiteEditor] = useState<{ item?: GeologicalSite } | null>(null)
  const [occurrenceEditor, setOccurrenceEditor] = useState<{ item?: DepositOccurrence; current: Deposit } | null>(null)
  const [removal, setRemoval] = useState<Removal | null>(null)
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['geology-master'] }),
      queryClient.invalidateQueries({ queryKey: ['demo-audit-events'] }),
    ])
  }
  const siteMutation = useMutation({
    mutationFn: ({ code, name }: { code: string; name: string }) => siteEditor?.item
      ? updateSite(siteEditor.item, { name }) : createSite({ depositId: deposit.id, code, name }),
    onSuccess: async () => { await refresh(); setSiteEditor(null) },
  })
  const occurrenceMutation = useMutation({
    mutationFn: ({ current, input }: { current: Deposit; input: OccurrenceValues & { id?: string } }) => saveOccurrence(current, input),
    onSuccess: async () => { await refresh(); setOccurrenceEditor(null) },
  })
  const deleteMutation = useMutation({
    mutationFn: (target: Removal) => target.kind === 'site' ? deleteSite(target.item) : deleteOccurrence(target.current, target.item.id).then(() => undefined),
    onSuccess: async () => { await refresh(); setRemoval(null) },
  })
  const allowEdit = canEdit && deposit.status !== 'archived'
  const allowDelete = canDelete && deposit.status !== 'archived'
  const actions = allowEdit || allowDelete
  const openRemoval = (target: Removal) => { deleteMutation.reset(); setRemoval(target) }

  return <>
    <div className="geobase-overview__relations">
      <Panel title="Участки" action={allowEdit && <Button size="sm" variant="secondary" onClick={() => { siteMutation.reset(); setSiteEditor({}) }}><Plus size={15} />Добавить участок</Button>}>
        {sites.length ? <div className="geobase-collection-scroll"><table className="geobase-collection-table" aria-label="Участки">
          <thead><tr><th scope="col">Код</th><th scope="col">Наименование</th>{actions && <th scope="col" className="geobase-collection-table__actions" aria-label="Действия" />}</tr></thead>
          <tbody>{sites.map((site) => <tr key={site.id}><td>{site.code}</td><th scope="row">{site.name}{site.status === 'archived' && <Badge>Архив</Badge>}</th>{actions && <td className="geobase-collection-table__actions"><RowActions label={`участок ${site.name}`}
            onEdit={allowEdit && site.status !== 'archived' ? () => { siteMutation.reset(); setSiteEditor({ item: site }) } : undefined}
            onDelete={allowDelete ? () => openRemoval({ kind: 'site', item: site }) : undefined} /></td>}</tr>)}</tbody>
        </table></div> : <p className="geobase-muted">Участки ещё не добавлены.</p>}
      </Panel>
      <Panel title="Список залежей" action={allowEdit && <Button size="sm" variant="secondary" onClick={() => { occurrenceMutation.reset(); setOccurrenceEditor({ current: deposit }) }}><Plus size={15} />Добавить залежь</Button>}>
        {deposit.occurrences.length ? <div className="geobase-collection-scroll"><table className="geobase-collection-table geobase-collection-table--occurrences" aria-label="Залежи">
          <thead><tr><th scope="col">Тип</th><th scope="col">Название RU</th><th scope="col">Название KZ</th><th scope="col">Название EN</th>{actions && <th scope="col" className="geobase-collection-table__actions" aria-label="Действия" />}</tr></thead>
          <tbody>{deposit.occurrences.map((item) => <tr key={item.id}><td>{item.type}</td><th scope="row">{item.nameRu}{item.status === 'archived' && <Badge>Архив</Badge>}</th><td>{item.nameKk}</td><td>{item.nameEn}</td>{actions && <td className="geobase-collection-table__actions"><RowActions label={`залежь ${item.nameRu}`}
            onEdit={allowEdit && item.status !== 'archived' ? () => { occurrenceMutation.reset(); setOccurrenceEditor({ item, current: deposit }) } : undefined}
            onDelete={allowDelete ? () => openRemoval({ kind: 'occurrence', item, current: deposit }) : undefined} /></td>}</tr>)}</tbody>
        </table></div> : <p className="geobase-muted">Залежи ещё не добавлены.</p>}
      </Panel>
    </div>
    {siteEditor && <SiteEditor item={siteEditor.item} pending={siteMutation.isPending} error={siteMutation.error?.message}
      onClose={() => setSiteEditor(null)} onSave={(values) => siteMutation.mutate(values)} />}
    {occurrenceEditor && <OccurrenceEditor item={occurrenceEditor.item} typeOptions={[...new Set(['Рудная залежь', 'Участок', 'Площадь', ...deposit.occurrences.map((item) => item.type)])]} pending={occurrenceMutation.isPending} error={occurrenceMutation.error?.message}
      onClose={() => setOccurrenceEditor(null)} onSave={(input) => occurrenceMutation.mutate({ current: occurrenceEditor.current, input: { ...input, id: occurrenceEditor.item?.id } })} />}
    {removal && <WorkspaceDialog size="compact" title={`Удалить ${removal.kind === 'site' ? 'участок' : 'залежь'} «${removal.kind === 'site' ? removal.item.name : removal.item.nameRu}»?`}
      pending={deleteMutation.isPending} onClose={() => setRemoval(null)} footer={<>
        <Button variant="secondary" disabled={deleteMutation.isPending} onClick={() => setRemoval(null)}>Отменить</Button>
        <Button variant="danger" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate(removal)}><Trash2 size={16} />Удалить</Button>
      </>}>
      <p className="geobase-muted">Запись будет удалена из списка месторождения.</p>
      {deleteMutation.error && <div className="form-alert form-alert--error" role="alert">{deleteMutation.error.message}</div>}
    </WorkspaceDialog>}
  </>
}

function SiteEditor({ item, pending, error, onClose, onSave }: {
  item?: GeologicalSite
  pending: boolean
  error?: string
  onClose: () => void
  onSave: (values: { code: string; name: string }) => void
}) {
  const [code, setCode] = useState(item?.code ?? '')
  const [name, setName] = useState(item?.name ?? '')
  const normalizedCode = code.trim().toUpperCase().replace(/\s+/g, '-')
  const valid = Boolean(normalizedCode && name.trim())
  return <WorkspaceDialog size="compact" title={item ? 'Редактирование участка' : 'Добавить участок'} pending={pending} onClose={onClose}>
    <form className="geobase-collection-form" onSubmit={(event) => { event.preventDefault(); if (valid && !pending) onSave({ code: normalizedCode, name: name.trim() }) }}>
      <label className="field"><span>Код участка</span><input required disabled={pending || Boolean(item)} value={code} onChange={(event) => setCode(event.target.value)} /><small>После создания не изменяется.</small></label>
      <label className="field"><span>Наименование участка</span><input required disabled={pending} value={name} onChange={(event) => setName(event.target.value)} /></label>
      {error && <div className="form-alert form-alert--error" role="alert">{error}</div>}
      <footer><Button variant="secondary" disabled={pending} onClick={onClose}>Отменить</Button><Button type="submit" disabled={pending || !valid}><Save size={16} />Сохранить</Button></footer>
    </form>
  </WorkspaceDialog>
}

function OccurrenceEditor({ item, typeOptions, pending, error, onClose, onSave }: {
  item?: DepositOccurrence
  typeOptions: string[]
  pending: boolean
  error?: string
  onClose: () => void
  onSave: (input: OccurrenceValues) => void
}) {
  const [values, setValues] = useState<OccurrenceValues>(() => ({ type: item?.type ?? 'Рудная залежь', nameRu: item?.nameRu ?? '', nameKk: item?.nameKk ?? '', nameEn: item?.nameEn ?? '' }))
  const valid = Object.values(values).every((value) => value.trim())
  return <WorkspaceDialog size="compact" title={item ? 'Редактирование залежи' : 'Добавить залежь'} pending={pending} onClose={onClose}>
    <form className="geobase-collection-form" onSubmit={(event) => { event.preventDefault(); if (valid && !pending) onSave(values) }}>
      <label className="field"><span>Тип залежи</span><select required disabled={pending} value={values.type} onChange={(event) => setValues({ ...values, type: event.target.value })}>{typeOptions.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
      {([
        ['nameRu', 'Название (RU)'], ['nameKk', 'Название (KZ)'], ['nameEn', 'Название (EN)'],
      ] as const).map(([key, label]) => <label className="field" key={key}><span>{label}</span><input required disabled={pending} value={values[key]} onChange={(event) => setValues({ ...values, [key]: event.target.value })} /></label>)}
      {error && <div className="form-alert form-alert--error" role="alert">{error}</div>}
      <footer><Button variant="secondary" disabled={pending} onClick={onClose}>Отменить</Button><Button type="submit" disabled={pending || !valid}><Save size={16} />Сохранить</Button></footer>
    </form>
  </WorkspaceDialog>
}
