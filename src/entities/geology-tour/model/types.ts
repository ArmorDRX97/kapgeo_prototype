export type GeologyTourProgress = {
  id: string
  personaId: string
  activeTourId?: string
  stepIndex: number
  lastRoute?: string
  completedTourIds: string[]
  launcherSeen: boolean
  updatedAt: string
}