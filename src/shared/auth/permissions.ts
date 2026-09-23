import type { UserPersona, RoleId } from '../../entities/session/model/types'

export type Permission =
  | 'bgd.view'
  | 'geology.view'
  | 'geology.bgd.create'
  | 'geology.bgd.update'
  | 'geology.bgd.delete'
  | 'geology.bgd.audit'
  | 'geology.bgd.well.create'
  | 'geology.bgd.well.update-all'
  | 'geology.bgd.well.update-technology'
  | 'geology.bgd.well.update-logging-depth'
  | 'geology.bgd.well.manage-logs'
  | 'geology.bgd.well.manage-deviation'
  | 'geology.bgd.well.administer-deviation'
  | 'geology.bgd.well.manage-core'
  | 'geology.bgd.well.manage-core-measurements'
  | 'geology.bgd.well.manage-ore-intervals'
  | 'geology.bgd.well.manage-geophysical-ore-intervals'
  | 'technology.view'
  | 'modeling.view'
  | 'analytics.view'
  | 'administration.view'

const rolePermissions: Record<RoleId, Permission[]> = {
  R1: ['bgd.view', 'geology.view', 'geology.bgd.update', 'geology.bgd.delete', 'geology.bgd.well.create', 'geology.bgd.well.update-all', 'geology.bgd.well.manage-logs', 'geology.bgd.well.manage-deviation', 'geology.bgd.well.manage-core', 'geology.bgd.well.manage-core-measurements', 'geology.bgd.well.manage-ore-intervals', 'modeling.view', 'analytics.view'],
  R2: ['bgd.view', 'geology.view', 'geology.bgd.well.update-logging-depth', 'geology.bgd.well.manage-logs', 'geology.bgd.well.manage-deviation', 'geology.bgd.well.administer-deviation', 'geology.bgd.well.manage-core-measurements', 'geology.bgd.well.manage-geophysical-ore-intervals', 'technology.view'],
  R3: ['bgd.view', 'geology.view', 'modeling.view'],
  R4: ['bgd.view', 'geology.view', 'modeling.view', 'analytics.view'],
  R5: ['modeling.view', 'analytics.view'],
  R6: ['bgd.view', 'geology.view', 'geology.bgd.well.update-technology', 'technology.view', 'modeling.view', 'analytics.view'],
  R7: ['technology.view', 'analytics.view'],
  R8: ['technology.view'],
  R9: ['technology.view'],
  R10: ['technology.view'],
  R11: ['bgd.view', 'geology.view', 'technology.view', 'modeling.view', 'analytics.view'],
  R12: ['bgd.view', 'geology.view', 'geology.bgd.audit', 'technology.view', 'modeling.view', 'analytics.view'],
  R13: ['bgd.view', 'geology.view', 'geology.bgd.create', 'geology.bgd.update', 'geology.bgd.delete', 'geology.bgd.audit', 'geology.bgd.well.create', 'geology.bgd.well.update-all', 'geology.bgd.well.manage-logs', 'geology.bgd.well.manage-deviation', 'geology.bgd.well.administer-deviation', 'geology.bgd.well.manage-core', 'geology.bgd.well.manage-core-measurements', 'geology.bgd.well.manage-ore-intervals', 'technology.view', 'modeling.view', 'analytics.view', 'administration.view'],
  R14: ['bgd.view', 'geology.view', 'geology.bgd.audit', 'technology.view', 'administration.view'],
}

export function hasPermission(persona: UserPersona | null, permission: Permission) {
  return persona?.roles.some((role) => rolePermissions[role].includes(permission)) ?? false
}

export function getPermissions(persona: UserPersona | null) {
  return new Set(persona?.roles.flatMap((role) => rolePermissions[role]) ?? [])
}

export function hasDepositPermission(
  persona: UserPersona | null,
  permission: Extract<Permission, 'geology.bgd.create' | 'geology.bgd.update' | 'geology.bgd.delete'>,
  deposit?: { id: string; createdBy: string },
) {
  if (!hasPermission(persona, permission)) return false
  if (!deposit || permission === 'geology.bgd.create' || persona?.roles.includes('R13')) return true
  return deposit.id === 'DEP-SARYTAU' || deposit.createdBy === persona?.name
}
