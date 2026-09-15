import { createContext, useContext } from 'react'
import type { SessionState, UserPersona } from './types'

export type SignInCredentials = {
  login: string
  password: string
}

export type SessionContextValue = SessionState & {
  signIn: (credentials: SignInCredentials) => UserPersona
  signOut: () => void
}

export const SessionContext = createContext<SessionContextValue | null>(null)

export function useSession() {
  const value = useContext(SessionContext)
  if (!value) throw new Error('useSession must be used inside SessionProvider')
  return value
}
