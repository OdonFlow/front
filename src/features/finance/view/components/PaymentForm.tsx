import { Avatar, Feedback, Field } from '../../../../shared/components/ui';
import { AccessGate } from '../../../access/view/AccessGate';
import { Icon } from '../../../../shared/components/Icon';
import { money } from '../../model/finance.rules';
import type { useReceiptViewModel } from '../../viewmodel/useReceiptViewModel';
import { BasketEditor } from './BasketEditor';
import { PaymentEntry } from './PaymentEntry';

export function PaymentForm({ vm }: { vm: ReturnType<typeof useReceiptViewModel> }) {
  return (
    <form
      className="payment-layout checkout-layout"
      onSubmit={(e) => {
        e.preventDefault();
        vm.submit();
      }}
    >
      <fieldset disabled={vm.mutation.isPending} className="checkout-basket-fieldset">
        <BasketEditor vm={vm} />
      </fieldset>
      <aside className="payment-summary">
        <section className="panel checkout-summary">
          <div className="section-heading">
            <h2>Resumo da comanda</h2>
            <span className="secondary-text">{vm.lines.length} itens</span>
          </div>
          <div className="payment-total-card">
            <div>
              <span>Subtotal de serviços</span>
              <strong>{money(vm.subtotal)}</strong>
            </div>
            <div>
              <span>Desconto / cortesia</span>
              <span>− {money(vm.subtotal - vm.total)}</span>
            </div>
            <div className="payment-settled">
              <span>Total a cobrar</span>
              <strong>{money(vm.total)}</strong>
            </div>
          </div>
          <AccessGate permission="management.view">
            <div className="checkout-commissions">
              {vm.totals?.commissions.map((commission) => (
                <div key={commission.dentistId}>
                  <Avatar name={commission.name} />
                  <span>{commission.name}</span>
                  <strong>{money(commission.cents)}</strong>
                </div>
              ))}
            </div>
          </AccessGate>
          <AccessGate permission="management.view">
            <div className="payment-accounting">
              <p>
                <span>Taxas provisionadas</span>
                <strong>{money(vm.totals?.feeCents ?? 0)}</strong>
              </p>
              <p>
                <span>Total de repasses</span>
                <strong>{money(vm.totals?.commissionCents ?? 0)}</strong>
              </p>
              <p>
                <span>Líquido da clínica</span>
                <strong>{money(vm.totals?.clinicCents ?? 0)}</strong>
              </p>
            </div>
          </AccessGate>
        </section>
        <section className="panel checkout-payment-panel">
          <fieldset disabled={vm.mutation.isPending} className="finance-form-fieldset">
            <div>
              <h2>Pagamento externo e baixa</h2>
              <p className="secondary-text">Valores recebidos fora do sistema.</p>
            </div>
            <Field label="Data / hora do recebimento">
              <input
                name="paidAt"
                type="datetime-local"
                step="60"
                value={vm.draft.paidAt}
                onChange={(e) => vm.setDraft({ paidAt: e.target.value })}
                required
              />
            </Field>
            {vm.total > 0 ? (
              <>
                {vm.draft.payments.map((payment, index) => (
                  <PaymentEntry
                    key={payment.key}
                    draft={payment}
                    index={index}
                    total={vm.total}
                    multiple={vm.draft.payments.length > 1}
                    usedMethods={vm.draft.payments
                      .filter((p) => p.key !== payment.key)
                      .map((p) => p.method)}
                    totals={vm.totals?.payments[index]}
                    onChange={(patch) => vm.setPayment(payment.key, patch)}
                    onMethod={(method) => vm.setMethod(payment.key, method)}
                    onRemove={() => vm.removePayment(payment.key)}
                  />
                ))}
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={vm.addPayment}
                  disabled={vm.draft.payments.length >= 4}
                >
                  <Icon name="plus" size={16} />
                  Dividir pagamento em outra forma
                </button>
                {vm.paymentDifference !== 0 && (
                  <p className="feedback feedback-error" role="status">
                    {vm.paymentDifference > 0 ? 'Falta distribuir' : 'Valor excedente'}:{' '}
                    {money(Math.abs(vm.paymentDifference))}
                  </p>
                )}
              </>
            ) : (
              <p className="courtesy-note">
                {vm.draft.courtesy
                  ? 'Cortesia integral: sem cobrança, taxas ou movimentação no caixa.'
                  : 'Adicione os serviços realizados ou confirme a avaliação gratuita.'}
              </p>
            )}
            <p className="payment-check">
              <Icon name="check" size={16} />
              Dar baixa no prontuário
            </p>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={vm.draft.printReceipt}
                onChange={(e) => vm.setDraft({ printReceipt: e.target.checked })}
              />
              Abrir recibo detalhado após confirmar
            </label>
            <Feedback error={vm.formError} />
            <button
              className="btn btn-primary w-full"
              disabled={
                vm.mutation.isPending ||
                !vm.canReceive ||
                (!vm.lines.length && !(vm.draft.courtesy && vm.appointment))
              }
            >
              {vm.mutation.isPending
                ? 'Registrando...'
                : vm.total === 0
                  ? 'Encerrar atendimento sem cobrança'
                  : 'Confirmar lançamento no caixa'}
            </button>
          </fieldset>
        </section>
      </aside>
    </form>
  );
}
