/** Preliminary prototype legend; no numeric suffix is interpreted as a type. */
export const wellTypes = [
  { name: 'Откачная', color: '#214b3c' },
  { name: 'Закачная', color: '#b69a25' },
  { name: 'Наблюдательная', color: '#435b9d' },
  { name: 'Разведочная', color: '#3a979b' },
  { name: 'Проектная', color: '#7b728c' },
] as const
export function wellSymbol(type: string) { return wellTypes.find(t => t.name === type) ?? { name: type || 'Тип не указан', color: '#697781' } }
/** Line follows real collar → bottom coordinates; the cross belongs inside the collar. */
export function wellSymbolPath(a: { x: number; y: number }, b: { x: number; y: number }, radius: number) {
  const r = radius * .6
  return { direction: `M${a.x},${a.y}L${b.x},${b.y}`, cross: `M${a.x-r},${a.y}h${r*2}M${a.x},${a.y-r}v${r*2}` }
}
