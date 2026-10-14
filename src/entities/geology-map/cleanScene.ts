import { type MapObject, type MapProject } from './model'

type GridWell = { object: MapObject; row: number; column: number }
type AnchoredPoint = { id: string; x: number; y: number; anchor: { wellId: string; target: 'bottom' } }

function bottomPoint(well: GridWell, id: string): AnchoredPoint {
  const bottom = well.object.parts[0]!.nodes[1]!
  return { id, x: bottom.x, y: bottom.y, anchor: { wellId: well.object.id, target: 'bottom' } }
}

function nearestInRow(wells: GridWell[], row: number, column: number): GridWell {
  return wells.filter(well => well.row === row).sort((a, b) => Math.abs(a.column - column) - Math.abs(b.column - column) || a.column - b.column)[0]!
}

function blockFor(wells: GridWell[], blockIndex: number): MapObject {
  const rowStart = Math.floor(blockIndex * 12 / 5)
  const rowEnd = Math.min(11, Math.floor((blockIndex + 1) * 12 / 5))
  const middle = Math.floor((rowStart + rowEnd) / 2)
  const selected = [nearestInRow(wells,rowStart,1+blockIndex%2),nearestInRow(wells,rowStart,11+blockIndex%3),nearestInRow(wells,middle,15),nearestInRow(wells,rowEnd,13-blockIndex%2),nearestInRow(wells,rowEnd,2),nearestInRow(wells,middle,0)]
    .filter((well,index,items)=>items.findIndex(item=>item.object.id===well.object.id)===index)
  const centerX = selected.reduce((sum, well) => sum + well.object.parts[0]!.nodes[1]!.x, 0) / selected.length
  const centerY = selected.reduce((sum, well) => sum + well.object.parts[0]!.nodes[1]!.y, 0) / selected.length
  const ordered = selected.sort((a, b) => {
    const pointA = a.object.parts[0]!.nodes[1]!
    const pointB = b.object.parts[0]!.nodes[1]!
    return Math.atan2(pointA.y - centerY, pointA.x - centerX) - Math.atan2(pointB.y - centerY, pointB.x - centerX)
  })
  return {
    id: `block-${blockIndex}`, layerId: 'blocks', kind: 'block', shape: 'straight', closed: true,
    name: `Геоблок ${110 + blockIndex}`,
    attributes: { type: '', depth: 0, value: 0, note: '' },
    label: { visible: true, dx: 8, dy: -8 },
    parts: [{ id: `block-${blockIndex}-part`, nodes: ordered.map((well, i) => bottomPoint(well, `block-${blockIndex}-n${i}`)) }],
    style: { stroke: '#43a9ae', fill: 'none', width: 1.2, paperWidth: .18, dash: 'solid', opacity: 1 },
  }
}

function profileFor(wells: GridWell[], profileIndex: number): MapObject {
  const selected = [0, 4, 8, 11].map(row => nearestInRow(wells, row, Math.round(profileIndex * 1.65 + row * 0.45)))
  return {
    id: `profile-${profileIndex}`, layerId: 'profiles', kind: 'profile', shape: 'straight', closed: false,
    name: `Р-${String(profileIndex + 1).padStart(2, '0')}`,
    attributes: { type: '', depth: 0, value: 0, note: '' },
    label: { visible: true, dx: 8, dy: -8 },
    parts: [{ id: `profile-${profileIndex}-part`, nodes: selected.map((well, i) => bottomPoint(well, `profile-${profileIndex}-n${i}`)) }],
    style: { stroke: '#56636d', fill: 'none', width: .8, paperWidth: .18, dash: 'solid', opacity: 1 },
  }
}

/** Build the deterministic, well-anchored clean map scene used by the plan editor. */
export function cleanMapScene(base: MapProject): MapProject {
  const types = ['Откачная', 'Закачная', 'Наблюдательная', 'Разведочная'] as const
  const colors: Record<(typeof types)[number], string> = {
    Откачная: '#214b3c', Закачная: '#b69a25', Наблюдательная: '#435b9d', Разведочная: '#3a979b',
  }
  const wells: GridWell[] = base.objects.filter(object => object.kind === 'well').map(object => {
    const index = Number(object.id.slice('well-'.length))
    const row = Math.floor(index / 16)
    const column = index % 16
    const block = Math.min(4, Math.floor(row * 5 / 12))
    const type = types[(index + row) % types.length]!
    return {
      row,
      column,
      object: {
        ...object,
        name: `${110 + block}.${row - Math.floor(block * 12 / 5) + 1}.${column + 1}`,
        attributes: { ...object.attributes, type },
        style: { ...object.style, stroke: colors[type] },
      },
    }
  }).sort((a, b) => a.row - b.row || a.column - b.column)

  const layers = [
    { id: 'blocks', parentId: null, name: 'Геоблоки', visible: true, locked: false },
    { id: 'profiles', parentId: null, name: 'Профили разрезов', visible: true, locked: false },
    { id: 'wells', parentId: null, name: 'Скважины', visible: true, locked: false },
  ]
  return {
    ...base,
    sceneVersion: 2,
    layers,
    objects: [
      ...Array.from({ length: 5 }, (_, index) => blockFor(wells, index)),
      ...Array.from({ length: 9 }, (_, index) => profileFor(wells, index)),
      ...wells.map(well => well.object),
    ],
  }
}
