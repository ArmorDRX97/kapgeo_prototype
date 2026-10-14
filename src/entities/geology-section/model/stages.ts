export const sectionStageValues = ['prospecting', 'appraisal', 'exploration', 'detailed', 'operationalExploration', 'operation'] as const

export type SectionStage = (typeof sectionStageValues)[number]

export const stageNames: Record<SectionStage, string> = {
  prospecting: 'Поисковые работы',
  appraisal: 'Поисково-оценочные работы',
  exploration: 'Разведочные работы',
  detailed: 'Детальная разведка',
  operationalExploration: 'Эксплуатационная разведка',
  operation: 'Эксплуатация',
}
