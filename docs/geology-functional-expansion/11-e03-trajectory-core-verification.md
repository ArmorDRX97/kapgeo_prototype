# GEOX-E03 — проверка траектории, бурения и керна

Дата: 24 августа 2026  
Статус: реализован в кликабельном synthetic-прототипе.

## Граница

Это browser-only demonstration flow, не инженерный расчёт и не производственный импорт. Все результаты детерминированно synthetic, хранятся в IndexedDB `kapgeo-demo`, переживают reload и полностью возвращаются к seed после глобального reset.

## Покрытие задач

| Задача | Реализованное поведение |
|---|---|
| T01 | В `?tab=drilling` есть несколько versioned surveys, metadata и выбор active survey. |
| T02 | Fixture import сначала показывает mapping MD/INC/AZI, preview, replace diff и подтверждение; после apply появляется candidate survey и import-protocol artifact. |
| T03 | Выбор survey создаёт deterministic mean-angle либо vertical-fallback trajectory result, synthetic job, version и artifact. |
| T04 | Таблица траектории показывает MD/TVD/N/E и bottom inspector; сохраняется view preference, CSV скачивается как browser artifact. |
| T05 | Core runs содержат drilling/interpreted ranges, recovered и explicit `no-core`. |
| T06 | Source/composite bins хранят range, size/count и missing semantics. |
| T07 | Core boxes связаны с рейсом, barcode, storage и synthetic photo label. |
| T08 | Core depth draft поддерживает reorder/reverse, stretch, no-core, split, merge, restore и undo/redo перед save. |
| T09 | При сохранении создаются preview relations core → lithology и core → samples; связанные upstream records не перезаписываются. |
| T10 | Validation report выявляет invalid range, overlap, impossible recovery, no-core и extrapolation; errors блокируют сохранение/publish scenario. |

## Сохраняемые evidence

Используются IndexedDB stores `records`, `versions`, `relations`, `auditEvents`, `jobs`, `artifacts`, `preferences`.

Каждый trajectory write добавляет version и audit event. Synthetic job имеет status `succeeded`; artifact — `trajectory-csv` либо `import-protocol`. Reset удаляет любые local fixtures и drafts.

## Проверки

```text
npm run typecheck — passed
npm run test      — 29 files, 74 tests passed
npm run build     — passed
npm run lint      — 0 errors; 3 pre-existing React Hook warnings
```

Repository tests подтверждают persistence импортированного survey, смену active bottom, job/artifact evidence и optimistic conflict для stale core draft. Визуальный browser smoke в текущей Windows sandbox среде недоступен; для последующего browser QA требуется ручной проход interactive сценария.

