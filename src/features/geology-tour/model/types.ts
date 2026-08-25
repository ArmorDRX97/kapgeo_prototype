export type GeologyTourTarget = {
  selector: string
  text?: string
}

export type GeologyTourStep = {
  id: string
  route: string
  target: GeologyTourTarget
  eyebrow: string
  title: string
  description: string
  hint?: string
}

export type GeologyTourDefinition = {
  id: string
  title: string
  description: string
  estimatedMinutes: number
  steps: GeologyTourStep[]
}
