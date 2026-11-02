import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { bgdFieldWells } from '../model/bgdField'
import { BgdFieldMap } from './BgdFieldMap'

vi.mock('../../../entities/geology-map/ui/MapCanvas', () => ({ MapCanvas: ({ selected, camera, project, onSelect, onContextSelect }: { selected?: string; camera: { x: number; y: number; scale: number } | null; project: { objects: { id: string }[] }; onSelect: (ids: string[]) => void; onContextSelect: (ids: string[], point: { x: number; y: number }) => void }) => <div data-testid="map" data-selected={selected} data-camera={JSON.stringify(camera)} data-visible={project.objects.some(o => o.id === selected)}><button onClick={() => onSelect([bgdFieldWells[0]!.id])}>ЛКМ</button><button onClick={() => onContextSelect([bgdFieldWells[0]!.id], { x: 100, y: 100 })}>ПКМ</button></div> }))

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
  it('shows well information on right click and opens the card only on the explicit action or left click', () => {
    const onOpenWell = vi.fn(), well = bgdFieldWells[0]!
    render(<QueryClientProvider client={new QueryClient()}><BgdFieldMap depositId="DEP-SARYTAU" onOpenWell={onOpenWell} /></QueryClientProvider>)
    fireEvent.click(screen.getByText('ПКМ'))
    expect(onOpenWell).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog', { name: 'Сведения об объекте карты' })).toHaveTextContent(well.name)
    expect(screen.getByText(well.status)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Перейти к скважине' }))
    expect(onOpenWell).toHaveBeenCalledWith(well.id)
    fireEvent.click(screen.getByText('ЛКМ'))
    expect(onOpenWell).toHaveBeenCalledTimes(2)
  })
})
