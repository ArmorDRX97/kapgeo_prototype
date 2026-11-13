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
  const canCreate = hasPermission(persona, 'geology.sections.edit')
  const openCatalog = (replace = false) => void navigate({ to: '/geology/sections', search: registryContext, replace })
  const openConstruction = canCreate ? () => void navigate({ to: '/geology/sections', search: { ...registryContext, create: true } }) : undefined
  const updateRegistry = (patch: Partial<SectionSearch>, replace = false) => {
    if (selected && sectionId) void navigate({ to: '/geology/sections/$sectionId', params: { sectionId }, search: { ...search, ...patch }, replace, resetScroll: false })
    else void navigate({ to: '/geology/sections', search: { ...registryContext, ...patch }, replace, resetScroll: false })
  }
  const create = (draft: GeologySection) => {
    const doc = sectionRepository.create(draft, persona)
    queryClient.setQueryData<GeologySection[]>(sectionsQueryKey, current => [...(current ?? []), doc])
    void navigate({ to: '/geology/sections/$sectionId', params: { sectionId: doc.id }, search: { ...registryContext, view: 'lithology' }, replace: true })
  }

  if (query.isPending) return <GeologyModuleLayout><div className="page-loading"><p>Открываем каталог разрезов…</p></div></GeologyModuleLayout>
  if (query.error) return <GeologyModuleLayout><Panel title="Не удалось открыть каталог"><p role="alert">{query.error.message}</p><Button onClick={() => void query.refetch()}>Повторить</Button></Panel></GeologyModuleLayout>

  if (!sectionId && search.create && canCreate) {
    return <GeologyModuleLayout><SectionConstruction onCancel={() => openCatalog(true)} onSave={create} /></GeologyModuleLayout>
  }

  const registryProps = { sections: entries, search, onSearch: updateRegistry, onCreate: openConstruction }
  if (!selected) return <GeologyModuleLayout><SectionRegistry key="catalog" catalog {...registryProps} missingDocument={Boolean(sectionId)} /></GeologyModuleLayout>

  return <GeologyModuleLayout><div className={`section-layout${collapsed ? ' is-registry-collapsed' : ''}`}>
    <SectionRegistry {...registryProps} sectionId={sectionId} collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
    <div className="section-document">
      <SectionWorkbench documents={query.data} key={selected.id} initial={selected} persona={persona} search={search}
        onSearch={next => void navigate({ to: '/geology/sections/$sectionId', params: { sectionId: selectedEntry!.id }, search: { ...registryContext, ...next }, resetScroll: false })}
        onSaved={() => void refresh()} onDeleted={() => { void refresh(); openCatalog() }} />
    </div>
  </div></GeologyModuleLayout>
}
