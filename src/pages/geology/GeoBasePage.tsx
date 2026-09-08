import { useNavigate } from '@tanstack/react-router'
import { GeologyDatabaseRegistry } from '../../features/geobase'

export function GeoBasePage() {
  const navigate = useNavigate({ from: '/geology/bgd' })

  return <GeologyDatabaseRegistry
    onOpenDeposit={(depositId) => void navigate({ to: '/geology/bgd/$depositId', params: { depositId } })}
  />
}
