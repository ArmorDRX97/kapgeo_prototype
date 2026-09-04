import { type PropsWithChildren, useMemo, useState } from 'react'
import { defaultPersona, userPersonas } from './personas'
import type { SessionState } from './types'
import { SessionContext, type SessionContextValue } from './sessionContext'

const SESSION_PERSONA_KEY = 'kapgeo.persona'

function getInitialSessionState(): SessionState {
  const storedPersonaId = window.sessionStorage.getItem(SESSION_PERSONA_KEY)
  const storedPersona = userPersonas.find((persona) => persona.id === storedPersonaId)

  return storedPersona
    ? { status: 'authenticated', persona: storedPersona }
    : { status: 'anonymous', persona: null }
}

export function SessionProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<SessionState>(getInitialSessionState)

  const value = useMemo<SessionContextValue>(
    () => ({
      ...state,
      signIn: ({ login, personaId }) => {
        const persona = userPersonas.find((item) => item.id === (personaId ?? login.trim())) ?? defaultPersona
        window.sessionStorage.setItem(SESSION_PERSONA_KEY, persona.id)
        setState({ status: 'authenticated', persona })
        return persona
      },
      signOut: () => {
        window.sessionStorage.removeItem(SESSION_PERSONA_KEY)
        setState({ status: 'anonymous', persona: null })
      },
      switchPersona: (personaId) => {
        const persona = userPersonas.find((item) => item.id === personaId)
        if (persona) {
          window.sessionStorage.setItem(SESSION_PERSONA_KEY, persona.id)
          setState({ status: 'authenticated', persona })
        }
      },
    }),
    [state],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}
