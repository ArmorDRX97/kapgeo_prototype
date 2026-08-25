# GEOX-E09 — проверка проектов запасов

Дата: 24 августа 2026  
Статус: реализован в кликабельном synthetic-прототипе.

| Задачи | Проверяемый результат |
|---|---|
| T01–T06 | Versioned ReserveProject хранит locked snapshot, packages/profiles, intersections, thickness reason, blocks, well sets и cells. |
| T07–T11 | Preflight запускает projection, Voronoi-like, interval-registry и geostatistical synthetic runs с отдельными protocols. |
| T12 | Compare использует один snapshot; active result не перезаписывает другие runs. |
| T13–T14 | Reserve plan и downloadable passport package проходят review/approve/publish и audit. |

Все результаты маркированы DEMO / НЕ ДЛЯ ПРОИЗВОДСТВЕННЫХ РЕШЕНИЙ, сохраняются в IndexedDB и сбрасываются reset.

```text
npm run typecheck — passed
npm run test      — 35 files, 87 tests passed
npm run build     — passed
```

Линтер: 0 errors, 3 прежних warnings вне E09.