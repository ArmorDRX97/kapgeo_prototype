import type { UserPersona } from './types'

export const userPersonas: UserPersona[] = [
  { id: 'geo.ivanova', name: 'Ирина Иванова', initials: 'ИИ', position: 'Геолог', roles: ['R1'], scope: 'Сарытау · Северный', homeRoute: '/geology' },
  { id: 'gis.askarov', name: 'Аскар Аскаров', initials: 'АА', position: 'Геофизик-интерпретатор', roles: ['R2'], scope: 'Сарытау · Северный', homeRoute: '/geology' },
  { id: 'reserves.lee', name: 'Марина Ли', initials: 'МЛ', position: 'Инженер по запасам', roles: ['R3'], scope: 'Сарытау', homeRoute: '/geology' },
  { id: 'modeler.sadyk', name: 'Садык Нурланов', initials: 'СН', position: 'Геотехнолог-моделист', roles: ['R4'], scope: 'Сарытау · Северный', homeRoute: '/modeling' },
  { id: 'expert.romanova', name: 'Елена Романова', initials: 'ЕР', position: 'Гидрогеохимик', roles: ['R5'], scope: 'Сарытау · 2 участка', homeRoute: '/modeling' },
  { id: 'tech.kim', name: 'Алексей Ким', initials: 'АК', position: 'Технолог добычи', roles: ['R6'], scope: 'Сарытау · Северный', homeRoute: '/technology' },
  { id: 'dispatcher.nur', name: 'Айжан Нур', initials: 'АН', position: 'Диспетчер', roles: ['R7'], scope: 'Сарытау · Северный', homeRoute: '/technology' },
  { id: 'lab.aminova', name: 'Диана Аминова', initials: 'ДА', position: 'Лаборант', roles: ['R8'], scope: 'Лаборатория №1', homeRoute: '/technology' },
  { id: 'mechanic.petrov', name: 'Илья Петров', initials: 'ИП', position: 'Механик', roles: ['R9'], scope: 'Предприятие №1', homeRoute: '/technology' },
  { id: 'rvr.bek', name: 'Бекжан Сериков', initials: 'БС', position: 'Мастер РВР', roles: ['R10'], scope: 'Сарытау · Северный', homeRoute: '/technology' },
  { id: 'analyst.volkova', name: 'Ольга Волкова', initials: 'ОВ', position: 'Аналитик', roles: ['R11'], scope: 'Предприятие №1', homeRoute: '/analytics' },
  { id: 'manager.orlov', name: 'Сергей Орлов', initials: 'СО', position: 'Главный технолог', roles: ['R12'], scope: 'Предприятие №1', homeRoute: '/analytics' },
  { id: 'admin.system', name: 'Системный администратор', initials: 'СА', position: 'Администратор системы', roles: ['R13'], scope: 'Все организации', homeRoute: '/admin' },
  { id: 'admin.ai', name: 'Администратор AI', initials: 'AI', position: 'Администратор AI-моделей', roles: ['R14'], scope: 'AI KAPGEO', homeRoute: '/admin' },
]

export const defaultPersona = userPersonas.find((persona) => persona.id === 'gis.askarov') ?? userPersonas[0]!
