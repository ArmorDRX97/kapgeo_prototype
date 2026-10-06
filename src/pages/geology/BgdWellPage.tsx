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
    activeView={search.view}
    onViewChange={(view) => void navigate({ search: { ...search, view }, resetScroll: false })}
    onTabChange={(tab) => void navigate({ search: { tab: tab === 'description' ? undefined : tab }, resetScroll: false })}
    onCancel={() => void navigate({ to: '/geology/bgd/$depositId', params: { depositId } })}
    onSaved={(well) => void navigate({ to: '/geology/bgd/$depositId/wells/$wellId', params: { depositId, wellId: well.id }, search, replace: true, resetScroll: false })}
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
    activeView={search.view}
    onViewChange={(view) => void navigate({ search: { ...search, view }, resetScroll: false })}
    onTabChange={(tab: BgdWellSection) => void navigate({ search: { tab: tab === 'description' ? undefined : tab }, resetScroll: false })}
    onCancel={() => void navigate({ to: '/geology/bgd/$depositId', params: { depositId } })}
    onSaved={(well) => void navigate({ to: '/geology/bgd/$depositId/wells/$wellId', params: { depositId, wellId: well.id }, search, replace: true, resetScroll: false })}
  />
}
