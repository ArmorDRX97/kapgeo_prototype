export const referenceColumns = [
  { id:'drilling', name:'Данные бурения', from:3000, to:10500 },
  { id:'logging-geology', name:'Бурение с учётом каротажа', from:10500, to:20000 },
  { id:'samples', name:'Результаты опробования', from:20000, to:30300 },
  { id:'sample-note', name:'Опробование · примечание', from:30300, to:30800 },
  { id:'ore', name:'Принято в подсчёте по каротажу', from:30800, to:36800 },
  { id:'horizon', name:'Рудовмещающий горизонт', from:36800, to:37800 },
  { id:'depth', name:'Глубина каротажа', from:37800, to:38800 },
  { id:'curves', name:'Графики каротажа и промера керна', from:38800, to:49300 },
  { id:'description', name:'Описание пород', from:49300, to:57300 },
  { id:'coordinates', name:'Координаты рудных интервалов', from:57300, to:59800 },
  { id:'construction', name:'Конструкция скважины', from:59800, to:61800 },
] as const
export type ReferenceColumnId = typeof referenceColumns[number]['id']
export type ReferenceSettings = { columns:ReferenceColumnId[]; from:number; to:number; scale:50|100|200; color:boolean; grid:boolean; author:string; date:string }
export const referenceDefaults = ():ReferenceSettings => ({columns:referenceColumns.map(c=>c.id),from:647.1,to:712.6,scale:50,color:true,grid:false,author:'',date:''})
export const referenceStorageKey = (id:string) => `kapgeo.passport.reference.v1.${id}`
export function loadReferenceSettings(id:string):ReferenceSettings {
  const fallback=referenceDefaults()
  try {
    const value:unknown=JSON.parse(localStorage.getItem(referenceStorageKey(id))??'null')
    if(!value||typeof value!=='object')return fallback
    const s=value as ReferenceSettings
    if(!Array.isArray(s.columns)||!s.columns.length||new Set(s.columns).size!==s.columns.length||!s.columns.every(id=>referenceColumns.some(c=>c.id===id))||!Number.isFinite(s.from)||!Number.isFinite(s.to)||s.from<647.1||s.to>712.6||s.to<=s.from||![50,100,200].includes(s.scale))return fallback
    return {...fallback,...s,color:typeof s.color==='boolean'?s.color:true,grid:typeof s.grid==='boolean'?s.grid:false,author:typeof s.author==='string'?s.author.slice(0,60):'',date:typeof s.date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s.date)?s.date:''}
  }catch{return fallback}
}
export function referenceSize(s:ReferenceSettings){return {width:5000+s.columns.reduce((sum,id)=>{const c=referenceColumns.find(c=>c.id===id)!;return sum+c.to-c.from},0),height:22000+(s.to-s.from)*2000*50/s.scale}}
const attr=(value:string)=>value.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;')
/** Recompose vector strips of the supplied sheet; original data is never recalculated. */
export function composeReferenceSvg(raw:string,s:ReferenceSettings):string {
  if(JSON.stringify(s)===JSON.stringify(referenceDefaults()))return raw
  const doc=new DOMParser().parseFromString(raw,'image/svg+xml')
  const texts=[...doc.querySelectorAll('text')]
  if(s.author){const author=texts.find(t=>t.textContent==='Составил:');if(author){author.textContent=`Составил: ${s.author}`;author.setAttribute('textLength','8500');author.setAttribute('lengthAdjust','spacingAndGlyphs')}}
  if(s.date){const date=texts.find(t=>t.textContent==='год');if(date)date.textContent=s.date.split('-').reverse().join('.')}
  const scale=texts.find(t=>t.textContent==='1:50');if(scale)scale.textContent=`1:${s.scale}`
  const source=new XMLSerializer().serializeToString(doc.documentElement)
  const {width,height}=referenceSize(s), plot=(s.to-s.from)*2000*50/s.scale, sourceTop=Math.round((20000+(s.from-647.1)*2000)*1000)/1000
  const slice=(x:number,y:number,w:number,h:number,sx:number,sy:number,sw:number,sh:number)=>`<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="${sx} ${sy} ${sw} ${sh}" preserveAspectRatio="none" overflow="hidden"><use href="#reference-source" /></svg>`
  let x=0,body=''
  const strips=[{from:0,to:3000},...s.columns.map(id=>referenceColumns.find(c=>c.id===id)!),{from:61800,to:63800}]
  for(const c of strips){const w=c.to-c.from;body+=slice(x,14000,w,6000,c.from,14000,w,6000)+slice(x,20000,w,plot,c.from,sourceTop,w,(s.to-s.from)*2000);x+=w}
  let grid=''
  if(s.grid)for(let d=Math.ceil(s.from);d<s.to;d+=1){const yy=20000+(d-s.from)*2000*50/s.scale;grid+=`<path d="M2000 ${yy}H${width-2000}" stroke="#8fa4bf" stroke-width="12" stroke-dasharray="50 40"/>`}
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width/100}mm" height="${height/100}mm"><defs><image id="reference-source" width="63800" height="153000" href="${attr('data:image/svg+xml;charset=utf-8,'+encodeURIComponent(source))}"/><filter id="reference-mono"><feColorMatrix type="saturate" values="0"/></filter></defs><rect width="100%" height="100%" fill="white"/><g${s.color?'':' filter="url(#reference-mono)"'}>${slice(0,0,width,14000,0,0,63800,14000)}${body}${grid}</g></svg>`
}
