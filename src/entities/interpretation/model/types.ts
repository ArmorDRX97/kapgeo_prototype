import type { CurveSpec } from '@kapgeo/geo-viz/wellog'

export type Rock = 'sand' | 'clay' | 'silt' | 'sandstone' | 'limestone' | 'unknown'
export type LithologyKind = 'core' | 'log' | 'composite'
export type InterpretationMode = 'lithology' | 'technology' | 'core'
export type CoreColor = 'gray' | 'brown' | 'yellow' | 'green' | 'white'
export type SampleKind = 'KP' | 'GS' | 'LGH' | 'TP'
export type LithologyInterval = { id: string; from: number; to: number; rock: Rock; mineralization: string; minerals?: string[]; color?: CoreColor; note: string }
export type TechnologyInterval = { id: string; from: number; to: number; kind: 'permeable' | 'impermeable' | 'unknown'; source: 'manual' | 'calculation' }
export type CoreSegment = { id: string; runId: string; from: number; to: number; reversed: boolean;
  sourceId?: string | null; sourceFrom?: number; sourceTo?: number; kind?: 'core' | 'no-core'; properties?: Omit<LithologyInterval, 'id' | 'from' | 'to'> }
export type CoreSource = { id: string; runId: string; from: number; to: number; lithology: LithologyInterval[];
  measurements: { id: string; depth: number; value: number }[] }
export type DemoSample = { id: string; name: string; assay: number; kind?: SampleKind; parts: { segmentId: string; from: number; to: number }[] }
export type CalculationParameters = { curveId: string; from: number; to: number; threshold: number; minThickness: number;
  method?: 'potential' | 'gradient'; direction?: 'down' | 'up'; rounding?: number; minImpermeable?: number; continuePermeable?: boolean }
export type InterpretationDocument = { wellId: string; logLithology: LithologyInterval[]; compositeLithology: LithologyInterval[];
  technology: TechnologyInterval[]; core: CoreSegment[]; calculation: CalculationParameters | null; revision: number; samples?: DemoSample[]; sourceRevision?: string }
export type InterpretationWell = { id: string; code: string; label: string; depth: number; scope: 'interpretation-demo'; status: 'draft' | 'locked';
  curves: CurveSpec[]; initialRange: [number, number]; sourceLithology: LithologyInterval[]; sourceRevision?: string;
  runs: { id: string; from: number; to: number; recovered: number }[]; core: CoreSource[]; samples: DemoSample[]; initial: InterpretationDocument }
