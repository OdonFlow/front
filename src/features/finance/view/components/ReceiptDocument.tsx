import type { ClinicSettings } from '../../../clinic/model/types';
import type { Receipt } from '../../model/types';
import { methodLabels, money, receiptItems, receiptPayments } from '../../model/finance.rules';
import { ClinicBrand } from '../../../branding/view/ClinicBrand';

export function ReceiptDocument({
  receipt,
  clinic,
}: {
  receipt: Receipt;
  clinic?: ClinicSettings;
}) {
  const items = receiptItems(receipt);
  const payments = receiptPayments(receipt);
  return (
    <article className="finance-document">
      <header className="finance-document-heading">
        <ClinicBrand name={clinic?.name} />
        <div>
          <h2>{receipt.courtesy ? 'Comprovante de cortesia' : 'Recibo de pagamento'}</h2>
          <p>{receipt.number}</p>
        </div>
      </header>
      <p className="secondary-text">
        {clinic?.address}
        <br />
        {clinic?.phone} · {clinic?.email}
      </p>
      {receipt.reversal && (
        <div className="feedback feedback-error">
          <strong>RECIBO ESTORNADO</strong> · {receipt.reversal.reason}
          <br />
          {receipt.reversal.operatorName} · {new Date(receipt.reversal.at).toLocaleString('pt-BR')}
        </div>
      )}
      <div className="document-total">
        <span>{receipt.courtesy ? 'Cortesia integral' : 'Valor liquidado'}</span>
        <strong>{money(receipt.settledCents)}</strong>
      </div>
      <p>
        {receipt.courtesy ? (
          <>
            Registramos o atendimento de <strong>{receipt.patientName}</strong> como cortesia
            integral, sem cobrança ou movimentação financeira.
          </>
        ) : (
          <>
            Recebemos de <strong>{receipt.patientName}</strong> o valor de{' '}
            <strong>{money(receipt.settledCents)}</strong>, dando quitação integral dos
            procedimentos relacionados abaixo.
          </>
        )}
      </p>
      <div className="table-scroll receipt-items">
        <table>
          <thead>
            <tr>
              <th>Serviço / executor</th>
              <th>Qtd.</th>
              <th>Unitário</th>
              <th>Desconto</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.treatmentId}>
                <td>
                  <strong>{item.procedure}</strong>
                  {item.tooth ? ` · Dente ${item.tooth}` : ''}
                  <span className="ledger-detail">{item.dentistName}</span>
                </td>
                <td>{item.quantity}</td>
                <td>{money(item.unitPriceCents)}</td>
                <td>{money(item.discountCents)}</td>
                <td>{money(item.netCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <dl className="document-details">
        <div>
          <dt>Subtotal / desconto</dt>
          <dd>
            {money(receipt.grossCents)} / {money(receipt.discountCents)}
          </dd>
        </div>
        <div>
          <dt>Recebido em</dt>
          <dd>{new Date(receipt.paidAt).toLocaleString('pt-BR')}</dd>
        </div>
        <div>
          <dt>Registrado por</dt>
          <dd>{receipt.operatorName}</dd>
        </div>
        <div>
          <dt>Registro</dt>
          <dd>{receipt.id}</dd>
        </div>
      </dl>
      {payments.length > 0 && (
        <>
          <h3>Formas de recebimento externo</h3>
          {payments.map((payment) => (
            <div className="receipt-payment" key={payment.method}>
              <strong>
                {methodLabels[payment.method]} · {money(payment.amountCents)}
              </strong>
              <p>
                {payment.method === 'credit' ? `${payment.installments}x na maquininha · ` : ''}
                {payment.destination}
              </p>
              {payment.proof && <p>NSU / comprovante: {payment.proof}</p>}
              {payment.method === 'cash' && (
                <p>
                  Valor entregue: {money(payment.tenderedCents)} · Troco:{' '}
                  {money(payment.changeCents)}
                </p>
              )}
            </div>
          ))}
        </>
      )}
      {receipt.authorizationReason && (
        <p className="secondary-text mt-4">
          Justificativa do ajuste / cortesia: {receipt.authorizationReason}
          {receipt.authorizedByName && ` · Autorizado por: ${receipt.authorizedByName}`}
        </p>
      )}
      <div className="document-signature">
        <span>{receipt.operatorName}</span>
        <p>Assinatura do responsável pelo atendimento</p>
      </div>
    </article>
  );
}
