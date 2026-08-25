# GEOX-E11 — проверка 3D/DGM

Дата: 24 августа 2026  
Статус: реализован в кликабельном synthetic-прототипе.

| Задачи | Проверяемый результат |
|---|---|
| T01–T03 | Versioned horizons/order/groups, section picks/pinch-out и roof/thickness surfaces с conflicts. |
| T04–T06 | Plan diagnostics и prismatic volume mesh показывают nodes/triangles/prisms/groups и table fallback. |
| T07–T10 | Horizon groups, 3D ellipsoid/variogram, accepted content/tech fields и exact-reference DGM composition. |
| T11–T13 | Slice averages/integrals, WebGL/2D/table modes и downloadable glTF-like JSON/DXF publication. |

Все данные synthetic в IndexedDB; reset возвращает seed.

```text
npm run typecheck — passed
npm run test      — 37 files, 91 tests passed
npm run build     — passed
```

Линтер: 0 errors, 3 прежних warnings вне E11.