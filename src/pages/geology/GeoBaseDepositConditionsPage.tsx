import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { GeologyDatabaseDeposit } from '../../features/geobase'

const conditionsRoute = getRouteApi('/geology/bgd/$depositId/conditions')

export function GeoBaseDepositConditionsPage() {
  const { depositId } = conditionsRoute.useParams()
  const navigate = useNavigate({ from: '/geology/bgd/$depositId/conditions' })

  return <GeologyDatabaseDeposit
    onOpenWell={wellId => void navigate({ to: '/geology/bgd/$depositId/wells/$wellId', params: { depositId, wellId }, search: {} })}
    depositId={depositId}
    key={depositId}
    view="conditions"
    onOpenDeposit={(nextDepositId) => void navigate({ to: '/geology/bgd/$depositId', params: { depositId: nextDepositId }, search: {} })}
    onDeleted={() => void navigate({ to: '/geology/bgd', replace: true })}
  />
}
