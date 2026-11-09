import { useState } from 'react'
import { CheckCircle2, Info, Trash2 } from 'lucide-react'
import { Button } from '../../shared/ui/Button'
import { WorkspaceDialog } from '../../shared/ui/WorkspaceDialog'
import { DiscardChangesDialog } from '../../shared/ui/DiscardChangesDialog'
import { Example, Field, type Notify } from './kitParts'

export function Dialogs({notify}:{notify:Notify}) {
  const [dialog,setDialog]=useState<'info'|'form'|'delete'|'success'|'discard'|null>(null)
  return <div className="uik-stack"><Example title="Окна приложения" description="Открываются действующие общие диалоги. Escape, крестик и возврат фокуса работают так же, как в рабочих областях."><div className="uik-dialog-cards">{[
    {id:'info' as const,title:'Информационное окно',detail:'Компактное · сведения и закрытие',Icon:Info},
    {id:'form' as const,title:'Рабочая форма',detail:'Широкое · ввод, сохранение, отмена',Icon:CheckCircle2},
    {id:'delete' as const,title:'Подтверждение удаления',detail:'Опасное действие · явное решение',Icon:Trash2},
    {id:'discard' as const,title:'Несохранённые изменения',detail:'Продолжить, отменить или сохранить',Icon:Info},
    {id:'success' as const,title:'Завершение действия',detail:'Компактное · положительный результат',Icon:CheckCircle2},
  ].map(({id,title,detail,Icon})=><button key={id} type="button" onClick={()=>setDialog(id)}><Icon size={24}/><strong>{title}</strong><span>{detail}</span><small>Открыть пример →</small></button>)}</div></Example>
    <Example title="Попробуйте защиту ввода" description="Откройте рабочую форму, измените название и нажмите Escape или «Отмена». Появится дополнительное подтверждение."><Button variant="secondary" onClick={()=>setDialog('form')}>Открыть форму с защитой</Button></Example>
    {dialog==='info'&&<WorkspaceDialog title="Сведения о скважине" size="compact" onClose={()=>setDialog(null)} footer={<Button onClick={()=>setDialog(null)}>Понятно</Button>}><dl className="uik-properties"><div><dt>Наименование</dt><dd>СК-001</dd></div><div><dt>Тип</dt><dd>Разведочная</dd></div><div><dt>Статус</dt><dd>Проверена</dd></div><div><dt>Глубина</dt><dd>360 м</dd></div></dl></WorkspaceDialog>}
    {dialog==='form'&&<SampleForm onClose={()=>setDialog(null)} onSave={name=>{setDialog(null);notify(`Сохранено название: ${name}`)}}/>}
    {dialog==='delete'&&<WorkspaceDialog title="Удалить интервал?" size="compact" onClose={()=>setDialog(null)} footer={<><Button variant="secondary" onClick={()=>setDialog(null)}>Отмена</Button><Button variant="danger" onClick={()=>{setDialog(null);notify('Пример удаления подтверждён')}}><Trash2 size={16}/>Удалить</Button></>}><p>Интервал 120–240 м будет удалён из примера. Для возврата исходного состояния используйте «Сбросить примеры».</p></WorkspaceDialog>}
    {dialog==='success'&&<WorkspaceDialog title="Операция завершена" size="compact" onClose={()=>setDialog(null)} footer={<Button onClick={()=>setDialog(null)}>Готово</Button>}><div className="success-banner"><CheckCircle2 size={21}/><span><strong>Изменения сохранены</strong>Пример положительного результата операции.</span></div></WorkspaceDialog>}
    {dialog==='discard'&&<DiscardChangesDialog action="close" onStay={()=>{setDialog(null);notify('Выбрано продолжение редактирования')}} onDiscard={()=>{setDialog(null);notify('Выбрана отмена изменений')}} onSave={()=>{setDialog(null);notify('Выбрано сохранение изменений')}}/>}
  </div>
}
function SampleForm({onClose,onSave}:{onClose:()=>void;onSave:(name:string)=>void}) {
  const [name,setName]=useState('СК-001')
  return <WorkspaceDialog title="Изменить сведения" onClose={onClose} footer={<><Button variant="secondary" onClick={onClose}>Отмена</Button><Button disabled={!name.trim()} onClick={()=>onSave(name)}>Сохранить</Button></>}><div className="uik-fields"><Field label="Название скважины *"><input value={name} onChange={e=>setName(e.target.value)}/></Field><Field label="Тип"><select><option>Разведочная</option><option>Откачная</option></select></Field><Field label="Глубина, м"><input type="number" defaultValue={360}/></Field><Field label="Примечание"><textarea rows={3} placeholder="Добавьте примечание"/></Field></div></WorkspaceDialog>
}
