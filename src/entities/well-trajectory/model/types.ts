export type TrajectoryStation = { id: string; md: number; inclination: number; azimuth: number }

export type TrajectorySurvey = {
  id: string
  code: string
  name: string
  source: 'bundled fixture' | 'local demo fixture'
  method: 'mean-angle' | 'vertical fallback'
  correction: number
  status: 'active' | 'candidate' | 'archived'
  version: number
  stations: TrajectoryStation[]
}

export type TrajectoryPoint = { md: number; tvd: number; northing: number; easting: number }

export type CoreRunV2 = {
  id: string
  drillingFrom: number
  drillingTo: number
  interpretedFrom: number
  interpretedTo: number
  recovered: number
  state: 'core' | 'no-core'
  version: number
}

export type CoreMeasurementBin = { id: string; runId: string; from: number; to: number; sizeMm?: number; count?: number; missing?: boolean }
export type CoreBoxV2 = { id: string; runId: string; barcode: string; from: number; to: number; storage: string; photoLabel: string; version: number }
export type CoreCommand = 'reorder' | 'reverse' | 'stretch' | 'no-core' | 'split' | 'merge' | 'restore'
export type TrajectoryValidation = { id: string; severity: 'error' | 'warning'; message: string }

export type WellTrajectoryWorkspace = {
  wellId: string
  selectedSurveyId: string
  surveys: TrajectorySurvey[]
  activeResult: { surveyId: string; version: number; points: TrajectoryPoint[]; extrapolated: boolean; generatedAt: string }
  coreRuns: CoreRunV2[]
  measurements: CoreMeasurementBin[]
  boxes: CoreBoxV2[]
  version: number
  updatedAt: string
}
