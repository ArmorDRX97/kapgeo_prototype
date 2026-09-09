export type CoreMeasurementColumn = 'DRILLING' | 'COMPOSITE'

export type CoreMeasurementInterval = {
  id: string
  depthFrom: number
  depthTo: number
  doseRate: number | null
}

export type CoreMeasurement = {
  id: string
  measurementDate: string
  operator: string
  note: string
  columnType: CoreMeasurementColumn
  intervals: CoreMeasurementInterval[]
}

export type CoreRun = {
  id: string
  number: string
  depthFrom: number
  depthTo: number
  recoveredLength: number
  measurements: CoreMeasurement[]
}

export type CoreSampleInterval = {
  id: string
  runId: string
  drillDepthFrom: number
  drillDepthTo: number
  adjustedDepthFrom: number | null
  adjustedDepthTo: number | null
}

export type CoreSampleResult = {
  id: string
  analyte: string
  value: number | null
  qualifier: '' | '<' | '>'
  unit: string
}

export type CoreSample = {
  id: string
  number: string
  sampleType: 'Керновая' | 'Контрольная' | 'Дубликат'
  samplingDate: string
  performer: string
  laboratory: string
  comment: string
  intervals: CoreSampleInterval[]
  results: CoreSampleResult[]
}

export type WellCoreWorkspace = {
  wellId: string
  runs: CoreRun[]
  samples: CoreSample[]
  version: number
  updatedAt: string
}

export const coreRunLength = (run: Pick<CoreRun, 'depthFrom' | 'depthTo'>) => Math.max(0, run.depthTo - run.depthFrom)

export const coreRecoveryPercent = (run: Pick<CoreRun, 'depthFrom' | 'depthTo' | 'recoveredLength'>) => {
  const length = coreRunLength(run)
  return length ? run.recoveredLength / length * 100 : 0
}
