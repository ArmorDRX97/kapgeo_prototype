export type RoleId =
  | 'R1'
  | 'R2'
  | 'R3'
  | 'R4'
  | 'R5'
  | 'R6'
  | 'R7'
  | 'R8'
  | 'R9'
  | 'R10'
  | 'R11'
  | 'R12'
  | 'R13'
  | 'R14'

export type SessionStatus = 'anonymous' | 'mfa' | 'authenticated'

export type UserPersona = {
  id: string
  name: string
  initials: string
  position: string
  roles: RoleId[]
  scope: string
  homeRoute: string
}

export type SessionState = {
  status: SessionStatus
  persona: UserPersona | null
  pendingPersona: UserPersona | null
}
