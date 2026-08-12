# Traceability E00–E16

Статус относится к **React UI/UX demo-прототипу**. `Demo` означает интерактивный маршрут/документированный сценарий; это не заявление о production backend.

| Эпик | Demo-покрытие | Доказательство | Открытая production/quality граница |
|---|---|---|---|
| E00–E01 Product/UX | Demo | `docs/ui-ux/*`, роли, screen catalog, flows | интервью и согласование с владельцами терминов |
| E02 Foundation | Demo | Vite, Router, Query, TS, lint/test/build | code splitting и error boundaries по всем routes |
| E03 Design system | Demo | tokens, app shell, shared UI, accessibility settings | Storybook/visual regression |
| E04 Mock data/API | Demo | `src/mocks`, deterministic personas/data | MSW handlers и seed scenarios 01–15 полностью |
| E05 Test infrastructure | Demo | Vitest + Testing Library, 12 tests including `router.test.ts` P0 route smoke | Playwright, component harness, screenshot baseline |
| E06 Auth/shell/profile | Demo | SSO/MFA/persona, permissions, profile | real IdP, session reauth, access request backend |
| E07 Object platform | Demo | well card/tabs/version context, work center | block card, attachments/comments и full diff |
| E08 Common workflows | Demo | `/work/workflows`, notifications, import/approval states | real jobs/export/audit persistence |
| E09 GEO | Demo | `/geology/*`, delivery | GIS/LIMS/parser/reserves engine |
| E10 TECH | Demo | `/technology/*` | telemetry/LIMS/offline field execution |
| E11 MOD | Demo | `/modeling/*`, typed `$projectId` deep-links | solver/result storage |
| E12 Analytics | Demo | `/analytics/*` | production sources and report export |
| E13 Admin | Demo | `/admin`, `/admin/operations` | actual user management/integration secrets |
| E14 A11y/i18n/responsive | Demo | `/help/accessibility`, focus/skip-link, responsive CSS, i18n strategy | RU/KZ/EN catalog, screen-reader and device audit |
| E15 Performance/polish | Demo | responsive smoke 1024/390, empty/forbidden patterns, build checks | bundle split, grid virtualisation, latency audit |
| E16 Handoff | Demo | `docs/handoff/*` | stakeholder acceptance walkthrough |

## Gate before declaring the whole E00–E16 objective complete

1. Пройти stakeholder acceptance walkthrough по `demo-scripts.md` и зафиксировать замечания.

Until these gates are met, the goal is intentionally kept active.
