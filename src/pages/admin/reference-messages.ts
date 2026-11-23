import type { ImportIssue } from '../../entities/reference-data/model/types'
import type { UiLocale } from '../../shared/lib/useUiLocale'

export const referenceText = (locale: UiLocale, ru: string, kk: string, en: string) => locale === 'kk' ? kk : locale === 'en' ? en : ru

const messages: Record<string, [kk: string, en: string]> = {
  'Значение с таким кодом уже есть в справочнике.': ['Анықтамалықта мұндай коды бар мән бұрыннан бар.', 'A value with this code already exists in the reference book.'],
  'Значение с таким наименованием уже есть в справочнике.': ['Анықтамалықта мұндай атауы бар мән бұрыннан бар.', 'A value with this name already exists in the reference book.'],
  'Значение изменено в другой вкладке. Обновите карточку и повторите изменение.': ['Мән басқа қойындыда өзгертілді. Карточканы жаңартып, әрекетті қайталаңыз.', 'The value was changed in another tab. Refresh the card and try again.'],
  'Структура справочника изменилась. Обновите форму.': ['Анықтамалықтың құрылымы өзгерді. Пішінді жаңартыңыз.', 'The reference book structure has changed. Refresh the form.'],
  'Код значения недоступен для изменения.': ['Мәннің кодын өзгерту мүмкін емес.', 'The value code cannot be changed.'],
  'Циклическая ссылка не допускается.': ['Циклдік сілтемеге жол берілмейді.', 'A cyclic reference is not allowed.'],
  'У значения есть действующие подчинённые значения.': ['Мәннің әрекеттегі бағынышты мәндері бар.', 'The value has active subordinate values.'],
  'У значения есть подчинённые значения.': ['Мәннің бағынышты мәндері бар.', 'The value has subordinate values.'],
  'Справочник с таким наименованием уже существует.': ['Мұндай атауы бар анықтамалық бұрыннан бар.', 'A reference book with this name already exists.'],
  'Цвет с таким кодом уже существует.': ['Мұндай коды бар түс бұрыннан бар.', 'A color with this code already exists.'],
  'Цвет используется. Удаление невозможно.': ['Түс пайдаланылады. Жою мүмкін емес.', 'The color is in use. It cannot be deleted.'],
  'Недостаточно прав для выполнения операции.': ['Әрекетті орындауға рұқсат жеткіліксіз.', 'You do not have permission to perform this action.'],
  'Заполните обязательное поле.': ['Міндетті өрісті толтырыңыз.', 'Fill in the required field.'],
  'Дата «Действует по» раньше даты «Действует с».': ['«Әрекет ету соңы» күні «Әрекет ету басы» күнінен ерте.', 'The “Valid to” date is earlier than the “Valid from” date.'],
}

export function referenceMessage(message: string, locale: UiLocale) {
  const match = messages[message]
  if (match) return referenceText(locale, message, ...match)
  const usage = message.match(/^Значение используется в данных \(записей: (\d+)\)/)
  if (usage) return referenceText(locale, message, `Мән деректерде пайдаланылады (жазбалар: ${usage[1]}) және жойылмайды. Оны әрекетсіз мәндерге ауыстырыңыз.`, `The value is used in data (${usage[1]} records) and cannot be deleted. Make it inactive instead.`)
  return message
}

const importMessages: Record<string, [kk: string, en: string]> = {
  NSI_IMP_BUSY: ['Анықтамалықтардың басқа пакеті жүктелуде. Кейінірек қайталаңыз.', 'Another package is being imported. Try again later.'],
  NSI_IMP_FILE_SIZE: ['Файл өлшемі 50 МБ-тан асады.', 'The file exceeds 50 MB.'],
  NSI_IMP_FILE_TYPE: ['XML, JSON, CSV файлын немесе CSV бар ZIP мұрағатын жүктеңіз.', 'Upload an XML, JSON or CSV file, or a ZIP archive containing CSV files.'],
  NSI_IMP_ENCODING: ['Файл UTF-8 кодтауында болуы керек.', 'The file must use UTF-8 encoding.'],
  NSI_IMP_FORMAT: ['Файл анықтамалықтармен алмасу пішіміне сәйкес келмейді.', 'The file does not match the reference exchange format.'],
  NSI_IMP_REFERENCE_NOT_FOUND: ['Пакеттегі анықтамалық жүйеде табылмады.', 'A reference book from the package was not found.'],
  NSI_IMP_LIMIT: ['Пакетте 100 000 мәннен артық бар.', 'The package contains more than 100,000 values.'],
  NSI_IMP_REQUIRED_COLUMN: ['Міндетті баған жоқ.', 'A required column is missing.'],
  NSI_IMP_UNKNOWN_COLUMN: ['Баған анықтамалықтың құрылымында қарастырылмаған.', 'The column is not part of the reference book structure.'],
  NSI_IMP_REQUIRED_FIELD: ['Міндетті өріс толтырылмаған.', 'A required field is empty.'],
  NSI_IMP_REQUIRED_ATTRIBUTE: ['Міндетті атрибут толтырылмаған.', 'A required attribute is empty.'],
  NSI_IMP_TYPE: ['Мән өрістің түріне сәйкес келмейді.', 'The value does not match the field type.'],
  NSI_IMP_CONSTRAINT: ['Өріс немесе атрибут мәні шектеуді бұзады.', 'A field or attribute violates its constraint.'],
  NSI_IMP_PERIOD: messages['Дата «Действует по» раньше даты «Действует с».']!,
  NSI_IMP_DUPLICATE_CODE: ['Код файлда қайталанады.', 'A code is repeated in the file.'],
  NSI_IMP_LINK_NOT_FOUND: ['Сілтемедегі мән табылмады.', 'The referenced value was not found.'],
  NSI_IMP_LINK_INACTIVE: ['Сілтемедегі мән әрекетсіз немесе жойылған.', 'The referenced value is inactive or deleted.'],
  NSI_IMP_COLOR_NOT_FOUND: ['Көрсетілген түс табылмады.', 'The specified color was not found.'],
  NSI_IMP_PARENT_CYCLE: ['Мәннің өзін немесе оның бағынышты мәнін ата-ана ретінде таңдауға болмайды.', 'The value or its descendant cannot be selected as its parent.'],
  NSI_IMP_SAVE_FAILED: ['Жүктеу тоқтатылды. Бірде-бір мән қосылмады.', 'The import stopped. No values were added.'],
}

export function referenceImportMessage(error: ImportIssue, locale: UiLocale) {
  const pair = importMessages[error.code]
  if (!pair || locale === 'ru') return referenceMessage(error.message, locale)
  const details = error.message.match(/«[^»]+»/g)?.join(' · ')
  return `${referenceText(locale, error.message, ...pair)}${details ? ` ${details}` : ''}`
}
