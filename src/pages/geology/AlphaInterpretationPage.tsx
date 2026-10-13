import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams, useSearch } from '@tanstack/react-router'
import { interpretationWells } from '../../entities/interpretation/model/fixtures'
import { alphaNames, type AlphaPage } from '../../entities/interpretation/model/alphaTypes'
import { useSession } from '../../entities/session/model/sessionContext'
import { alphaRepository } from '../../repository/demo/alphaInterpretationRepository'
import { hasPermission } from '../../shared/auth/permissions'
import { Panel } from '../../shared/ui/Panel'
import { Button } from '../../shared/ui/Button'
import { AccessDeniedPage } from '../system/ModulePlaceholderPage'
import { GeologyModuleLayout } from './GeologyModuleLayout'
import { AlphaWorkbench } from '../../features/interpretation/alpha/AlphaWorkbench'

export function AlphaInterpretationPage() {
  const { persona } = useSession(), { method } = useParams({ from: '/geology/interpretation/$method' }), search = useSearch({ from: '/geology/interpretation/$method' })
  const navigate = useNavigate(), cache = useQueryClient(), well = interpretationWells.find(w => w.id === (search.well ?? 'int-demo-01'))
  const allowed = hasPermission(persona, 'geology.view'), valid = method in alphaNames
  const query = useQuery({ queryKey: ['alpha-interpretation', well?.id], queryFn: () => alphaRepository.load(well!), enabled: allowed && !!well && valid, retry: false })
  if (!allowed) return <AccessDeniedPage moduleName="Интерпретация" />
  const fallback = () => void navigate({ to: '/geology/interpretation/$method', params: { method: 'gamma' }, search: {} })
  if (!well || !valid) return <Panel title={!well ? 'Скважина не найдена' : 'Метод не найден'}><Button onClick={fallback}>Открыть интерпретацию</Button></Panel>
  if (query.error) return <Panel title="Не удалось открыть интерпретацию"><p role="alert">{query.error.message}</p><Button onClick={() => void query.refetch()}>Повторить</Button></Panel>
  if (!query.data) return <div className="page-loading"><span /><p>Подготавливаем записи ГИС…</p></div>
  return <GeologyModuleLayout><AlphaWorkbench key={well.id} initial={query.data} well={well} persona={persona} page={method as AlphaPage} search={search}
    onLocation={(page, search, replace = false) => void navigate({ to: '/geology/interpretation/$method', params: { method: page }, search, replace, resetScroll: false })}
    onSaved={document => cache.setQueryData(['alpha-interpretation', well.id], document)} /></GeologyModuleLayout>
}
