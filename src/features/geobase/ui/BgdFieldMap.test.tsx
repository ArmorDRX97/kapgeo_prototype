import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { bgdFieldWells } from '../model/bgdField'
import { BgdFieldMap } from './BgdFieldMap'

vi.mock('../../../entities/geology-map/ui/MapCanvas', () => ({ MapCanvas: ({ selected, camera, project }: { selected?: string; camera: { x: number; y: number; scale: number } | null; project: { objects: { id: string }[] } }) => <div data-testid="map" data-selected={selected} data-camera={JSON.stringify(camera)} data-visible={project.objects.some(o => o.id === selected)} /> }))

afterEach(() => { cleanup(); sessionStorage.clear() })
describe('Показать скважину на карте', () => {
  it('centres and selects the requested well even when previous filters excluded it', async () => {
    const well = bgdFieldWells[0]!, point = well.parts[0]!.nodes[0]!
    const client = new QueryClient()
    client.setQueryData(['bgd-field-filters', 'DEP-SARYTAU'], { query: 'неизвестная скважина', hiddenTypes: [], status: 'all', site: 'all' })
    render(<QueryClientProvider client={client}><BgdFieldMap depositId="DEP-SARYTAU" focusWellId={well.id} /></QueryClientProvider>)
    const map = screen.getByTestId('map')
    await waitFor(() => expect(map).toHaveAttribute('data-visible', 'true'))
    expect(map).toHaveAttribute('data-selected', well.id)
    expect(JSON.parse(map.getAttribute('data-camera')!)).toEqual({ x: point.x, y: point.y, scale: 1.5 })
    expect(client.getQueryData(['bgd-field-filters', 'DEP-SARYTAU'])).toMatchObject({ query: '', site: 'all' })
  })
})
