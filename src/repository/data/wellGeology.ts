import type { Well, WellGeologyData } from '../../entities/well/model/types'

const baseGeologyData: WellGeologyData = {
  baseVersion: 7,
  intervals: [
    { id: 'LITH-01', from: 0, to: 120, lithology: 'Суглинок', stratigraphy: 'Q', description: 'Покровные суглинки, влажные, с редким щебнем.', source: 'Ручное описание' },
    { id: 'LITH-02', from: 120, to: 280, lithology: 'Песчаник', stratigraphy: 'K2', description: 'Песчаник мелкозернистый, серый, слабосцементированный.', source: 'Керн' },
    { id: 'LITH-03', from: 280, to: 320, lithology: 'Рудный песчаник', stratigraphy: 'K2', description: 'Песчаник с лимонитизацией; интервал требует уточнения границы.', source: 'Керн' },
    { id: 'LITH-04', from: 340, to: 452, lithology: 'Алевролит', stratigraphy: 'K1', description: 'Алевролит серый, трещиноватый, местами глинистый.', source: 'ГИС' },
    { id: 'LITH-05', from: 452, to: 612.4, lithology: 'Глина', stratigraphy: 'J3', description: 'Глина плотная, тёмно-серая, с песчаными прослоями.', source: 'ГИС' },
  ],
}

const geologyStore = new Map<string, WellGeologyData>()

function cloneGeology(data: WellGeologyData): WellGeologyData {
  return { baseVersion: data.baseVersion, intervals: data.intervals.map((item) => ({ ...item })) }
}

export function getGeologyData(well: Well) {
  const stored = geologyStore.get(well.id)
  if (stored) return cloneGeology(stored)
  const seeded = ['WELL-1042', 'WELL-1010-FULL'].includes(well.id) ? { ...cloneGeology(baseGeologyData), baseVersion: well.version ?? 7 } : { baseVersion: well.version ?? 1, intervals: [] }
  geologyStore.set(well.id, cloneGeology(seeded))
  return seeded
}

export function setGeologyData(wellId: string, data: WellGeologyData) {
  geologyStore.set(wellId, cloneGeology(data))
  return cloneGeology(data)
}
