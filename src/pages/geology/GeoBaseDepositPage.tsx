import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { GeologyDatabaseDeposit } from '../../features/geobase'

const bgdDepositRoute = getRouteApi('/geology/bgd/$depositId')

export function GeoBaseDepositPage() {
  const { depositId } = bgdDepositRoute.useParams()
  const search = bgdDepositRoute.useSearch()
  const navigate = useNavigate({ from: '/geology/bgd/$depositId' })

  return <GeologyDatabaseDeposit
    depositId={depositId}
    activeSection={search.section ?? 'overview'}
    onDeleted={() => void navigate({ to: '/geology/bgd', replace: true })}
    onCreateWell={() => void navigate({ to: '/geology/bgd/$depositId/wells/new', params: { depositId } })}
    onOpenWell={(wellId) => void navigate({ to: '/geology/bgd/$depositId/wells/$wellId', params: { depositId, wellId } })}
  />
}
