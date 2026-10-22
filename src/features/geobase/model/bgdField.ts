import { useQuery, useQueryClient } from '@tanstack/react-query'
import { depositField } from '../../../entities/geology-map/fieldScene'
import type { MapObject, MapProject } from '../../../entities/geology-map/model'

const wellOrder = new Intl.Collator('ru', { numeric: true })
export const BGD_TEMPLATE_WELL_ID = 'WELL-1010-FULL'
export const bgdFieldWells = depositField.objects.filter(o => o.kind === 'well').map((o, index) => ({ ...o, id: `BGD-${o.id}`, status: index % 23 === 0 ? 'Требует внимания' : index % 17 === 0 ? 'Отключена' : o.attributes.type === 'Проектная' ? 'На проверке' : 'Работает', site: index % 3 === 0 ? 'Южный' : 'Северный' })).sort((a, b) => wellOrder.compare(a.name, b.name))
const byId = new Map(bgdFieldWells.map(w => [w.id, w]))
export function bgdFieldWell(id: string | undefined) { return id ? byId.get(id) : undefined }
export const bgdFieldScene: MapProject = { ...depositField, id: 'BGD-FIELD', layers: depositField.layers.filter(l => l.id === 'field-wells'), objects: bgdFieldWells }
export type BgdFieldFilters = { query: string; hiddenTypes: string[]; status: string; site: string }
const initial: BgdFieldFilters = { query: '', hiddenTypes: [], status: 'all', site: 'all' }
export function useBgdFieldFilters(depositId: string) {
  const client = useQueryClient(), key = ['bgd-field-filters', depositId]
  const { data: filters } = useQuery({ queryKey: key, queryFn: () => initial, initialData: initial, staleTime: Infinity })
  return { filters, setFilters: (patch: Partial<BgdFieldFilters>) => client.setQueryData<BgdFieldFilters>(key, old => ({ ...(old ?? initial), ...patch })), reset: () => client.setQueryData(key, initial) }
}
export function filterBgdWells(filters: BgdFieldFilters) {
  const query = filters.query.trim().toLocaleLowerCase('ru')
  return bgdFieldWells.filter(w => !filters.hiddenTypes.includes(w.attributes.type) && (filters.status === 'all' || w.status === filters.status) && (filters.site === 'all' || w.site === filters.site) && (!query || `${w.name} ${w.id} ${w.attributes.type} ${w.status} ${w.site}`.toLocaleLowerCase('ru').includes(query)))
}
export function bgdOnlyWells(objects: MapObject[]): MapProject { return { ...bgdFieldScene, objects } }
