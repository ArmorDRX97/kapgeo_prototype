export function drawingSvgSource(original: SVGSVGElement) {
  const copy = original.cloneNode(true) as SVGSVGElement, originals = [original, ...original.querySelectorAll('*')], copies = [copy, ...copy.querySelectorAll('*')]
  originals.forEach((node, i) => {
    const style = getComputedStyle(node)
    copies[i]?.setAttribute('style', ['fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'opacity', 'font-family', 'font-size', 'font-weight', 'paint-order'].map(k => `${k}:${style.getPropertyValue(k).replace(/url\(["']?[^#)]*#([^"')]+)["']?\)/g, 'url(#$1)')}`).join(';'))
  })
  return new XMLSerializer().serializeToString(copy)
}
export function downloadDrawing(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob), a = document.createElement('a')
  a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
}
export async function drawingPng(original: SVGSVGElement, widthMm: number, heightMm: number) {
  const source = URL.createObjectURL(new Blob([drawingSvgSource(original)], { type: 'image/svg+xml;charset=utf-8' }))
  try {
    const image = new Image()
    await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error('Не удалось подготовить изображение чертежа.')); image.src = source })
    const canvas = document.createElement('canvas'); canvas.width = Math.round(widthMm / 25.4 * 150); canvas.height = Math.round(heightMm / 25.4 * 150)
    const context = canvas.getContext('2d'); if (!context) throw new Error('Браузер не поддерживает растровый экспорт.')
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Не удалось сохранить PNG.')), 'image/png'))
  } finally { URL.revokeObjectURL(source) }
}
