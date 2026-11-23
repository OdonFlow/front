import { Dialog, Field, Feedback } from '../../../shared/components/ui';
import { money } from '../../finance/model/finance.rules';
import { useSmallExpenseViewModel } from '../viewmodel/useSmallExpenseViewModel';
export function SmallExpense() {
  const vm = useSmallExpenseViewModel();
  return (
    <>
      <button className="btn btn-secondary" onClick={vm.show}>
        Lançar despesa miúda
      </button>
      {vm.success && (
        <span role="status" className="secondary-text">
          Despesa registrada na gestão.
        </span>
      )}
      {vm.open && (
        <Dialog title="Despesa de suprimentos" onClose={vm.close}>
          <form
            className="form-content"
            onSubmit={(e) => {
              e.preventDefault();
              vm.save(new FormData(e.currentTarget));
            }}
          >
            <p className="secondary-text">
              {vm.limited
                ? `Teto autorizado por lançamento: ${money(vm.cap)}.`
                : 'Lançamento gerencial de suprimentos.'}{' '}
              Esta despesa não movimenta dinheiro físico; registre uma sangria separadamente quando
              necessário.
            </p>
            <Field label="Descrição">
              <input name="description" required minLength={3} maxLength={150} />
            </Field>
            <Field label="Valor (R$)">
              <input
                name="amount"
                type="number"
                required
                min="0.01"
                step="0.01"
                max={vm.limited ? vm.cap / 100 : 1000000}
              />
            </Field>
            <Field label="Referência">
              <input name="reference" maxLength={150} />
            </Field>
            <Feedback error={vm.error} />
            <button className="btn btn-primary" disabled={vm.saving}>
              Salvar despesa
            </button>
          </form>
        </Dialog>
      )}
    </>
  );
}
