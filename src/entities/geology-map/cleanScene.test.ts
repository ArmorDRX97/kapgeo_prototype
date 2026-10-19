import { describe, expect, it } from 'vitest'
import { legacyInitialMaps } from './fixtures'
import { cleanMapScene } from './cleanScene'
import { projectSchema } from './model'

describe('cleanMapScene', () => {
  it('is deterministic and leaves the source project untouched', () => {
    const base = legacyInitialMaps()[0]!
    const before = structuredClone(base)

    expect(cleanMapScene(base)).toEqual(cleanMapScene(base))
    expect(base).toEqual(before)
  })

  it('keeps all wells and creates only anchored block and profile geometry', () => {
    const base = legacyInitialMaps()[0]!
    const scene = cleanMapScene(base)
    const baseWells = base.objects.filter(object => object.kind === 'well')
    const wells = scene.objects.filter(object => object.kind === 'well')
    const blocks = scene.objects.filter(object => object.kind === 'block')
    const profiles = scene.objects.filter(object => object.kind === 'profile')
    const byId = new Map(wells.map(well => [well.id, well]))

    expect(wells).toHaveLength(180)
    expect(blocks).toHaveLength(5)
    expect(profiles).toHaveLength(9)
    expect(profiles.every(profile => profile.parts[0]!.nodes.length === 7)).toBe(true)
    expect(blocks.every(block => block.parts[0]!.nodes.length >= 12)).toBe(true)
    expect(scene.objects).toHaveLength(194)
    expect(scene.objects.some(object => object.kind === 'contour')).toBe(false)
    expect(scene.layers).toEqual([
      { id: 'blocks', parentId: null, name: 'Геоблоки', visible: true, locked: false },
      { id: 'profiles', parentId: null, name: 'Профили разрезов', visible: true, locked: false },
      { id: 'wells', parentId: null, name: 'Скважины', visible: true, locked: false },
    ])
    expect(scene.sceneVersion).toBe(2)

    for (const source of baseWells) {
      const result = byId.get(source.id)!
      expect(result.parts[0]!.nodes.map(({ x, y }) => ({ x, y }))).toEqual(source.parts[0]!.nodes.map(({ x, y }) => ({ x, y })))
      expect(result.attributes.depth).toBe(source.attributes.depth)
      expect(result.attributes.value).toBe(source.attributes.value)
    }

    for (const object of [...blocks, ...profiles]) {
      expect(object.style.fill).toBe('none')
      for (const node of object.parts.flatMap(part => part.nodes)) {
        const anchor = node.anchor!
        const well = byId.get(anchor.wellId)!
        const circle = well.parts[0]!.nodes[0]!
        expect(anchor.target).toBe('collar')
        expect({ x: node.x, y: node.y }).toEqual({ x: circle.x, y: circle.y })
      }
    }
    expect(new Set(blocks.map(block => JSON.stringify(block.parts[0]!.nodes.map(({ x, y }) => [x, y])))).size).toBeGreaterThan(1)
    expect(projectSchema.safeParse(scene).success).toBe(true)
  })
})
