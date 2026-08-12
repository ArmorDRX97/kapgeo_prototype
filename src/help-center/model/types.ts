export type GuideLink = {
  label: string
  href: string
}

export type GuideStep = {
  title: string
  description: string
  href: string
  linkLabel: string
  taskId?: string
  result: string
}

export type RoleGuide = {
  id: string
  personaId: string
  name: string
  person: string
  scope: string
  summary: string
  startHref: string
  modules: string[]
  responsibilities: string[]
  steps: GuideStep[]
  collaboratesWith: Array<{ role: string; reason: string }>
}

export type ScreenGuide = {
  name: string
  href: string
  purpose: string
  actions: string[]
  roles: string[]
}

export type ModuleGuide = {
  id: string
  name: string
  code: string
  summary: string
  entryHref: string
  audience: string[]
  screens: ScreenGuide[]
}

export type FlowGuide = {
  id: string
  title: string
  summary: string
  actors: string[]
  steps: GuideStep[]
}

export type VerificationRecord = {
  area: string
  href: string
  checked: string
  result: string
}
