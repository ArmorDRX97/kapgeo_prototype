/** Working plots reserve an independent header; print geometry keeps its margins. */
export function plotFrame(width: number, height: number, clean = false, headerTop = 96) {
  const left = 42, top = clean ? 42 : headerTop, right = width - 42, bottom = height - 42
  return { left, top, right, bottom, width: right - left, height: bottom - top }
}
