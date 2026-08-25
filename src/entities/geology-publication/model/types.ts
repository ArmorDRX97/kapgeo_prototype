export type DemoLocale = 'ru' | 'kk' | 'en'
export type PublicationConsumer = 'technology' | 'modeling' | 'analytics'
export type ApprovalStatus = 'draft' | 'in_review' | 'returned' | 'reauthenticated' | 'approved'
export type PublicationStatus = 'draft' | 'published' | 'withdrawn' | 'replaced'

export type ExactVersionReference = {
  id: string
  entityType: 'well' | 'section' | 'reserve' | 'model-2d' | 'dgm'
  label: string
  version: string
}

export type ConsumerHandoff = {
  id: string
  consumer: PublicationConsumer
  packageId: string
  packageVersion: number
  exactVersionIds: string[]
  targetPath: '/technology' | '/modeling' | '/analytics'
  status: 'available' | 'withdrawn' | 'replaced'
  createdAt: string
}

export type PublicationNotification = {
  id: string
  kind: 'published' | 'withdrawn' | 'replaced'
  consumer: PublicationConsumer
  message: string
  createdAt: string
}

export type ExportHistoryItem = {
  id: string
  fileName: string
  format: 'pdf' | 'json' | 'snapshot'
  artifactId: string
  checksum: string
  userCreated: boolean
  createdAt: string
}

export type PolicyScenario = {
  id: 'file-type' | 'file-size' | 'expression' | 'sensitive-export'
  label: string
  outcome: 'idle' | 'allowed' | 'denied' | 'sandboxed'
  detail: string
}

export type BrowserQaResult = {
  width: 390 | 1024 | 1440
  status: 'pending' | 'passed'
  note: string
}

export type RegressionRun = {
  id: string
  status: 'not-run' | 'passed'
  steps: Array<{ id: string; label: string; status: 'pending' | 'passed' }>
  createdAt?: string
}

export type TerminologyEntry = {
  id: string
  labels: Record<DemoLocale, string | null>
}

export type GeologyPublicationWorkspace = {
  id: 'GEO-PKG-2026-08'
  title: string
  scope: ExactVersionReference[]
  selectedVersionIds: string[]
  consumers: PublicationConsumer[]
  limitations: string[]
  approval: {
    status: ApprovalStatus
    reason: string
    reauthenticatedAt?: string
    signaturePlaceholder?: string
  }
  publication: {
    status: PublicationStatus
    reason?: string
    replacementPackageId?: string
  }
  handoffs: ConsumerHandoff[]
  notifications: PublicationNotification[]
  exports: ExportHistoryItem[]
  terminology: TerminologyEntry[]
  performance: {
    profile: 'small' | 'medium' | 'large'
    rows: number
    lod: string
    virtualization: boolean
    loadingState: 'idle' | 'loading' | 'ready'
    demoBudgetMs: number
  }
  policies: PolicyScenario[]
  browserQa: BrowserQaResult[]
  regression: RegressionRun
  helpVersion: string
  version: number
  updatedAt: string
}
