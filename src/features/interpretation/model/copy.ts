/** Full messages and stable keys are kept together for subsequent RU/KZ/EN dictionaries. */
export const interpretationCopy = {
  modes: { lithology: 'Литология', technology: 'Технологические интервалы', core: 'Привязка керна' },
  kinds: { core: 'По керну · источник', log: 'По каротажу', composite: 'Сводная литология' },
  rocks: { sand: 'Песок', clay: 'Глина', silt: 'Алеврит', sandstone: 'Песчаник', limestone: 'Известняк', unknown: 'Нет данных' },
  technology: { permeable: 'Проницаемый', impermeable: 'Непроницаемый', unknown: 'Нет КС' },
  colors: { gray: 'Серый', brown: 'Бурый', yellow: 'Жёлтый', green: 'Зеленоватый', white: 'Светлый' },
  sampleKinds: { KP: 'КП', GS: 'ГС', LGH: 'ЛГХ', TP: 'ТП' },
  tools: { select: 'Выбрать', pan: 'Переместить вид', range: 'Новый интервал', boundary: 'Изменить контакт' },
  hints: { select: 'Нажмите на интервал или выберите строку в таблице. Свойства откроются справа.', pan: 'Перетаскивайте планшет по глубине. Колесо мыши изменяет масштаб.',
    range: 'Протяните диапазон по редактируемой колонке. Уточните глубины и свойства справа.', boundary: 'Перетащите границу интервала. Изменятся только два соседних интервала.' },
  standalone: 'Месторождение «Песчаный»',
  storageError: 'Не удалось сохранить результат. Проверьте доступ к хранилищу браузера.',
}
