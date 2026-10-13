import { useNavigate, useSearch } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { interpretationWells } from '../../entities/interpretation/model/fixtures'
import { useSession } from '../../entities/session/model/sessionContext'
import { InterpretationWorkbench } from '../../features/interpretation/InterpretationWorkbench'
import { interpretationRepository } from '../../repository/demo/interpretationRepository'
import { hasPermission } from '../../shared/auth/permissions'
import { Button } from '../../shared/ui/Button'
import { Panel } from '../../shared/ui/Panel'
import { AccessDeniedPage } from '../system/ModulePlaceholderPage'
import { GeologyModuleLayout } from './GeologyModuleLayout'

export function InterpretationPage() {
  return <GeologyModuleLayout><InterpretationContent /></GeologyModuleLayout>
}

function InterpretationContent() {
  const { persona } = useSession()
  const search = useSearch({ from: '/geology/interpretation' })
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const well = interpretationWells.find(w => w.id === (search.well ?? interpretationWells[0]?.id))
  const allowed = hasPermission(persona, 'geology.view')
  const query = useQuery({ queryKey: ['interpretation-demo', well?.id], queryFn: () => interpretationRepository.load(well!), enabled: allowed && !!well, retry: false })
  if (!allowed) return <AccessDeniedPage moduleName="Интерпретация" />
  if (!well) return <Panel title="Скважина не найдена"><p>Выберите скважину из списка.</p><Button onClick={() => void navigate({ to: '/geology/interpretation', search: {} })}>Открыть список скважин</Button></Panel>
  if (query.error) return <Panel title="Не удалось открыть интерпретацию"><p role="alert">{query.error.message}</p><Button onClick={() => void query.refetch()}>Повторить</Button><Button variant="secondary" onClick={() => { if (window.confirm('Удалить только сохранённый результат интерпретации этой скважины?')) { interpretationRepository.reset(well); void query.refetch() } }}>Сбросить интерпретацию</Button></Panel>
  if (!query.data) return <div className="page-loading"><span /><p>Подготавливаем планшет…</p></div>
  // Selection and depth-window updates are workbench interactions, not page changes.
  return <><div className="alpha-legacy-return"><Button size="sm" variant="quiet" onClick={() => void navigate({ to: '/geology/interpretation/$method', params: { method: 'electro' }, search: { well: well.id } })}>← Методы интерпретации ГИС</Button></div><InterpretationWorkbench key={well.id} well={well} initial={query.data} persona={persona} search={search}
    onSaved={document => queryClient.setQueryData(['interpretation-demo', well.id], document)}
    onLocationChange={next => void navigate({ to: '/geology/interpretation', search: next, replace: next.well === search.well, resetScroll: false })} /></>
}
