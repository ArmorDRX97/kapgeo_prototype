# @kapgeo/geo-viz — local prototype distribution

The wellog Canvas renderer is copied from `C:/Projects/frontent/packages/geo-viz`
at commit `d1d4088db013aaa7c61c97089c8ccd224009b2fb` (2026-10-05).
The numerical scale, curve rendering, axis, sampling and min/max decimation originate
there. Domain tokens are copied from that repository's `packages/ui/src/tokens/domain.ts`.
This is a local file dependency, not a third-party package or a link to another checkout.

Prototype adaptations: standalone CSS instead of Tailwind; semantic theme bridge;
interval tracks and selection/range/contact interactions; gap-preserving decimation
and sampling; React peer range ^19.0.0 to match this prototype. Plan/OpenLayers and
the main application's UI/API/auth packages are deliberately outside this distribution.
Domain palette remains provisional, as in the source. Future upstream updates must
review these adaptations; this snapshot does not automatically update the main app.
