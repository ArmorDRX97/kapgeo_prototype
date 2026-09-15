export type RoleId = 'R1'

export type SessionStatus = 'anonymous' | 'authenticated'

export type UserPersona = {
  id: string
  name: string
  initials: string
  position: string
  roles: RoleId[]
  scope: string
}

export type SessionState = {
  status: SessionStatus
  persona: UserPersona | null
}
