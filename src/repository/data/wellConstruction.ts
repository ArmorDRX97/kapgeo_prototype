import type { ConstructionInterval } from '../../entities/well-construction/model/types'

/** Invented completion example for the demonstration well 1010; not production data. */
export const demoWellConstruction: ConstructionInterval[] = [
  { id: 'CONST-1010-01', element: 'Кондуктор', from: 0, to: 82, diameter: 273, innerDiameter: 253, material: 'Сталь', note: 'Демо: крепление верхней части ствола' },
  { id: 'CONST-1010-02', element: 'Обсадная колонна', from: 0, to: 430, diameter: 219, innerDiameter: 199, material: 'Сталь', note: 'Демо: промежуточная колонна' },
  { id: 'CONST-1010-03', element: 'Цементировочное кольцо', from: 60, to: 82, diameter: 295, innerDiameter: 273, material: 'Сталь', note: 'Демо: изоляция верхнего интервала' },
  { id: 'CONST-1010-04', element: 'Обсадная колонна', from: 410, to: 548, diameter: 146, innerDiameter: 126, material: 'ПВХ', note: 'Демо: эксплуатационная колонна' },
  { id: 'CONST-1010-05', element: 'Бентогильза', from: 538, to: 548, diameter: 168, innerDiameter: 146, material: 'ПВХ', note: 'Демо: герметизация над фильтром' },
  { id: 'CONST-1010-06', element: 'Гравийная обсыпка', from: 548, to: 600, diameter: 168, innerDiameter: 146, material: 'Фильтр', note: 'Демо: обсыпка фильтра' },
  { id: 'CONST-1010-07', element: 'Фильтр', from: 548, to: 592, diameter: 146, innerDiameter: 126, material: 'Фильтр', note: 'Демо: водоприёмный интервал' },
  { id: 'CONST-1010-08', element: 'Отстойник', from: 592, to: 612.4, diameter: 146, innerDiameter: 126, material: 'ПВХ', note: 'Демо: нижняя глухая секция' },
]
