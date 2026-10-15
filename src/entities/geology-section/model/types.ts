import type { SectionStage } from './stages'
export type XY = { x: number; y: number }
export type XZ = { x: number; z: number }
export type SectionLayer = 'technology' | 'ore' | 'uncorrected' | 'offbalance'
export type SectionView = 'overview' | 'map' | 'technology' | 'lithology' | 'ore' | 'offbalance' | 'oxidation' | 'drawing'
export type SectionInterval = { id: string; from: number; to: number; kind: 'permeable' | 'impermeable'; grade?: number }
export type SectionWellSource = {
  id: string; name: string; collar: XY & { z: number }; depth: number; revision: number
  trajectory: Array<{ md: number; x: number; y: number; z: number }>
  technology: SectionInterval[]; ore: SectionInterval[]; uncorrected: SectionInterval[]; offbalance: SectionInterval[]
  lithology: Array<{ id: string; from: number; to: number; rock: 'sand' | 'clay' | 'silt' }>
  curves: Array<{ id: string; name: string; unit: string; min: number; max: number; samples: Array<{ md: number; value: number | null }> }>
}
export type CorrelationLink = { id: string; a: string; b: string }
export type SectionAnchor = { id: string; wellId: string; layer: SectionLayer; top: XZ; bottom: XZ; from: number; to: number }
export type ContourEdit = { anchorId: string; side: 'left' | 'right'; x: number; z: number; boundary: boolean; boundaryTop?: number; boundaryBottom?: number }
export type ArcEdit = { linkId: string; edge: 'top' | 'bottom'; points: XZ[]; smooth: boolean }
export type ContourArcEdit = { ringKey: string; start: number; end: number; route: 'short' | 'long'; operation: 'smooth' | 'straight' }
export type SectionAuxiliary = { id: string; wellId: string; layer: SectionLayer; from: number; to: number; sharedId?: string; sourceRevision?: number }
export type SharedAuxiliary = { id: string; revision: number; scope: 'geology-section-prototype'; wellId: string; layer: SectionLayer; from: number; to: number }
export type ColumnTrack = { id: string; type: 'lithology' | 'intervals' | 'curve'; curveId?: string; width: number }
export type ColumnSettings = { width: number; offset: number; lithology: boolean; intervals: boolean; curves: boolean; curveMin: number; curveMax: number; curvesFirst?: boolean; tracks?: ColumnTrack[]; curveSettings?: Record<string, { visible: boolean; min: number; max: number; from: number; to: number }> }
export type SectionGraphic = {
  id: string; type: 'lithology' | 'oxidation' | 'foundation' | 'fault'
  name: string; points: XZ[]; closed: boolean; reversed: boolean; smooth: boolean
  rock?: 'sand' | 'clay' | 'silt'; parentId?: string; contourLinks?: string[]
  contourSnapshot?: XZ[]; detachedFromContour?: boolean
}
export type SectionDrawing = { id: string; name: string; horizontalScale: number; verticalScale: number; top: number; bottom: number; left: number; right: number; planHeight: number; paper: 'A4' | 'A3'; landscape: boolean; margin: number; layers: string[]; description: string; overlap?: number; center?: boolean; pageOrder?: 'rows' | 'columns'; profileOffset?: number; separator?: number; bottomField?: number; appendix?: string; firstSheet?: number; legendSize?: number; wellIds?: string[]; lithologyColumns?: boolean; stems?: boolean; logColumns?: boolean; intervalColumns?: boolean; oreParameters?: boolean; legend?: boolean; staticLevel?: number; frozenBoundary?: number; columnSettings?: Record<string,ColumnSettings>; wellDecorations?: Record<string, { coreColor?: string; filterFrom?: number; filterTo?: number }> }
export type GeologySection = {
  demoPreset?: 'video-reference-v1'
  schemaVersion: 1; id: string; revision: number; synthetic: true; scope: 'geology-section-prototype'
  title: string; depositId: string; depositName: string; stage: SectionStage; kind: 'main' | 'auxiliary'
  year: number; description: string; top: number; bottom: number; status: 'draft' | 'locked'
  profile: XY[]; wellIds: string[]; sourceRevisions: Record<string, number>
  profileVertexIds?: string[]; segmentWells?: Record<string, string[]>
  participation: Record<SectionLayer, string[]>; links: Record<SectionLayer, CorrelationLink[]>
  graphics: SectionGraphic[]; drawings: SectionDrawing[]
  contourEdits?: Record<string, ContourEdit[]>; smoothLayers?: SectionLayer[]
  arcEdits?: Record<string, ArcEdit[]>
  contourArcEdits?: Record<string, ContourArcEdit[]>
  bottomExtensions?: Record<string, number>
  metadata?: { geoBlock?: string; techBlock?: string; depositBody: string; createdOn: string; compiledBy: string; checkedBy: string }
  columnSettings?: Record<string, ColumnSettings>
  auxiliary?: SectionAuxiliary[]
  sourceOverrides?: Record<string, { revision: number; technology: SectionInterval[]; ore: SectionInterval[]; uncorrected: SectionInterval[]; offbalance: SectionInterval[] }>
}
export const sectionViews: Array<{ id: SectionView; label: string }> = [
  { id: 'overview', label: 'Разрез' }, { id: 'map', label: 'Карта' },
  { id: 'technology', label: 'Технологический горизонт' }, { id: 'lithology', label: 'Литология' }, { id: 'ore', label: 'Рудное тело' },
  { id: 'offbalance', label: 'Технологический забаланс' }, { id: 'oxidation', label: 'Зона окисления' }, { id: 'drawing', label: 'Чертёж' },
]
