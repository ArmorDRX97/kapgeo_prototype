/** Autonomous section requisites; these are not BGD or map object IDs. */
export const geoBlocks = ['ГБ-01', 'ГБ-02', 'ГБ-03']
export const techBlocks = Array.from({ length: 8 }, (_, index) => `ТБ-${String(index + 1).padStart(2, '0')}`)
