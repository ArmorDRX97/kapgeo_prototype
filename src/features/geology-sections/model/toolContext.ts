import { createContext, useContext } from 'react'

export type ToolId = 'display' | 'objects' | 'coordinates'
export type ToolSlot = 'display' | 'coordinates' | 'footer'
export const ToolContext = createContext<{ targets: Record<ToolSlot, HTMLDivElement | null>; help: HTMLDivElement | null; reveal: (id: ToolId) => void } | undefined>(undefined)
export function useRevealTool() { return useContext(ToolContext)?.reveal ?? (() => {}) }
