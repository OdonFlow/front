import { Dialog, Feedback, Field } from '../../../../shared/components/ui';
import { methodKeys, methodLabels, money } from '../../model/finance.rules';
import type { useFinanceViewModel } from '../../viewmodel/useFinanceViewModel';

export function FinanceDialogs({ vm }: { vm: ReturnType<typeof useFinanceViewModel> }) {
  return (
    <>
      {vm.modal && (
        <Dialog
          title={
            vm.modal === 'open'
              ? 'Abrir caixa'
              : vm.modal === 'withdraw'
                ? 'Registrar sangria'
                : vm.modal === 'close'
                  ? 'Conferir e fechar turno'
                  : 'Taxas e repasses'
          }
          subtitle={
            vm.modal === 'close'
              ? 'Compare os valores externos com os lançamentos do turno.'
              : undefined
          }
          onClose={vm.closeModal}
        >
          <form
            className="form-content"
            onSubmit={(e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              if (vm.modal === 'open') vm.saveOpen(form);
              else if (vm.modal === 'withdraw') vm.saveWithdrawal(form);
              else if (vm.modal === 'close') vm.saveClose(form);
              else vm.saveConfiguration(form);
            }}
          >
            <fieldset disabled={vm.isBusy} className="finance-form-fieldset">
              {vm.modal === 'open' && (
                <>
                  <p className="secondary-text">
                    Informe o dinheiro disponível na gaveta para troco. Ele não conta como receita
                    do turno.
                  </p>
                  <Field label="Fundo inicial em dinheiro (R$)">
                    <input
                      name="opening"
                      inputMode="decimal"
                      defaultValue="0.00"
                      pattern="[0-9]+([.,][0-9]{1,2})?"
                      required
                    />
                  </Field>
                </>
              )}
              {vm.modal === 'withdraw' && (
                <>
                  <div className="cash-available">
                    <span>Saldo disponível na gaveta</span>
                    <strong>{money(vm.summary?.expected.cash ?? 0)}</strong>
                  </div>
                  <Field label="Valor da sangria (R$)">
                    <input
                      name="amount"
                      inputMode="decimal"
                      value={vm.withdrawal}
                      onChange={(e) => vm.setWithdrawal(e.target.value)}
                      pattern="[0-9]+([.,][0-9]{1,2})?"
                      required
                    />
                  </Field>
                  <Field label="Destino">
                    <select name="destination">
                      <option value="safe">Cofre da clínica</option>
                      <option value="bank">Depósito bancário</option>
                    </select>
                  </Field>
                  <Field label="Justificativa">
                    <textarea name="reason" required minLength={5} maxLength={500} rows={3} />
                  </Field>
                  <div className="cash-available">
                    <span>Fica em gaveta</span>
                    <strong>{money(vm.remainingCash)}</strong>
                  </div>
                </>
              )}
              {vm.modal === 'close' && (
                <>
                  <div className="closing-counts">
                    {methodKeys.map((method) => (
                      <div key={method}>
                        <Field label={`${methodLabels[method]} conferido (R$)`}>
                          <input
                            name={`count-${method}`}
                            inputMode="decimal"
                            value={vm.counts[method] ?? ''}
                            onChange={(e) => vm.setCount(method, e.target.value)}
                            placeholder="0,00"
                            pattern="[0-9]+([.,][0-9]{1,2})?"
                            required
                          />
                        </Field>
                        <p className="secondary-text">
                          Esperado: {money(vm.summary?.expected[method] ?? 0)}
                          {Number.isFinite(vm.differences[method]) && (
                            <span
                              className={
                                vm.differences[method] ? 'difference-warning' : 'difference-ok'
                              }
                            >
                              {' '}
                              · Diferença: {money(vm.differences[method])}
                            </span>
                          )}
                        </p>
                      </div>
                    ))}
                  </div>
                  <Field
                    label={
                      vm.hasDifference
                        ? 'Justificativa das divergências *'
                        : 'Observações da conferência'
                    }
                  >
                    <textarea
                      name="reason"
                      rows={3}
                      required={vm.hasDifference}
                      minLength={vm.hasDifference ? 5 : undefined}
                      maxLength={1000}
                    />
                  </Field>
                  <Field label="Nome do responsável pelo fechamento">
                    <input
                      name="signature"
                      required
                      minLength={3}
                      maxLength={100}
                      placeholder={vm.shift?.operatorName}
                    />
                  </Field>
                  <label className="checkbox-label">
                    <input type="checkbox" required />
                    Conferi o dinheiro da gaveta, os comprovantes POS e o extrato Pix.
                  </label>
                  <p className="secondary-text">
                    O fechamento encerra os lançamentos e os estornos deste turno.
                  </p>
                </>
              )}
              {vm.modal === 'configuration' && vm.data && (
                <>
                  <p className="secondary-text">
                    Percentuais aplicados aos próximos recebimentos. Os lançamentos anteriores
                    mantêm seus valores.
                  </p>
                  <Field label="Taxa de débito (%)">
                    <input
                      name="debitRate"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      required
                      defaultValue={vm.data.configuration.debitRate}
                    />
                  </Field>
                  <div className="form-grid">
                    <Field label="Taxa de crédito à vista (%)">
                      <input
                        name="creditRate"
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        required
                        defaultValue={vm.data.configuration.creditRate}
                      />
                    </Field>
                    <Field label="Adicional por parcela extra (%)">
                      <input
                        name="additionalInstallmentRate"
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        required
                        defaultValue={vm.data.configuration.additionalInstallmentRate}
                      />
                    </Field>
                  </div>
                  <p className="secondary-text">
                    Crédito parcelado: taxa à vista + adicional × (parcelas − 1). Os percentuais
                    iniciais são exemplos para a demonstração.
                  </p>
                  <h3>Repasse por profissional</h3>
                  {vm.dentists.map((dentist) => (
                    <Field key={dentist.id} label={`${dentist.name} (%)`}>
                      <input
                        name={`rate-${dentist.id}`}
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        required
                        defaultValue={vm.data?.configuration.dentistRates[dentist.id] ?? 40}
                      />
                    </Field>
                  ))}
                  <p className="secondary-text">
                    O repasse incide sobre o valor liquidado após desconto e antes das taxas da
                    maquininha.
                  </p>
                </>
              )}
            </fieldset>
            <Feedback error={vm.formError} />
            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={vm.closeModal}
                disabled={vm.isBusy}
              >
                Cancelar
              </button>
              <button className="btn btn-primary" disabled={vm.isBusy}>
                {vm.isBusy
                  ? 'Salvando...'
                  : vm.modal === 'close'
                    ? 'Fechar turno e gerar borderô'
                    : vm.modal === 'withdraw'
                      ? 'Confirmar sangria'
                      : vm.modal === 'open'
                        ? 'Abrir caixa'
                        : 'Salvar taxas e repasses'}
              </button>
            </div>
          </form>
        </Dialog>
      )}
      {vm.reversal && (
        <Dialog
          title="Estornar recebimento"
          subtitle={`${vm.reversal.patientName} · ${money(vm.reversal.settledCents)}`}
          onClose={vm.closeReversal}
        >
          <form
            className="form-content"
            onSubmit={(e) => {
              e.preventDefault();
              if (vm.reversal)
                vm.reverse.mutate({
                  id: vm.reversal.id,
                  reason: String(new FormData(e.currentTarget).get('reason')),
                });
            }}
          >
            <p className="secondary-text">
              O estorno reabre a pendência no prontuário e mantém o lançamento original no
              histórico. Confirme a devolução pelo meio externo utilizado.
            </p>
            <Field label="Motivo do estorno">
              <textarea name="reason" rows={3} required minLength={5} maxLength={500} />
            </Field>
            <Feedback error={vm.reverse.error} />
            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={vm.closeReversal}>
                Cancelar
              </button>
              <button className="btn btn-primary" disabled={vm.reverse.isPending}>
                {vm.reverse.isPending ? 'Estornando...' : 'Confirmar estorno'}
              </button>
            </div>
          </form>
        </Dialog>
      )}
    </>
  );
}
