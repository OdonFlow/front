import type { Database, MedicalRecord, Treatment, User } from '../../clinic/model/types.ts';
import { localDate } from '../../clinic/model/fixtures.ts';
import { calculateCheckout, validatePaymentParts } from './checkout.rules.ts';
import { isCents, paidReceipt, receiptPayments } from './finance.rules.ts';
import { pendingReceivables } from './finance.mock.ts';
import type { CheckoutInput, CheckoutLineInput, Receipt, ReceiptLine } from './types.ts';

export function settleCheckout(db: Database, input: CheckoutInput, actor?: User): Receipt {
  const finance = db.finance;
  if (!finance) throw new Error('O financeiro não foi inicializado.');
  if (!Array.isArray(input.lines) || !Array.isArray(input.payments))
    throw new Error('Informe os serviços e os meios de pagamento da comanda.');
  if (typeof input.requestId !== 'string' || input.requestId.trim().length < 8)
    throw new Error('Identificador de lançamento inválido. Atualize a comanda.');
  const fingerprint = JSON.stringify({
    patientId: input.patientId,
    appointmentId: input.appointmentId,
    shiftId: input.shiftId,
    lines: input.lines.map((l) => [
      l.key,
      l.treatmentId,
      l.serviceId,
      l.dentistId,
      l.tooth,
      l.quantity,
      l.unitPriceCents,
    ]),
    payments: input.payments.map((p) => [
      p.method,
      p.amountCents,
      p.tenderedCents,
      p.installments,
      p.proof,
      p.destination,
      p.pixVerified,
    ]),
    discountCents: input.discountCents,
    courtesy: input.courtesy,
    authorizationReason: input.authorizationReason,
    authorizedBy: input.authorizedBy,
    paidAt: input.paidAt,
  });
  const previousRequest = finance.checkoutRequests?.[input.requestId];
  if (previousRequest) {
    if (previousRequest.fingerprint !== fingerprint)
      throw new Error('Este lançamento já foi processado com outros dados. Inicie um novo acerto.');
    const previous = finance.receipts.find((r) => r.id === previousRequest.receiptId);
    if (!previous) throw new Error('Registro de lançamento não encontrado.');
    return previous;
  }
  const shift = finance.shifts.find((s) => s.id === input.shiftId && !s.closing);
  if (!shift || shift.date !== localDate())
    throw new Error('O caixa está fechado ou pertence a outro dia.');
  const patient = db.patients.find((p) => p.id === input.patientId);
  const record = db.records.find((r) => r.patientId === input.patientId);
  if (!patient || !record) throw new Error('Paciente ou prontuário não encontrado.');
  const appointment = input.appointmentId
    ? db.appointments.find((a) => a.id === input.appointmentId)
    : undefined;
  if (
    input.appointmentId &&
    (!appointment ||
      appointment.patientId !== input.patientId ||
      appointment.status === 'cancelled' ||
      appointment.date > localDate())
  )
    throw new Error('Selecione um atendimento válido deste paciente, sem data futura.');
  if (
    appointment &&
    finance.receipts.some((r) => r.appointmentId === appointment.id && !r.reversal)
  )
    throw new Error('Este atendimento já foi acertado no caixa.');
  const date = new Date(input.paidAt);
  if (
    !Number.isFinite(date.getTime()) ||
    date.getTime() > Date.now() ||
    date.getTime() < Math.floor(new Date(shift.openedAt).getTime() / 60000) * 60000 ||
    localDate(date) !== shift.date
  )
    throw new Error(
      'A data do recebimento deve estar dentro do turno aberto e não pode ser futura.',
    );
  if (!Array.isArray(input.lines) || input.lines.length > 100)
    throw new Error('A comanda deve conter até 100 serviços.');
  let requested = input.lines;
  if (!requested.length) {
    if (!input.courtesy || !appointment) throw new Error('Adicione ao menos um serviço executado.');
    const priorEvaluation = record.treatments.find(
      (t) =>
        t.appointmentId === appointment.id && t.price === 0 && !paidReceipt(finance.receipts, t.id),
    );
    requested = [
      {
        key: 'free-evaluation',
        treatmentId: priorEvaluation?.id,
        dentistId: priorEvaluation?.dentistId ?? appointment.dentistId,
        tooth: 0,
        quantity: 1,
        unitPriceCents: 0,
      },
    ];
  }
  const used = new Set<string>();
  let needsAuthorization = input.courtesy || input.discountCents > 0;
  const pending = pendingReceivables(db);
  const staged: Treatment[] = [];
  const lines: ReceiptLine[] = requested.map((entry: CheckoutLineInput) => {
    if (!entry.key || used.has(entry.key) || (entry.treatmentId && used.has(entry.treatmentId)))
      throw new Error('A comanda contém um procedimento duplicado.');
    used.add(entry.key);
    if (entry.treatmentId) used.add(entry.treatmentId);
    const dentist = db.users.find((u) => u.id === entry.dentistId && u.role === 'dentist');
    if (!dentist) throw new Error('Selecione o dentista executor de cada serviço.');
    if (
      !Number.isInteger(entry.quantity) ||
      entry.quantity < 1 ||
      entry.quantity > 100 ||
      !isCents(entry.unitPriceCents) ||
      entry.unitPriceCents > 100000000
    )
      throw new Error('Revise quantidade e valor unitário dos serviços.');
    if (
      !Number.isInteger(entry.tooth) ||
      (entry.tooth !== 0 && ![1, 2, 3, 4].includes(Math.floor(entry.tooth / 10))) ||
      entry.tooth % 10 > 8 ||
      (entry.tooth !== 0 && entry.tooth % 10 < 1)
    )
      throw new Error('Informe um dente FDI válido ou deixe sem dente específico.');
    let treatment = entry.treatmentId
      ? record.treatments.find((t) => t.id === entry.treatmentId)
      : undefined;
    let name: string;
    let rate: number;
    let serviceId: string | undefined;
    if (entry.treatmentId) {
      const receivable = pending.find(
        (r) => r.treatmentId === entry.treatmentId && r.patientId === patient.id,
      );
      if (!treatment || !receivable || paidReceipt(finance.receipts, entry.treatmentId))
        throw new Error('Procedimento indisponível ou já quitado. Atualize a comanda.');
      if (entry.dentistId !== receivable.dentistId || entry.tooth !== treatment.tooth)
        throw new Error('O executor e o dente do procedimento devem corresponder ao prontuário.');
      if (
        entry.unitPriceCents !==
          (treatment.unitPriceCents ??
            Math.round(treatment.price * 100) / (treatment.quantity ?? 1)) ||
        entry.quantity !== (treatment.quantity ?? 1)
      )
        needsAuthorization = true;
      name = treatment.procedure;
      rate = receivable.commissionRate;
      serviceId = treatment.serviceId;
    } else {
      const service = db.services?.find((s) => s.id === entry.serviceId && s.active);
      if (!service && !(input.courtesy && !input.lines.length && appointment))
        throw new Error('O serviço não está disponível no catálogo.');
      if (service && entry.unitPriceCents !== service.priceCents) needsAuthorization = true;
      name = service?.name ?? 'Avaliação clínica (cortesia)';
      rate = service?.commissionRate ?? 0;
      serviceId = service?.id;
    }
    if (!treatment)
      treatment = {
        id: crypto.randomUUID(),
        patientId: patient.id,
        tooth: entry.tooth,
        procedure: name,
        price: 0,
        completed: true,
      };
    if (!Number.isFinite(rate) || rate < 0 || rate > 100)
      throw new Error('O percentual de repasse do procedimento é inválido.');
    const grossCents = entry.unitPriceCents * entry.quantity;
    staged.push({
      ...treatment,
      price: grossCents / 100,
      quantity: entry.quantity,
      unitPriceCents: entry.unitPriceCents,
      serviceId,
      commissionRate: rate,
      dentistId: dentist.id,
      completed: true,
      completedAt: treatment.completedAt ?? new Date().toISOString(),
      appointmentId: treatment.appointmentId ?? appointment?.id,
    });
    return {
      treatmentId: treatment.id,
      patientId: patient.id,
      patientName: patient.name,
      dentistId: dentist.id,
      dentistName: dentist.name,
      procedure: name,
      tooth: entry.tooth,
      grossCents,
      commissionRate: rate,
      serviceId,
      quantity: entry.quantity,
      unitPriceCents: entry.unitPriceCents,
      discountCents: 0,
      netCents: grossCents,
      commissionCents: 0,
    };
  });
  const gross = lines.reduce((sum, line) => sum + line.grossCents, 0);
  if (!isCents(input.discountCents) || input.discountCents > gross)
    throw new Error('O desconto não pode superar o subtotal.');
  const discount = input.courtesy ? gross : input.discountCents;
  if (gross - discount === 0) needsAuthorization = true;
  if (
    needsAuthorization &&
    (!db.users.some((u) => u.id === input.authorizedBy) ||
      input.authorizationReason.trim().length < 5)
  )
    throw new Error(
      'Informe o responsável pela autorização e uma justificativa para o desconto, ajuste ou cortesia.',
    );
  validatePaymentParts(input.payments, gross - discount, finance.configuration);
  const normalizedPayments = input.payments.map((p) => ({
    ...p,
    proof: p.method === 'cash' ? '' : p.proof.trim(),
    destination: p.method === 'cash' ? 'Gaveta do caixa' : p.destination.trim(),
    tenderedCents: p.method === 'cash' ? p.tenderedCents : p.amountCents,
  }));
  for (const payment of normalizedPayments)
    if (
      payment.method !== 'cash' &&
      finance.receipts.some(
        (r) =>
          !r.reversal &&
          localDate(new Date(r.paidAt)) === shift.date &&
          receiptPayments(r).some(
            (p) =>
              p.method === payment.method &&
              p.proof.trim().toLowerCase() === payment.proof.toLowerCase() &&
              p.destination.trim().toLowerCase() === payment.destination.toLowerCase(),
          ),
      )
    )
      throw new Error('Este comprovante já está vinculado a um recebimento.');
  const totals = calculateCheckout(lines, discount, normalizedPayments, finance.configuration);
  if (totals.clinicCents < 0)
    throw new Error('As taxas e os repasses não podem superar o total recebido.');
  const first = totals.lines[0];
  const payment = totals.payments[0];
  const receipt: Receipt = {
    ...first,
    settledCents: totals.settledCents,
    feeCents: totals.feeCents,
    commissionCents: totals.commissionCents,
    clinicCents: totals.clinicCents,
    id: crypto.randomUUID(),
    items: totals.lines,
    payments: totals.payments,
    number: `REC-${shift.date.replaceAll('-', '')}-${String(finance.receipts.length + 1).padStart(4, '0')}`,
    procedure: lines.length === 1 ? first.procedure : `${lines.length} serviços executados`,
    dentistName: totals.commissions.length === 1 ? first.dentistName : 'Múltiplos profissionais',
    grossCents: totals.grossCents,
    discountCents: discount,
    shiftId: shift.id,
    method: payment?.method ?? 'cash',
    tenderedCents: payment?.tenderedCents ?? 0,
    installments: payment?.installments ?? 1,
    proof: payment?.proof.trim() ?? '',
    destination: payment?.destination ?? 'Cortesia — sem movimentação',
    paidAt: date.toISOString(),
    recordedAt: new Date().toISOString(),
    operatorId: actor?.id ?? shift.operatorId,
    operatorName: actor?.name ?? shift.operatorName,
    feeRate: payment?.feeRate ?? 0,
    changeCents: totals.payments.reduce((sum, p) => sum + p.changeCents, 0),
    appointmentId: appointment?.id,
    courtesy: totals.settledCents === 0,
    authorizationReason: needsAuthorization ? input.authorizationReason.trim() : undefined,
    authorizedBy: needsAuthorization ? input.authorizedBy : undefined,
    authorizedByName: needsAuthorization
      ? db.users.find((u) => u.id === input.authorizedBy)?.name
      : undefined,
  };
  // Commit only after every item, payment and authorization passes validation.
  const next: MedicalRecord = {
    ...record,
    treatments: [...record.treatments.filter((t) => !staged.some((s) => s.id === t.id)), ...staged],
  };
  db.records[db.records.indexOf(record)] = next;
  finance.receipts.push(receipt);
  finance.checkoutRequests ??= {};
  finance.checkoutRequests[input.requestId] = { receiptId: receipt.id, fingerprint };
  if (appointment) appointment.status = 'completed';
  return receipt;
}
