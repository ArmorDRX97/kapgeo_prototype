import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Archive, Check, Factory, GitBranch, MapPinned, Plus, Save, Send, ShieldCheck } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { ConditionSet, Deposit, GeologicalLens, GeologicalSite } from '../../entities/geology-master/model/types'
import { approveConditionSet, archiveDeposit, archiveLens, archiveSite, createConditionSetVersion, createDeposit, createLens, createSite, fetchGeologicalMasterData, publishConditionSet, saveConditionSet, updateDeposit, updateLens, updateSite } from '../../repository/api'
import { Badge } from '../../shared/ui/Badge'
import { Button } from '../../shared/ui/Button'
import { PageHeader } from '../../shared/ui/PageHeader'
import { Panel } from '../../shared/ui/Panel'

const conditionTone = { draft: 'warning', in_review: 'info', approved: 'success', published: 'success' } as const

export function GeologyMasterPage() {
  const queryClient = useQueryClient()
  const masterQuery = useQuery({ queryKey: ['geology-master'], queryFn: fetchGeologicalMasterData })
  const [selectedDepositId, setSelectedDepositId] = useState('DEP-SARYTAU')
  const [selectedConditionId, setSelectedConditionId] = useState('CONDITIONS-NORTH-2026')
  const [showCreate, setShowCreate] = useState(false)
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['geology-master'] })
  const createMutation = useMutation({ mutationFn: createDeposit, onSuccess: () => { void refresh(); setShowCreate(false) } })
  const updateMutation = useMutation({ mutationFn: ({ current, patch }: { current: Deposit; patch: Pick<Deposit, 'name' | 'description' | 'crs'> }) => updateDeposit(current, patch), onSuccess: refresh })
  const archiveMutation = useMutation({ mutationFn: archiveDeposit, onSuccess: refresh })
  const createSiteMutation = useMutation({ mutationFn: createSite, onSuccess: refresh })
  const updateSiteMutation = useMutation({ mutationFn: ({ current, name }: { current: GeologicalSite; name: string }) => updateSite(current, { name }), onSuccess: refresh })
  const archiveSiteMutation = useMutation({ mutationFn: archiveSite, onSuccess: refresh })
  const createLensMutation = useMutation({ mutationFn: createLens, onSuccess: refresh })
  const updateLensMutation = useMutation({ mutationFn: ({ current, name }: { current: GeologicalLens; name: string }) => updateLens(current, { name }), onSuccess: refresh })
  const archiveLensMutation = useMutation({ mutationFn: archiveLens, onSuccess: refresh })
  const createConditionMutation = useMutation({ mutationFn: createConditionSetVersion, onSuccess: (next) => { void refresh(); setSelectedConditionId(next.id) } })
  const saveConditionMutation = useMutation({ mutationFn: ({ current, patch }: { current: ConditionSet; patch: Omit<ConditionSet, 'id' | 'siteId' | 'code' | 'version' | 'status'> }) => saveConditionSet(current, patch), onSuccess: refresh })
  const approveMutation = useMutation({ mutationFn: approveConditionSet, onSuccess: refresh })
  const publishMutation = useMutation({ mutationFn: publishConditionSet, onSuccess: refresh })

  const data = masterQuery.data
  const deposit = data?.deposits.find((item) => item.id === selectedDepositId) ?? data?.deposits[0]
  const siteRows = useMemo(() => data?.sites.filter((item) => item.depositId === deposit?.id) ?? [], [data, deposit?.id])
  const condition = data?.conditionSets.find((item) => item.id === selectedConditionId) ?? data?.conditionSets[0]
  const relatedConditions = condition ? data?.conditionSets.filter((item) => item.code.replace(/-V\d+$/, '') === condition.code.replace(/-V\d+$/, '')) ?? [] : []

  if (masterQuery.isLoading || !data || !deposit) return <div className="page-loading"><span /><p>Загружаем synthetic master data…</p></div>

  return <div className="page-stack">
    <PageHeader eyebrow="Геология · GEO-02" title="Месторождения и кондиции" description="Сохраняемый synthetic контекст: месторождение, участок, залежь и effective-dated набор кондиций." meta={<Badge tone="info" dot>IndexedDB · synthetic</Badge>} actions={<Button onClick={() => setShowCreate(true)}><Plus size={16} /> Месторождение</Button>} />
    {(masterQuery.isError || createMutation.error || updateMutation.error || archiveMutation.error || createSiteMutation.error || updateSiteMutation.error || archiveSiteMutation.error || createLensMutation.error || updateLensMutation.error || archiveLensMutation.error || saveConditionMutation.error || approveMutation.error || publishMutation.error) && <div className="form-alert form-alert--error">{String(masterQuery.error?.message ?? createMutation.error?.message ?? updateMutation.error?.message ?? archiveMutation.error?.message ?? createSiteMutation.error?.message ?? updateSiteMutation.error?.message ?? archiveSiteMutation.error?.message ?? createLensMutation.error?.message ?? updateLensMutation.error?.message ?? archiveLensMutation.error?.message ?? saveConditionMutation.error?.message ?? approveMutation.error?.message ?? publishMutation.error?.message)}</div>}
    <div className="object-content-grid">
      <div className="object-content-grid__main">
        <Panel title="Реестр контекста" description="Коды неизменяемы; архив не удаляет version history." action={<><Button size="sm" variant="secondary" onClick={() => { const code = window.prompt('Код участка', 'NEW-SITE'); const name = window.prompt('Наименование участка', 'Новый участок'); if (code && name) createSiteMutation.mutate({ depositId: deposit.id, code, name }) }}><Plus size={14} /> Участок</Button><Button size="sm" variant="secondary" onClick={() => { const site = siteRows.find((item) => item.status === 'active'); const code = window.prompt('Код залежи', 'NEW-LENS'); const name = window.prompt('Наименование залежи', 'Новая залежь'); if (site && code && name) createLensMutation.mutate({ siteId: site.id, code, name }) }}><Plus size={14} /> Залежь</Button></>}>
          <div className="map-result-list" role="listbox" aria-label="Месторождения">
            {data.deposits.map((item) => <button type="button" key={item.id} className={item.id === deposit.id ? 'is-active' : ''} onClick={() => setSelectedDepositId(item.id)}><span><strong>{item.code}</strong><small>{item.name} · v{item.version}</small></span><Badge tone={item.status === 'active' ? 'success' : 'neutral'}>{item.status === 'active' ? 'Активно' : 'Архив'}</Badge></button>)}
          </div>
          <div className="domain-status-grid">
            {siteRows.map((site) => <article key={site.id}><span className="domain-status-grid__icon"><MapPinned size={18} /></span><div><strong>{site.name}</strong><small>{site.code} · {data.lenses.filter((lens) => lens.siteId === site.id).map((lens) => `${lens.code} v${lens.version}`).join(', ') || 'Залежи не заданы'}</small></div><Badge tone={site.status === 'active' ? 'success' : 'neutral'}>{site.status === 'active' ? `Участок v${site.version}` : 'Архив'}</Badge><div><Button size="sm" variant="quiet" disabled={site.status === 'archived'} onClick={() => { const name = window.prompt('Наименование участка', site.name); if (name) updateSiteMutation.mutate({ current: site, name }) }}>Изменить</Button><Button size="sm" variant="quiet" disabled={site.status === 'archived'} onClick={() => { if (window.confirm(`Архивировать участок ${site.code}?`)) archiveSiteMutation.mutate(site) }}>Архив</Button></div></article>)}
          </div>
          <div className="map-result-list" aria-label="Залежи выбранного месторождения">
            {data.lenses.filter((lens) => siteRows.some((site) => site.id === lens.siteId)).map((lens) => <div key={lens.id}><span><strong>{lens.code}</strong><small>{lens.name} · v{lens.version}</small></span><Badge tone={lens.status === 'active' ? 'success' : 'neutral'}>{lens.status === 'active' ? 'Залежь' : 'Архив'}</Badge><Button size="sm" variant="quiet" disabled={lens.status === 'archived'} onClick={() => { const name = window.prompt('Наименование залежи', lens.name); if (name) updateLensMutation.mutate({ current: lens, name }) }}>Изменить</Button><Button size="sm" variant="quiet" disabled={lens.status === 'archived'} onClick={() => { if (window.confirm(`Архивировать залежь ${lens.code}?`)) archiveLensMutation.mutate(lens) }}>Архив</Button></div>)}
          </div>
        </Panel>
        <DepositEditor key={`${deposit.id}-${deposit.version}`} deposit={deposit} onSave={(patch) => updateMutation.mutate({ current: deposit, patch })} onArchive={() => archiveMutation.mutate(deposit)} pending={updateMutation.isPending || archiveMutation.isPending} />
      </div>
      <aside>
        {condition && <><ConditionEditor key={`${condition.id}-${condition.version}`} condition={condition} onCreateVersion={() => createConditionMutation.mutate(condition)} onSave={(patch) => saveConditionMutation.mutate({ current: condition, patch })} onApprove={() => approveMutation.mutate(condition)} onPublish={() => publishMutation.mutate(condition)} pending={createConditionMutation.isPending || saveConditionMutation.isPending || approveMutation.isPending || publishMutation.isPending} /><ConditionCompare current={condition} versions={relatedConditions} onSelect={setSelectedConditionId} /></>}
      </aside>
    </div>
    {showCreate && <CreateDepositDialog pending={createMutation.isPending} onClose={() => setShowCreate(false)} onSubmit={(input) => createMutation.mutate(input)} />}
  </div>
}

function ConditionCompare({ current, versions, onSelect }: { current: ConditionSet; versions: ConditionSet[]; onSelect: (id: string) => void }) {
  if (versions.length < 2) return null
  return <Panel title="Сравнение версий кондиций" description="Effective date и ключевые пороги сравниваются до approve/publish."><div className="audit-timeline audit-timeline--compact">{versions.map((item) => <button type="button" key={item.id} className={item.id === current.id ? 'is-active' : ''} onClick={() => onSelect(item.id)}><strong>{item.code} · v{item.version}</strong><span>{item.effectiveFrom} · ρ {item.density} · balance {item.balanceThreshold}% · off-balance {item.offBalanceThreshold}%</span><small>{item.status}</small></button>)}</div></Panel>
}
function DepositEditor({ deposit, onSave, onArchive, pending }: { deposit: Deposit; onSave: (patch: Pick<Deposit, 'name' | 'description' | 'crs'>) => void; onArchive: () => void; pending: boolean }) {
  const [form, setForm] = useState({ name: deposit.name, description: deposit.description, crs: deposit.crs })
  const dirty = JSON.stringify(form) !== JSON.stringify({ name: deposit.name, description: deposit.description, crs: deposit.crs })
  const readOnly = deposit.status === 'archived'
  return <Panel title="Карточка месторождения" description={`${deposit.code} · immutable code · v${deposit.version}`} action={<Badge tone={readOnly ? 'neutral' : 'success'}>{readOnly ? 'Read-only' : 'Активно'}</Badge>}><div className="form-grid"><label className="field"><span className="field__label">Наименование</span><input disabled={readOnly} value={form.name} onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))} /></label><label className="field"><span className="field__label">CRS</span><select disabled={readOnly} value={form.crs} onChange={(event) => setForm((value) => ({ ...value, crs: event.target.value }))}><option>EPSG:32642</option><option>LOCAL:SARYTAU</option></select></label><label className="field" style={{ gridColumn: '1 / -1' }}><span className="field__label">Описание</span><textarea disabled={readOnly} rows={3} value={form.description} onChange={(event) => setForm((value) => ({ ...value, description: event.target.value }))} /></label></div><div className="wizard-actions"><Button variant="secondary" disabled={readOnly || pending || !dirty} onClick={() => onSave(form)}><Save size={16} /> Сохранить версию</Button><Button variant="quiet" disabled={readOnly || pending} onClick={onArchive}><Archive size={16} /> В архив</Button></div></Panel>
}

function ConditionEditor({ condition, onCreateVersion, onSave, onApprove, onPublish, pending }: { condition: ConditionSet; onCreateVersion: () => void; onSave: (patch: Omit<ConditionSet, 'id' | 'siteId' | 'code' | 'version' | 'status'>) => void; onApprove: () => void; onPublish: () => void; pending: boolean }) {
  const [form, setForm] = useState({ effectiveFrom: condition.effectiveFrom, density: condition.density, balanceThreshold: condition.balanceThreshold, offBalanceThreshold: condition.offBalanceThreshold, azimuthCorrection: condition.azimuthCorrection, geometryTolerance: condition.geometryTolerance })
  const readOnly = condition.status === 'published'
  const dirty = JSON.stringify(form) !== JSON.stringify({ effectiveFrom: condition.effectiveFrom, density: condition.density, balanceThreshold: condition.balanceThreshold, offBalanceThreshold: condition.offBalanceThreshold, azimuthCorrection: condition.azimuthCorrection, geometryTolerance: condition.geometryTolerance })
  const numeric = (key: keyof Omit<ConditionSet, 'id' | 'siteId' | 'code' | 'version' | 'status'>, value: string) => setForm((current) => ({ ...current, [key]: key === 'effectiveFrom' ? value : Number(value) }))
  return <Panel title="Набор кондиций" description={`${condition.code} · effective from ${condition.effectiveFrom} · v${condition.version}`} action={<Badge tone={conditionTone[condition.status]} dot>{condition.status}</Badge>}><div className="form-grid"><label className="field"><span className="field__label">Дата действия</span><input disabled={readOnly} type="date" value={form.effectiveFrom} onChange={(event) => numeric('effectiveFrom', event.target.value)} /></label><label className="field"><span className="field__label">Плотность, т/м³</span><input disabled={readOnly} type="number" step=".01" value={form.density} onChange={(event) => numeric('density', event.target.value)} /></label><label className="field"><span className="field__label">Balance, %</span><input disabled={readOnly} type="number" step=".01" value={form.balanceThreshold} onChange={(event) => numeric('balanceThreshold', event.target.value)} /></label><label className="field"><span className="field__label">Off-balance, %</span><input disabled={readOnly} type="number" step=".01" value={form.offBalanceThreshold} onChange={(event) => numeric('offBalanceThreshold', event.target.value)} /></label><label className="field"><span className="field__label">Поправка азимута, °</span><input disabled={readOnly} type="number" step=".1" value={form.azimuthCorrection} onChange={(event) => numeric('azimuthCorrection', event.target.value)} /></label><label className="field"><span className="field__label">Допуск геометрии, м</span><input disabled={readOnly} type="number" step=".01" value={form.geometryTolerance} onChange={(event) => numeric('geometryTolerance', event.target.value)} /></label></div><div className="wizard-actions">{readOnly ? <Button variant="secondary" disabled={pending} onClick={onCreateVersion}><GitBranch size={16} /> Новая версия</Button> : <Button variant="secondary" disabled={pending || !dirty} onClick={() => onSave(form)}><Save size={16} /> Сохранить draft</Button>}{condition.status === 'draft' && <Button disabled={pending} onClick={onApprove}><Check size={16} /> Утвердить</Button>}{condition.status === 'approved' && <Button disabled={pending} onClick={onPublish}><Send size={16} /> Опубликовать</Button>}</div>{readOnly && <p className="save-hint"><ShieldCheck size={14} /> Опубликованная версия неизменяема; новая версия сохраняет исходную для аудита.</p>}</Panel>
}

function CreateDepositDialog({ onClose, onSubmit, pending }: { onClose: () => void; onSubmit: (input: Pick<Deposit, 'code' | 'name' | 'description' | 'crs'>) => void; pending: boolean }) {
  const [form, setForm] = useState({ code: 'DEMO-NEW', name: 'Новый synthetic объект', description: 'Демонстрационное месторождение без производственных данных.', crs: 'EPSG:32642' })
  return <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Создать месторождение"><Panel title="Новое месторождение" description="Код нельзя изменить после сохранения."><div className="form-grid"><label className="field"><span className="field__label">Код</span><input value={form.code} onChange={(event) => setForm((value) => ({ ...value, code: event.target.value.toUpperCase() }))} /></label><label className="field"><span className="field__label">Название</span><input value={form.name} onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))} /></label><label className="field" style={{ gridColumn: '1 / -1' }}><span className="field__label">Описание</span><textarea value={form.description} onChange={(event) => setForm((value) => ({ ...value, description: event.target.value }))} /></label></div><div className="wizard-actions"><Button variant="secondary" onClick={onClose}>Отмена</Button><Button disabled={pending || !form.name.trim()} onClick={() => onSubmit(form)}><Factory size={16} /> Создать</Button></div></Panel></div>
}
