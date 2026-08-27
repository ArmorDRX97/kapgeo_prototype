import type { Well, WellBgdData } from '../../entities/well/model/types'

export const fullWellBgdData: WellBgdData = {
  name: 1010,
  depositId: 'DEP-SARYTAU',
  lensId: 'LENS-PR07',
  profileId: 'PR-07',
  geoBlockId: 'BLK-07-12',
  techBlockId: 'TC-07-12',
  statusChangedAt: '2026-08-10T10:15',
  statusHistory: [
    { status: 'На проверке', changedAt: '2026-06-10T08:30' },
    { status: 'Требует внимания', changedAt: '2026-07-01T14:20' },
    { status: 'Работает', changedAt: '2026-08-10T10:15' },
  ],
  descriptionRu: 'Разведочная скважина профиля PR-07, полностью документированная по результатам бурения, каротажа, освоения и геологического описания.',
  descriptionKk: 'PR-07 профиліндегі барлау ұңғымасы. Бұрғылау, каротаж, игеру және геологиялық сипаттама нәтижелері толық құжатталған.',
  descriptionEn: 'Exploration well on profile PR-07, fully documented with drilling, logging, development and geological results.',
  note: 'Эталонная полностью заполненная карточка для проверки всех разделов БГД.',
  geometry: {
    headX: 468146.8,
    headY: 4812856.4,
    headZ: 153.5,
    bottomX: 468158.321,
    bottomY: 4812872.852,
    bottomZ: -458.532,
    acceptedDepth: 612.4,
    bottomOffsetLength: 20.1,
    bottomOffsetAzimuth: 55,
  },
  passport: {
    documentStartDate: '2026-06-10T08:30',
    documentEndDate: '2026-08-10T09:45',
    date: '2026-08-10T10:00',
    author: 'Ирина Иванова',
    chiefGeologist: 'Марина Ли',
    chiefGeophysicist: 'Аскар Аскаров',
    drillingManager: 'Садык Нурланов',
    samplingPerformer: 'Ирина Иванова',
    interpretationPerformer: 'Аскар Аскаров',
    surveyor: 'Марина Ли',
  },
  drilling: {
    startedAt: '2026-06-10T08:30',
    completedAt: '2026-06-24T18:00',
    drillingType: 'Колонковое',
    foreman: 'Садык Нурланов',
    rigType: 'ЗИФ-1200',
    rigNumber: 6,
    company: 'АО «Волковгеология»',
    brigade: 'Бригада 2',
    designDepth: 610,
    drillLogDepth: 612.4,
    loggingDepth: 611.8,
    intervals: [
      { id: 'DRILL-1010-01', drillingDiameter: 295, depthFrom: 0, depthTo: 82, drillingTool: 'Трёхшарошечное долото', flushingAgent: 'Техническая вода' },
      { id: 'DRILL-1010-02', drillingDiameter: 215, depthFrom: 82, depthTo: 430, drillingTool: 'Алмазная коронка', flushingAgent: 'Полимерно-глинистый' },
      { id: 'DRILL-1010-03', drillingDiameter: 168, depthFrom: 430, depthTo: 612.4, drillingTool: 'PDC-долото', flushingAgent: 'Сульфанол' },
    ],
  },
  development: {
    flowRate: 18.4,
    specificFlowRate: 2.7,
    works: [
      {
        id: 'WORK-1010-01', workType: 'Эрлифтная прокачка', startedAt: '2026-06-25T08:00', completedAt: '2026-06-26T18:00', method: 'Эрлифт',
        descriptionRu: 'Прокачка до устойчивого осветления воды и стабилизации дебита.',
        descriptionKk: 'Су толық тазарғанға және дебит тұрақтанғанға дейін эрлифттік айдау орындалды.',
        descriptionEn: 'Airlift pumping continued until the water cleared and the flow rate stabilized.',
      },
      {
        id: 'WORK-1010-02', workType: 'Пневмоимпульсная обработка', startedAt: '2026-06-27T09:00', completedAt: '2026-06-27T16:30', method: 'Комбинированный',
        descriptionRu: 'Выполнена обработка фильтрового интервала с контрольным замером приёмистости.',
        descriptionKk: 'Сүзгі аралығы өңделіп, қабылдағыштықтың бақылау өлшемі жүргізілді.',
        descriptionEn: 'The screen interval was treated and followed by an injectivity control measurement.',
      },
      {
        id: 'WORK-1010-03', workType: 'Химреагентная обработка', startedAt: '2026-06-28T10:00', completedAt: '2026-06-29T15:00', method: 'Прокачка',
        descriptionRu: 'Удалены остаточные кольматирующие отложения, выполнена финальная прокачка.',
        descriptionKk: 'Қалдық колматант шөгінділері жойылып, соңғы айдау орындалды.',
        descriptionEn: 'Residual clogging deposits were removed and final pumping was completed.',
      },
    ],
  },
  geology: {
    permafrostDepth: 120,
    groundwaterLevel: 76.5,
    complications: 'Суффозия в интервале 312–318 м; локальная трещиноватость 438–446 м. Осложнения учтены в конструкции и режиме освоения.',
    impermeableIntervals: [
      { id: 'IMP-1010-01', depthFrom: 50, depthTo: 67 },
      { id: 'IMP-1010-02', depthFrom: 80, depthTo: 105 },
      { id: 'IMP-1010-03', depthFrom: 340, depthTo: 352 },
    ],
  },
}

const wellSeed: Well[] = [
  { id: 'WELL-1010-FULL', code: 'WELL-1010', type: 'Разведочная', purpose: 'Разведочная', profile: 'PR-07', crs: 'EPSG:32642', casingDiameter: 168, status: 'Работает', quality: 'Высокое', site: 'Северный', block: 'BLK-07-12', cell: 'TC-07-12-03', depth: 612.4, coordinates: { x: 468_146.8, y: 4_812_856.4 }, mapPosition: { x: 41, y: 42 }, updatedAt: 'Сегодня, 10:15', completeness: 100, activeTask: 'Все обязательные данные заполнены', aiConflicts: 0, version: 12, bgd: fullWellBgdData },
  { id: 'WELL-1042', code: 'WELL-1042', type: 'Откачная', purpose: 'Эксплуатационная', profile: 'PR-07', crs: 'EPSG:32642', casingDiameter: 168, status: 'Требует внимания', quality: 'Среднее', site: 'Северный', block: 'BLK-07-12', cell: 'TC-07-12-04', depth: 612.4, coordinates: { x: 468_214.3, y: 4_812_905.8 }, mapPosition: { x: 46, y: 38 }, updatedAt: 'Сегодня, 09:42', completeness: 94, activeTask: 'Разрешить расхождение интерпретации', aiConflicts: 1 },
  { id: 'WELL-1038', code: 'WELL-1038', type: 'Закачная', purpose: 'Эксплуатационная', profile: 'PR-07', crs: 'EPSG:32642', casingDiameter: 168, status: 'Работает', quality: 'Высокое', site: 'Северный', block: 'BLK-07-12', cell: 'TC-07-12-04', depth: 598.1, coordinates: { x: 468_089.7, y: 4_812_814.2 }, mapPosition: { x: 35, y: 47 }, updatedAt: 'Сегодня, 09:31', completeness: 100, aiConflicts: 0 },
  { id: 'WELL-1046', code: 'WELL-1046', type: 'Наблюдательная', purpose: 'Наблюдательная', profile: 'PR-07', crs: 'EPSG:32642', casingDiameter: 146, status: 'На проверке', quality: 'Высокое', site: 'Северный', block: 'BLK-07-12', cell: 'TC-07-12-05', depth: 624.9, coordinates: { x: 468_332.1, y: 4_812_998.4 }, mapPosition: { x: 57, y: 30 }, updatedAt: 'Вчера, 18:05', completeness: 87, activeTask: 'Проверить новый набор ГИС', aiConflicts: 0 },
  { id: 'WELL-1027', code: 'WELL-1027', type: 'Откачная', purpose: 'Эксплуатационная', profile: 'PR-07', crs: 'EPSG:32642', casingDiameter: 168, status: 'Работает', quality: 'Высокое', site: 'Северный', block: 'BLK-07-11', cell: 'TC-07-11-02', depth: 583.5, coordinates: { x: 467_921.2, y: 4_812_644.7 }, mapPosition: { x: 22, y: 64 }, updatedAt: 'Сегодня, 08:57', completeness: 98, aiConflicts: 0 },
  { id: 'WELL-1051', code: 'WELL-1051', type: 'Закачная', purpose: 'Эксплуатационная', profile: 'PR-07', crs: 'EPSG:32642', casingDiameter: 168, status: 'Отключена', quality: 'Есть проблемы', site: 'Северный', block: 'BLK-07-13', cell: 'TC-07-13-01', depth: 606.8, coordinates: { x: 468_478.5, y: 4_813_104.1 }, mapPosition: { x: 70, y: 22 }, updatedAt: '2 дня назад', completeness: 71, activeTask: 'Уточнить конструкцию', aiConflicts: 2 },
  { id: 'WELL-1019', code: 'WELL-1019', type: 'Разведочная', purpose: 'Разведочная', profile: 'PR-06', crs: 'EPSG:32642', casingDiameter: 127, status: 'На проверке', quality: 'Среднее', site: 'Центральный', block: 'BLK-06-08', cell: '—', depth: 655.2, coordinates: { x: 467_744.9, y: 4_812_510.3 }, mapPosition: { x: 14, y: 78 }, updatedAt: '3 дня назад', completeness: 82, activeTask: 'Дополнить литологию', aiConflicts: 0 },
  { id: 'WELL-1054', code: 'WELL-1054', type: 'Откачная', purpose: 'Эксплуатационная', profile: 'PR-07', crs: 'EPSG:32642', casingDiameter: 168, status: 'Работает', quality: 'Высокое', site: 'Северный', block: 'BLK-07-13', cell: 'TC-07-13-02', depth: 601.3, coordinates: { x: 468_521.7, y: 4_812_948.5 }, mapPosition: { x: 78, y: 42 }, updatedAt: 'Сегодня, 07:52', completeness: 99, aiConflicts: 0 },
  { id: 'WELL-1057', code: 'WELL-1057', type: 'Закачная', purpose: 'Эксплуатационная', profile: 'PR-07', crs: 'EPSG:32642', casingDiameter: 168, status: 'Работает', quality: 'Высокое', site: 'Северный', block: 'BLK-07-13', cell: 'TC-07-13-02', depth: 596.7, coordinates: { x: 468_611.4, y: 4_812_861.2 }, mapPosition: { x: 84, y: 57 }, updatedAt: 'Сегодня, 07:41', completeness: 97, aiConflicts: 0 },
  { id: 'WELL-1060', code: 'WELL-1060', type: 'Наблюдательная', purpose: 'Наблюдательная', profile: 'PR-07', crs: 'EPSG:32642', casingDiameter: 146, status: 'Требует внимания', quality: 'Среднее', site: 'Северный', block: 'BLK-07-14', cell: 'TC-07-14-01', depth: 619.6, coordinates: { x: 468_702.9, y: 4_813_018.4 }, mapPosition: { x: 89, y: 28 }, updatedAt: 'Вчера, 16:10', completeness: 76, activeTask: 'Проверить координаты устья', aiConflicts: 0 },
  { id: 'WELL-1014', code: 'WELL-1014', type: 'Разведочная', purpose: 'Разведочная', profile: 'PR-06', crs: 'EPSG:32642', casingDiameter: 127, status: 'Отключена', quality: 'Есть проблемы', site: 'Центральный', block: 'BLK-06-07', cell: '—', depth: 681.1, coordinates: { x: 467_588.1, y: 4_812_391.6 }, mapPosition: { x: 8, y: 88 }, updatedAt: '5 дней назад', completeness: 63, activeTask: 'Устранить разрывы интервалов', aiConflicts: 0 },
]

export function getSeedWells(): Well[] {
  return structuredClone(wellSeed)
}

export const wells: Well[] = getSeedWells()

export const primaryWell = wells[0]!
