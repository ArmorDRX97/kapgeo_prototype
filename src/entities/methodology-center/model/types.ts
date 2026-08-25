export type DefinitionStatus = 'verified' | 'unverified'
export type WalkthroughDecision = 'unreviewed' | 'confirmed' | 'question'

export type MethodologyContour = {
  id: 'wells' | 'sections' | 'reserves' | 'model-2d' | 'model-3d'
  order: number
  title: string
  purpose: string
  roles: string[]
  operations: string[]
  limitations: string[]
  decision: WalkthroughDecision
  note: string
}

export type FormulaVariable = {
  symbol: string
  label: string
  unit: string
  demoValue: number
}

export type SyntheticMethodDefinition = {
  id: 'projection' | 'voronoi' | 'interval-register' | 'geostatistical'
  name: string
  shortName: string
  status: DefinitionStatus
  version: number
  formula: string
  description: string
  requiredInputs: string[]
  variables: FormulaVariable[]
  exampleResult: number
  resultUnit: string
  runCount: number
  lastArtifactId?: string
}

export type MethodologyDefinition = {
  id: string
  kind: 'dictionary' | 'condition'
  name: string
  owner: string
  effectiveFrom: string
  status: DefinitionStatus
  version: number
  value: number
  unit: string
  impact: string[]
}

export type OutputTemplate = {
  id: string
  kind: 'passport' | 'column' | 'section' | 'reserve-plan'
  name: string
  status: DefinitionStatus
  version: number
  pages: number
  description: string
}

export type SyntheticVolumeProfile = {
  id: 'small' | 'medium' | 'large'
  label: string
  wells: number
  curves: number
  points: number
  cells: number
  device: string
  note: string
}

export type MethodExampleRun = {
  id: string
  methodId: SyntheticMethodDefinition['id']
  methodVersion: number
  result: number
  unit: string
  artifactId: string
  status: 'synthetic-unverified'
  createdAt: string
}

export type MethodologyCenterWorkspace = {
  id: 'GEOX-METHOD-CENTER'
  contours: MethodologyContour[]
  methods: SyntheticMethodDefinition[]
  definitions: MethodologyDefinition[]
  templates: OutputTemplate[]
  selectedTemplateId: string
  volumeProfiles: SyntheticVolumeProfile[]
  selectedVolumeProfileId: SyntheticVolumeProfile['id']
  exampleRuns: MethodExampleRun[]
  version: number
  updatedAt: string
}
