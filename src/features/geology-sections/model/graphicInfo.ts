export type GraphicInfo = { title: string; kind: string; rows: Array<[string, string]>; selection?: string }
export const inspectAttributes = (info: GraphicInfo, clean = false) => clean ? {} : { 'data-inspect': JSON.stringify(info) }
