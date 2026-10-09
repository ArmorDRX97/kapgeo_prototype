import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { GeologyDatabaseDeposit } from '../../features/geobase'

const bgdDepositRoute = getRouteApi('/geology/bgd/$depositId')

export function GeoBaseDepositPage() {
  const { depositId } = bgdDepositRoute.useParams()
  const navigate = useNavigate({ from: '/geology/bgd/$depositId' })

  return <GeologyDatabaseDeposit
    depositId={depositId}
    key={depositId}
    onOpenDeposit={(nextDepositId) => void navigate({ to: '/geology/bgd/$depositId', params: { depositId: nextDepositId }, search: {} })}
    onDeleted={() => void navigate({ to: '/geology/bgd', replace: true })}
  />
}
