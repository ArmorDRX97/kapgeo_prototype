import type { UserPersona, RoleId } from '../../entities/session/model/types'

export type Permission =
  | 'home.view'
  | 'work.view'
  | 'geology.view'
  | 'technology.view'
  | 'modeling.view'
  | 'analytics.view'
  | 'administration.view'

const rolePermissions: Record<RoleId, Permission[]> = {
  R1: ['home.view', 'work.view', 'geology.view', 'modeling.view', 'analytics.view'],
  R2: ['home.view', 'work.view', 'geology.view', 'technology.view'],
  R3: ['home.view', 'work.view', 'geology.view', 'modeling.view'],
  R4: ['home.view', 'work.view', 'geology.view', 'modeling.view', 'analytics.view'],
  R5: ['home.view', 'work.view', 'modeling.view', 'analytics.view'],
  R6: ['home.view', 'work.view', 'geology.view', 'technology.view', 'modeling.view', 'analytics.view'],
  R7: ['home.view', 'work.view', 'technology.view', 'analytics.view'],
  R8: ['home.view', 'work.view', 'technology.view'],
  R9: ['home.view', 'work.view', 'technology.view'],
  R10: ['home.view', 'work.view', 'technology.view'],
  R11: ['home.view', 'work.view', 'geology.view', 'technology.view', 'modeling.view', 'analytics.view'],
  R12: ['home.view', 'work.view', 'geology.view', 'technology.view', 'modeling.view', 'analytics.view'],
  R13: ['home.view', 'work.view', 'geology.view', 'technology.view', 'modeling.view', 'analytics.view', 'administration.view'],
  R14: ['home.view', 'work.view', 'geology.view', 'technology.view', 'administration.view'],
}

export function hasPermission(persona: UserPersona | null, permission: Permission) {
  return persona?.roles.some((role) => rolePermissions[role].includes(permission)) ?? false
}

export function getPermissions(persona: UserPersona | null) {
  return new Set(persona?.roles.flatMap((role) => rolePermissions[role]) ?? [])
}
