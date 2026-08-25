# GEOX-E08 — проверка геотехнологического разреза

Дата: 24 августа 2026  
Статус: реализован в кликабельном synthetic-прототипе.

| Задачи | Проверяемый результат |
|---|---|
| T01–T04 | Versioned SectionProject хранит snapshot, route, corridor wells, scene и table fallback. |
| T05–T06 | Connectivity/pinch-out и section-only helper сохраняются, не попадая в column/reserves. |
| T07–T10 | Contour, rhythm, ore bodies и oxidation имеют synthetic edit/validation actions. |
| T11–T12 | Auto-repair создаёт proposal; drawing composer скачивает SVG и создаёт artifact/job. |

Все данные synthetic в IndexedDB; reset возвращает seed.

```text
npm run typecheck — passed
npm run test      — 34 files, 85 tests passed
npm run build     — passed
```

Линтер: 0 errors, 3 прежних warnings вне E08.