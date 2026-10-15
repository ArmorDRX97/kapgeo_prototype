import type { ConstructionInterval } from './types'

export function validateConstruction(items: ConstructionInterval[], depth: number): string {
  for (const item of items) {
    if (![item.from, item.to, item.diameter].every(Number.isFinite) || item.from < 0 || item.to <= item.from) return 'Конечная глубина должна быть больше начальной.'
    if (item.to > depth) return 'Конструкция не должна выходить за глубину скважины.'
    if (item.diameter <= 0 || (item.innerDiameter != null && (!Number.isFinite(item.innerDiameter) || item.innerDiameter <= 0 || item.innerDiameter >= item.diameter))) return 'Проверьте диаметры: внутренний должен быть меньше внешнего.'
  }
  return ''
}
