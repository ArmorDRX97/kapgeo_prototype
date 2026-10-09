
export type ConstructionMaterial = 'Сталь' | 'ПВХ' | 'Фильтр'
export type ConstructionElement = 'Направление' | 'Кондуктор' | 'Эксплуатационная колонна' | 'Фильтровая колонна'

export type ConstructionInterval = {
  id: string
  kind?: 'interval' | 'point'
  from: number
  to: number
  diameter: number
  material: ConstructionMaterial
  element: ConstructionElement
}

export type WellConstructionData = {
  intervals: ConstructionInterval[]
}
