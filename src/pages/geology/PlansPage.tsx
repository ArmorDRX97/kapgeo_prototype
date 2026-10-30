import { useState } from 'react'
import { useNavigate, useParams, useSearch } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { LockKeyhole, Map, Plus, Search, X } from 'lucide-react'
import { useSession } from '../../entities/session/model/sessionContext'
import { emptyMap } from '../../entities/geology-map/fixtures'
import { newId } from '../../entities/geology-map/model'
import { canEditMap, mapRepository } from '../../repository/demo/mapRepository'
import { hasPermission } from '../../shared/auth/permissions'
import { AccessDeniedPage } from '../system/ModulePlaceholderPage'
import { Button } from '../../shared/ui/Button'
import { WorkspaceDialog } from '../../shared/ui/WorkspaceDialog'
import { GeologyModuleLayout } from './GeologyModuleLayout'
import { PlanIconButton } from '../../features/geology-plan/PlanIconButton'
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
  const normalized = q.trim().toLocaleLowerCase('ru')
  const filteredPlans = (query.data ?? []).filter(plan => `${plan.title} ${plan.id}`.toLocaleLowerCase('ru').includes(normalized))
  const openCreate = () => { setTitle(''); setError(''); setCreating(true) }
  const registry = <div className="map-registry">
    <div className="map-registry-heading"><strong>Планы месторождения</strong><PlanIconButton icon={Plus} label="Создать план" disabled={!hasPermission(persona, 'geology.maps.edit')} onClick={openCreate} /></div>
    <label className="map-registry-search"><Search size={16} /><input aria-label="Поиск проектов" value={q} maxLength={120} onChange={event => setQ(event.target.value)} placeholder="Поиск по названию или ID" />{q && <button type="button" aria-label="Очистить поиск планов" onClick={() => setQ('')}><X size={14} /></button>}</label>
    <div className="map-registry-meta"><small>Полигон Северный · залежь 2.1</small><small>{filteredPlans.length} из {query.data?.length ?? 0}</small></div>
    <div className="map-registry-list">{filteredPlans.map(plan => <button type="button" key={plan.id} className={plan.id === projectId ? 'is-selected' : ''} aria-current={plan.id === projectId ? 'page' : undefined} onClick={() => void navigate({ to: '/geology/plans/$projectId', params: { projectId: plan.id }, search: {} })}><Map size={16} /><span><strong>{plan.title}</strong><small>{plan.date} · {plan.objects.filter(object => object.kind === 'well').length} скв.</small></span>{plan.id === projectId && <i className="map-selection-dot" aria-hidden="true" />}{plan.locked && <LockKeyhole size={14} aria-label="Зафиксирован" />}</button>)}</div>
    {!filteredPlans.length && <div className="map-registry-empty"><strong>Планы не найдены</strong><p>Попробуйте другое название или ID.</p>{q && <Button variant="secondary" size="sm" onClick={() => setQ('')}>Сбросить поиск</Button>}</div>}
  </div>
  return <GeologyModuleLayout>{query.isPending ? <div className="page-loading">Открываем планы…</div> : query.error ? <div className="map-load-error"><h1>Не удалось открыть планы</h1><p role="alert">{query.error.message}</p><div className="map-actions"><Button onClick={() => void query.refetch()}>Повторить</Button><Button variant="secondary" onClick={() => downloadFile('plans-storage-backup.txt', mapRepository.raw(), 'text/plain')}>Скачать исходную копию</Button>{hasPermission(persona, 'geology.maps.edit') && <Button variant="danger" onClick={() => { if (window.confirm('Восстановить исходные планы? Только локальные планы карты будут заменены; сохраните исходную копию перед восстановлением.')) { mapRepository.reset(); refresh() } }}>Восстановить исходные планы</Button>}</div></div> : selected ? <PlanWorkbench key={selected.id} initial={selected} persona={persona} search={search} onSearch={next => void navigate({ to: '/geology/plans/$projectId', params: { projectId: selected.id }, search: next, resetScroll: false })} onSaved={refresh} onDeleted={() => { refresh(); void navigate({ to: '/geology/plans' }) }} registry={registry} registryOpen={open} onRegistryToggle={() => setOpen(!open)} /> : <div className="map-empty-layout"><aside>{registry}</aside><div className="map-empty"><div className="map-empty-card"><span className="map-empty-icon"><Map size={30} /></span><h1>{projectId ? 'План не найден' : 'Интерактивный план месторождения'}</h1><p>{projectId ? 'Выберите другой план в реестре или создайте новый.' : 'Откройте план слева, чтобы работать со скважинами, профилями и геологическими блоками.'}</p><div className="map-empty-features"><span>Скважины и слои</span><span>Профили и контуры</span><span>Чертёж и экспорт</span></div>{hasPermission(persona, 'geology.maps.edit') && <Button onClick={openCreate}><Plus size={16} />Создать план</Button>}</div></div></div>}
    {creating && <WorkspaceDialog title="Новый план месторождения" size="compact" onClose={() => setCreating(false)} footer={<><Button variant="secondary" onClick={() => setCreating(false)}>Отмена</Button><Button disabled={!title.trim()} onClick={() => { try { const next = emptyMap(`MAP-${newId().slice(0, 8)}`, title); next.author = persona?.name ?? ''; if (!canEditMap(persona, next)) throw new Error('Нет доступа к созданию плана в этой области.'); const result = mapRepository.save(next, persona); refresh(); setCreating(false); void navigate({ to: '/geology/plans/$projectId', params: { projectId: result.id }, search: {} }) } catch (e) { setError(e instanceof Error ? e.message : 'Не удалось создать план.') } }}>Создать план</Button></>}><label className="map-form">Название плана<input autoComplete="off" placeholder="Например, Северный · геологический план" value={title} maxLength={120} onChange={e => setTitle(e.target.value)} /></label><p>Полигон Северный · залежь 2.1</p>{error && <p role="alert" className="map-error">{error}</p>}</WorkspaceDialog>}
  </GeologyModuleLayout>
}
