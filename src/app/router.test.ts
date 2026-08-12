import { describe, expect, it } from 'vitest'
import { router } from './router'

describe('P0 route smoke', () => {
  it('builds typed deep-links for the core modules', () => {
    expect(router.buildLocation({ to: '/objects/wells/$wellId', params: { wellId: 'WELL-1042' }, search: { tab: 'logs' } }).href).toBe('/objects/wells/WELL-1042?tab=logs')
    expect(router.buildLocation({ to: '/modeling/workspace/$projectId', params: { projectId: 'MOD-PR-07' } }).href).toBe('/modeling/workspace/MOD-PR-07')
    expect(router.buildLocation({ to: '/technology/balance' }).href).toBe('/technology/balance')
    expect(router.buildLocation({ to: '/analytics/decision' }).href).toBe('/analytics/decision')
    expect(router.buildLocation({ to: '/admin/operations' }).href).toBe('/admin/operations')
    expect(router.buildLocation({ to: '/help/roles/$roleId', params: { roleId: 'R6' } }).href).toBe('/help/roles/R6')
    expect(router.buildLocation({ to: '/help/modules/$moduleId', params: { moduleId: 'technology' } }).href).toBe('/help/modules/technology')
  })
})
