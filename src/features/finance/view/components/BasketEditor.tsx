import { Field } from '../../../../shared/components/ui';
import { Icon } from '../../../../shared/components/Icon';
import { ServicePicker } from '../../../services/view/components/ServicePicker';
import { money } from '../../model/finance.rules';
import type { useReceiptViewModel } from '../../viewmodel/useReceiptViewModel';

type BasketModel = Pick<
  ReturnType<typeof useReceiptViewModel>,
  | 'lines'
  | 'setLine'
  | 'removeLine'
  | 'dentists'
  | 'services'
  | 'serviceId'
  | 'setServiceId'
  | 'addService'
  | 'pendingItems'
  | 'addPending'
  | 'plannedService'
  | 'draft'
  | 'setDraft'
  | 'needsAuthorization'
  | 'users'
  | 'appointment'
>;
export function BasketEditor({ vm }: { vm: BasketModel }) {
  return (
    <section className="panel basket-editor">
      <div className="section-heading">
        <h2>Serviços executados</h2>
        <span className="secondary-text">Cálculo automático</span>
      </div>
      {vm.plannedService && (
        <div className="planned-service">
          <div>
            <strong>Previsto na agenda: {vm.plannedService.name}</strong>
            <p>
              {vm.plannedService.active
                ? 'Confirme somente se este serviço foi realizado.'
                : 'Serviço inativo. Selecione um serviço disponível no catálogo.'}
            </p>
          </div>
          <button
            type="button"
            className="text-button"
            disabled={!vm.plannedService.active}
            onClick={() => vm.addService(vm.plannedService?.id)}
          >
            Confirmar serviço executado
          </button>
        </div>
      )}
      <div className="basket-lines">
        {vm.lines.map((line, index) => (
          <article className="basket-line" key={line.key}>
            <div className="basket-line-heading">
              <div>
                <strong>{line.name}</strong>
                <p>
                  Repasse {line.rate}%{line.unavailable && ' · Indisponível'}
                </p>
              </div>
              <strong>{money(line.item.grossCents)}</strong>
              <button
                type="button"
                className="icon-button"
                aria-label={`Remover ${line.name}`}
                onClick={() => vm.removeLine(line.key)}
              >
                <Icon name="close" size={17} />
              </button>
            </div>
            <div className="basket-line-fields">
              <Field label="Quantidade">
                <input
                  name={`quantity-${index}`}
                  type="number"
                  min="1"
                  max="100"
                  required
                  value={line.quantity}
                  onChange={(e) => vm.setLine(line.key, { quantity: e.target.value })}
                />
              </Field>
              <Field label="Valor unitário (R$)">
                <input
                  name={`unitPrice-${index}`}
                  inputMode="decimal"
                  required
                  pattern="[0-9]+([.,][0-9]{1,2})?"
                  value={line.unitPrice}
                  onChange={(e) => vm.setLine(line.key, { unitPrice: e.target.value })}
                />
              </Field>
              <Field label="Dente (opcional)">
                <select
                  name={`tooth-${index}`}
                  value={line.tooth}
                  disabled={Boolean(line.treatmentId)}
                  onChange={(e) => vm.setLine(line.key, { tooth: e.target.value })}
                >
                  <option value="0">Sem dente específico</option>
                  {[1, 2, 3, 4]
                    .flatMap((q) => Array.from({ length: 8 }, (_, i) => q * 10 + i + 1))
                    .map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                </select>
              </Field>
            </div>
            <Field label="Dentista executor">
              <select
                name={`dentist-${index}`}
                value={line.dentistId}
                disabled={Boolean(line.treatmentId)}
                required
                onChange={(e) => vm.setLine(line.key, { dentistId: e.target.value })}
              >
                {vm.dentists.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </Field>
          </article>
        ))}
      </div>
      {!vm.lines.length && (
        <p className="basket-empty">
          Confirme o serviço previsto ou adicione os procedimentos realizados na sessão.
        </p>
      )}
      <div className="basket-add">
        <ServicePicker
          services={vm.services}
          value={vm.serviceId}
          onChange={vm.setServiceId}
          label="Adicionar outro serviço do catálogo"
        />
        <button
          type="button"
          className="btn btn-secondary"
          disabled={!vm.serviceId}
          onClick={() => vm.addService()}
        >
          <Icon name="plus" size={17} />
          Adicionar serviço
        </button>
      </div>
      {vm.pendingItems.some((p) => !vm.lines.some((l) => l.treatmentId === p.treatmentId)) && (
        <details className="pending-to-basket">
          <summary>Incluir pendências já concluídas no prontuário</summary>
          {vm.pendingItems
            .filter((p) => !vm.lines.some((l) => l.treatmentId === p.treatmentId))
            .map((p) => (
              <button
                type="button"
                className="pending-basket-item"
                key={p.treatmentId}
                onClick={() => vm.addPending(p)}
              >
                <span>
                  {p.procedure}
                  {p.tooth ? ` · Dente ${p.tooth}` : ''}
                  <small>{p.dentistName}</small>
                </span>
                <strong>{money(p.grossCents)}</strong>
                <Icon name="plus" size={16} />
              </button>
            ))}
        </details>
      )}
      <div className="basket-discount">
        <Field label="Desconto autorizado (R$)">
          <input
            name="discount"
            inputMode="decimal"
            value={vm.draft.discount}
            onChange={(e) => vm.setDraft({ discount: e.target.value })}
            required={!vm.draft.courtesy}
            disabled={vm.draft.courtesy}
            pattern="[0-9]+([.,][0-9]{1,2})?"
          />
        </Field>
        {(vm.appointment || vm.lines.length > 0) && (
          <label className="checkbox-label courtesy-checkbox">
            <input
              type="checkbox"
              name="courtesy"
              checked={vm.draft.courtesy}
              onChange={(e) => vm.setDraft({ courtesy: e.target.checked })}
            />
            {vm.lines.length
              ? 'Conceder cortesia integral'
              : 'Encerrar avaliação gratuita (R$ 0,00)'}
          </label>
        )}
      </div>
      {vm.needsAuthorization && (
        <div className="discount-authorization">
          <Field label="Autorizado por">
            <select
              name="authorizedBy"
              value={vm.draft.authorizedBy}
              required
              onChange={(e) => vm.setDraft({ authorizedBy: e.target.value })}
            >
              <option value="">Selecione o responsável</option>
              {vm.users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Justificativa do desconto, ajuste ou cortesia">
            <textarea
              name="authorizationReason"
              rows={3}
              minLength={5}
              maxLength={1000}
              required
              value={vm.draft.authorizationReason}
              onChange={(e) => vm.setDraft({ authorizationReason: e.target.value })}
            />
          </Field>
        </div>
      )}
    </section>
  );
}
