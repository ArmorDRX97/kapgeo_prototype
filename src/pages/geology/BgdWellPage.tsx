import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { WellEditorPage } from './NewWellPage'

const newRoute = getRouteApi('/geology/bgd/$depositId/wells/new')
const wellRoute = getRouteApi('/geology/bgd/$depositId/wells/$wellId')

export function BgdNewWellPage() {
  const { depositId } = newRoute.useParams()
  const navigate = useNavigate({ from: '/geology/bgd/$depositId/wells/new' })
  return <WellEditorPage
    depositId={depositId}
    onCancel={() => void navigate({ to: '/geology/bgd/$depositId', params: { depositId } })}
    onSaved={(well) => void navigate({ to: '/geology/bgd/$depositId/wells/$wellId', params: { depositId, wellId: well.id }, replace: true })}
  />
}

export function BgdWellPage() {
  const { depositId, wellId } = wellRoute.useParams()
  const navigate = useNavigate({ from: '/geology/bgd/$depositId/wells/$wellId' })
  return <WellEditorPage
    depositId={depositId}
    wellId={wellId}
    onCancel={() => void navigate({ to: '/geology/bgd/$depositId', params: { depositId } })}
    onSaved={(well) => void navigate({ to: '/geology/bgd/$depositId/wells/$wellId', params: { depositId, wellId: well.id }, replace: true })}
  />
}
