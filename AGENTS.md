# AI KAPGEO — project instructions

## Start every session here

1. Read `docs/README.md` first.
2. Read `docs/ui-ux/01-product-brief.md` and `docs/implementation-status.md` before planning changes.
3. Open only the task-specific documents listed in `docs/README.md`; the detailed set is intentionally marked “read as needed”.
4. Treat `docs/ui-ux/` as the primary product and UI/UX specification until a newer recorded decision supersedes it.

## Archive policy — mandatory

- Do not recursively list, search, index, summarize, extract, inspect, or modify `archive/` during normal work.
- Do not use `archive/` to rebuild context that is already captured in `docs/`.
- Open an archived source only when the user explicitly requests it, or when a blocking ambiguity cannot be resolved from `docs/` and the exact source is identified first in `docs/ui-ux/11-traceability-open-questions.md`.
- When archive access is necessary, inspect only the exact named file and record any new durable conclusion back in `docs/`.
- Never include `archive/` in broad `rg`, file inventory, document extraction, or repository-analysis commands.

## Source of truth

- Product intent, roles, screen inventory, flows and business states: `docs/ui-ux/`.
- Current implementation state and known gaps: `docs/implementation-status.md`.
- Running behavior: source code and tests, but divergences from approved documentation must be called out and resolved.
- Historical source material: `archive/source-materials/` (do not read by default).
- Historical extraction/rendering artifacts: `archive/analysis-artifacts/` (never use as primary evidence).

## Frontend conventions

- Use React and strict TypeScript.
- Keep the dependency direction `app → pages → widgets → features → entities → shared`.
- Use semantic design tokens; do not hard-code product colors or spacing in feature components.
- Every route must support the relevant loading, empty, error, forbidden and read-only states.
- Access is determined by permission, scope and object status, not by a role-name check alone.
- Keep shareable context in the URL where practical: organization/site/block, `asOf`, scenario, view and selection.
- All prototype data must be deterministic and visibly synthetic. Never add real production data or credentials.
- AI output must remain distinguishable from manual and approved human results.
- Preserve RU/KZ/EN localization readiness; do not concatenate translated sentence fragments.
- Maintain keyboard focus, semantic labels, reduced-motion behavior and non-color status cues.

## Change discipline

- Prefer vertical slices that end in a demonstrable user outcome.
- Reuse common cards, workflows and workbench primitives instead of creating module-specific duplicates.
- When adding or removing a screen, update `docs/ui-ux/04-screen-catalog.md`.
- When changing a workflow or state transition, update the relevant module document and `docs/ui-ux/05-cross-module-flows.md`.
- Record unresolved product decisions in `docs/ui-ux/11-traceability-open-questions.md`.
- Update `docs/implementation-status.md` after each material implementation milestone.

## Verification

After frontend changes, run the available equivalents of:

```text
npm run typecheck
npm run test
npm run build
```

Add route/component/e2e checks in proportion to the implemented behavior. Do not report a screen as complete when its actions are decorative.
