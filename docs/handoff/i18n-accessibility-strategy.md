# E14 — i18n и accessibility strategy

## Scope текущего demo

- RU — полный язык интерактивного demo и документации интерфейса.
- KZ/EN — не имитируются неполными переводами: до появления каталога интерфейс остаётся честно русскоязычным.
- Переключатели языка в профиле и accessibility lab служат для демонстрации настройки, но не заявляют наличие полного перевода.

## Production migration

1. Вынести все строки в typed message catalog (`ru`, `kk`, `en`).
2. Определить владельцев терминов для геологии, технологии, моделирования и РВР.
3. Добавить pseudo-localization, проверку длинных строк и fallback language.
4. Проверять локализованные P0 screens в visual regression.

## Accessibility baseline demo

- semantic labels, visible focus и skip-link;
- high contrast и reduced motion в `/help/accessibility`;
- keyboard-first controls на P0 actions;
- mobile применяется как read-only режим, пока не реализован field-mode РВР.

## Production verification

- screen-reader walkthrough, WCAG contrast audit и keyboard checklist;
- 1440/1280/1024/tablet/mobile matrix;
- доступные текстовые альтернативы для графиков, карт и треков.
