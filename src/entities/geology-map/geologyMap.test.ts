import { describe, expect, it } from 'vitest'
import { containsEvenOdd, distance, flattenedParts, hitObject, objectPath, projectOnSegment, screenToWorld, splitBezier, worldToScreen, zoomCamera } from './geometry'
import { emptyMap, initialMaps } from './fixtures'
import { layerEditable, layerVisible, makeObject, orderedLayers, point, projectSchema } from './model'
import { importSvg, transformSvgPoint } from './svgImport'
import { planSvg } from '../../features/geology-plan/export'

describe('engineering map coordinate and geometry contracts', () => {
  it('round trips survey X north / Y east and keeps metres isotropic', () => {
    const c = { x: 60000, y: 94000, scale: 2 }, size = { width: 1000, height: 800 }
    expect(worldToScreen({ x: 60010, y: 94020 }, c, size)).toEqual({ x: 540, y: 380 })
    expect(screenToWorld({ x: 540, y: 380 }, c, size)).toEqual({ x: 60010, y: 94020 })
    expect(distance({ x: 0, y: 0 }, { x: 30, y: 40 })).toBe(50)
  })
  it('zooms around the world point under the cursor and clamps zoom', () => {
    const c = { x: 20, y: 40, scale: 2 }, size = { width: 900, height: 700 }, anchor = { x: 234, y: 186 }, p = screenToWorld(anchor, c, size)
    const screen = worldToScreen(p, zoomCamera(c, 3, anchor, size), size)
    expect(screen.x).toBeCloseTo(anchor.x, 8); expect(screen.y).toBeCloseTo(anchor.y, 8)
    expect(zoomCamera(c, 1e10, anchor, size).scale).toBe(80)
  })
  it('snaps between bottoms using a bounded segment, including coincident bottoms', () => {
    expect(projectOnSegment({ x: 5, y: 20 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toEqual({ x: 5, y: 0 })
    expect(projectOnSegment({ x: 30, y: 5 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toEqual({ x: 10, y: 0 })
    expect(projectOnSegment({ x: 1, y: 2 }, { x: 4, y: 5 }, { x: 4, y: 5 })).toEqual({ x: 4, y: 5 })
  })
  it('leaves nested areas transparent and applies parity for overlapping rings', () => {
    const ring = (a: number, b: number) => [{ x: a, y: a }, { x: a, y: b }, { x: b, y: b }, { x: b, y: a }]
    expect(containsEvenOdd([ring(0, 10), ring(3, 7)], { x: 1, y: 1 })).toBe(true)
    expect(containsEvenOdd([ring(0, 10), ring(3, 7)], { x: 5, y: 5 })).toBe(false)
    expect(containsEvenOdd([ring(0, 10), ring(3, 7), ring(4, 6)], { x: 5, y: 5 })).toBe(true)
  })
  it('hit testing follows the same hole geometry as drawing', () => {
    const o = makeObject('a', 'contour', [point(0, 0), point(0, 10), point(10, 10), point(10, 0)])
    o.parts.push({ id: 'hole', nodes: [point(3, 3), point(3, 7), point(7, 7), point(7, 3)] })
    expect(hitObject(o, { x: 5, y: 5 }, .1)).toBe(false); expect(hitObject(o, { x: 1, y: 1 }, .1)).toBe(true)
  })
  it('preserves Bezier control points and cardinal interpolation nodes', () => {
    const bezier = makeObject('a', 'profile', [point(0, 0), point(0, 10), point(10, 10), point(10, 0)], 'bezier')
    expect(objectPath(bezier)).toContain('C0.000,10.000 10.000,10.000 10.000,0.000')
    const mid = flattenedParts(bezier)[0]![12]!
    expect(mid.x).toBeCloseTo(5); expect(mid.y).toBeCloseTo(7.5)
    bezier.shape = 'cardinal'; expect(objectPath(bezier)).toContain('10.000,10.000')
  })
  it('source fixtures have stable IDs and valid independent projects', () => {
    expect(initialMaps()).toEqual(initialMaps())
    const docs = initialMaps(); docs.forEach(p => expect(projectSchema.safeParse(p).success).toBe(true))
    expect(docs[0]!.objects.filter(o => o.kind === 'well').length).toBeGreaterThan(150)
    expect(docs[1]!.locked).toBe(true); expect(docs[2]!.objects).toHaveLength(0)
  })
  it('adds a Bezier anchor by splitting without moving the original curve', () => {
    const o = makeObject('a', 'contour', [point(0, 0), point(0, 10), point(10, 10), point(10, 0)], 'bezier'); o.closed = false
    const result = splitBezier(o, { x: 5, y: 7.5 }), n = result.parts[0]!.nodes
    expect(n).toHaveLength(7); expect(n[3]).toMatchObject({ x: 5, y: 7.5 }); expect(n[0]).toEqual(o.parts[0]!.nodes[0]); expect(n.at(-1)).toEqual(o.parts[0]!.nodes.at(-1))
    expect(splitBezier({ ...o, parts: [{ id: 'empty', nodes: [] }] }, { x: 0, y: 0 }).parts[0]!.nodes).toHaveLength(0)
  })
  it('inherits layer visibility/lock and paints children in tree order', () => {
    const p = emptyMap('x', 'Plan'); p.layers = [{ id: 'a', parentId: null, name: 'A', visible: false, locked: true }, { id: 'b', parentId: null, name: 'B', visible: true, locked: false }, { id: 'c', parentId: 'a', name: 'C', visible: true, locked: false }]
    expect(layerVisible(p, 'c')).toBe(false); expect(layerEditable(p, 'c')).toBe(false)
    expect(orderedLayers(p).map(l => l.id)).toEqual(['a', 'c', 'b'])
    p.layers[0]!.parentId = 'c'; expect(projectSchema.safeParse(p).success).toBe(false)
  })
})
describe('SVG import and physical output', () => {
  const t = { x: 100, y: 200, scale: 2, angle: 0, flipY: true }
  it('converts source axes and clockwise rotation explicitly', () => {
    expect(transformSvgPoint({ x: 10, y: 5 }, t)).toEqual({ x: 90, y: 220 })
    const p = transformSvgPoint({ x: 10, y: 0 }, { ...t, angle: 90 }); expect(p.x).toBeCloseTo(80); expect(p.y).toBeCloseTo(200)
  })
  it('imports relative commands and multipart even-odd areas without executing source', () => {
    const source = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><path id="area" d="M0 0 h10 v10 h-10 z M3 3 l4 0 v4 h-4 z"/></svg>'
    const result = importSvg(source, 'layer', t)
    expect(result.objects).toHaveLength(1); expect(result.objects[0]!.parts).toHaveLength(2)
    expect(result.objects[0]!.parts[0]!.nodes[1]).toMatchObject({ x: 100, y: 220 }); expect(result.warnings.length).toBeGreaterThan(0)
  })
  it('converts Q and straight segments into a consistent cubic path', () => {
    const o = importSvg('<svg><path d="M0 0 Q5 10 10 0 L20 0"/></svg>', 'layer', t).objects[0]!
    expect(o.shape).toBe('bezier'); expect(o.parts[0]!.nodes).toHaveLength(7)
  })
  it('rejects unsupported commands/transforms and entity declarations with explanations', () => {
    expect(() => importSvg('<svg><path d="M0 0 A10 10 0 0 1 20 20"/></svg>', 'layer', t)).toThrow('Команда A')
    expect(() => importSvg('<svg><g transform="scale(2)"><path d="M0 0 L10 10"/></g></svg>', 'layer', t)).toThrow('transform')
    expect(() => importSvg('<!DOCTYPE svg><svg/>', 'layer', t)).toThrow('декларацию')
    expect(() => importSvg('<svg><path d="M0 0 L5"/></svg>', 'layer', t)).toThrow('координата')
  })
  it('produces physical paper size, independent scale, escaped metadata and a 50mm ruler', () => {
    const p = emptyMap('p', '<script>Plan</script>'); p.print = { paper: 'A3', landscape: true, scale: 1000 }
    const svg = planSvg(p, { x: 100, y: 200, scale: 300 })
    expect(svg).toContain('width="420mm" height="297mm"'); expect(svg).toContain('контроль 50 мм'); expect(svg).toContain('&lt;script&gt;Plan'); expect(svg).not.toContain('<script>')
    expect(svg).toBe(planSvg(p, { x: 100, y: 200, scale: .01 }))
  })
  it('exports 100m as 100mm at 1:1000 and keeps paper line weight independent', () => {
    const p = emptyMap('p', 'Scale'); p.print.scale = 1000
    const o = makeObject(p.layers[0]!.id, 'profile', [point(0, 0), point(0, 100)]); o.style.width = 5; o.style.paperWidth = .1; p.objects.push(o)
    const doc = new DOMParser().parseFromString(planSvg(p, { x: 0, y: 50, scale: 10 }), 'image/svg+xml'), path = Array.from(doc.querySelectorAll('path')).find(n => n.getAttribute('d')?.includes('C') === false && n.getAttribute('stroke-width') === '0.1')!
    const numbers = path.getAttribute('d')!.match(/[-+]?\d*\.?\d+/g)!.map(Number)
    expect(numbers[2]! - numbers[0]!).toBe(100)
  })
  it('supports declared paper dimensions A4 through A0 without altering object geometry', () => {
    const p = emptyMap('p', 'Paper')
    for (const [paper, width, height] of [['A4', 210, 297], ['A3', 297, 420], ['A2', 420, 594], ['A1', 594, 841], ['A0', 841, 1189]] as const) {
      p.print = { paper, landscape: false, scale: 1000 }; expect(planSvg(p, { x: 0, y: 0, scale: 1 })).toContain(`width="${width}mm" height="${height}mm"`)
    }
  })
})
