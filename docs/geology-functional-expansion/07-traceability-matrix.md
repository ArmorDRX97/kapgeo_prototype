# Матрица трассировки: руководство → целевой продукт → реализация

## 1. Правила

Статусы:

- **Implemented demo** — проверяемое интерактивное поведение есть, production services нет;
- **Partial demo** — показана малая часть исходного процесса;
- **Planned** — описано в target specification/backlog, код отсутствует;
- **Platform replacement** — legacy-функция заменяется общей платформенной возможностью;
- **Not carried** — техническое ограничение не переносится.

Номера изображений `IMG-001…IMG-199` соответствуют порядку строк `screenshots/index.csv`. Figure 1.32 на странице 66 — отдельная векторная схема без raster IMG.

## 2. Программа «Скважина»

| Источник | Legacy capability | Целевое покрытие | Epic | Текущий статус |
|---|---|---|---|---|
| стр. 5–9, рис. 1.1, IMG-001 | главное окно, одна выбранная скважина, apply/cancel | GEO shell, object context, drafts/version/conflict | E01 | Platform replacement |
| стр. 9–10 | create/open Access/Oracle/MS SQL/PostgreSQL DB | admin data sources/integrations | E01/E12 | Not carried to subject UI |
| стр. 10–12, рис. 1.2, IMG-002 | deposit CRUD, immutable ID, dependency delete | GEO-02 deposit registry/card | E02 | Planned |
| стр. 12 | condition limits | ConditionSet versions/approval/impact | E02 | Planned |
| стр. 12–14, рис. 1.3–1.4, IMG-003–004 | well registry/search/group/delete dependency | GEO-03/04 registry/map | E02 | Implemented demo, grouping/dependency partial |
| стр. 15–19, рис. 1.5–1.8, IMG-005–008 | passport: description/drilling/completion/geology | GEO-05/06 nested tabs | E02 | Partial demo; wellhead migrated to CRS-aware geometry foundation |
| стр. 15–17 | trajectory-derived bottom/depth/fallback | trajectory service and impact | E03 | Implemented in synthetic prototype |
| стр. 19–20, рис. 1.9, IMG-009 | source/interpreted core runs | well core run workspace | E03 | Partial demo |
| стр. 21–23, рис. 1.10, IMG-010 | all log types, run registry, table operations | GEO-12/14 arbitrary curves | E05 | Implemented synthetic versioned LogRun/viewer; core GR/SP/RES fixture scope |
| стр. 23–25, рис. 1.11, IMG-011 | formula recalculation | typed curve transform job | E05 | Implemented synthetic derived-curve preview with lineage |
| стр. 25–27, рис. 1.12, IMG-012 | import formats/encoding/multi-curve/replace | production import framework | E05 | Implemented synthetic LAS/DAT fixture parser/mapping/QC; production parsing excluded |
| стр. 27–30, рис. 1.13, IMG-013 | merge curves, corrections/ranges/priority | curve merge feature | E05 | Implemented synthetic merge preview with priority formula |
| стр. 30–34, рис. 1.14–1.15, IMG-014–015 | inclinometry, calculation, import/export | trajectory registry/workbench | E03 | Implemented in synthetic prototype |
| стр. 34–39, рис. 1.16–1.17, IMG-016–017 | three lithologies, minerals/colors, description overrides | core/log/composite tracks + annotations | E04 | Implemented in synthetic prototype |
| стр. 39–42, рис. 1.18, IMG-018 | core measurement/rebin | core measurement workspace | E03 | Planned |
| стр. 42–44, рис. 1.19, IMG-019 | stratigraphy CRUD/copy/shift | separate stratigraphy track | E04 | Implemented in synthetic prototype |
| стр. 44–46, рис. 1.20, IMG-020 | permeable intervals | technology interval track | E06 | Planned |
| стр. 46–47, рис. 1.21, IMG-021 | filtration properties | filtration track | E06 | Planned |
| стр. 47–52, рис. 1.23–1.24, IMG-022–023 | direct ore intervals/composites | ore workbench | E06 | Planned |
| стр. 52–59, рис. 1.25–1.26, IMG-024–025 | differential log and GammaZ matching | differential → ore → composite | E06 | Planned |
| стр. 59–63, рис. 1.27–1.29, IMG-026–028 | multi-interval core samples/parameters/results | sample v2 and lab workflow | E04 | Implemented in synthetic prototype |
| стр. 63–65, рис. 1.30–1.31, IMG-029–030 | granulometry/histogram/d60/d10 | granulometry workspace | E04 | Implemented in synthetic prototype |
| стр. 65–66 | lithogeochemical/technological samples | sample family support | E04 | Implemented in synthetic prototype |
| стр. 66–68, рис. 1.32–1.33, IMG-031 for 1.33 | typed well construction | construction editor | E02 | Partial demo |
| стр. 68–78, рис. 1.34–1.41, IMG-032–039 | passport/full-bore vector column and detailed curve layout | GEO-19/20 vector scene/layout | E07 | Partial demo templates |
| стр. 79–80, рис. 1.42, IMG-040 | split-view column window | split scientific view | E07 | Planned |
| стр. 80–87, рис. 1.43–1.47, IMG-041–045 | visual lithology interpreter, configurable columns | generalized depth workbench | E01/E04 | Implemented demo with shared interval policies/commands/diff/history; multi-track expansion planned |
| стр. 87–92, рис. 1.48–1.49, IMG-046–047 | manual/auto KS tech interpretation | tech interpretation preview/apply | E06 | Planned |
| стр. 92–107, рис. 1.50–1.58, IMG-048–056 | core interpreter and sample alignment | core depth mapping workspace | E03 | Planned |
| стр. 107 | Word/Excel reports | report jobs/templates | E07 | Placeholder only |
| стр. 108–110, рис. 1.57–1.58, IMG-057–058 | well documents | platform documents tab | E07 | Placeholder tab |
| стр. 110–117, рис. 1.59–1.63, IMG-059–063 | map/search/layers/well spatial edit | GEO-03/21 spatial workbench | E07 | Partial synthetic map; shared geometry contracts ready, real renderer/transform/edit planned |
| стр. 117–123, рис. 1.64–1.67, IMG-064–067 | multi-page print preview/window/full drawing | ReportPreview/export request | E07 | Planned |
| стр. 123–126, рис. 1.68–1.70, IMG-068–070 | generated legend/global settings | legend templates/user preferences | E07/E12 | Planned |
| стр. 127–129 | downstream section/reserve invalidation and transfer | dependency graph/stale events | E01/E12 | Implemented demo for passport → section/model/column; expansion to remaining aggregates planned |

## 3. «Геотехнологический разрез»

| Источник | Legacy capability | Целевое покрытие | Epic | Текущий статус |
|---|---|---|---|---|
| стр. 130–136, рис. 2.1–2.3, IMG-071–073 | section registry/grouping/delete dependency | GEO-22 SectionProject registry | E08 | Planned; one fixed route exists |
| стр. 136–138, рис. 2.4–2.5, IMG-074–075 | section metadata/elevation/profile segments | section metadata and route | E08 | Partial demo metadata only |
| стр. 138–142, рис. 2.6–2.7, IMG-076–077 | least-squares route fit/well list | GEO-23 route editor | E08 | Planned |
| стр. 142–145, рис. 2.8, IMG-078 | map route/well/corridor editor | GEO-23 spatial route editor | E08 | Planned |
| стр. 145–151, рис. 2.9–2.12, IMG-079–082 | section scene and well tracks/settings | SectionWorkbench | E08 | Partial hard-coded correlation |
| стр. 151–157, рис. 2.13–2.14, IMG-083–084 | connect tech intervals, pinch-out, helper intervals, smoothing/repair | GEO-24 connectivity editor | E08 | Planned |
| стр. 157–161, рис. 2.15–2.16, IMG-085–086 | rhythm packages/foundation | GEO-24 boundaries | E08 | Planned |
| стр. 161–167, рис. 2.17, IMG-087 | ore body contour | GEO-25 ore editor | E08 | Planned |
| стр. 167–168 | tech off-balance and no-correction bodies | GEO-25 body types | E08 | Planned |
| стр. 168–170, рис. 2.18, IMG-088 | oxidation multi-polylines | GEO-25 oxidation editor | E08 | Planned |
| стр. 171–177, рис. 2.19–2.22, IMG-089–092 | drawing plan/section/tables/stamp/variants | Section drawing composer | E08 | Planned |
| стр. 177–186, рис. 2.23–2.27, IMG-093–096 | vector export/print/multi-page preview | report/export platform | E07/E08 | Planned |
| стр. 187 | section → reserve intersections/blocks | exact version handoff | E08/E09 | Planned |

## 4. «Запасы»

| Источник | Legacy capability | Целевое покрытие | Epic | Текущий статус |
|---|---|---|---|---|
| стр. 188–192, рис. 3.1–3.2, IMG-097–098 | stage-specific reserve workflow | GEO-27 ReserveProject | E09 | Partial single-page demo |
| стр. 192–197, рис. 3.3–3.5, IMG-099–101 | profile selection on section/map | intersection source selector | E09 | Planned |
| стр. 197–199, рис. 3.6, IMG-102 | ore package CRUD/order/color | GEO-02/27 ore packages | E02/E09 | Planned |
| стр. 199–203, рис. 3.7–3.10, IMG-103–106 | profile display tracks/scales | intersection workbench view | E09 | Planned |
| стр. 203–210, рис. 3.11–3.12, IMG-107–108 | ore intersections/effective thickness | GEO-27/28 intersection editor | E09 | Planned |
| стр. 210–214, рис. 3.13–3.15, IMG-109–111 | block plan/workbench | GEO-29 spatial editor | E09 | Planned |
| стр. 215–218, рис. 3.16–3.18, IMG-112–114 | block properties, included/network wells, snap | GEO-29 block inspector | E09 | Planned |
| стр. 218–221, рис. 3.19–3.20, IMG-115–116 | method registry and block projection | calculation plugin/run | E09 | Simplified arithmetic demo only |
| стр. 221–222, рис. 3.21, IMG-117 | Voronoi method | Voronoi plugin | E09 | Planned |
| стр. 223–224, рис. 3.22, IMG-118 | ore interval registry method | interval-registry plugin | E09 | Planned |
| стр. 225–226, рис. 3.23, IMG-119 | geostatistical model method | field-integration plugin | E09/E10 | Planned |
| стр. 226–229, рис. 3.24–3.25, IMG-120–121 | technological polygon/cells/opened reserves | technological polygon workflow | E09 | Planned |
| стр. 230–241, рис. 3.26–3.34, IMG-122–130 | reserve plan registry/editor/layers/isolines/cells | GEO-31/33 plan composer | E09 | Planned |
| стр. 241–248, рис. 3.35–3.38, IMG-131–134 | multi-page preview/print | ReportPreview | E07/E09 | Planned |
| стр. 248–250, рис. 3.39–3.40, IMG-135–136 | tolerances/condition limits | ConditionSet + user prefs | E02/E09 | Planned |
| стр. 250–251 | prerequisites and handoff | dependency/preflight contract | E01/E09 | Planned |
| стр. 252–263 | formulas for 4 methods | versioned calculation specs + golden tests | E00/E09 | Planned; requires manual verification |

## 5. «2D геологическое моделирование»

| Источник | Legacy capability | Целевое покрытие | Epic | Текущий статус |
|---|---|---|---|---|
| стр. 264–269, рис. 1.1–1.3, IMG-137–139 | model registry/metadata/process | GEO entry → MOD project template | E10 | Modeling shell demo exists |
| стр. 269–276, рис. 1.4–1.7, IMG-140–143 | data/grid domain, nested regions, axis/faults | MOD-05 domain editor | E10 | Planned |
| стр. 276–278, рис. 1.8–1.10, IMG-144–146 | triangular mesh/settings/Voronoi | MOD-05 mesh | E10 | Placeholder/demo summary |
| стр. 278–280, рис. 1.11–1.12, IMG-147–148 | variable selection/workflow | geological model project variable | E10 | Planned |
| стр. 280–283, рис. 1.13–1.15, IMG-149–151 | source points/histogram/validation | MOD-06/07 source analysis | E10 | Planned |
| стр. 283–293, рис. 1.16–1.23, IMG-152–159 | variogram cloud/model/cross-validation | MOD-07 variography | E10 | Planned |
| стр. 293–296, рис. 1.24–1.26, IMG-160–162 | interpolation methods/search/field run | MOD-07 scientific job | E10 | Synthetic run only |
| стр. 297–301, рис. 1.27–1.30, IMG-163–166 | geological environment/ore contours/reserves | accepted field + GEO contour/handoff | E10 | Planned |
| стр. 301–303, рис. 1.31–1.32, IMG-167–168 | plan/volume visualization | MOD result views | E10 | Partial general model demo |
| стр. 304–307, рис. 1.33, IMG-169 | map/edit/export | shared spatial workbench | E07/E10 | Partial map only |
| стр. 308 | field → reserve calculation handoff | accepted field version reference | E09/E10 | Planned |

## 6. «3D геологическое моделирование»

| Источник | Legacy capability | Целевое покрытие | Epic | Текущий статус |
|---|---|---|---|---|
| стр. 309–313, рис. 1.1–1.3, IMG-170–172 | 3D model project/process | geological 3D project template | E11 | General modeling shell only |
| стр. 313–318, рис. 1.4–1.7, IMG-173–176 | plan data/grid domains | MOD-05 domain editor | E11 | Planned |
| стр. 318–321, рис. 1.8–1.11, IMG-177–180 | horizons, well picks, roof/thickness | horizon/surface workspace | E11 | Planned |
| стр. 321–327, рис. 1.12–1.17, IMG-181–186 | plan and prismatic volume mesh/inspector | 3D mesh and inspector | E11 | Planned |
| стр. 327–334, рис. 1.17–1.23, IMG-187–193 | horizon groups, variography, 3D field calculation | MOD-06/07 3D workflow | E11 | Planned |
| стр. 334–337, рис. 1.24–1.27, IMG-194–197 | DGM, plan slices, isosurfaces | DGM/result views | E11 | Planned |
| стр. 337–339, рис. 1.28–1.29, IMG-198–199 | 3D section planes and DXF | 3D profiler/export | E11 | Planned |

## 7. Canonical screen ID correction

Текущие page labels расходятся с `docs/ui-ux/04-screen-catalog.md`. При миграции использовать:

| Текущий demo route/label | Canonical coverage |
|---|---|
| `/geology/correlation`, ранее описан как GEO-20 | GEO-22 «Разрезы» + часть GEO-24 «Корреляция/горизонты» |
| `/geology/reserves`, ранее описан как GEO-21 | упрощённая часть GEO-27–30 |
| `/geology/delivery`, ранее описан как GEO-22 | GEO-34 «Публикация геологической версии» |
| GEO-32 duplicate в старом каталоге | GEO-32 остаётся approval запасов; publication переносится в GEO-34 |

## 8. Платформенные замены legacy-функций

| Legacy | Целевая замена | Причина |
|---|---|---|
| подключение к Access/DB пользователем | ADM integrations/data sources | security/central configuration |
| глобальный Apply/Cancel | draft/version/diff/conflict | collaboration/audit |
| локальный Office automation | background report/export jobs | browser/server independence |
| printer driver dialog | PDF page setup and artifact | deterministic output |
| raw SQL layer configuration | saved views/admin-managed datasets | security/supportability |
| copy/paste GammaZ | versioned import adapter | validation/provenance |
| manual reopen downstream editor | stale event and repair/rerun action | traceability |
| local file storage folder | object/document storage | access/version/retention |
| USB license dependency | deployment/license management outside subject UX | web architecture |

## 9. Правило обновления матрицы

При завершении задачи:

1. изменить только строки реально покрытого поведения;
2. добавить route/component/test evidence в implementation status или PR, не превращая эту матрицу в журнал файлов;
3. `Implemented demo` не заменять на «готово production», пока нет backend/compute/storage;
4. новую функцию руководства добавлять с page/figure/IMG reference;
5. любое исключение фиксировать в `08-open-questions-decisions.md` как decision, а не удалять строку.
