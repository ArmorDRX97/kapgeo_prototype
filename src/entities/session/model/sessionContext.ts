import { createContext, useContext } from 'react'
import type { SessionState } from './types'

export type SessionContextValue = SessionState & {
  beginSso: (personaId?: string) => void
  verifyMfa: (code: string) => boolean
  signOut: () => void
  switchPersona: (personaId: string) => void
}

export const SessionContext = createContext<SessionContextValue | null>(null)

export function useSession() {
  const value = useContext(SessionContext)
  if (!value) throw new Error('useSession must be used inside SessionProvider')
  return value
}
