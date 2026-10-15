import type { EdgeType, MapMode, NodeType } from './schema'

export const deliveryStatusLabels = {
  prototype: 'Рабочий прототип',
  partial: 'Реализовано частично',
  placeholder: 'Заглушка',
  deferred: 'Отложено',
  excluded: 'Исключено',
} as const

export const relationScopeLabels = {
  domain: 'Предметная связь',
  prototype: 'Внутри прототипа',
  proposal: 'Предложенная связь',
} as const

export const nodeLabels: Record<NodeType, string> = {
  domain: 'Область', process: 'Процесс', activity: 'Операция', entity: 'Объект',
  data: 'Данные', role: 'Специалист', module: 'Модуль', concept: 'Понятие',
}
export const edgeLabels: Record<EdgeType, string> = {
  contains: 'Включает', precedes: 'Предшествует', produces: 'Создаёт', uses: 'Использует',
  transforms: 'Преобразует', performed_by: 'Выполняется специалистом', supports: 'Поддерживается модулем', related_to: 'Связано',
}
export const modeLabels: Record<MapMode, { title: string; question: string; heading: string; subtitle: string }> = {
  processes: { title: 'Процессы', question: 'Что происходит и зачем?', heading: 'От породы к производству', subtitle: 'Исследуйте предприятие через процессы, объекты и их взаимосвязи.' },
  specialists: { title: 'Специалисты', question: 'Кто с кем работает?', heading: 'Люди, которые связывают систему', subtitle: 'Выберите специалиста: увидите его задачи, данные и передачу результатов.' },
  data: { title: 'Данные', question: 'От измерения к решению', heading: 'Как данные становятся решениями', subtitle: 'Проследите путь измерений, образцов, документов и расчётных результатов.' },
  modules: { title: 'Модули KAPGEO', question: 'Как помогает система?', heading: 'Цифровая поддержка предприятия', subtitle: 'Рабочие области, заглушки и ограничения. Предметная связь не означает автоматический обмен данными.' },
}
