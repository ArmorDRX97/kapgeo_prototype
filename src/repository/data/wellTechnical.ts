import type { Well, WellTechnicalData } from '../../entities/well/model/types'

const baseTechnicalData: WellTechnicalData = {
  construction: [
    { id: 'CONST-01', from: 0, to: 82, diameter: 245, material: 'Сталь', element: 'Кондуктор' },
    { id: 'CONST-02', from: 82, to: 430, diameter: 168, material: 'ПВХ', element: 'Эксплуатационная колонна' },
    { id: 'CONST-03', from: 430, to: 612.4, diameter: 146, material: 'Фильтр', element: 'Фильтровая колонна' },
  ],
  drillingRuns: [
    { id: 'RUN-01', from: 0, to: 120, method: 'Роторное', diameter: 295, coreRecovered: 0 },
    { id: 'RUN-02', from: 120, to: 280, method: 'Колонковое', diameter: 215, coreRecovered: 146.4 },
    { id: 'RUN-03', from: 280, to: 452, method: 'Колонковое', diameter: 190, coreRecovered: 154.8 },
    { id: 'RUN-04', from: 452, to: 612.4, method: 'Колонковое', diameter: 168, coreRecovered: 137.9 },
  ],
  coreBoxes: [
    { id: 'BOX-118', number: 'BX-118', from: 278, to: 292, storage: 'Кернохранилище A · стеллаж 14', photos: 8, samples: 3, description: 'Песчаник мелкозернистый, локальная лимонитизация.' },
    { id: 'BOX-119', number: 'BX-119', from: 292, to: 306, storage: 'Кернохранилище A · стеллаж 14', photos: 6, samples: 4, description: 'Алевролит серый, трещиноватый.' },
    { id: 'BOX-120', number: 'BX-120', from: 306, to: 320, storage: 'Кернохранилище A · стеллаж 15', photos: 7, samples: 2, description: 'Песчаник, восстановительная обстановка.' },
  ],
}

const technicalStore = new Map<string, WellTechnicalData>()

function cloneTechnical(data: WellTechnicalData): WellTechnicalData {
  return {
    construction: data.construction.map((item) => ({ ...item })),
    drillingRuns: data.drillingRuns.map((item) => ({ ...item })),
    coreBoxes: data.coreBoxes.map((item) => ({ ...item })),
  }
}

export function getTechnicalData(well: Well) {
  const stored = technicalStore.get(well.id)
  if (stored) return cloneTechnical(stored)

  const seeded = ['WELL-1042', 'WELL-1010-FULL'].includes(well.id)
    ? cloneTechnical(baseTechnicalData)
    : {
        construction: [{ id: `CONST-${well.id}-01`, from: 0, to: well.depth, diameter: well.casingDiameter, material: 'ПВХ' as const, element: 'Эксплуатационная колонна' as const }],
        drillingRuns: [],
        coreBoxes: [],
      }
  technicalStore.set(well.id, cloneTechnical(seeded))
  return seeded
}

export function setTechnicalData(wellId: string, data: WellTechnicalData) {
  technicalStore.set(wellId, cloneTechnical(data))
  return cloneTechnical(data)
}
