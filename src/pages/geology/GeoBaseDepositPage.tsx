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
    onSectionChange={(section) => void navigate({ search: { section: section === 'overview' ? undefined : section }, replace: true })}
    onBack={(replace) => void navigate({ to: '/geology/bgd', replace })}
    onCreateWell={() => void navigate({ to: '/geology/bgd/$depositId/wells/new', params: { depositId } })}
    onOpenWell={(wellId) => void navigate({ to: '/geology/bgd/$depositId/wells/$wellId', params: { depositId, wellId } })}
  />
}
