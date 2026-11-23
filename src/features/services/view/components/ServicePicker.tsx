import { useId } from 'react';
import type { ClinicalService } from '../../model/types';
import { useServicePickerViewModel } from '../../viewmodel/useServicePickerViewModel';
import { money } from '../../../finance/model/finance.rules';
import { Icon } from '../../../../shared/components/Icon';

export function ServicePicker({
  services,
  value,
  onChange,
  label = 'Buscar serviço no catálogo',
  optional = false,
}: {
  services: ClinicalService[];
  value: string;
  onChange: (id: string) => void;
  label?: string;
  optional?: boolean;
}) {
  const id = useId();
  const vm = useServicePickerViewModel(services, value, onChange);
  return (
    <div
      className="service-picker"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) vm.close();
      }}
    >
      <label htmlFor={id} className="field">
        <span>{label}</span>
      </label>
      <div className="service-picker-input">
        <Icon name="search" size={17} />
        <input
          id={id}
          role="combobox"
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={vm.open}
          aria-controls={`${id}-options`}
          aria-activedescendant={
            vm.open && vm.filtered[vm.highlight]
              ? `${id}-${vm.filtered[vm.highlight].id}`
              : undefined
          }
          value={vm.display}
          placeholder={
            optional ? 'A definir na consulta / Avaliação inicial' : 'Digite o nome do serviço...'
          }
          onFocus={vm.focus}
          onChange={(e) => vm.search(e.target.value)}
          onKeyDown={(e) => {
            if (vm.keyDown(e.key)) e.preventDefault();
          }}
        />
        {value && (
          <button
            type="button"
            className="icon-button"
            aria-label="Limpar serviço"
            onClick={() => vm.choose('')}
          >
            <Icon name="close" size={16} />
          </button>
        )}
      </div>
      {vm.open && (
        <div
          className="service-picker-options"
          id={`${id}-options`}
          role="listbox"
          aria-label="Serviços do catálogo"
        >
          {optional && (
            <button
              type="button"
              role="option"
              tabIndex={-1}
              aria-selected={!value}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => vm.choose('')}
            >
              A definir na consulta / Avaliação inicial
            </button>
          )}
          {vm.filtered.map((s, index) => (
            <button
              type="button"
              key={s.id}
              id={`${id}-${s.id}`}
              role="option"
              tabIndex={-1}
              aria-selected={value === s.id}
              className={index === vm.highlight ? 'highlighted' : ''}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => vm.choose(s.id)}
            >
              <strong>{s.name}</strong>
              <span>
                {money(s.priceCents)} · {s.durationMinutes} min · repasse {s.commissionRate}%
              </span>
            </button>
          ))}
          {!vm.filtered.length && <p>Nenhum serviço ativo encontrado.</p>}
        </div>
      )}
    </div>
  );
}
