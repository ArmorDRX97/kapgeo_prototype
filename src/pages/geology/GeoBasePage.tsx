import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { GeologyDatabaseRegistry } from '../../features/geobase'

const bgdRoute = getRouteApi('/geology/bgd')

export function GeoBasePage() {
  const search = bgdRoute.useSearch()
  const navigate = useNavigate({ from: '/geology/bgd' })

  return <GeologyDatabaseRegistry
    search={search}
    onSearchChange={(patch) => void navigate({ search: { ...search, ...patch }, replace: true })}
    onOpenDeposit={(depositId) => void navigate({ to: '/geology/bgd/$depositId', params: { depositId }, search })}
  />
}