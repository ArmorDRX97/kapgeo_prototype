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
export type RockCode = 'sand' | 'clay' | 'silt' | 'sandstone' | 'limestone' | 'paleozoic' | 'unknown'
export type ElectroInterval = DepthInterval & { rock: RockCode; lithologyCode?: string; geochemistryCode?: string; resistivity: number | null; normalized: number | null; kf: number; lft: number; manualKf: boolean }
export type OreInterval = DepthInterval & { ra: number; uranium: number; metro: number; category: 'balance' | 'offbalance' | 'technological'; morphology: 'bag' | 'upper' | 'lower' | 'remnant'; krr: number }
export type MetalMark = { id: string; depth: number; label: string }
export type FlowBin = DepthInterval & { rate: number; percent: number }
export type ControlRange = DepthInterval & { controlFrom: number; controlTo: number }
export type ControlPair = ControlRange & { mainArea: number | null; controlArea: number | null; relative: number | null; depthError: number; thicknessError: number; status: 'pass' | 'fail' | 'unmatched'; mainThickness: number | null; controlThickness: number | null; mainMetro: number | null; controlMetro: number | null; thicknessRelative: number | null }
export type Result<T> = { rows: T[]; fingerprint: string; version: 'alpha-prototype-1' | 'alpha-prototype-2'; note: string }
export type KrrPoint = { x: number; y: number }
export type GammaProfile = {
  thkCorrection: number; radonFactor: number; probeDiameter: number; fluidDensity: number; fluidAttenuation: number;
  casingThickness: number; casingDensity: number; casingAttenuation: number; caliperFrom: number; caliperTo: number;
  krrImpermeable: number; dependence: 'constant' | 'thickness' | 'radium'; thicknessPermeable: KrrPoint[]; thicknessImpermeable: KrrPoint[]; radiumPermeable: KrrPoint[]; radiumImpermeable: KrrPoint[];
  morphology: Record<OreInterval['morphology'], { permeable: number; impermeable: number; grayA: number; grayB: number; yellowA: number; yellowB: number }>;
  cutoffMode: 'fixed' | 'regression'; cutoffA: number; cutoffB: number; minimumMetro: number; technologicalCutoff: number; impermeableGap: number; iterations: number;
}
export type ElectroParameters = { recordId: string; from: number; to: number; mode: 'overview' | 'detail'; probe: 'bottom' | 'top'; length: number; normalization: number; levels: number[]; minThickness: number; permeableKf: number;
  levelMode: 'absolute' | 'percent'; normalizationMethod: 'manual' | 'clay' | 'horizon'; referenceFrom: number; referenceTo: number; referenceValue: number; kfModel: 'linear' | 'power'; kfA: number; kfB: number }
export type GammaParameters = { recordId: string; caliperId: string; from: number; to: number; stage: 'preliminary' | 'final'; algorithm: 'weighted' | 'iterative'; background: number; conversion: number; absorption: number; moisture: number; density: number; krr: number; cutoff: number; balanceCutoff: number; gap: number; minThickness: number; nominalDiameter: number; transform: boolean; useCaliper: boolean; useMorphology: boolean; profile: GammaProfile }
export type CurrentParameters = { recordId: string; from: number; to: number; sumpBottom: number; note: string }
export type ThermalParameters = { recordId: string; inductionId: string; backgroundFrom: number; backgroundTo: number; backgroundTop: number; backgroundBottom: number; autoBackground: boolean; interpretable: boolean; note: string }
export type CaliperParameters = { recordId: string; from: number; to: number; target: number; casingDiameter: number; filterDiameter: number; projectFrom: number; projectTo: number; gravelMode: 'filter' | 'manual'; above: number; below: number; gravelFrom: number; gravelTo: number }
export type FlowParameters = { recordId: string; total: number; totalUnit: 'm3/h'; mode: 'injection' | 'pumping' | 'natural'; step: number; grouping: 'step' | 'lithology' | 'sections' }
export type ControlParameters = { mainId: string; controlId: string; type: 'production' | 'reference' | 'barren'; from: number; to: number; controlFrom: number; controlTo: number; referenceArea: number; tolerance: number; depthTolerance: number; thicknessTolerance: number; note: string; pairing: 'automatic' | 'manual'; pairs: ControlRange[] }
export type AlphaHeader = { deposit: 'demo-north' | 'demo-east'; horizon: string; block: string; row: string; kind: 'exploration' | 'production' | 'injection' | 'observation'; organization: string; loggedAt: string }
export type AlphaDocument = { schemaVersion: 1; wellId: string; revision: number; derived: MeasurementRecord[];
  header: AlphaHeader;
  parameters: { electro: ElectroParameters; gamma: GammaParameters; current: CurrentParameters; thermal: ThermalParameters; caliper: CaliperParameters; flow: FlowParameters; controls: ControlParameters };
  electro: Result<ElectroInterval>; gamma: Result<OreInterval>; current: Result<DepthInterval>;
  thermal: Result<DepthInterval>; metal: Result<MetalMark>; projects: (DepthInterval & { kind: 'filter' | 'bentonite'; label: string })[];
  caliper: Result<DepthInterval & { minimum: number | null; mean: number | null }>;
  flow: Result<FlowBin>; sections: DepthInterval[]; controls: Result<ControlPair>; oxidation: DepthInterval[];
  filterProposal: { from: number; to: number }; zadr: { above: number; below: number; includeOffbalance: boolean; includeTechnological: boolean };
  passport: { from: number; to: number; scale: number; compiledBy: string; note: string; template: 'ore' | 'construction' | 'flow' } }
