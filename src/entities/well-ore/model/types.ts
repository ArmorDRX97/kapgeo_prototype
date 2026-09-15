export type OreIntervalSource = 'Гамма-каротаж' | 'КНД' | 'Керн и опробование' | 'Паспортная информация'
export type OreElement = 'Уран' | 'Радий'
export type OrePermeability = 'Проницаемый' | 'Непроницаемый'
export type OreValueBasis = 'content' | 'meterPercent'

export type OreInterval = {
  id: string
  source: OreIntervalSource
  element: OreElement
  from: number
  to: number
  content: number
  meterPercent: number
  permeability: OrePermeability
  differentialIds: string[]
}

export type MergedOreInterval = {
  id: string
  oreIntervalIds: string[]
}

export type DifferentialOreInterval = {
  id: string
  source: OreIntervalSource
  element: OreElement
  from: number
  to: number
  content: number
  permeability: OrePermeability
  oreIntervalId?: string
}

export type WellOreWorkspace = {
  wellId: string
  useDifferentialLogging: boolean
  selectedSource: OreIntervalSource
  selectedElement: OreElement
  oreIntervals: OreInterval[]
  mergedIntervals: MergedOreInterval[]
  differentialIntervals: DifferentialOreInterval[]
  version: number
  updatedAt: string
}

export type OreIntervalDraft = Pick<OreInterval, 'source' | 'element' | 'from' | 'to' | 'permeability'> & {
  basis: OreValueBasis
  value: number
}

export type MergedOreIntervalSummary = {
  id: string
  oreIntervalIds: string[]
  source: OreIntervalSource
  element: OreElement
  from: number
  to: number
  thickness: number
  content: number
  meterPercent: number
  permeability: OrePermeability
}
