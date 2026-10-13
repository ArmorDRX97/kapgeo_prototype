export function printPageIndices(value: string, count: number): number[] {
  if (!value.trim()) return Array.from({ length: count }, (_, i) => i)
  const selected = new Set<number>()
  for (const part of value.split(',')) {
    const match = /^\s*(\d+)\s*(?:[-–]\s*(\d+)\s*)?$/.exec(part)
    if (!match) throw new Error('Укажите номера листов через запятую или диапазон, например 1, 3–5.')
    const first = Number(match[1]), last = Number(match[2] ?? match[1])
    if (first < 1 || last < first || last > count) throw new Error(`Доступны листы 1–${count}; начало диапазона должно быть не больше конца.`)
    for (let page = first; page <= last; page++) selected.add(page - 1)
  }
  return [...selected].sort((a, b) => a - b)
}
