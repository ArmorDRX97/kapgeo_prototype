/** Interface filter accents. Drawing symbols are selected separately by explicit well type. */
export const wellTypes = [
  { name: 'Откачная', color: '#23705b' },
  { name: 'Закачная', color: '#b78c12' },
  { name: 'Наблюдательная', color: '#5365b5' },
  { name: 'Разведочная', color: '#168fa2' },
  { name: 'Проектная', color: '#9371ab' },
] as const
export function wellSymbol(type: string) { return wellTypes.find(t => t.name === type) ?? { name: type || 'Тип не указан', color: '#697781' } }

/** СТ НАК 16-2026, таблица 4, с. 24: знаки фактических скважин в плане. */
export function wellMark(type: string) {
  const kind = type === 'Откачная' ? 'dot' : type === 'Закачная' ? 'cross' :
    type === 'Разведочная' ? 'ring' : type === 'Наблюдательная' ? 'solid' : 'unclassified'
  return { kind, color: kind === 'unclassified' ? '#697781' : '#20262d' } as const
}

export function wellMarkGeometry(type: string, x: number, y: number, radius: number) {
  const mark = wellMark(type)
  const arm = radius * .82
  return {
    ...mark,
    outline: mark.kind === 'unclassified'
      ? `M${x} ${y - radius}L${x + radius} ${y} ${x} ${y + radius} ${x - radius} ${y}Z`
      : `M${x - radius} ${y}a${radius} ${radius} 0 1 0 ${2 * radius} 0a${radius} ${radius} 0 1 0 ${-2 * radius} 0`,
    cross: mark.kind === 'cross' ? `M${x - arm} ${y}h${2 * arm}M${x} ${y - arm}v${2 * arm}` : undefined,
  }
}
/** Line follows real collar → bottom coordinates; the cross belongs inside the collar. */
export function wellSymbolPath(a: { x: number; y: number }, b: { x: number; y: number }, radius: number) {
  const r = radius * .6
  return { direction: `M${a.x},${a.y}L${b.x},${b.y}`, cross: `M${a.x-r},${a.y}h${r*2}M${a.x},${a.y-r}v${r*2}` }
}
