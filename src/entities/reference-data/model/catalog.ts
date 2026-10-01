import type { ReferenceDefinition } from './types'

const commonFields: ReferenceDefinition['fields'] = [
  { key: 'code', label: 'Код', type: 'text', required: true, maxLength: 32 },
  { key: 'name_ru', label: 'Наименование на русском', type: 'text', required: true, maxLength: 255 },
  { key: 'name_kk', label: 'Қазақ тіліндегі атауы', type: 'text', required: true, maxLength: 255 },
  { key: 'name_en', label: 'Name in English', type: 'text', required: true, maxLength: 255 },
]

// Fixed schemas from UC.KAPGEO.ADM.04 and the supplied reff table. ID and status are record metadata.
export const referenceDefinitions: ReferenceDefinition[] = [
  ...[["deposit_type","Типы месторождений"],["deposits_lodes_type","Типы залежей"],["well_core_type_id","Типы керна"],["column_materials","Материалы колонн"],["fault_type","Типы неисправностей"],["repair_work_type","Виды ремонтных работ"],["well_status","Состояния скважин"],["drilling_fluid_method","Способы подачи бурового раствора"],["waterproofing_type","Типы гидроизоляции"],["gis_type","Типы ГИС"],["destroy_type","Типы разрушения"],["well_column_type","Типы колонн"],["litology_type","Типы литологии"],["laboratory","Лаборатории"],["reserve_stage","Стадии запасов"],["line_zone_type","Типы зон профиля"],["interpolation_method","Методы интерполяции"],["reserve_method","Методы подсчёта запасов"],["development_method","Методы освоения"],["drilling_type","Типы бурения"],["rig_type","Типы буровых установок"],["drilling_tool","Буровые инструменты"],["flushing_agent","Промывочные агенты"],["section_kind","Виды разрезов"],["usage_kind","Виды использования"]].map(([id, label]) => ({ id: id!, label: label!, kind: 'ordinary' as const, fields: commonFields })),
  ...[
  {
    "fields": [
      {
        "key": "name_ru",
        "label": "Название цвета на русском",
        "type": "text",
        "required": true,
        "maxLength": 255
      },
      {
        "key": "name_kk",
        "label": "Название цвета на казахском",
        "type": "text",
        "required": true,
        "maxLength": 255
      },
      {
        "key": "name_en",
        "label": "Название цвета на английском",
        "type": "text",
        "required": true,
        "maxLength": 255
      }
    ],
    "id": "reff_colour",
    "label": "Справочник цветов",
    "kind": "reff"
  },
  {
    "fields": [
      {
        "key": "coefficient",
        "label": "Коэффициент",
        "type": "number"
      },
      {
        "key": "name_ru",
        "label": "Название каротажа на русском",
        "type": "text",
        "required": true,
        "maxLength": 255
      },
      {
        "key": "name_kk",
        "label": "Название каротажа на казахском",
        "type": "text",
        "required": true,
        "maxLength": 255
      },
      {
        "key": "name_en",
        "label": "Название каротажа на английском",
        "type": "text",
        "required": true,
        "maxLength": 255
      },
      {
        "key": "quantity_id",
        "label": "Единица измерения",
        "type": "reference",
        "reference": "reff_quantity"
      }
    ],
    "id": "reff_well_logg_method",
    "label": "Справочник методов каротажа",
    "kind": "reff"
  },
  {
    "fields": [
      {
        "key": "code",
        "label": "Код",
        "type": "text",
        "required": true,
        "maxLength": 32
      },
      {
        "key": "name_ru",
        "label": "Название на русском",
        "type": "text",
        "required": true,
        "maxLength": 255
      },
      {
        "key": "name_kk",
        "label": "Название на казахском",
        "type": "text",
        "required": true,
        "maxLength": 255
      },
      {
        "key": "name_en",
        "label": "Название на английском",
        "type": "text",
        "required": true,
        "maxLength": 255
      },
      {
        "key": "unit",
        "label": "Размерность",
        "type": "text",
        "maxLength": 16
      },
      {
        "key": "si_plus",
        "label": "сдвиг для пересчета в СИ \"Значение в СИ\" = (\"значение\" + si_plus)*si_coef",
        "type": "number"
      },
      {
        "key": "si_coef",
        "label": "Коэффициент пересчёта в СИ",
        "type": "number"
      },
      {
        "key": "si",
        "label": "идент. соотв-щей СИ величины",
        "type": "reference",
        "reference": "reff_quantity"
      }
    ],
    "id": "reff_quantity",
    "label": "Справочник физических величин",
    "kind": "reff"
  },
  {
    "fields": [
      {
        "key": "name_ru",
        "label": "Название на русском",
        "type": "text",
        "required": true,
        "maxLength": 255
      },
      {
        "key": "name_kk",
        "label": "Название на казахском",
        "type": "text",
        "required": true,
        "maxLength": 255
      },
      {
        "key": "name_en",
        "label": "Название на английском",
        "type": "text",
        "required": true,
        "maxLength": 255
      },
      {
        "key": "sname",
        "label": "Наименование краткое",
        "type": "text",
        "maxLength": 255
      },
      {
        "key": "colour_id",
        "label": "Цвет",
        "type": "reference",
        "reference": "reff_colour"
      },
      {
        "key": "colour2_id",
        "label": "Цвет",
        "type": "reference",
        "reference": "reff_colour"
      },
      {
        "key": "xcomment",
        "label": "Комментарий",
        "type": "textarea"
      }
    ],
    "id": "reff_well_modes",
    "label": "Справочник режимов скважины",
    "kind": "reff"
  },
  {
    "fields": [
      {
        "key": "name_ru",
        "label": "Название на русском",
        "type": "text",
        "required": true,
        "maxLength": 255
      },
      {
        "key": "name_kk",
        "label": "Название на казахском",
        "type": "text",
        "required": true,
        "maxLength": 255
      },
      {
        "key": "name_en",
        "label": "Название на английском",
        "type": "text",
        "required": true,
        "maxLength": 255
      },
      {
        "key": "param_name",
        "label": "Название 1 параметра",
        "type": "text",
        "maxLength": 255
      }
    ],
    "id": "reff_well_job_type",
    "label": "Справочник освоения скважин",
    "kind": "reff"
  },
  {
    "fields": [
      {
        "key": "name_ru",
        "label": "Название на русском",
        "type": "text",
        "required": true,
        "maxLength": 255
      },
      {
        "key": "name_kk",
        "label": "Название на казахском",
        "type": "text",
        "required": true,
        "maxLength": 255
      },
      {
        "key": "name_en",
        "label": "Название на английском",
        "type": "text",
        "required": true,
        "maxLength": 255
      },
      {
        "key": "symbol_file",
        "label": "Файл условного обозначения",
        "type": "text",
        "maxLength": 255
      },
      {
        "key": "color",
        "label": "Условный цвет",
        "type": "reference",
        "reference": "reff_colour"
      },
      {
        "key": "parent_id",
        "label": "Предок в структуре",
        "type": "reference",
        "reference": "reff_rock_type"
      }
    ],
    "id": "reff_rock_type",
    "label": "Справочник литотипов (пород)",
    "kind": "reff"
  },
  {
    "fields": [
      {
        "key": "name_ru",
        "label": "Название на русском",
        "type": "text",
        "required": true,
        "maxLength": 255
      },
      {
        "key": "name_kk",
        "label": "Название на казахском",
        "type": "text",
        "required": true,
        "maxLength": 255
      },
      {
        "key": "name_en",
        "label": "Название на английском",
        "type": "text",
        "required": true,
        "maxLength": 255
      },
      {
        "key": "symbol_file",
        "label": "Файл условного обозначения",
        "type": "text",
        "maxLength": 255
      },
      {
        "key": "colour_id",
        "label": "Условный цвет",
        "type": "reference",
        "reference": "reff_colour"
      },
      {
        "key": "apply_kind",
        "label": "Правило применения цвета",
        "type": "text",
        "maxLength": 32
      },
      {
        "key": "type",
        "label": "1 - выделять интервал на колонках, 2 - выделять интервал на колонках пунктиром",
        "type": "integer"
      },
      {
        "key": "parent_id",
        "label": "Предок в структуре",
        "type": "reference",
        "reference": "reff_mineralization"
      }
    ],
    "id": "reff_mineralization",
    "label": "Дополнительный признак породы",
    "kind": "reff"
  },
  {
    "fields": [
      {
        "key": "num",
        "label": "порядок в списке",
        "type": "integer"
      },
      {
        "key": "colortxt",
        "label": "текст в описание породы",
        "type": "text",
        "required": true,
        "maxLength": 64
      },
      {
        "key": "colour_id",
        "label": "цвет RGB, -1 цвет не определен (для каротажной), -2 нет цвета (нет керна, шлам)",
        "type": "reference",
        "reference": "reff_colour"
      },
      {
        "key": "comment",
        "label": "комментарий",
        "type": "textarea"
      }
    ],
    "id": "reff_lothology_colour",
    "label": "Цвет породы",
    "kind": "reff"
  },
  {
    "fields": [
      {
        "key": "chrono_name",
        "label": "Геохронологическое наименование",
        "type": "text",
        "required": true,
        "maxLength": 255
      },
      {
        "key": "strat_name",
        "label": "Стратиграфическое наименование",
        "type": "text",
        "required": true,
        "maxLength": 255
      }
    ],
    "id": "reff_stratum_type",
    "label": "Справочник стратиграфических подразделений",
    "kind": "reff"
  },
  {
    "fields": [
      {
        "key": "name_ru",
        "label": "Название на русском",
        "type": "text",
        "required": true,
        "maxLength": 255
      },
      {
        "key": "name_kk",
        "label": "Название на казахском",
        "type": "text",
        "required": true,
        "maxLength": 255
      },
      {
        "key": "name_en",
        "label": "Название на английском",
        "type": "text",
        "required": true,
        "maxLength": 255
      },
      {
        "key": "comment",
        "label": "краткое описание",
        "type": "textarea"
      },
      {
        "key": "picture",
        "label": "имя файла с изображением условного обозначения",
        "type": "text",
        "maxLength": 64
      },
      {
        "key": "spicture",
        "label": "имя файла с изображением условного обозначения",
        "type": "text",
        "maxLength": 64
      },
      {
        "key": "colour_id",
        "label": "Цвет",
        "type": "reference",
        "reference": "reff_colour"
      },
      {
        "key": "stratum_type_id",
        "label": "Подразделение",
        "type": "reference",
        "reference": "reff_stratum_type"
      },
      {
        "key": "parent_id",
        "label": "Предок в структуре",
        "type": "reference",
        "reference": "reff_stratum"
      }
    ],
    "id": "reff_stratum",
    "label": "Справочник стратонов",
    "kind": "reff"
  },
  {
    "fields": [
      {
        "key": "code",
        "label": "Код",
        "type": "text",
        "required": true,
        "maxLength": 32
      },
      {
        "key": "name_ru",
        "label": "Название на русском",
        "type": "text",
        "required": true,
        "maxLength": 255
      },
      {
        "key": "name_kk",
        "label": "Название на казахском",
        "type": "text",
        "required": true,
        "maxLength": 255
      },
      {
        "key": "name_en",
        "label": "Название на английском",
        "type": "text",
        "required": true,
        "maxLength": 255
      },
      {
        "key": "description",
        "label": "Описание",
        "type": "textarea"
      },
      {
        "key": "quantity_id",
        "label": "Физическая величина",
        "type": "reference",
        "reference": "reff_quantity"
      },
      {
        "key": "short_name",
        "label": "Аббревиатура",
        "type": "text",
        "maxLength": 255
      }
    ],
    "id": "reff_assay_quantity",
    "label": "Измеряемая величина пробы",
    "kind": "reff"
  },
  {
    "fields": [
      {
        "key": "name_ru",
        "label": "Название на русском",
        "type": "text",
        "required": true,
        "maxLength": 255
      },
      {
        "key": "name_kk",
        "label": "Название на казахском",
        "type": "text",
        "required": true,
        "maxLength": 255
      },
      {
        "key": "name_en",
        "label": "Название на английском",
        "type": "text",
        "required": true,
        "maxLength": 255
      },
      {
        "key": "short_name",
        "label": "Наименование (короткое)",
        "type": "text",
        "maxLength": 32
      },
      {
        "key": "data_type",
        "label": "тип данных, битовое поле: не задается: 1 - конечная глубина, 2 - внешний диаметр, 4 - внутренний диаметр",
        "type": "integer"
      },
      {
        "key": "comment",
        "label": "комментарий",
        "type": "textarea"
      }
    ],
    "id": "reff_well_construction_element_type",
    "label": "Справочник типов конструкционных сегментов",
    "kind": "reff"
  },
  {
    "fields": [
      {
        "key": "name_ru",
        "label": "Название на русском",
        "type": "text",
        "required": true,
        "maxLength": 255
      },
      {
        "key": "name_kk",
        "label": "Название на казахском",
        "type": "text",
        "required": true,
        "maxLength": 255
      },
      {
        "key": "name_en",
        "label": "Название на английском",
        "type": "text",
        "required": true,
        "maxLength": 255
      },
      {
        "key": "type",
        "label": "Тип: (type & 3) -> 0 - значение в узле, 1 - значене в центре ячейки, 2 - значение в ячейке",
        "type": "integer"
      },
      {
        "key": "ext",
        "label": "Размерность величины",
        "type": "text",
        "maxLength": 128
      },
      {
        "key": "query",
        "label": "Запрос на выборку данных",
        "type": "textarea",
        "maxLength": 2000
      }
    ],
    "id": "reff_model_variable",
    "label": "Типы физических величин в моделях",
    "kind": "reff"
  },
  {
    "fields": [
      {
        "key": "code",
        "label": "Код",
        "type": "text",
        "required": true,
        "maxLength": 32
      },
      {
        "key": "name_ru",
        "label": "Название на русском",
        "type": "text",
        "required": true,
        "maxLength": 255
      },
      {
        "key": "name_kk",
        "label": "Название на казахском",
        "type": "text",
        "required": true,
        "maxLength": 255
      },
      {
        "key": "name_en",
        "label": "Название на английском",
        "type": "text",
        "required": true,
        "maxLength": 255
      },
      {
        "key": "description",
        "label": "Описание",
        "type": "textarea"
      }
    ],
    "id": "reff_ore_interval_source",
    "label": "Источник выделения рудного интервала",
    "kind": "reff"
  },
  {
    "fields": [
      {
        "key": "code",
        "label": "Код",
        "type": "text",
        "required": true,
        "maxLength": 255
      },
      {
        "key": "name_ru",
        "label": "Название на русском",
        "type": "text",
        "required": true,
        "maxLength": 255
      },
      {
        "key": "name_kk",
        "label": "Название на казахском",
        "type": "text",
        "required": true,
        "maxLength": 255
      },
      {
        "key": "name_en",
        "label": "Название на английском",
        "type": "text",
        "required": true,
        "maxLength": 255
      },
      {
        "key": "description",
        "label": "Описание",
        "type": "textarea"
      },
      {
        "key": "sort_order",
        "label": "Порядок сортировки",
        "type": "integer"
      },
      {
        "key": "is_active",
        "label": "Действующая запись",
        "type": "boolean"
      },
      {
        "key": "size_from_mm",
        "label": "Размер от",
        "type": "number"
      },
      {
        "key": "size_to_mm",
        "label": "Размер до",
        "type": "number"
      },
      {
        "key": "group_name",
        "label": "Группа фракций",
        "type": "text",
        "maxLength": 255
      }
    ],
    "id": "reff_grain_fraction",
    "label": "Фракция гранулометрического состава",
    "kind": "reff"
  },
  {
    "fields": [
      {
        "key": "code",
        "label": "Код",
        "type": "text",
        "required": true,
        "maxLength": 32
      },
      {
        "key": "name_ru",
        "label": "Название на русском",
        "type": "text",
        "required": true,
        "maxLength": 255
      },
      {
        "key": "name_kk",
        "label": "Название на казахском",
        "type": "text",
        "required": true,
        "maxLength": 255
      },
      {
        "key": "name_en",
        "label": "Название на английском",
        "type": "text",
        "required": true,
        "maxLength": 255
      },
      {
        "key": "description",
        "label": "Описание",
        "type": "textarea"
      },
      {
        "key": "short_name",
        "label": "Аббревиатура",
        "type": "text",
        "maxLength": 255
      },
      {
        "key": "quantity_id",
        "label": "Физическая величина",
        "type": "reference",
        "reference": "reff_quantity"
      }
    ],
    "id": "reff_ore_component",
    "label": "Рудный компонент",
    "kind": "reff"
  },
  {
    "fields": [
      {
        "key": "code",
        "label": "Код",
        "type": "text",
        "required": true,
        "maxLength": 255
      },
      {
        "key": "name_ru",
        "label": "Название на русском",
        "type": "text",
        "required": true,
        "maxLength": 255
      },
      {
        "key": "name_kk",
        "label": "Название на казахском",
        "type": "text",
        "required": true,
        "maxLength": 255
      },
      {
        "key": "name_en",
        "label": "Название на английском",
        "type": "text",
        "required": true,
        "maxLength": 255
      },
      {
        "key": "description",
        "label": "Описание",
        "type": "textarea"
      }
    ],
    "id": "reff_ore_morphology_type",
    "label": "Морфологический тип рудного интервала",
    "kind": "reff"
  },
  {
    "fields": [
      {
        "key": "name_ru",
        "label": "Название на русском",
        "type": "text",
        "required": true,
        "maxLength": 255
      },
      {
        "key": "name_kk",
        "label": "Название на казахском",
        "type": "text",
        "required": true,
        "maxLength": 255
      },
      {
        "key": "name_en",
        "label": "Название на английском",
        "type": "text",
        "required": true,
        "maxLength": 255
      },
      {
        "key": "description",
        "label": "Описание",
        "type": "textarea"
      }
    ],
    "id": "reff_drilling_company",
    "label": "Справочник буровых компаний",
    "kind": "reff"
  },
  {
    "fields": [
      {
        "key": "name_ru",
        "label": "Название на русском",
        "type": "text",
        "required": true,
        "maxLength": 255
      },
      {
        "key": "name_kk",
        "label": "Название на казахском",
        "type": "text",
        "required": true,
        "maxLength": 255
      },
      {
        "key": "name_en",
        "label": "Название на английском",
        "type": "text",
        "required": true,
        "maxLength": 255
      },
      {
        "key": "description",
        "label": "Описание",
        "type": "textarea"
      }
    ],
    "id": "reff_brigade",
    "label": "Справочник бригад",
    "kind": "reff"
  },
  {
    "fields": [
      {
        "key": "upper_value",
        "label": "Значение проницаемости",
        "type": "number"
      },
      {
        "key": "name_ru",
        "label": "Название на русском",
        "type": "text",
        "required": true,
        "maxLength": 255
      },
      {
        "key": "name_kk",
        "label": "Название на казахском",
        "type": "text",
        "required": true,
        "maxLength": 255
      },
      {
        "key": "name_en",
        "label": "Название на английском",
        "type": "text",
        "required": true,
        "maxLength": 255
      },
      {
        "key": "colour_id",
        "label": "Условный цвет",
        "type": "reference",
        "reference": "reff_colour"
      }
    ],
    "id": "reff_filtration_level",
    "label": "Общие уровни или классы фильтрации",
    "kind": "reff"
  },
  {
    "fields": [
      {
        "key": "rock_type_id",
        "label": "Литотип",
        "type": "reference",
        "reference": "reff_rock_type",
        "required": true
      },
      {
        "key": "permeability_lateral",
        "label": "Проницаемость по латерали",
        "type": "number"
      },
      {
        "key": "permeability_vertical",
        "label": "Проницаемость по вертикали",
        "type": "number"
      },
      {
        "key": "effective_porosity",
        "label": "Проточная пористость",
        "type": "number"
      },
      {
        "key": "total_porosity",
        "label": "Полная пористость",
        "type": "number"
      },
      {
        "key": "specific_acid_capacity",
        "label": "Удельная кислотоёмкость",
        "type": "number"
      }
    ],
    "id": "reff_rock_filtration_property",
    "label": "Типовые фильтрационные свойства литотипа",
    "kind": "reff"
  },
  {
    "fields": [
      {
        "key": "code",
        "label": "Код",
        "type": "text",
        "required": true,
        "maxLength": 32
      },
      {
        "key": "name_ru",
        "label": "Название на русском",
        "type": "text",
        "required": true,
        "maxLength": 255
      },
      {
        "key": "name_kk",
        "label": "Название на казахском",
        "type": "text",
        "required": true,
        "maxLength": 255
      },
      {
        "key": "name_en",
        "label": "Название на английском",
        "type": "text",
        "required": true,
        "maxLength": 255
      },
      {
        "key": "short_name",
        "label": "Короткое название",
        "type": "text",
        "maxLength": 255
      },
      {
        "key": "description",
        "label": "Описание",
        "type": "textarea"
      }
    ],
    "id": "reff_sample_type",
    "label": "Типы проб",
    "kind": "reff"
  },
  {
    "fields": [
      {
        "key": "code",
        "label": "Код системы координат",
        "type": "text",
        "required": true
      },
      {
        "key": "name",
        "label": "Наименование",
        "type": "text",
        "required": true
      },
      {
        "key": "epsg_code",
        "label": "Код EPSG",
        "type": "integer"
      },
      {
        "key": "transform_params",
        "label": "Параметры трансформации",
        "type": "json"
      },
      {
        "key": "is_default",
        "label": "Условная система по умолчанию",
        "type": "boolean"
      }
    ],
    "id": "reff_coordinate_system",
    "label": "Система координат",
    "kind": "reff"
  },
  {
    "fields": [
      {
        "key": "code",
        "label": "Код",
        "type": "text",
        "required": true,
        "maxLength": 32
      },
      {
        "key": "name",
        "label": "Наименование",
        "type": "text",
        "required": true,
        "maxLength": 255
      },
      {
        "key": "description",
        "label": "Описание",
        "type": "textarea"
      },
      {
        "key": "sort_order",
        "label": "Порядок сортировки",
        "type": "integer"
      },
      {
        "key": "is_active",
        "label": "Действующая запись",
        "type": "boolean"
      },
      {
        "key": "quantity_id",
        "label": "Физическая величина",
        "type": "reference",
        "reference": "reff_quantity"
      },
      {
        "key": "value_type",
        "label": "Тип значения",
        "type": "text"
      },
      {
        "key": "is_global",
        "label": "Общее значение",
        "type": "boolean"
      },
      {
        "key": "is_system",
        "label": "Системный параметр",
        "type": "boolean"
      }
    ],
    "id": "reff_condition_parameter",
    "label": "Кондиционный параметр",
    "kind": "reff"
  },
  {
    "fields": [
      {
        "key": "code",
        "label": "Код",
        "type": "text",
        "required": true,
        "maxLength": 32
      },
      {
        "key": "name_ru",
        "label": "Название на русском",
        "type": "text",
        "required": true,
        "maxLength": 255
      },
      {
        "key": "name_kk",
        "label": "Название на казахском",
        "type": "text",
        "required": true,
        "maxLength": 255
      },
      {
        "key": "name_en",
        "label": "Название на английском",
        "type": "text",
        "required": true,
        "maxLength": 255
      },
      {
        "key": "description",
        "label": "Описание",
        "type": "textarea"
      }
    ],
    "id": "reff_tech_interval_source",
    "label": "Источники технологических интервалов",
    "kind": "reff"
  },
  {
    "fields": [
      {
        "key": "name_ru",
        "label": "Название на русском",
        "type": "text",
        "required": true,
        "maxLength": 255
      },
      {
        "key": "name_kk",
        "label": "Название на казахском",
        "type": "text",
        "required": true,
        "maxLength": 255
      },
      {
        "key": "name_en",
        "label": "Название на английском",
        "type": "text",
        "required": true,
        "maxLength": 255
      },
      {
        "key": "description",
        "label": "Описание",
        "type": "textarea"
      },
      {
        "key": "device_type_id",
        "label": "Тип прибора",
        "type": "reference",
        "reference": "device_type"
      }
    ],
    "id": "reff_device",
    "label": "Приборы",
    "kind": "reff"
  }
] as ReferenceDefinition[],
  { id: 'reff_well_development_method', label: 'Типы работ освоения', kind: 'reff', fields: commonFields, provisional: true },
  { id: 'device_type', label: 'Типы приборов', kind: 'ordinary', fields: commonFields, provisional: true },
]

export const referenceDefinition = (id: string) => referenceDefinitions.find((item) => item.id === id)
