import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { WellEditorPage } from './NewWellPage'
import type { BgdWellSection } from '../../features/geobase/model/bgdWellSection'

const newRoute = getRouteApi('/geology/bgd/$depositId/wells/new')
const wellRoute = getRouteApi('/geology/bgd/$depositId/wells/$wellId')

export function BgdNewWellPage() {
  const { depositId } = newRoute.useParams()
  const search = newRoute.useSearch()
  const navigate = useNavigate({ from: '/geology/bgd/$depositId/wells/new' })
  return <WellEditorPage
    depositId={depositId}
    activeTab={search.tab ?? 'description'}
    onTabChange={(tab) => void navigate({ search: { tab: tab === 'description' ? undefined : tab }, replace: true })}
    onCancel={() => void navigate({ to: '/geology/bgd/$depositId', params: { depositId } })}
    onSaved={(well) => void navigate({ to: '/geology/bgd/$depositId/wells/$wellId', params: { depositId, wellId: well.id }, replace: true })}
  />
}

export function BgdWellPage() {
  const { depositId, wellId } = wellRoute.useParams()
  const search = wellRoute.useSearch()
  const navigate = useNavigate({ from: '/geology/bgd/$depositId/wells/$wellId' })
  return <WellEditorPage
    depositId={depositId}
    wellId={wellId}
    activeTab={search.tab ?? 'description'}
    onTabChange={(tab: BgdWellSection) => void navigate({ search: { tab: tab === 'description' ? undefined : tab }, replace: true })}
    onCancel={() => void navigate({ to: '/geology/bgd/$depositId', params: { depositId } })}
    onSaved={(well) => void navigate({ to: '/geology/bgd/$depositId/wells/$wellId', params: { depositId, wellId: well.id }, replace: true })}
  />
}
