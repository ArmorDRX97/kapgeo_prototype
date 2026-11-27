import { useId } from 'react'
import {
  groupConditionLimits,
  isValidConditionLimit,
  unrestrictedConditionLimit,
  unrestrictedConditionLimitId,
  type ConditionLimit,
} from '../../entities/geology-master/model/types'

export function ConditionLimitFields({ limits, disabled, onChange }: {
  limits: ConditionLimit[]
  disabled: boolean
  onChange: (limits: ConditionLimit[]) => void
}) {
  const fieldId = useId()
  const suggestionsId = `${fieldId}-suggestions`

  return <div className="geobase-limit-groups">
    {groupConditionLimits(limits).map(({ title, required, limits: group }) => <fieldset key={title} className="geobase-limit-group">
      <legend className="geobase-limit-group__title" data-required={required}>{title}</legend>
      <div className="geobase-limits-table">
        <div className="geobase-limits-table__head"><span>Параметр</span><span>Значение</span><span>Ед. изм.</span></div>
        {group.map((limit) => {
          const inputId = `${fieldId}-${limit.id}`
          const allowsUnrestricted = limit.id === unrestrictedConditionLimitId
          const invalid = !disabled && !isValidConditionLimit(limit)
          return <div key={limit.id} className="geobase-limits-table__row">
            <label htmlFor={inputId}>{limit.parameter}</label>
            <span>
              <input
                id={inputId}
                value={limit.value}
                required={required}
                disabled={disabled}
                inputMode={required && !allowsUnrestricted ? 'decimal' : undefined}
                list={allowsUnrestricted ? suggestionsId : undefined}
                aria-describedby={invalid ? `${inputId}-error ${inputId}-unit` : `${inputId}-unit`}
                aria-invalid={invalid || undefined}
                onChange={(event) => onChange(limits.map((item) => item.id === limit.id
                  ? { ...item, value: event.target.value }
                  : item))}
              />
              {invalid && <small id={`${inputId}-error`} className="field__error">
                {allowsUnrestricted ? 'Введите число или «Без ограничения».' : 'Введите число от 0.'}
              </small>}
            </span>
            <small id={`${inputId}-unit`}>{limit.unit ?? '—'}</small>
          </div>
        })}
      </div>
    </fieldset>)}
    <datalist id={suggestionsId}><option value={unrestrictedConditionLimit} /></datalist>
  </div>
}
