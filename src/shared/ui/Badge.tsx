import type { PropsWithChildren } from 'react'
import { cx } from '../lib/cx'

type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'ai'
type BadgeVariant = 'status' | 'tag'

export function Badge({ children, tone = 'neutral', dot, variant }: PropsWithChildren<{ tone?: BadgeTone; dot?: boolean; variant?: BadgeVariant }>) {
  const resolvedVariant = variant ?? (tone === 'neutral' ? 'tag' : 'status')
  const showDot = dot ?? resolvedVariant === 'status'

  return (
    <span className={cx('badge', `badge--${resolvedVariant}`, `badge--${tone}`)}>
      {showDot && <span className="badge__dot" aria-hidden="true" />}
      {children}
    </span>
  )
}
