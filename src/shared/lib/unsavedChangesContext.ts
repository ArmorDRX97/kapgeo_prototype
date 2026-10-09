import { createContext } from 'react'

export type UnsavedEditor = { dirty: boolean; save: () => Promise<boolean>; discard: () => void }
export const UnsavedChangesContext = createContext<{
  register: (editor: { current: UnsavedEditor }) => () => void
  requestTransition: (transition: () => void) => void
} | null>(null)
