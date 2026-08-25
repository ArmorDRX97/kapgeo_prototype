# GEOX-E01 — IndexedDB foundation: implementation and verification

Status: implemented in the clickable prototype on 24 August 2026.

## Boundary

This is a browser-only demonstration platform for GitHub Pages. It stores only deterministic synthetic data in IndexedDB `kapgeo-demo`; it has no server synchronization, production credentials, or claim of production-grade data protection.

## Implemented data contract

`DemoDatabase` owns schema version `1`, deterministic seed `demo-main-v1`, migration/reseed and snapshot export/import. Its stores are `meta`, `records`, `versions`, `relations`, `auditEvents`, `jobs`, `artifacts`, and `preferences`. `records` indexes entity type, object, scope, status, and update time.

All geology pages use repository/API boundaries for mutable well data. The demo adapters persist well aggregates, passport/construction version history and dependencies, scientific jobs and artifacts, decision/reserve/delivery workflows, audit events, and map workspace preferences.

## User-visible proof

- Profile → “Демонстрационные данные” asks for confirmation, clears local data, restores the fixed synthetic seed and reloads the prototype.
- Map layer choices are saved in `preferences`; well selection/filter/focus remains in the shareable URL.
- Passport/construction save carries expected versions, produces a comparable conflict, shows impact before save and stores stale dependencies without changing the old published snapshot.
- Interpretation supports draft → review → return/approve; reserves support draft → review; delivery publication is persisted and immutable in the repository.
- Scientific jobs restore their lifecycle and artifacts after reload in the browser; the well Audit tab merges persisted audit evidence with the active job timeline.

## Verification record

Automated checks covering persistent seed/reset, workspace preferences, audit query, version conflict/history, workflow approval/publication and job lifecycle are in `src/repository/demo/*.test.ts` and `src/pages/geology/components/WellAuditWorkspace.test.tsx`.

Commands completed for this milestone:

```text
npm run typecheck
npm run test
npm run build
```

Browser automation could not be run in this desktop session because the local browser sandbox helper repeatedly exited during initialization. The implementation remains covered by component/repository tests; manual browser smoke should confirm map-layer reload and Profile reset on the target GitHub Pages build.