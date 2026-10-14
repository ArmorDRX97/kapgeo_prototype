import { useState } from 'react'
import { useNavigate, useParams, useSearch } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { LockKeyhole, Map, Plus, Search } from 'lucide-react'
import { useSession } from '../../entities/session/model/sessionContext'
import { emptyMap } from '../../entities/geology-map/fixtures'
import { newId } from '../../entities/geology-map/model'
import { canEditMap, mapRepository } from '../../repository/demo/mapRepository'
import { hasPermission } from '../../shared/auth/permissions'
import { AccessDeniedPage } from '../system/ModulePlaceholderPage'
import { Button } from '../../shared/ui/Button'
import { WorkspaceDialog } from '../../shared/ui/WorkspaceDialog'
import { GeologyModuleLayout } from './GeologyModuleLayout'
import { PlanWorkbench } from '../../features/geology-plan/PlanWorkbench'
import { downloadFile } from '../../features/geology-plan/export'
import { validatePlanSearch } from '../../features/geology-plan/search'
import '../../features/geology-plan/plan.css'

export function PlansPage() {
  const { persona } = useSession(), navigate = useNavigate(), cache = useQueryClient(), { projectId } = useParams({ strict: false }), search = validatePlanSearch(useSearch({ strict: false }))
  const query = useQuery({ queryKey: ['geology-maps'], queryFn: mapRepository.list, retry: false, refetchOnWindowFocus: false, refetchOnReconnect: false })
  const [q, setQ] = useState(''), [creating, setCreating] = useState(false), [title, setTitle] = useState(''), [error, setError] = useState(''), [open, setOpen] = useState(true)
  const selected = query.data?.find(p => p.id === projectId), refresh = () => void cache.invalidateQueries({ queryKey: ['geology-maps'] })
  if (!hasPermission(persona, 'geology.view')) return <AccessDeniedPage moduleName="интерактивный план месторождения" />
  const registry = <div className="map-registry"><div className="map-registry-heading"><strong>Планы месторождения</strong><Button variant="quiet" size="sm" aria-label="Создать план" disabled={!hasPermission(persona, 'geology.maps.edit')} onClick={() => { setTitle(''); setError(''); setCreating(true) }}><Plus size={17} /></Button></div><label className="map-registry-search"><Search size={15} /><input aria-label="Поиск проектов" value={q} onChange={e => setQ(e.target.value)} placeholder="Поиск планов" /></label><small>Полигон Северный · залежь 2.1</small><div className="map-registry-list">{query.data?.filter(p => p.title.toLowerCase().includes(q.toLowerCase())).map(p => <button type="button" key={p.id} className={p.id === projectId ? 'is-selected' : ''} onClick={() => void navigate({ to: '/geology/plans/$projectId', params: { projectId: p.id }, search: {} })}><Map size={15} /><span>{p.title}<small>{p.date} · {p.objects.filter(o => o.kind === 'well').length} скважин</small></span>{p.locked && <LockKeyhole size={14} aria-label="Зафиксирован" />}</button>)}{query.data && !query.data.some(p => p.title.toLowerCase().includes(q.toLowerCase())) && <p className="map-muted">Планы не найдены</p>}</div></div>
  return <GeologyModuleLayout>{query.isPending ? <div className="page-loading">Открываем планы…</div> : query.error ? <div className="map-load-error"><h1>Не удалось открыть планы</h1><p role="alert">{query.error.message}</p><div className="map-actions"><Button onClick={() => void query.refetch()}>Повторить</Button><Button variant="secondary" onClick={() => downloadFile('plans-storage-backup.txt', mapRepository.raw(), 'text/plain')}>Скачать исходную копию</Button>{hasPermission(persona, 'geology.maps.edit') && <Button variant="danger" onClick={() => { if (window.confirm('Восстановить исходные планы? Только локальные планы карты будут заменены; сохраните исходную копию перед восстановлением.')) { mapRepository.reset(); refresh() } }}>Восстановить примеры</Button>}</div></div> : selected ? <PlanWorkbench key={selected.id} initial={selected} persona={persona} search={search} onSearch={next => void navigate({ to: '/geology/plans/$projectId', params: { projectId: selected.id }, search: next, resetScroll: false })} onSaved={refresh} onDeleted={() => { refresh(); void navigate({ to: '/geology/plans' }) }} registry={registry} registryOpen={open} onRegistryToggle={() => setOpen(!open)} /> : <div className="map-empty-layout"><aside>{registry}</aside><div className="map-empty"><Map size={34} /><h1>{projectId ? 'План не найден' : 'Интерактивный план месторождения'}</h1><p>{projectId ? 'Выберите другой план в реестре или создайте новый.' : 'Выберите план слева или создайте новый.'}</p></div></div>}
    {creating && <WorkspaceDialog title="Новый план месторождения" size="compact" onClose={() => setCreating(false)} footer={<><Button variant="secondary" onClick={() => setCreating(false)}>Отмена</Button><Button disabled={!title.trim()} onClick={() => { try { const next = emptyMap(`MAP-${newId().slice(0, 8)}`, title); next.author = persona?.name ?? ''; if (!canEditMap(persona, next)) throw new Error('Нет доступа к созданию плана в этой области.'); const result = mapRepository.save(next, persona); refresh(); setCreating(false); void navigate({ to: '/geology/plans/$projectId', params: { projectId: result.id }, search: {} }) } catch (e) { setError(e instanceof Error ? e.message : 'Не удалось создать план.') } }}>Создать план</Button></>}><label className="map-form">Название<input value={title} maxLength={120} onChange={e => setTitle(e.target.value)} /></label><p>Полигон Северный · залежь 2.1</p>{error && <p role="alert" className="map-error">{error}</p>}</WorkspaceDialog>}
  </GeologyModuleLayout>
}
