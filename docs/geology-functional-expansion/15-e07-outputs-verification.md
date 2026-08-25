# GEOX-E07 — проверка outputs, документов и карты

Дата: 24 августа 2026  
Статус: реализован в кликабельном synthetic-прототипе.

| Задача | Проверяемый результат |
|---|---|
| T01–T05 | Versioned SVG-column отображает tracks, split scale, annotations, legend и template без изменения scientific data. |
| T06–T07 | SVG Blob скачивается; multi-page/crop/rotation export request создаёт artifact/job manifest после save. |
| T08 | Documents workspace поддерживает synthetic/local demo upload, version/state и archive. |
| T09 | GIS-like map показывает CRS/layers/measure и сохраняемый validated edit. |
| T10 | Managed views сохраняют filters/styles/layers без raw SQL. |

Все данные synthetic и живут в IndexedDB; reset возвращает seed.

```text
npm run typecheck — passed
npm run test      — 33 files, 83 tests passed
npm run build     — passed
```

Линтер: 0 errors, 3 прежних предупреждения вне E07.