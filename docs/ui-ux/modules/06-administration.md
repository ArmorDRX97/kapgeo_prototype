# Администрирование

## 1. Цель

Предоставить безопасный UI управления пользователями, ролями, организационными областями, справочниками, нормативами, шаблонами, интеграциями, плановыми процессами, аудитом, компонентами среды и жизненным циклом AI-моделей.

Административный интерфейс не должен превращаться в прямой редактор production БД или секретов.

## 2. Роли

- **R13 Администратор системы:** users, roles, scopes, dictionaries, integrations, schedules, audit, monitoring.
- **R14 Администратор AI-моделей:** models, versions, datasets metadata, metrics, publish/rollback в установленной области.
- профильные владельцы: review/publish отдельных справочников/нормативов;
- security auditor — **OPEN:** отдельная роль или permission read/export audit.

Разделы видны только по permission. R13 не получает автоматическое предметное право утверждать геологию/режим/модельный результат.

## 3. Обзор состояния

Показывает action-oriented группы:

- запросы доступа и истекающие scopes;
- заблокированные/неактивные учётные записи;
- ошибки интеграций и очередь;
- failed/stuck jobs;
- неопубликованные/конфликтные справочники;
- состояние компонентов;
- события безопасности;
- AI versions, ожидающие review/rollback attention.

Техническая метрика без порога/действия не выводится как KPI.

## 4. Пользователи и доступ

### Реестр пользователей

Фильтры: статус, IdP/source, роль, scope, дата последнего входа, lock, MFA, срок доступа. Данные минимизированы; персональные поля показываются только разрешённым администраторам.

### Карточка

- identity и source directory;
- статус/MFA/lock;
- роли;
- scopes и срок действия;
- effective permissions summary;
- активные сессии;
- access requests;
- audit timeline.

Операции: activate/deactivate, unlock, invalidate sessions, assign/revoke time-bound role/scope, approve request. Смена identity атрибутов, управляемых AD, выполняется в источнике, а UI объясняет это.

### Запрос доступа

Очередь показывает requester, requested role/scope/duration, reason, manager/owner, conflicts и current access. Решения: approve as requested, approve modified, request info, reject. Обязательны reason и audit.

## 5. Роли и permissions

### Матрица

Строки: resources/actions; колонки: roles или levels. Filters по module/resource. Изменение создаёт draft role version.

### Effective access preview

Администратор выбирает user + context + object status + date и видит:

- allowed/denied;
- какая роль дала право;
- какая scope/status policy ограничила;
- срок;
- simulated navigation/actions.

Preview не даёт выполнить действие от имени пользователя.

### Контроли

- separation of duties conflicts;
- запрещённое self-escalation;
- review для sensitive roles;
- time-bound elevation;
- impact count перед публикацией;
- rollback role version.

Точный SoD policy — OPEN.

## 6. Организационные области

Tree/editor организации, предприятия, месторождения, участка и блока. Операции реорганизации показывают:

- affected users/objects/tasks/integrations;
- изменение наследования;
- effective date;
- history;
- запрет удаления используемого узла.

Scope grants ссылаются на стабильный ID, а не display name.

## 7. Справочники и классификаторы

### Каталог

Группировка по модулю, owner, status, current version, effective date и usage. Видны source и синхронизация.

### Редактор версии

- add/edit/deactivate;
- code, localized labels, definition;
- validity dates;
- parent/hierarchy;
- mapping external codes;
- duplicate/reference validation;
- diff;
- impact preview;
- review/scheduled publish/rollback.

Используемое значение не удаляется. Deactivation требует replacement или объяснение допустимого исторического использования.

## 8. Нормативы и расчётные параметры

Отличаются от простого справочника наличием quantity, unit, applicability, valid interval, formula/method source и approval. UI показывает, какие alerts/calculations/reports используют версию.

Публикация нового норматива не пересчитывает историю молча. Пользователь выбирает effective date, а зависимые drafts получают актуальную версию.

## 9. Шаблоны

Типы:

- формы;
- geological column/log tracks;
- карты/legend;
- отчёты;
- импорт mapping;
- export presets;
- уведомления.

Template version имеет preview, owner, locale coverage, compatibility и consumer list. Изменение template не меняет уже сформированный approved report.

## 10. Интеграции

### Каталог

Система, направление, тип данных, owner, environment, last success, lag, status, queue/errors. Secrets скрыты; доступны только признаки configured/expired.

### Карточка

- назначение и owner;
- endpoints как безопасные aliases;
- mapping/schema version;
- расписание/event mode;
- last runs и metrics;
- error queue;
- object links;
- configuration history;
- pause/resume/test/retry по праву.

### Error inspector

Показывает request/message ID, time, stage, category, safe metadata, affected object, retryable, attempts и human action. Payload маскируется. Retry одного/пакета показывает scope и требует idempotency key.

## 11. Планировщик и фоновые процессы

Schedule: process type, scope, timezone, cadence, dependencies, owner, active period, concurrency policy и notifications. Перед сохранением preview следующих запусков.

Job monitor различает business job и infrastructure component. Actions: cancel/retry только когда допустимо, open log, download diagnostic, notify owner. Ручной запуск использует тот же audit и права.

## 12. Общесистемный аудит

Фильтры: time, user/service, action, module, object, scope, result, request ID, source IP metadata по policy. Event содержит before/after diff или ссылку, reason, session/request/correlation IDs.

Требования:

- immutable read view;
- sensitive values masked;
- export требует permission и причины;
- timezone видна;
- переход к существующему/архивному object;
- сохранённые searches;
- retention notice.

UI не обещает полноту security SIEM, если это отдельная система.

## 13. Мониторинг, backup и среда

### Мониторинг

Компоненты, status, dependencies, latency/error, queue lag, last change и link to runbook. Для business user деградация переводится в понятный banner; технический экран доступен R13.

### Backup/restore

В прототипе: каталог заданий, status, scope, started/completed, verification, retention и guarded restore wizard. Реальный запуск restore — P2 и требует отдельного подтверждения/двойного контроля.

### Settings

- environment label;
- default locale/timezone/units policy;
- support links;
- feature flags с owner/expiry;
- maintenance banners;
- public metadata.

Secrets и raw config values не редактируются общим key-value UI.

## 14. Управление AI-моделями

### Каталог

Model family, task/domain, current version, status, owner, last evaluation, deployed scopes и warnings.

### Карточка версии

- назначение и ограничения;
- artifact/version identifiers;
- training/evaluation dataset metadata и lineage;
- metrics by approved slices;
- thresholds;
- compare with current;
- drift/quality events;
- consumers/runs;
- change log/model card;
- approvals.

Не показывать обучающие данные, если нет отдельного права. UI сообщает размер/период/качество/lineage metadata.

### Lifecycle

`Draft → Evaluating → Review → Approved → Scheduled/Published → Monitoring → Deprecated/Rolled back`

R14 не подтверждает предметный результат отдельной скважины. Publish preview показывает affected workflows/scopes, compatibility и rollback target. Rollback создаёт новую deployment event, не стирая историю.

### Feedback

Решения manual/AI/resolved агрегируются в metrics только по утверждённой политике. Admin видит distribution и errors без раскрытия недоступных предметных объектов.

## 15. Состояния безопасности

- session expired;
- role/scope expired;
- account locked/deactivated;
- SSO directory delayed;
- MFA not enrolled/failed;
- forbidden self-change;
- permission version conflict;
- sensitive export pending approval;
- break-glass — только если подтверждён policy.

## 16. Demo-срез

1. пользователь запрашивает R11 для участка на 30 дней;
2. R13 меняет scope на меньший и одобряет;
3. effective access preview показывает разрешённый маршрут и запрет соседнего участка;
4. integration SCN-13 содержит одно retryable и одно non-retryable сообщение;
5. retry создаёт success без duplicate;
6. новая версия норматива проходит impact preview и scheduled publish;
7. R14 сравнивает AI versions, публикует candidate на demo-scope и выполняет rollback;
8. audit связывает все действия.

## 17. Acceptance

- user role/scope/time дают объяснимое effective право;
- публичной self-registration нет без решения OQ-04;
- sensitive action требует reason и audit;
- directory-owned поле нельзя редактировать локально;
- dictionary version не ломает историю;
- integration payload/secrets замаскированы;
- retry не создаёт duplicate;
- schedule учитывает timezone;
- audit фильтруется и не изменяется;
- AI publish/rollback traceable, а domain approval отделён;
- system admin не получает скрытой предметной власти.
