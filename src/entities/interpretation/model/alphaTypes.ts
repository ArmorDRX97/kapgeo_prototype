export const alphaMethods = ['gamma', 'knd', 'electro', 'current', 'thermal', 'caliper', 'flow'] as const
export type AlphaMethod = typeof alphaMethods[number]
export type AlphaPage = AlphaMethod | 'controls' | 'curves' | 'passport'
export const alphaNames: Record<AlphaPage, string> = {
  gamma: 'Гамма-каротаж', knd: 'КНД-м', electro: 'Электрокаротаж', current: 'Токовый каротаж',
  thermal: 'Термометрия и ИК', caliper: 'Кавернометрия', flow: 'Расходометрия', controls: 'Контрольные измерения', curves: 'Редактор кривых', passport: 'Паспорт скважины',
}
export type MeasurementKind = 'GR' | 'RS' | 'SP' | 'TK' | 'IL' | 'TM' | 'CAL' | 'FLOW'
export type MeasurementRecord = { id: string; kind: MeasurementKind; name: string; unit: string; date: string; instrument: string; operator: string;
  stage: 'primary' | 'expanded' | 'development' | 'repeat'; role: 'main' | 'control'; revision: number; parentId?: string; operations: string[]; depths: number[]; values: (number | null)[] }
export type DepthInterval = { id: string; from: number; to: number }
export type RockCode = 'sand' | 'clay' | 'silt' | 'sandstone' | 'limestone' | 'unknown'
export type ElectroInterval = DepthInterval & { rock: RockCode; resistivity: number | null; normalized: number | null; kf: number; lft: number; manualKf: boolean }
export type OreInterval = DepthInterval & { ra: number; uranium: number; metro: number; category: 'balance' | 'offbalance' | 'technological'; morphology: 'bag' | 'upper' | 'lower' | 'remnant'; krr: number }
export type MetalMark = { id: string; depth: number; label: string }
export type FlowBin = DepthInterval & { rate: number; percent: number }
export type ControlPair = { id: string; from: number; to: number; controlFrom: number; controlTo: number; mainArea: number | null; controlArea: number | null; relative: number | null; depthError: number; thicknessError: number; status: 'pass' | 'fail' | 'unmatched' }
export type Result<T> = { rows: T[]; fingerprint: string; version: 'alpha-prototype-1'; note: string }
export type ElectroParameters = { recordId: string; from: number; to: number; mode: 'overview' | 'detail'; probe: 'bottom' | 'top'; length: number; normalization: number; levels: number[]; minThickness: number; permeableKf: number }
export type GammaParameters = { recordId: string; caliperId: string; from: number; to: number; stage: 'preliminary' | 'final'; algorithm: 'weighted' | 'iterative'; background: number; conversion: number; absorption: number; moisture: number; density: number; krr: number; cutoff: number; balanceCutoff: number; gap: number; minThickness: number; nominalDiameter: number; transform: boolean; useCaliper: boolean; useMorphology: boolean }
export type CurrentParameters = { recordId: string; from: number; to: number; sumpBottom: number; note: string }
export type ThermalParameters = { recordId: string; inductionId: string; backgroundFrom: number; backgroundTo: number; backgroundTop: number; backgroundBottom: number; autoBackground: boolean; interpretable: boolean; note: string }
export type CaliperParameters = { recordId: string; from: number; to: number; target: number; casingDiameter: number; filterDiameter: number; projectFrom: number; projectTo: number; gravelMode: 'filter' | 'manual'; above: number; below: number; gravelFrom: number; gravelTo: number }
export type FlowParameters = { recordId: string; total: number; mode: 'injection' | 'pumping' | 'natural'; step: number; grouping: 'step' | 'lithology' | 'sections' }
export type ControlParameters = { mainId: string; controlId: string; type: 'production' | 'reference' | 'barren'; from: number; to: number; controlFrom: number; controlTo: number; referenceArea: number; tolerance: number; depthTolerance: number; thicknessTolerance: number; note: string }
export type AlphaDocument = { schemaVersion: 1; wellId: string; revision: number; derived: MeasurementRecord[];
  parameters: { electro: ElectroParameters; gamma: GammaParameters; current: CurrentParameters; thermal: ThermalParameters; caliper: CaliperParameters; flow: FlowParameters; controls: ControlParameters };
  electro: Result<ElectroInterval>; gamma: Result<OreInterval>; current: Result<DepthInterval>;
  thermal: Result<DepthInterval>; metal: Result<MetalMark>; projects: (DepthInterval & { kind: 'filter' | 'bentonite'; label: string })[];
  caliper: Result<DepthInterval & { minimum: number | null; mean: number | null }>;
  flow: Result<FlowBin>; sections: DepthInterval[]; controls: Result<ControlPair>; oxidation: DepthInterval[];
  filterProposal: { from: number; to: number }; zadr: { above: number; below: number; includeOffbalance: boolean };
  passport: { from: number; to: number; scale: number; compiledBy: string; note: string } }
