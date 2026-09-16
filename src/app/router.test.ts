import { describe, expect, it } from 'vitest'
import { router } from './router'

describe('BGD route smoke', () => {
  it('builds typed deep-links for the complete BGD flow', () => {
    expect(router.buildLocation({ to: '/geology/bgd' }).href).toBe('/geology/bgd')
    expect(router.buildLocation({ to: '/geology/bgd/$depositId', params: { depositId: 'DEP-SARYTAU' } }).href).toBe('/geology/bgd/DEP-SARYTAU')
    expect(router.buildLocation({ to: '/geology/bgd/$depositId', params: { depositId: 'DEP-SARYTAU' }, search: { section: 'conditions' } }).href).toBe('/geology/bgd/DEP-SARYTAU?section=conditions')
    expect(router.buildLocation({ to: '/geology/bgd/$depositId/wells/new', params: { depositId: 'DEP-SARYTAU' } }).href).toBe('/geology/bgd/DEP-SARYTAU/wells/new')
    expect(router.buildLocation({ to: '/geology/bgd/$depositId/wells/$wellId', params: { depositId: 'DEP-SARYTAU', wellId: 'WELL-1042' } }).href).toBe('/geology/bgd/DEP-SARYTAU/wells/WELL-1042')
    expect(router.buildLocation({ to: '/geology/bgd/$depositId/wells/$wellId', params: { depositId: 'DEP-SARYTAU', wellId: 'WELL-1042' }, search: { tab: 'logs' } }).href).toBe('/geology/bgd/DEP-SARYTAU/wells/WELL-1042?tab=logs')
    expect(router.buildLocation({ to: '/geology/bgd/$depositId/wells/$wellId', params: { depositId: 'DEP-SARYTAU', wellId: 'WELL-1042' }, search: { tab: 'lithology' } }).href).toBe('/geology/bgd/DEP-SARYTAU/wells/WELL-1042?tab=lithology')
    expect(router.buildLocation({ to: '/geology/bgd/$depositId/wells/$wellId', params: { depositId: 'DEP-SARYTAU', wellId: 'WELL-1042' }, search: { tab: 'ore-intervals' } }).href).toBe('/geology/bgd/DEP-SARYTAU/wells/WELL-1042?tab=ore-intervals')
    expect(router.buildLocation({ to: '/profile' }).href).toBe('/profile')
    expect(router.buildLocation({ to: '/technology' }).href).toBe('/technology')
    expect(router.buildLocation({ to: '/modeling' }).href).toBe('/modeling')
    expect(router.buildLocation({ to: '/analytics' }).href).toBe('/analytics')
    expect(router.buildLocation({ to: '/admin' }).href).toBe('/admin')
  })
})
