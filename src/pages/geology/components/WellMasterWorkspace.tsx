import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Archive, Check, FileText, GitBranch, Landmark, Play, Save, Send, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import type { Well } from '../../../entities/well/model/types'
import type { WellMasterAggregateData, WellMasterAggregateKind, WellMasterWorkspace as Workspace } from '../../../entities/well-master/model/types'
import { createWellMasterDraft, fetchWellMasterWorkspace, saveWellAssignment, saveWellMasterAggregate, transitionWellWorkflow } from '../../../repository/api'
import { useSession } from '../../../entities/session/model/sessionContext'
import { hasPermission } from '../../../shared/auth/permissions'
import { Badge } from '../../../shared/ui/Badge'
import { Button } from '../../../shared/ui/Button'
import { Panel } from '../../../shared/ui/Panel'

const labels: Record<WellMasterAggregateKind, string> = { description: 'Описание', documentation: 'Документы', drilling: 'Проходка', completion: 'Освоение', geology: 'Геология' }
const workflowTone = { draft: 'warning', in_review: 'info', changes_requested: 'danger', approved: 'success', published: 'success', archived: 'neutral' } as const

export function WellMasterWorkspace({ well }: { well: Well }) {
  const queryClient = useQueryClient()
  const { persona } = useSession()
  const query = useQuery({ queryKey: ['well-master', well.id], queryFn: () => fetchWellMasterWorkspace(well.id) })
  const [active, setActive] = useState<WellMasterAggregateKind>('description')
  const [reason, setReason] = useState('')
  const refreshWell = async () => { await queryClient.invalidateQueries({ queryKey: ['well-master', well.id] }); await queryClient.invalidateQueries({ queryKey: ['well', well.id] }); await queryClient.invalidateQueries({ queryKey: ['wells'] }) }
  const createDraftMutation = useMutation({ mutationFn: () => createWellMasterDraft(well.id, query.data!), onSuccess: refreshWell })
  const assignmentMutation = useMutation({ mutationFn: (assignment: Workspace['assignment']) => saveWellAssignment(well.id, query.data!, assignment), onSuccess: refreshWell })
  const aggregateMutation = useMutation({ mutationFn: ({ kind, data }: { kind: WellMasterAggregateKind; data: WellMasterAggregateData }) => saveWellMasterAggregate(well.id, query.data!, kind, data), onSuccess: refreshWell })
  const workflowMutation = useMutation({ mutationFn: (action: 'submit' | 'return' | 'approve' | 'publish' | 'archive') => transitionWellWorkflow(well.id, query.data!, action, reason), onSuccess: () => { setReason(''); return refreshWell() } })
  if (query.isLoading || !query.data) return <div className="page-loading page-loading--inline"><span /><p>Загружаем полный паспорт скважины…</p></div>
  const workspace = query.data
  const canEdit = hasPermission(persona, 'geology.well-master.edit')
  const canReview = hasPermission(persona, 'geology.well-master.review')
  const canPublish = hasPermission(persona, 'geology.well-master.publish')
  const editable = workspace.workflow.status !== 'published' && workspace.workflow.status !== 'archived' && canEdit
  const error = assignmentMutation.error ?? aggregateMutation.error ?? workflowMutation.error
  return <div className="object-workspace">
    {error && <div className="form-alert form-alert--error">{String(error.message)}</div>}
    <div className="passport-layout">
      <div className="passport-layout__main">
        <Panel title="Принадлежность и проект" description="Месторождение, участок и залежь хранятся отдельно от геометрии и конструкции." action={<Badge tone={workflowTone[workspace.workflow.status]} dot>{workspace.workflow.status}</Badge>}>
          <AssignmentEditor value={workspace.assignment} disabled={!editable || assignmentMutation.isPending} onSave={(value) => assignmentMutation.mutate(value)} />
        </Panel>
        <Panel title="Полный паспорт" description="Каждый раздел создаёт независимую версию и не перезаписывает опубликованный snapshot.">
          <div className="saved-views" aria-label="Разделы полного паспорта">{(Object.keys(labels) as WellMasterAggregateKind[]).map((kind) => <button type="button" key={kind} className={active === kind ? 'is-active' : ''} onClick={() => setActive(kind)}>{labels[kind]} <small>v{workspace.aggregates[kind].version}</small></button>)}</div>
          <AggregateEditor key={`${active}-${workspace.aggregates[active].version}`} kind={active} aggregate={workspace.aggregates[active]} disabled={!editable || aggregateMutation.isPending} onSave={(data) => aggregateMutation.mutate({ kind: active, data })} />
        </Panel>
      </div>
      <aside className="passport-layout__aside">
        <Panel title="Review и публикация" description={`Версия well-master v${workspace.workflow.version}. Published и archive — read-only.`}>
          <p className="save-hint">Сценарий доступа: <strong>{persona?.position ?? 'Гость'}</strong> · {canEdit ? 'редактирование' : canReview ? 'review' : canPublish ? 'публикация' : 'только просмотр'}.</p>
          <div className="version-impact"><span className="version-impact__icon"><GitBranch size={20} /></span><div><strong>{workflowCopy[workspace.workflow.status]}</strong><p>Команда создаёт сохраняемое evidence-событие и не удаляет предыдущие версии.</p></div></div>
          {(workspace.workflow.status === 'in_review' || workspace.workflow.status === 'approved' || workspace.workflow.status === 'published') && <label className="field"><span className="field__label">Причина возврата или архива</span><textarea rows={3} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Не менее 8 символов для возврата/архива" /></label>}
          <div className="workflow-actions">{workspace.workflow.status === 'published' && <Button variant="secondary" disabled={!canEdit || createDraftMutation.isPending} onClick={() => createDraftMutation.mutate()}><GitBranch size={16} /> Новый draft</Button>}{workflowActions(workspace.workflow.status).map(({ action, label, icon: Icon, variant }) => <Button key={action} variant={variant} disabled={!canRunWorkflowAction(action, canEdit, canReview, canPublish) || workflowMutation.isPending || ((action === 'return' || action === 'archive') && reason.trim().length < 8)} onClick={() => workflowMutation.mutate(action)}><Icon size={16} /> {label}</Button>)}</div>
          {workspace.workflow.status === 'published' && <p className="save-hint"><ShieldCheck size={14} /> Эта demo-версия immutable. Для изменения создайте следующий draft в последующем срезе.</p>}
        </Panel>
      </aside>
    </div>
  </div>
}

const workflowCopy: Record<Workspace['workflow']['status'], string> = { draft: 'Черновик редактируется', in_review: 'Ожидает review', changes_requested: 'Требуются изменения', approved: 'Утверждено', published: 'Опубликовано', archived: 'Архивировано' }
function workflowActions(status: Workspace['workflow']['status']) {
  if (status === 'draft' || status === 'changes_requested') return [{ action: 'submit' as const, label: 'На review', icon: Send, variant: 'primary' as const }, { action: 'archive' as const, label: 'Архивировать', icon: Archive, variant: 'quiet' as const }]
  if (status === 'in_review') return [{ action: 'return' as const, label: 'Вернуть', icon: Play, variant: 'secondary' as const }, { action: 'approve' as const, label: 'Утвердить', icon: Check, variant: 'primary' as const }]
  if (status === 'approved') return [{ action: 'publish' as const, label: 'Опубликовать', icon: ShieldCheck, variant: 'primary' as const }]
  if (status === 'published') return [{ action: 'archive' as const, label: 'Архивировать', icon: Archive, variant: 'quiet' as const }]
  return []
}

function canRunWorkflowAction(action: 'submit' | 'return' | 'approve' | 'publish' | 'archive', canEdit: boolean, canReview: boolean, canPublish: boolean) {
  if (action === 'submit') return canEdit
  if (action === 'return' || action === 'approve') return canReview
  if (action === 'publish') return canPublish
  return canEdit || canPublish
}

function AssignmentEditor({ value, disabled, onSave }: { value: Workspace['assignment']; disabled: boolean; onSave: (value: Workspace['assignment']) => void }) {
  const [form, setForm] = useState(value)
  const dirty = JSON.stringify(form) !== JSON.stringify(value)
  return <><div className="form-grid"><label className="field"><span className="field__label">Месторождение</span><select disabled={disabled} value={form.depositId} onChange={(event) => setForm((current) => ({ ...current, depositId: event.target.value }))}><option value="DEP-SARYTAU">Сарытау</option></select></label><label className="field"><span className="field__label">Участок</span><select disabled={disabled} value={form.siteId} onChange={(event) => setForm((current) => ({ ...current, siteId: event.target.value }))}><option value="SITE-NORTH">Северный</option><option value="SITE-CENTRAL">Центральный</option></select></label><label className="field"><span className="field__label">Залежь</span><select disabled={disabled} value={form.lensId} onChange={(event) => setForm((current) => ({ ...current, lensId: event.target.value }))}><option value="LENS-PR07">PR-07</option><option value="LENS-CN02">CN-02</option></select></label><label className="field"><span className="field__label">Проект</span><input disabled={disabled} value={form.projectCode} onChange={(event) => setForm((current) => ({ ...current, projectCode: event.target.value.toUpperCase() }))} /></label></div><div className="passport-form-actions"><Button variant="secondary" disabled={disabled || !dirty} onClick={() => onSave(form)}><Landmark size={16} /> Сохранить назначение</Button></div></>
}

function AggregateEditor({ kind, aggregate, disabled, onSave }: { kind: WellMasterAggregateKind; aggregate: Workspace['aggregates'][WellMasterAggregateKind]; disabled: boolean; onSave: (data: WellMasterAggregateData) => void }) {
  const [form, setForm] = useState(aggregate.data as Record<string, string | number>)
  const set = (key: string, value: string) => setForm((current) => ({ ...current, [key]: ['pumpingRate'].includes(key) ? Number(value) : value }))
  const fields: Array<[string, string]> = kind === 'description' ? [['shortName', 'Краткое наименование'], ['purposeNote', 'Назначение / примечание'], ['contractor', 'Подрядчик']] : kind === 'documentation' ? [['projectNumber', 'Номер проекта'], ['permitNumber', 'Разрешение'], ['sourceReference', 'Источник документации']] : kind === 'drilling' ? [['startedAt', 'Начато'], ['completedAt', 'Завершено'], ['method', 'Метод'], ['fluid', 'Промывочная жидкость']] : kind === 'completion' ? [['state', 'Состояние'], ['pumpingRate', 'Дебит, м³/ч'], ['commissionedAt', 'Введена в эксплуатацию']] : [['groundwater', 'Подземные воды'], ['permafrost', 'Многолетняя мерзлота'], ['complications', 'Осложнения']]
  const dateFields = ['startedAt', 'completedAt', 'commissionedAt']
  const multi = ['purposeNote', 'sourceReference', 'complications']
  return <><div className="form-grid">{fields.map(([key, label]) => <label className="field" key={key} style={multi.includes(key) ? { gridColumn: '1 / -1' } : undefined}><span className="field__label">{label}</span>{multi.includes(key) ? <textarea disabled={disabled} rows={3} value={String(form[key] ?? '')} onChange={(event) => set(key, event.target.value)} /> : <input disabled={disabled} type={dateFields.includes(key) ? 'date' : key === 'pumpingRate' ? 'number' : 'text'} value={String(form[key] ?? '')} onChange={(event) => set(key, event.target.value)} />}</label>)}</div><div className="passport-form-actions"><Button disabled={disabled} onClick={() => onSave(form as WellMasterAggregateData)}><Save size={16} /> Сохранить {labels[kind].toLowerCase()}</Button></div><p className="save-hint"><FileText size={14} /> Агрегат {aggregate.id} · v{aggregate.version} · {aggregate.status}</p></>
}
