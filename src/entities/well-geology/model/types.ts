import type { GeologicalInterval, LabResult, Sample } from '../../well/model/types'

export type GeologyTrackKind = 'core' | 'log' | 'composite' | 'stratigraphy'
export type GeologyTrack = { id: string; kind: GeologyTrackKind; label: string; source: 'Керн' | 'ГИС' | 'Composite' | 'Ручное описание'; intervals: GeologicalInterval[]; version: number; status: 'draft' | 'published' }
export type DictionaryEntry = { id: string; dictionary: 'lithology' | 'mineralization' | 'color' | 'stratigraphy'; code: string; labels: { ru: string; kz: string; en: string }; effectiveFrom: string; version: number; status: 'active' | 'archived' }
export type DescriptionOverride = { id: string; trackId: string; intervalId: string; grouping: string; description: string; inheritsSource: boolean; version: number }
export type SampleWorkflowStatus = 'collection' | 'requested' | 'laboratory' | 'result' | 'qa_accepted' | 'qa_rejected'
export type SampleV2 = Sample & { linkedIntervals: string[]; depthSource: 'core' | 'composite'; workflow: SampleWorkflowStatus; version: number }
export type GranulometryRun = { id: string; sampleId: string; bins: Array<{ sizeMm: number; massPercent: number }>; sga: number; d10: number; d60: number; method: string; version: number }
export type LimsStaging = { id: string; sampleId: string; result: LabResult; state: 'staged' | 'conflict' | 'applied'; conflictReason?: string }
export type WellGeologyWorkspace = { wellId: string; tracks: GeologyTrack[]; dictionaries: DictionaryEntry[]; overrides: DescriptionOverride[]; samples: SampleV2[]; labResults: LabResult[]; granulometry: GranulometryRun[]; lims: LimsStaging[]; version: number; updatedAt: string }
