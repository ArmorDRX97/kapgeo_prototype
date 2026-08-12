export type WellType = 'Откачная' | 'Закачная' | 'Наблюдательная' | 'Разведочная'
export type WellStatus = 'Работает' | 'На проверке' | 'Отключена' | 'Требует внимания'
export type QualityState = 'Высокое' | 'Среднее' | 'Есть проблемы'
export type WellPurpose = 'Эксплуатационная' | 'Разведочная' | 'Наблюдательная'

export type WellFilters = {
  query: string
  status: 'Все' | WellStatus
  type: 'Все' | WellType
  quality: 'Все' | QualityState
  site: 'Все' | string
}

export type CreateWellInput = {
  code: string
  type: WellType
  purpose: WellPurpose
  site: string
  profile: string
  coordinates: { x: number; y: number }
  crs: string
  depth: number
  casingDiameter: number
}

export type Well = {
  id: string
  code: string
  type: WellType
  status: WellStatus
  quality: QualityState
  purpose: WellPurpose
  profile: string
  crs: string
  casingDiameter: number
  site: string
  block: string
  cell: string
  depth: number
  coordinates: { x: number; y: number }
  mapPosition: { x: number; y: number }
  updatedAt: string
  completeness: number
  activeTask?: string
  aiConflicts: number
  version?: number
}

export type ConstructionInterval = {
  id: string
  from: number
  to: number
  diameter: number
  material: 'Сталь' | 'ПВХ' | 'Фильтр'
  element: 'Направление' | 'Кондуктор' | 'Эксплуатационная колонна' | 'Фильтровая колонна'
}

export type DrillingRun = {
  id: string
  from: number
  to: number
  method: 'Роторное' | 'Колонковое' | 'Шнековое'
  diameter: number
  coreRecovered: number
}

export type CoreBox = {
  id: string
  number: string
  from: number
  to: number
  storage: string
  photos: number
  samples: number
  description: string
}

export type WellTechnicalData = {
  construction: ConstructionInterval[]
  drillingRuns: DrillingRun[]
  coreBoxes: CoreBox[]
}

export type Lithology = 'Суглинок' | 'Песчаник' | 'Алевролит' | 'Глина' | 'Рудный песчаник'
export type StratigraphyUnit = 'Q' | 'K2' | 'K1' | 'J3'

export type GeologicalInterval = {
  id: string
  from: number
  to: number
  lithology: Lithology
  stratigraphy: StratigraphyUnit
  description: string
  source: 'Ручное описание' | 'Керн' | 'ГИС'
}

export type WellGeologyData = {
  intervals: GeologicalInterval[]
  baseVersion: number
}

export type SampleType = 'Керновая' | 'Контрольная' | 'Пустая' | 'Дубликат'
export type SampleStatus = 'Черновик' | 'Зарегистрирована' | 'Отправлена в лабораторию' | 'Результат получен'

export type Sample = {
  id: string
  number: string
  wellId: string
  from: number
  to: number
  type: SampleType
  status: SampleStatus
  purpose: 'Химический анализ' | 'Минералогия' | 'Контроль качества'
  linkedIntervalId?: string
  createdAt: string
}

export type QaStatus = 'Принят' | 'На проверке' | 'Отклонён'

export type LabResult = {
  id: string
  sampleId: string
  analyte: 'U' | 'Mo' | 'pH'
  value: number
  unit: 'мг/кг' | 'pH'
  method: string
  analyst: string
  qaStatus: QaStatus
  flag?: 'Контрольная' | 'Пустая' | 'Дубликат'
}

export type LogRunStatus = 'Импортирован' | 'Есть замечания QC' | 'QC пройден' | 'Интерпретирован' | 'Утверждён'
export type LogRun = { id: string; wellId: string; name: string; from: number; to: number; depthUnit: 'м'; step: number; curves: Array<'GR' | 'SP' | 'RES'>; source: 'LAS' | 'DAT'; status: LogRunStatus; qcIssues: number; importedAt: string }
