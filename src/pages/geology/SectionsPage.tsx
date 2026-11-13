import { useMemo, useState } from 'react'
import { useNavigate, useParams, useSearch } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSession } from '../../entities/session/model/sessionContext'
import type { GeologySection } from '../../entities/geology-section/model/types'
import { sectionRepository } from '../../repository/demo/sectionRepository'
import { hasPermission } from '../../shared/auth/permissions'
import { SectionWorkbench } from '../../features/geology-sections/SectionWorkbench'
import { SectionRegistry } from '../../features/geology-sections/ui/SectionRegistry'
import { SectionConstruction } from '../../features/geology-sections/ui/SectionConstruction'
import { sectionRegistrySearch, validateSectionSearch, type SectionSearch } from '../../features/geology-sections/model/search'
import { sectionRegistryEntries } from '../../features/geology-sections/model/registryEntries'
import { Button } from '../../shared/ui/Button'
import { Panel } from '../../shared/ui/Panel'
import { GeologyModuleLayout } from './GeologyModuleLayout'
import '../../features/geology-sections/sections.css'

const sectionsQueryKey = ['geology-sections-prototype']

export function SectionsPage() {
  const { persona } = useSession(), navigate = useNavigate(), queryClient = useQueryClient()
  const { sectionId } = useParams({ strict: false }), search = validateSectionSearch(useSearch({ strict: false }))
  const query = useQuery({ queryKey: sectionsQueryKey, queryFn: () => sectionRepository.demoList(), retry: false })
  const [collapsed, setCollapsed] = useState(() => !!sectionId && window.innerWidth <= 760)
  const registryContext = sectionRegistrySearch(search)
  const refresh = () => queryClient.invalidateQueries({ queryKey: sectionsQueryKey })
  const entries = useMemo(() => sectionRegistryEntries(query.data ?? []), [query.data])
  const selectedEntry = entries.find(entry => entry.id === sectionId) ?? (/^GTR-DEMO-\d+$/.test(sectionId ?? '') ? entries.find(entry => entry.id === 'GTR-01') : undefined)
  const selected = query.data?.find(d => d.id === selectedEntry?.documentId)
  const example = selectedEntry?.demo ? { title: selectedEntry.title, techBlock: selectedEntry.techBlock } : undefined
  const canCreate = hasPermission(persona, 'geology.sections.edit')
  const changeConstruction = (create?: true) => {
    const next = { ...search, create }
    if (selected && sectionId) void navigate({ to: '/geology/sections/$sectionId', params: { sectionId }, search: next, replace: !create })
    else void navigate({ to: '/geology/sections', search: { ...registryContext, create }, replace: !create })
  }
  const updateRegistry = (patch: Partial<SectionSearch>, replace = false) => {
    if (selected && sectionId) void navigate({ to: '/geology/sections/$sectionId', params: { sectionId }, search: { ...search, ...patch }, replace, resetScroll: false })
    else void navigate({ to: '/geology/sections', search: { ...registryContext, ...patch }, replace, resetScroll: false })
  }
  const create = (draft: GeologySection) => {
    const doc = sectionRepository.create(draft, persona)
    queryClient.setQueryData<GeologySection[]>(sectionsQueryKey, current => [...(current ?? []), doc])
    void navigate({ to: '/geology/sections/$sectionId', params: { sectionId: doc.id }, search: { ...registryContext, view: 'lithology' }, replace: true })
  }

  if (query.isPending) return <GeologyModuleLayout><div className="page-loading"><p>Загружаем разрезы…</p></div></GeologyModuleLayout>
  if (query.error) return <GeologyModuleLayout><Panel title="Не удалось загрузить разрезы"><p role="alert">{query.error.message}</p><Button onClick={() => void query.refetch()}>Повторить</Button></Panel></GeologyModuleLayout>

  if (search.create && canCreate) {
    return <GeologyModuleLayout><SectionConstruction onCancel={() => changeConstruction()} onSave={create} /></GeologyModuleLayout>
  }

  return <GeologyModuleLayout><div className={`section-layout${collapsed ? ' is-registry-collapsed' : ''}`}>
    <SectionRegistry sections={entries} search={search} onSearch={updateRegistry} onCreate={canCreate ? () => changeConstruction(true) : undefined}
      sectionId={selectedEntry?.id} collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
    <div className="section-document">
      {selected ? <SectionWorkbench documents={query.data} key={selectedEntry!.id} initial={selected} example={example} persona={persona} search={search}
        onSearch={next => void navigate({ to: '/geology/sections/$sectionId', params: { sectionId: selectedEntry!.id }, search: { ...registryContext, ...next }, resetScroll: false })}
        onSaved={saved => queryClient.setQueryData<GeologySection[]>(sectionsQueryKey, current => current?.map(doc => doc.id === saved.id ? saved : doc))}
        onDeleted={() => { void refresh(); void navigate({ to: '/geology/sections', search: registryContext }) }} />
        : <div className="section-document-empty">
          <h1>{sectionId ? 'Разрез не найден' : 'Разрезы и развёртки'}</h1>
          <p>{canCreate ? 'Выберите разрез в списке или нажмите «+», чтобы создать новый.' : 'Выберите разрез в списке.'}</p>
        </div>}
    </div>
  </div></GeologyModuleLayout>
}
