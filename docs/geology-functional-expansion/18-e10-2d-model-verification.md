# GEOX-E10 — проверка 2D геологического моделирования

Дата: 24 августа 2026  
Статус: реализован в кликабельном synthetic-прототипе.

| Задачи | Проверяемый результат |
|---|---|
| T01–T05 | ModelProject создаётся из exact Reserve snapshot; domain/grid, points, histogram/statistics и rejection decisions versioned. |
| T06–T08 | Variogram cloud/model parameters и cross-validation сохраняются; поле требует human acceptability decision. |
| T09–T10 | Kriging, IDW, minimum-curvature и Sibson-Laplace создают отдельные deterministic runs с search/weight parameters. |
| T11–T13 | Accepted field показывает coverage/no-data/quality, создаёт environment/ore contours и downloadable PNG/SVG/JSON artifacts and table fallback. |

Все данные synthetic в IndexedDB; reset возвращает seed.

```text
npm run typecheck — passed
npm run test      — 36 files, 89 tests passed
npm run build     — passed
```

Линтер: 0 errors, 3 прежних warnings вне E10.