import { useState } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useMapFullscreen } from './useMapFullscreen'

afterEach(() => { cleanup(); vi.restoreAllMocks() })
function Map() {
  const fullscreen = useMapFullscreen(), [scale, setScale] = useState(1)
  return <section data-testid="map" className={fullscreen.active ? 'map-is-fullscreen' : ''}><button onClick={fullscreen.toggle}>{fullscreen.active ? 'Свернуть' : 'Развернуть'}</button><button onClick={() => setScale(scale + 1)}>Приблизить</button><output>{scale}</output></section>
}
describe('map expanded viewport', () => {
  it('keeps the map state and exits with Escape without entering browser fullscreen', () => {
    const native = vi.fn()
    vi.stubGlobal('requestFullscreen', native)
    render(<Map />)
    fireEvent.click(screen.getByText('Приблизить'))
    fireEvent.click(screen.getByText('Развернуть'))
    expect(screen.getByTestId('map')).toHaveClass('map-is-fullscreen')
    expect(document.body.style.overflow).toBe('hidden')
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.getByTestId('map')).not.toHaveClass('map-is-fullscreen')
    expect(screen.getByRole('status')).toHaveTextContent('2')
    expect(native).not.toHaveBeenCalled()
    expect(document.body.style.overflow).not.toBe('hidden')
    vi.unstubAllGlobals()
  })
})
