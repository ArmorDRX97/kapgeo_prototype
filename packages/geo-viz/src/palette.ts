/**
 * Domain colour access for the canvas / OpenLayers renderers in this package.
 *
 * Canvas and OpenLayers cannot read Tailwind classes, so they need resolved
 * colour values. The single source of truth is `@kapgeo/ui/tokens`
 * (`packages/ui/src/tokens/domain.ts`) — this module only re-exports it and
 * adds the tiny lookup helpers the renderers use, so that no renderer ever
 * hardcodes a colour.
 *
 * It lives at the package root, not inside `plan/` or `wellog/`: those two
 * subpath exports are independent of each other, so neither may import from
 * the other. Nothing here is part of the public surface — `@kapgeo/geo-viz`
 * must not become a second source of the domain palette; consumers import
 * `@kapgeo/ui/tokens` directly.
 *
 * Note on naming: the package contract sketched `domainTokens.wellKinds` /
 * `wellStatuses`; the shipped `@kapgeo/ui` uses the singular `wellKind` /
 * `wellStatus`. The real module wins — the helpers below are the stable seam.
 */
import { domainTokens } from './domain-tokens';
import type { CurveType, WellKind, WellStatus } from './domain-tokens';

export { domainTokens };
export type {
  CurveType,
  DomainTokens,
  LithologyType,
  PlanToken,
  WellKind,
  WellStatus,
} from './domain-tokens';

/** A two-part symbol colour. */
export type SymbolColors = { fill: string; stroke: string };

/** Colours for a well kind, falling back to `other` for unknown values. */
export function wellKindColors(kind: WellKind): SymbolColors {
  return domainTokens.wellKind[kind] ?? domainTokens.wellKind.other;
}

/** Colours for a well status; `undefined` means "status not tracked". */
export function wellStatusColors(status: WellStatus | undefined): SymbolColors | undefined {
  return status === undefined ? undefined : domainTokens.wellStatus[status];
}

/** Default colour for a curve type. */
export function curveColor(type: CurveType): string {
  return domainTokens.curves[type];
}
