import { type PropsWithChildren, useMemo, useState } from 'react'
import { defaultPersona } from './personas'
import type { SessionState } from './types'
import { SessionContext, type SessionContextValue } from './sessionContext'

const SESSION_PERSONA_KEY = 'kapgeo.persona'

function getInitialSessionState(): SessionState {
  const storedPersonaId = window.sessionStorage.getItem(SESSION_PERSONA_KEY)
  return storedPersonaId === defaultPersona.id
    ? { status: 'authenticated', persona: defaultPersona }
    : { status: 'anonymous', persona: null }
}

export function SessionProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<SessionState>(getInitialSessionState)

  const value = useMemo<SessionContextValue>(
    () => ({
      ...state,
      signIn: () => {
        window.sessionStorage.setItem(SESSION_PERSONA_KEY, defaultPersona.id)
        setState({ status: 'authenticated', persona: defaultPersona })
        return defaultPersona
      },
      signOut: () => {
        window.sessionStorage.removeItem(SESSION_PERSONA_KEY)
        setState({ status: 'anonymous', persona: null })
      },
    }),
    [state],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}
