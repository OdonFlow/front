import { Field } from '../../../../shared/components/ui';
import { Icon } from '../../../../shared/components/Icon';
import { methodLabels, money } from '../../model/finance.rules';
import type { PaymentMethod, ReceiptPayment } from '../../model/types';
import type { PaymentDraft } from '../../viewmodel/checkoutDraft';

const methods = [
  { id: 'pix', icon: 'grid' },
  { id: 'debit', icon: 'card' },
  { id: 'credit', icon: 'card' },
  { id: 'cash', icon: 'wallet' },
] as const;
export function PaymentEntry({
  draft,
  index,
  total,
  multiple,
  usedMethods,
  totals,
  onChange,
  onMethod,
  onRemove,
}: {
  draft: PaymentDraft;
  index: number;
  total: number;
  multiple: boolean;
  usedMethods: PaymentMethod[];
  totals?: ReceiptPayment;
  onChange: (patch: Partial<PaymentDraft>) => void;
  onMethod: (method: PaymentMethod) => void;
  onRemove: () => void;
}) {
  const name = (field: string) => (index ? `payment-${index}-${field}` : field);
  return (
    <section className="payment-entry">
      <div className="section-heading">
        <h3>Pagamento {index + 1}</h3>
        {multiple && (
          <button type="button" className="text-button subtle" onClick={onRemove}>
            Remover forma
          </button>
        )}
      </div>
      <fieldset className="payment-methods">
        <legend className="sr-only">Meio externo do pagamento {index + 1}</legend>
        {methods.map((method) => (
          <label
            key={method.id}
            className={`payment-method ${draft.method === method.id ? 'selected' : ''} ${usedMethods.includes(method.id) ? 'method-disabled' : ''}`}
          >
            <input
              className="sr-only"
              type="radio"
              name={name('method')}
              value={method.id}
              checked={draft.method === method.id}
              disabled={usedMethods.includes(method.id)}
              onChange={() => onMethod(method.id)}
            />
            <Icon name={method.icon} size={18} />
            <strong>{methodLabels[method.id]}</strong>
          </label>
        ))}
      </fieldset>
      <Field label="Valor neste meio (R$)">
        <input
          name={name('amount')}
          inputMode="decimal"
          value={multiple ? draft.amount : (total / 100).toFixed(2)}
          readOnly={!multiple}
          onChange={(e) => onChange({ amount: e.target.value })}
          pattern="[0-9]+([.,][0-9]{1,2})?"
          required
        />
      </Field>
      {draft.method === 'credit' && (
        <Field label="Parcelas na maquininha externa">
          <select
            name={name('installments')}
            value={draft.installments}
            onChange={(e) => onChange({ installments: Number(e.target.value) })}
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n === 1 ? 'À vista' : `${n}x na maquininha`}
              </option>
            ))}
          </select>
        </Field>
      )}
      <Field label="Destino do recebimento">
        <input
          name={name('destination')}
          value={draft.destination}
          onChange={(e) => onChange({ destination: e.target.value })}
          readOnly={draft.method === 'cash'}
          required
          maxLength={100}
        />
      </Field>
      {draft.method === 'cash' ? (
        <>
          <Field label="Valor entregue pelo paciente (R$)">
            <input
              name={name('tendered')}
              inputMode="decimal"
              value={draft.tendered}
              onChange={(e) => onChange({ tendered: e.target.value })}
              pattern="[0-9]+([.,][0-9]{1,2})?"
              required
            />
          </Field>
          <Field label="Troco a devolver">
            <output
              className={`change-output ${(totals?.changeCents ?? 0) < 0 ? 'insufficient' : ''}`}
            >
              {(totals?.changeCents ?? 0) < 0
                ? 'Valor insuficiente'
                : money(totals?.changeCents ?? 0)}
            </output>
          </Field>
        </>
      ) : (
        <Field
          label={
            draft.method === 'pix' ? 'Código / comprovante Pix' : 'NSU / autorização da maquininha'
          }
        >
          <input
            name={name('proof')}
            value={draft.proof}
            onChange={(e) => onChange({ proof: e.target.value })}
            required
            maxLength={100}
          />
        </Field>
      )}
      {draft.method === 'pix' && (
        <label className="checkbox-label pix-confirmation">
          <input
            name={name('pixVerified')}
            type="checkbox"
            checked={draft.pixVerified}
            onChange={(e) => onChange({ pixVerified: e.target.checked })}
            required
          />
          Confirmei o crédito do Pix na conta bancária da clínica.
        </label>
      )}
      <p className="secondary-text">
        Taxa provisionada ({totals?.feeRate ?? 0}%): {money(totals?.feeCents ?? 0)}
      </p>
    </section>
  );
}
