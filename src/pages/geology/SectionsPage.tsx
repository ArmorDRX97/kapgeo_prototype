import { useMemo, useState } from 'react'
import { useNavigate, useParams, useSearch } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSession } from '../../entities/session/model/sessionContext'
import { createSection } from '../../entities/geology-section/model/fixtures'
import { sectionRepository } from '../../repository/demo/sectionRepository'
import { hasPermission } from '../../shared/auth/permissions'
import { SectionWorkbench } from '../../features/geology-sections/SectionWorkbench'
import { SectionRegistry } from '../../features/geology-sections/ui/SectionRegistry'
import { validateSectionSearch, type SectionSearch } from '../../features/geology-sections/model/search'
import { sectionRegistryEntries } from '../../features/geology-sections/model/registryEntries'
import { Button } from '../../shared/ui/Button'
import { Panel } from '../../shared/ui/Panel'
import { WorkspaceDialog } from '../../shared/ui/WorkspaceDialog'
import { GeologyModuleLayout } from './GeologyModuleLayout'
import '../../features/geology-sections/sections.css'

export function SectionsPage() {
  const { persona } = useSession(), navigate = useNavigate(), queryClient = useQueryClient()
  const { sectionId } = useParams({ strict: false }), search = validateSectionSearch(useSearch({ strict: false }))
  const query = useQuery({ queryKey: ['geology-sections-prototype'], queryFn: () => sectionRepository.list(), retry: false })
  const [collapsed, setCollapsed] = useState(false)
  const registryContext = { q: search.q, kind: search.kind, year: search.year, body: search.body, groupBy: search.groupBy }
  const updateRegistry = (patch: Partial<SectionSearch>, replace = false) => { const next = { ...search, ...patch }; if (sectionId) void navigate({ to: '/geology/sections/$sectionId', params: { sectionId }, search: next, replace, resetScroll: false }); else void navigate({ to: '/geology/sections', search: next, replace, resetScroll: false }) }
  const [creating, setCreating] = useState(false), [name, setName] = useState(''), [error, setError] = useState('')
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['geology-sections-prototype'] })
  const entries = useMemo(() => sectionRegistryEntries(query.data ?? []), [query.data])
  const selectedEntry = entries.find(entry => entry.id === sectionId)
  const selected = query.data?.find(d => d.id === selectedEntry?.documentId)
  const create = () => {
    try {
      let n = 1; while (query.data?.some(s => s.id === `GTR-NEW-${n}`)) n++
      const doc = sectionRepository.create(createSection(`GTR-NEW-${n}`, name), persona)
      void refresh(); setCreating(false); setName(''); setError(''); void navigate({ to: '/geology/sections/$sectionId', params: { sectionId: doc.id }, search: {} })
    } catch (problem) { setError(problem instanceof Error ? problem.message : 'Не удалось создать разрез.') }
  }
  return <GeologyModuleLayout>
    {query.isPending ? <div className="page-loading"><p>Открываем локальные разрезы…</p></div> : query.error ? <Panel title="Не удалось открыть реестр"><p role="alert">{query.error.message}</p><Button onClick={() => void query.refetch()}>Повторить</Button></Panel> : <div className={`section-layout${collapsed ? ' is-registry-collapsed' : ''}`}>
      <SectionRegistry sections={entries} sectionId={sectionId} search={search} onSearch={updateRegistry} collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} onCreate={hasPermission(persona, 'geology.sections.edit') ? () => { setCreating(true); setError('') } : undefined} />
      <div className="section-document">{selected ? <SectionWorkbench key={selected.id} initial={selected} persona={persona} search={search} onSearch={next => void navigate({ to: '/geology/sections/$sectionId', params: { sectionId: selectedEntry!.id }, search: { ...registryContext, ...next }, resetScroll: false })} onSaved={() => void refresh()} onDeleted={() => { void refresh(); void navigate({ to: '/geology/sections' }) }} /> : <section className="section-document-empty" aria-labelledby="section-empty-title"><div><h1 id="section-empty-title">{sectionId ? 'Разрез не найден' : 'Геотехнологические разрезы'}</h1><p>{sectionId ? 'Этот разрез отсутствует в локальном реестре. Выберите другой или создайте новый.' : 'Выберите разрез в реестре слева или создайте новый.'}</p></div></section>}</div>
    </div>}
    {creating && <WorkspaceDialog title="Новый разрез" size="compact" onClose={() => setCreating(false)} footer={<><Button variant="secondary" onClick={() => setCreating(false)}>Отмена</Button><Button disabled={!name.trim()} onClick={create}>Создать разрез</Button></>}><label className="section-search">Название разреза<input value={name} maxLength={120} onChange={e => setName(e.target.value)} /></label><p>Месторождение: Полигон Северный. После создания задайте высоты, состав скважин и профиль.</p>{error && <p role="alert" className="section-error">{error}</p>}</WorkspaceDialog>}
  </GeologyModuleLayout>
}
