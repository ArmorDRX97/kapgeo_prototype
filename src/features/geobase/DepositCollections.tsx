import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Save, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { depositStructureTypes, type Deposit, type DepositOccurrence } from '../../entities/geology-master/model/types'
import { deleteOccurrence, saveOccurrence } from '../../repository/api'
import { Badge } from '../../shared/ui/Badge'
import { Button } from '../../shared/ui/Button'
import { Panel } from '../../shared/ui/Panel'
import { RowActions } from '../../shared/ui/RowActions'
import { WorkspaceDialog } from '../../shared/ui/WorkspaceDialog'

type OccurrenceValues = Pick<DepositOccurrence, 'type' | 'nameRu' | 'nameKk' | 'nameEn'>
const structureTitle = 'Структура месторождения'

export function DepositCollections({ deposit, canEdit, canDelete }: {
  deposit: Deposit
  canEdit: boolean
  canDelete: boolean
}) {
  const queryClient = useQueryClient()
  const [editor, setEditor] = useState<{ item?: DepositOccurrence } | null>(null)
  const [removal, setRemoval] = useState<DepositOccurrence | null>(null)
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['geology-master'] }),
      queryClient.invalidateQueries({ queryKey: ['demo-audit-events'] }),
    ])
  }
  const occurrenceMutation = useMutation({
    mutationFn: (input: OccurrenceValues & { id?: string }) => saveOccurrence(deposit, input),
    onSuccess: async () => { await refresh(); setEditor(null) },
  })
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteOccurrence(deposit, id),
    onSuccess: async () => { await refresh(); setRemoval(null) },
  })
  const allowEdit = canEdit && deposit.status !== 'archived'
  const allowDelete = canDelete && deposit.status !== 'archived'
  const actions = allowEdit || allowDelete
  const openEditor = (item?: DepositOccurrence) => { occurrenceMutation.reset(); setEditor({ item }) }
  const openRemoval = (item: DepositOccurrence) => { deleteMutation.reset(); setRemoval(item) }

  return <>
    <Panel title={structureTitle} action={allowEdit && <Button size="sm" variant="secondary" onClick={() => openEditor()}><Plus size={15} />Добавить объект</Button>}>
      {deposit.occurrences.length ? <div className="geobase-collection-scroll">
        <table className="geobase-collection-table" aria-label={structureTitle}>
          <thead><tr>
            <th scope="col" className="geobase-collection-table__type">Тип</th>
            <th scope="col">Название (RU)</th><th scope="col">Название (KZ)</th><th scope="col">Название (EN)</th>
            {actions && <th scope="col" className="geobase-collection-table__actions" aria-label="Действия" />}
          </tr></thead>
          <tbody>{deposit.occurrences.map((item) => <tr key={item.id}>
            <td><Badge tone={item.type === 'Рудная залежь' ? 'warning' : 'info'} variant="tag">{item.type}</Badge></td>
            <th scope="row">{item.nameRu}{item.status === 'archived' && <Badge>Архив</Badge>}</th>
            <td>{item.nameKk}</td><td>{item.nameEn}</td>
            {actions && <td className="geobase-collection-table__actions"><RowActions label={`${item.type} «${item.nameRu}»`}
              onEdit={allowEdit && item.status !== 'archived' ? () => openEditor(item) : undefined}
              onDelete={allowDelete ? () => openRemoval(item) : undefined} /></td>}
          </tr>)}</tbody>
        </table>
      </div> : <p className="geobase-muted">Объекты ещё не добавлены.</p>}
    </Panel>
    {editor && <OccurrenceEditor item={editor.item} typeOptions={[...new Set([...depositStructureTypes, ...deposit.occurrences.map((item) => item.type)])]} pending={occurrenceMutation.isPending} error={occurrenceMutation.error?.message}
      onClose={() => setEditor(null)} onSave={(input) => occurrenceMutation.mutate({ ...input, id: editor.item?.id })} />}
    {removal && <WorkspaceDialog size="compact" title={`Удалить объект «${removal.nameRu}»?`}
      pending={deleteMutation.isPending} onClose={() => setRemoval(null)} footer={<>
        <Button variant="secondary" disabled={deleteMutation.isPending} onClick={() => setRemoval(null)}>Отменить</Button>
        <Button variant="danger" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate(removal.id)}><Trash2 size={16} />Удалить</Button>
      </>}>
      <p className="geobase-muted">Запись будет удалена из списка месторождения.</p>
      {deleteMutation.error && <div className="form-alert form-alert--error" role="alert">{deleteMutation.error.message}</div>}
    </WorkspaceDialog>}
  </>
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
  return <WorkspaceDialog size="compact" title={item ? 'Редактирование объекта' : 'Добавить объект'} pending={pending} onClose={onClose}>
    <form className="geobase-collection-form" onSubmit={(event) => { event.preventDefault(); if (valid && !pending) onSave(values) }}>
      <label className="field"><span>Тип объекта</span><select required disabled={pending} value={values.type} onChange={(event) => setValues({ ...values, type: event.target.value })}>{typeOptions.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
      {([
        ['nameRu', 'Название (RU)'], ['nameKk', 'Название (KZ)'], ['nameEn', 'Название (EN)'],
      ] as const).map(([key, label]) => <label className="field" key={key}><span>{label}</span><input required disabled={pending} value={values[key]} onChange={(event) => setValues({ ...values, [key]: event.target.value })} /></label>)}
      {error && <div className="form-alert form-alert--error" role="alert">{error}</div>}
      <footer><Button variant="secondary" disabled={pending} onClick={onClose}>Отменить</Button><Button type="submit" disabled={pending || !valid}><Save size={16} />Сохранить</Button></footer>
    </form>
  </WorkspaceDialog>
}
