import { Plus, Trash2 } from 'lucide-react'
import { useId, useLayoutEffect, useRef } from 'react'
import type { WellBgdData, WellPassportPerson } from '../../../entities/well/model/types'
import { Button } from '../../../shared/ui/Button'
import { Panel } from '../../../shared/ui/Panel'

type Passport = WellBgdData['passport']

const passportRoles = [
  ['author', 'Составитель паспорта'],
  ['chiefGeologist', 'Главный геолог'],
  ['chiefGeophysicist', 'Главный геофизик'],
  ['drillingManager', 'Начальник бурения'],
  ['samplingPerformer', 'Исполнитель опробования'],
  ['interpretationPerformer', 'Исполнитель интерпретации'],
  ['surveyor', 'Топограф'],
] as const

export function BgdWellPassportTab({ passport, disabled, onChange }: {
  passport: Passport
  disabled: boolean
  onChange: (passport: Passport) => void
}) {
  const tableTitleId = useId()
  const addButtonRef = useRef<HTMLButtonElement>(null)
  const tableRef = useRef<HTMLTableElement>(null)
  const pendingFocus = useRef<string | null>(null)
  const people = passport.people ?? passportRoles.map(([key, position]) => ({
    id: key,
    position,
    name: passport[key] ?? '',
  }))

  useLayoutEffect(() => {
    if (pendingFocus.current) {
      tableRef.current?.querySelector<HTMLInputElement>(`[data-person-id="${pendingFocus.current}"] input`)?.focus()
      pendingFocus.current = null
    }
  }, [passport.people])

  const setPeople = (next: WellPassportPerson[]) => {
    const { date, documentStartDate, documentEndDate } = passport
    onChange({ date, documentStartDate, documentEndDate, people: next })
  }

  const addPerson = () => {
    const id = crypto.randomUUID()
    pendingFocus.current = id
    setPeople([...people, { id, position: '', name: '' }])
  }

  const updatePerson = (id: string, field: 'position' | 'name', value: string) => {
    setPeople(people.map((person) => person.id === id ? { ...person, [field]: value } : person))
  }

  const removePerson = (index: number) => {
    pendingFocus.current = people[index + 1]?.id ?? people[index - 1]?.id ?? null
    if (!pendingFocus.current) addButtonRef.current?.focus()
    setPeople(people.filter((_, rowIndex) => rowIndex !== index))
  }

  return <Panel title="Паспорт">
    <label className="field bgd-passport-date">
      <span className="field__label">Дата составления паспорта</span>
      <input type="datetime-local" disabled={disabled} max={new Date().toISOString().slice(0, 16)} value={passport.date} onChange={(event) => onChange({ ...passport, date: event.target.value })} />
    </label>
    <div className="bgd-drilling-scroll bgd-passport-people">
      <header className="bgd-passport-people__header">
        <h3 id={tableTitleId}>Ответственные специалисты</h3>
        <Button ref={addButtonRef} size="sm" variant="secondary" disabled={disabled} onClick={addPerson}><Plus size={15} />Добавить</Button>
      </header>
      <table ref={tableRef} className="bgd-passport-table" aria-labelledby={tableTitleId}>
        <colgroup><col /><col /><col className="bgd-passport-table__actions" /></colgroup>
        <thead><tr><th scope="col">Должность</th><th scope="col">ФИО</th><th scope="col"><span className="sr-only">Удаление</span></th></tr></thead>
        <tbody>{people.map((person, index) => <tr key={person.id} data-person-id={person.id}>
          <td><input
            aria-label={`Должность, строка ${index + 1}`}
            disabled={disabled}
            value={person.position}
            onChange={(event) => updatePerson(person.id, 'position', event.target.value)}
          /></td>
          <td><input
            aria-label={`ФИО, строка ${index + 1}`}
            disabled={disabled}
            value={person.name}
            onChange={(event) => updatePerson(person.id, 'name', event.target.value)}
          /></td>
          <td><Button size="sm" variant="quiet" className="bgd-passport-table__remove" disabled={disabled}
            aria-label={`Удалить специалиста, строка ${index + 1}`} title="Удалить строку" onClick={() => removePerson(index)}><Trash2 size={15} /></Button></td>
        </tr>)}
          {people.length === 0 && <tr><td colSpan={3} className="bgd-passport-table__empty">Специалисты не добавлены</td></tr>}
        </tbody>
      </table>
    </div>
  </Panel>
}
