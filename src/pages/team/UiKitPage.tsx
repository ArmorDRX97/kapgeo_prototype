import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { UiKitWorkbench } from '../../features/ui-kit/UiKitWorkbench'

const route = getRouteApi('/team/ui-kit')
export function UiKitPage() {
  const { section } = route.useSearch()
  const navigate = useNavigate()
  return <UiKitWorkbench section={section ?? 'overview'} onSection={section => void navigate({ to: '/team/ui-kit', search: { section: section === 'overview' ? undefined : section }, resetScroll: false })} onBack={() => void navigate({ to: '/profile' })} />
}
