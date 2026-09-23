export type DeviationAzimuthKind = 'true' | 'magnetic'

export type DeviationPoint = {
  id: string
  depth: number
  azimuth: number
  zenithAngle: number
  dx: number | null
  dy: number | null
  dz: number | null
}

export type DeviationSurvey = {
  id: string
  wellId: string
  surveyDate: string
  azimuthKind: DeviationAzimuthKind
  correctionAngle: number
  isPrimary: boolean
  operatorId: string
  device: string
  minZenithAngle: number
  comment: string
  planDistance: number | null
  zenithTopBottom: number | null
  bearingTopBottom: number | null
  points: DeviationPoint[]
  calculatedAt?: string
  version: number
}

export type WellDeviationWorkspace = {
  wellId: string
  surveys: DeviationSurvey[]
  version: number
  updatedAt: string
}

