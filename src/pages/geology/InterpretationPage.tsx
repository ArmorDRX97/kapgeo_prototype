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

export function InterpretationPage() {
  const { persona } = useSession()
  const search = useSearch({ from: '/geology' })
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const well = interpretationWells.find(w => w.id === (search.well ?? interpretationWells[0]?.id))
  const allowed = hasPermission(persona, 'geology.view')
  const query = useQuery({ queryKey: ['interpretation-demo', well?.id], queryFn: () => interpretationRepository.load(well!), enabled: allowed && !!well, retry: false })
  if (!allowed) return <AccessDeniedPage moduleName="Интерпретация" />
  if (!well) return <Panel title="Демонстрационная скважина не найдена"><p>Выберите скважину из учебного набора.</p><Button onClick={() => void navigate({ to: '/geology', search: {} })}>Открыть учебный набор</Button></Panel>
  if (query.error) return <Panel title="Не удалось открыть интерпретацию"><p role="alert">{query.error.message}</p><Button onClick={() => void query.refetch()}>Повторить</Button><Button variant="secondary" onClick={() => { if (window.confirm('Удалить только сохранённый результат интерпретации этой demo-скважины?')) { interpretationRepository.reset(well); void query.refetch() } }}>Сбросить интерпретацию</Button></Panel>
  if (!query.data) return <div className="page-loading"><span /><p>Подготавливаем демонстрационный планшет…</p></div>
  // Selection and depth-window updates are workbench interactions, not page changes.
  return <InterpretationWorkbench key={well.id} well={well} initial={query.data} persona={persona} search={search}
    onSaved={document => queryClient.setQueryData(['interpretation-demo', well.id], document)}
    onLocationChange={next => void navigate({ to: '/geology', search: next, replace: next.well === search.well, resetScroll: false })} />
}
