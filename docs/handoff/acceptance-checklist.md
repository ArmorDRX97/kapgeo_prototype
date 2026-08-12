# Acceptance checklist

## Сквозные P0 demo-пути

- [x] Auth → MFA → ролевое меню. Проверено в browser: SSO → MFA `246810` → HOME R3 (11.08.2026).
- [x] Запрет прямого перехода без permission. Проверено в browser: R3 → `/admin` → 403 без раскрытия данных (11.08.2026).
- [x] GEO: маршрут `/geology` → `WELL-1042?tab=logs`: карта/реестр, object tabs, source/QC и viewer entry доступны в browser (11.08.2026).
- [ ] GEO: скважина → ГИС → ручная/AI интерпретация → решение → публикация.
- [x] TECH: технолог R6 → `/technology` → `/technology/balance`; факт, evidence и ручные действия отображаются в browser (11.08.2026).
- [x] MOD: моделист → `/modeling` → `/modeling/workspace/MOD-PR-07`; snapshot и preflight workspace открываются в browser (11.08.2026).
- [x] ANALYTICS: аналитик → `/analytics/decision` → «Принять решение» → `TECH-TASK-134` в browser (11.08.2026).
- [ ] ADMIN: effective permissions → access request → audit/integration retry.

## Общие критерии

- [ ] Маршруты, loading/error/empty/forbidden состояния и deep-link проверены.
- [ ] У действий есть понятный статус, источник и audit context.
- [ ] Typecheck, unit tests, lint и build проходят.
- [x] Responsive smoke: `/technology/balance` проверен на 1024px, `/technology/plan-fact` — на 390px; горизонтального overflow страницы нет (browser, 11.08.2026).

Производственные интеграции и серверные расчёты в этот чек-лист не входят.
