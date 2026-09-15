import type { UserPersona, RoleId } from '../../entities/session/model/types'

export type Permission =
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
  | 'geology.bgd.well.manage-core'
  | 'geology.bgd.well.manage-core-measurements'
  | 'geology.bgd.well.manage-ore-intervals'
  | 'geology.bgd.well.manage-geophysical-ore-intervals'

const rolePermissions: Record<RoleId, Permission[]> = {
  R1: [
    'geology.view',
    'geology.bgd.create',
    'geology.bgd.update',
    'geology.bgd.delete',
    'geology.bgd.well.create',
    'geology.bgd.well.update-all',
    'geology.bgd.well.manage-logs',
    'geology.bgd.well.manage-core',
    'geology.bgd.well.manage-core-measurements',
    'geology.bgd.well.manage-ore-intervals',
  ],
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
  if (!deposit || permission === 'geology.bgd.create') return true
  return deposit.id === 'DEP-SARYTAU' || deposit.createdBy === persona?.name
}
