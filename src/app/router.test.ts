import { describe, expect, it } from 'vitest'
import { router } from './router'

describe('P0 route smoke', () => {
  it('builds typed deep-links for the core modules', () => {
    expect(router.buildLocation({ to: '/objects/wells/$wellId', params: { wellId: 'WELL-1042' }, search: { tab: 'logs' } }).href).toBe('/objects/wells/WELL-1042?tab=logs')
    expect(router.buildLocation({ to: '/modeling/workspace/$projectId', params: { projectId: 'MOD-PR-07' } }).href).toBe('/modeling/workspace/MOD-PR-07')
    expect(router.buildLocation({ to: '/geology/master' }).href).toBe('/geology/master')
    expect(router.buildLocation({ to: '/geology/bgd' }).href).toBe('/geology/bgd')
    expect(router.buildLocation({ to: '/geology/bgd/$depositId', params: { depositId: 'DEP-SARYTAU' } }).href).toBe('/geology/bgd/DEP-SARYTAU')
    expect(router.buildLocation({ to: '/geology/bgd/$depositId/wells/new', params: { depositId: 'DEP-SARYTAU' } }).href).toBe('/geology/bgd/DEP-SARYTAU/wells/new')
    expect(router.buildLocation({ to: '/geology/bgd/$depositId/wells/$wellId', params: { depositId: 'DEP-SARYTAU', wellId: 'WELL-1042' } }).href).toBe('/geology/bgd/DEP-SARYTAU/wells/WELL-1042')
    expect(router.buildLocation({ to: '/geology/methodology' }).href).toBe('/geology/methodology')
    expect(router.buildLocation({ to: '/technology/balance' }).href).toBe('/technology/balance')
    expect(router.buildLocation({ to: '/analytics/decision' }).href).toBe('/analytics/decision')
    expect(router.buildLocation({ to: '/admin/operations' }).href).toBe('/admin/operations')
    expect(router.buildLocation({ to: '/help/roles/$roleId', params: { roleId: 'R6' } }).href).toBe('/help/roles/R6')
    expect(router.buildLocation({ to: '/help/modules/$moduleId', params: { moduleId: 'technology' } }).href).toBe('/help/modules/technology')
  })
})
