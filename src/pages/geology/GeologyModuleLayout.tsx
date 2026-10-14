import type { PropsWithChildren } from 'react'
import './geology-module.css'

export function GeologyModuleLayout({ children }: PropsWithChildren) {
  return <div className="geology-module">{children}</div>
}
