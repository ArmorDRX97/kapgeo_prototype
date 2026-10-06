import { domainTokens } from '../palette';

/**
 * Neutral "chrome" colours (background, grid, ticks, labels) for the canvas
 * renderers. Canvas cannot use Tailwind classes, so the values are read from
 * the semantic CSS variables that `@kapgeo/ui/styles/theme.css` defines on the
 * element tree — that keeps the tablet in sync with light/dark themes.
 */
export type ChromeColors = {
  background: string;
  grid: string;
  axis: string;
  text: string;
  crosshair: string;
};

/** Used when the variables are not available (tests, jsdom, unstyled hosts). */
export const fallbackChromeColors: ChromeColors = {
  background: 'transparent',
  grid: domainTokens.plan.grid,
  axis: domainTokens.plan.axis,
  text: domainTokens.plan.label,
  crosshair: domainTokens.plan.hover,
};

function cssVar(styles: CSSStyleDeclaration, name: string, fallback: string): string {
  const value = styles.getPropertyValue(name).trim();
  return value ? value : fallback;
}

/** Resolve the chrome colours from `element`'s computed style. */
export function readChromeColors(element: Element | null): ChromeColors {
  if (!element || typeof globalThis.getComputedStyle !== 'function') return fallbackChromeColors;
  let styles: CSSStyleDeclaration;
  try {
    styles = globalThis.getComputedStyle(element);
  } catch {
    return fallbackChromeColors;
  }
  return {
    background: cssVar(styles, '--card', fallbackChromeColors.background),
    grid: cssVar(styles, '--border', fallbackChromeColors.grid),
    axis: cssVar(styles, '--muted-foreground', fallbackChromeColors.axis),
    text: cssVar(styles, '--muted-foreground', fallbackChromeColors.text),
    crosshair: domainTokens.plan.hover,
  };
}
