import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { GeologyDatabaseDeposit } from '../../features/geobase'

const bgdDepositRoute = getRouteApi('/geology/bgd/$depositId')

export function GeoBaseDepositPage() {
  const { depositId } = bgdDepositRoute.useParams()
  const search = bgdDepositRoute.useSearch()
  const navigate = useNavigate({ from: '/geology/bgd/$depositId' })

  return <GeologyDatabaseDeposit
    depositId={depositId}
    onBack={(replace) => void navigate({ to: '/geology/bgd', search, replace })}
  />
}