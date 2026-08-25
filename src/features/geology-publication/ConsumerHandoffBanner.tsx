import { useQuery } from '@tanstack/react-query'
import { Link2 } from 'lucide-react'
import type { PublicationConsumer } from '../../entities/geology-publication/model/types'
import { fetchGeologyHandoffs } from '../../repository/api'
import { Badge } from '../../shared/ui/Badge'

export function ConsumerHandoffBanner({ consumer }: { consumer: PublicationConsumer }) {
  const query = useQuery({ queryKey: ['geology-handoffs', consumer], queryFn: () => fetchGeologyHandoffs(consumer) })
  const handoff = query.data?.find((item) => item.status === 'available')
  if (!handoff) return null
  return <aside className="consumer-handoff" aria-label="Опубликованная геологическая версия">
    <Link2 size={18} />
    <span><strong>Доступна геологическая выдача {handoff.packageId} · v{handoff.packageVersion}</strong><small>{handoff.exactVersionIds.length} точных версий · synthetic handoff · IndexedDB</small></span>
    <Badge tone="success">Exact refs</Badge>
  </aside>
}
