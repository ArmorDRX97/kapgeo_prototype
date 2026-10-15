
export type ConstructionMaterial = 'Сталь' | 'ПВХ' | 'Фильтр'
export type ConstructionElement = 'Направление' | 'Кондуктор' | 'Обсадная колонна' | 'Цементировочное кольцо' | 'Цементировочный узел' | 'Фильтр' | 'Отстойник' | 'Гравийная обсыпка' | 'Бентогильза' | 'Обсадная труба' | 'Фильтровая труба' | 'Цементирование' | 'Обсыпка' | 'Эксплуатационная колонна' | 'Фильтровая колонна'

export type ConstructionInterval = {
  id: string
  kind?: 'interval' | 'point'
  from: number
  to: number
  length?: number
  diameter: number
  innerDiameter?: number | null
  note?: string
  material: ConstructionMaterial
  element: ConstructionElement
}

export type WellConstructionData = {
  intervals: ConstructionInterval[]
}
