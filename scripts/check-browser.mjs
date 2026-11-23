import { spawn } from 'node:child_process';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import { Buffer } from 'node:buffer';
import { setTimeout as pause } from 'node:timers/promises';
import assert from 'node:assert/strict';

// Optional smoke test: uses an already installed Chrome, without browser dependencies.
const origin = process.env.APP_URL || 'http://127.0.0.1:5173';
const chromePath =
  process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const profile = await mkdtemp(join(tmpdir(), 'odontoflow-browser-'));
const chrome = spawn(
  chromePath,
  [
    '--headless',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--remote-debugging-port=0',
    `--user-data-dir=${profile}`,
    'about:blank',
  ],
  { windowsHide: true, stdio: 'ignore' },
);
let socket;
let sequence = 0;
const pending = new Map();
const errors = [];

try {
  chrome.on('error', (error) => errors.push(error.message));
  let port;
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      port = Number((await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]);
      break;
    } catch {
      await pause(100);
    }
  }
  assert.ok(port, `Chrome não iniciou: ${errors.join(', ')}`);
  const target = await (
    await globalThis.fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })
  ).json();
  socket = new globalThis.WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(String(data));
    if (message.id) {
      const entry = pending.get(message.id);
      if (entry) {
        globalThis.clearTimeout(entry.timer);
        pending.delete(message.id);
        if (message.error) entry.reject(new Error(message.error.message));
        else entry.resolve(message.result);
      }
    }
    if (message.method === 'Runtime.exceptionThrown')
      errors.push(
        message.params.exceptionDetails.exception?.description ||
          message.params.exceptionDetails.text,
      );
  });
  function command(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++sequence;
      const timer = globalThis.setTimeout(() => {
        pending.delete(id);
        reject(new Error(`Timeout: ${method}`));
      }, 15000);
      pending.set(id, { resolve, reject, timer });
      socket.send(JSON.stringify({ id, method, params }));
    });
  }
  async function evaluate(expression) {
    const result = await command('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (result.exceptionDetails)
      throw new Error(result.exceptionDetails.exception?.description || 'Erro no navegador');
    return result.result.value;
  }
  async function waitFor(expression) {
    for (let i = 0; i < 100; i++) {
      if (await evaluate(`Boolean(${expression})`)) return;
      await pause(100);
    }
    await screenshot('failure.png');
    process.stdout.write(`Estado da página: ${await evaluate('document.body.innerText')}\n`);
    throw new Error(`Timeout esperando: ${expression}`);
  }
  async function navigate(path) {
    await evaluate(`window.__odontoflowNavigation=true`);
    await command('Page.navigate', { url: `${origin}${path}` });
    await waitFor(
      `!window.__odontoflowNavigation && document.querySelector('h1') && !document.querySelector('.spinner') && !document.querySelector('.empty-state[role="alert"]')`,
    );
    await pause(100);
  }
  async function reloadPage() {
    await evaluate(`window.__odontoflowNavigation=true`);
    await command('Page.reload');
    await waitFor(
      `!window.__odontoflowNavigation && document.querySelector('h1') && !document.querySelector('.spinner')`,
    );
    await pause(100);
  }
  async function screenshot(name) {
    const result = await command('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: true,
    });
    const path = join(profile, name);
    await writeFile(path, Buffer.from(result.data, 'base64'));
    process.stdout.write(`Screenshot: ${path}\n`);
  }
  async function clickText(text) {
    assert.ok(
      await evaluate(
        `(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(text)});b?.click();return !!b})()`,
      ),
      `Botão ausente: ${text}`,
    );
  }
  async function fillForm(values) {
    await evaluate(
      `(()=>{const f=document.querySelector('dialog[open] form');for(const [k,v] of Object.entries(${JSON.stringify(values)})){const field=f.elements.namedItem(k);if(!field)throw new Error('Campo ausente: '+k);const prototype=field.tagName==='SELECT'?HTMLSelectElement.prototype:field.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(prototype,'value').set.call(field,v);field.dispatchEvent(new Event(field.tagName==='SELECT'?'change':'input',{bubbles:true}));}f.requestSubmit()})()`,
    );
  }
  async function setInput(selector, value) {
    await evaluate(
      `(()=>{const field=document.querySelector(${JSON.stringify(selector)});if(!field)throw new Error('Campo ausente');const prototype=field.tagName==='SELECT'?HTMLSelectElement.prototype:field.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(prototype,'value').set.call(field,${JSON.stringify(String(value))});field.dispatchEvent(new Event(field.tagName==='SELECT'?'change':'input',{bubbles:true}))})()`,
    );
  }
  async function closeDocument() {
    await evaluate(`document.querySelector('dialog[open] [aria-label="Fechar"]').click()`);
    await waitFor(`!document.querySelector('dialog[open]')`);
  }
  async function chooseService(container, name) {
    const selector = `${container} input[role="combobox"]`;
    await evaluate(`document.querySelector(${JSON.stringify(selector)}).focus()`);
    await setInput(selector, name);
    await waitFor(
      `[...document.querySelectorAll('[role="option"] strong')].some(e=>e.textContent===${JSON.stringify(name)})`,
    );
    await evaluate(
      `(()=>{const item=[...document.querySelectorAll('[role="option"]')].find(e=>e.querySelector('strong')?.textContent===${JSON.stringify(name)});item.click()})()`,
    );
  }

  async function signIn(email, password = 'Odonto123!') {
    await navigate('/login');
    await setInput('input[name="email"]', email);
    await setInput('input[name="password"]', password);
    await evaluate(`document.querySelector('.auth-form').requestSubmit()`);
    await waitFor(
      `location.pathname!=='/login' && !!document.querySelector('.sidebar') && !document.querySelector('.spinner')`,
    );
  }
  await command('Page.enable');
  await command('Runtime.enable');
  await command('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await navigate('/agenda');
  await waitFor(`location.pathname==='/login'`);
  await screenshot('login-desktop.png');
  await signIn('admin@odontoflow.com');
  await waitFor(
    `location.pathname==='/gestao-financeira' && document.querySelectorAll('.management-kpi').length===4`,
  );
  await navigate('/agenda');
  await waitFor(`document.querySelectorAll('.appointment').length===11`);
  assert.equal(await evaluate(`document.querySelectorAll('.waiting-item').length`), 3);
  await screenshot('agenda-desktop.png');
  await clickText('Chamar paciente');
  await waitFor(`document.querySelectorAll('.waiting-item').length===2`);
  await clickText('Novo agendamento');
  await waitFor(`!!document.querySelector('dialog[open]')`);
  await fillForm({
    patientId: 'p12',
    dentistId: 'd1',
    time: '17:00',
    duration: '30',
    procedure: 'Consulta de teste no navegador',
  });
  await waitFor(
    `!document.querySelector('dialog[open]') && document.querySelectorAll('.appointment').length===12`,
  );
  process.stdout.write('PASS: agenda, chamada da fila e novo agendamento\n');

  await navigate('/pacientes');
  assert.equal(await evaluate(`document.querySelectorAll('tbody tr').length`), 12);
  await clickText('Novo paciente');
  await waitFor(`!!document.querySelector('dialog[open]')`);
  await fillForm({
    name: 'Ana Teste Navegador',
    birthDate: '1995-06-12',
    phone: '(85) 99999-1234',
    email: 'ana@exemplo.com',
    dentistId: 'd1',
  });
  await waitFor(
    `!document.querySelector('dialog[open]') && document.querySelectorAll('tbody tr').length===13`,
  );
  await navigate('/pacientes?q=Ana%20Teste');
  assert.equal(await evaluate(`document.querySelectorAll('tbody tr').length`), 1);
  await screenshot('pacientes-desktop.png');
  process.stdout.write('PASS: cadastro, persistência e busca de pacientes\n');

  await navigate('/prontuarios?patient=p12&tab=evolution');
  assert.equal(await evaluate(`document.querySelectorAll('.tooth-button').length`), 32);
  await evaluate(`document.querySelector('[aria-label^="Dente 11:"]').click()`);
  await waitFor(`!!document.querySelector('dialog[open]')`);
  await clickText('Implante');
  await waitFor(
    `!document.querySelector('dialog[open]') && !!document.querySelector('[aria-label="Dente 11: Implante. Editar condição."]')`,
  );
  await clickText('Nova evolução');
  await waitFor(`!!document.querySelector('dialog[open]')`);
  await fillForm({ dentistId: 'd1', description: 'Evolução de teste no navegador.' });
  await waitFor(
    `!document.querySelector('dialog[open]') && document.querySelectorAll('.evolution-card').length===4`,
  );
  await screenshot('prontuario-desktop.png');
  for (const [tab, expected] of [
    ['Anamnese', '.anamnesis-panel'],
    ['Plano de tratamento', '.treatment-total'],
    ['Prescrições', '.prescription-card'],
  ]) {
    await clickText(tab);
    await waitFor(`!!document.querySelector('${expected}')`);
  }
  process.stdout.write('PASS: odontograma, evolução clínica e abas do prontuário\n');

  await clickText('Nova prescrição');
  await waitFor(`!!document.querySelector('dialog[open]')`);
  await fillForm({
    dentistId: 'd1',
    medication: 'Produto fictício de teste',
    instructions: 'Orientação fictícia para teste da interface.',
  });
  await waitFor(
    `!document.querySelector('dialog[open]') && document.querySelectorAll('.prescription-card').length===2`,
  );
  await clickText('Plano de tratamento');
  await waitFor(`!!document.querySelector('.treatment-total')`);
  await clickText('Adicionar procedimento');
  await waitFor(`!!document.querySelector('dialog[open]')`);
  await fillForm({ tooth: '11', procedure: 'Procedimento de teste', price: '150' });
  await waitFor(
    `!document.querySelector('dialog[open]') && document.querySelectorAll('tbody tr').length===4`,
  );
  await clickText('Concluir');
  await waitFor(
    `document.querySelectorAll('button.text-button').item(1)?.textContent.trim()==='Reabrir'`,
  );
  await clickText('Anamnese');
  await waitFor(`!!document.querySelector('.anamnesis-panel')`);
  await evaluate(
    `(()=>{const f=document.querySelector('.anamnesis-panel form');f.elements.namedItem('notes').value='Anamnese de teste no navegador';f.requestSubmit()})()`,
  );
  await waitFor(`document.querySelector('.anamnesis-panel .btn-primary')?.disabled===true`);
  await waitFor(
    `document.querySelector('.anamnesis-panel .btn-primary')?.disabled===false && !!document.querySelector('.feedback-success')`,
  );
  await navigate('/prontuarios?patient=p12&tab=anamnesis');
  assert.equal(
    await evaluate(`document.querySelector('[name="notes"]').value`),
    'Anamnese de teste no navegador',
  );
  process.stdout.write('PASS: prescrição, procedimento, conclusão e anamnese persistida\n');

  await navigate('/dentistas');
  assert.equal(await evaluate(`document.querySelectorAll('.dentist-card').length`), 3);

  await clickText('Novo profissional');
  await waitFor(`!!document.querySelector('dialog[open]')`);
  await fillForm({
    name: 'Dra. Ana Teste',
    email: 'dentista-teste@exemplo.com',
    specialty: 'Clínica geral',
    cro: 'CRO-CE 98765',
  });
  await waitFor(
    `!document.querySelector('dialog[open]') && document.querySelectorAll('.dentist-card').length===4`,
  );
  await navigate('/configuracoes');
  assert.ok(await evaluate(`!!document.querySelector('[name="openingTime"]')`));

  await evaluate(
    `(()=>{const f=document.querySelector('.settings-form');f.elements.namedItem('name').value='OdontoFlow Teste';f.requestSubmit()})()`,
  );
  await waitFor(`document.querySelector('.brand').textContent.includes('OdontoFlow Teste')`);
  await navigate('/pacientes?q=sem-resultado-inexistente');
  assert.ok(await evaluate(`document.body.textContent.includes('Nenhum resultado encontrado')`));
  await navigate('/agenda?date=2026-13-99');
  assert.equal(
    await evaluate(`document.querySelector('input[type="date"]').value`),
    new Date().toLocaleDateString('en-CA'),
  );
  process.stdout.write('PASS: cadastro de dentista, configurações, estado vazio e URL inválida\n');
  await navigate('/financeiro');
  assert.equal(await evaluate(`document.querySelectorAll('.finance-ledger tbody tr').length`), 4);
  await screenshot('financeiro-desktop.png');
  await navigate('/financeiro/recebimentos');
  await setInput('[aria-label="Selecionar pendência"]', 't-p5-1');
  await waitFor(`!!document.querySelector('.payment-layout')`);
  assert.ok(await evaluate(`location.search.includes('t-p5-1')`));
  await screenshot('recebimento-desktop.png');
  await evaluate(`document.querySelector('input[name="method"][value="credit"]').click()`);
  await setInput('[name="installments"]', '3');
  await setInput('[name="proof"]', 'UI-NSU-CREDIT-1');
  await evaluate(`document.querySelector('.payment-layout').requestSubmit()`);
  await waitFor(`!!document.querySelector('dialog[open] .finance-document')`);
  assert.ok(await evaluate(`document.querySelector('dialog[open]').textContent.includes('3x')`));
  await command('Emulation.setEmulatedMedia', { media: 'print' });
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('#root')).display`), 'none');
  assert.equal(
    await evaluate(`getComputedStyle(document.querySelector('.finance-print-document')).display`),
    'block',
  );
  await command('Emulation.setEmulatedMedia', { media: '' });
  await closeDocument();
  await navigate('/prontuarios?patient=p5&tab=treatment');
  await waitFor(`document.querySelector('tbody').textContent.includes('Pago · Ver recibo')`);
  await navigate('/financeiro');
  await evaluate(
    `(()=>{const row=[...document.querySelectorAll('.finance-ledger tbody tr')].find(r=>r.textContent.includes('Clara Menezes'));[...row.querySelectorAll('button')].find(b=>b.textContent.trim()==='Estornar').click()})()`,
  );
  await waitFor(`!!document.querySelector('dialog[open]')`);
  await fillForm({ reason: 'Estorno confirmado no meio externo para teste' });
  await waitFor(
    `!document.querySelector('dialog[open]') && !!document.querySelector('.reversed-receipt')`,
  );
  await navigate('/prontuarios?patient=p5&tab=treatment');
  await waitFor(`document.querySelector('tbody').textContent.includes('Pendente · Receber')`);
  process.stdout.write(
    'PASS: crédito parcelado, recibo para impressão, quitação e estorno no prontuário\n',
  );

  await navigate('/financeiro/recebimentos?patient=p6&treatment=t-p6-1');
  await waitFor(`!!document.querySelector('.payment-layout')`);
  await evaluate(`document.querySelector('input[name="method"][value="cash"]').click()`);
  await setInput('[name="tendered"]', '900.00');
  assert.ok(await evaluate(`document.querySelector('output').textContent.includes('50,00')`));
  await evaluate(`document.querySelector('.payment-layout').requestSubmit()`);
  await waitFor(`!!document.querySelector('dialog[open] .finance-document')`);
  await closeDocument();
  await navigate('/financeiro/recebimentos?patient=p7&treatment=t-p7-1');
  await waitFor(`!!document.querySelector('.payment-layout')`);
  await evaluate(`document.querySelector('input[name="method"][value="pix"]').click()`);
  await setInput('[name="proof"]', 'UI-PIX-1');
  await evaluate(`document.querySelector('[name="pixVerified"]').click()`);
  await evaluate(`document.querySelector('.payment-layout').requestSubmit()`);
  await waitFor(`!!document.querySelector('dialog[open] .finance-document')`);
  await closeDocument();
  await navigate('/financeiro');
  await clickText('Registrar sangria');
  await waitFor(`!!document.querySelector('dialog[open]')`);
  await setInput('[name="amount"]', '500.00');
  await fillForm({ destination: 'safe', reason: 'Recolhimento para o cofre da clínica' });
  await waitFor(
    `!document.querySelector('dialog[open]') && !!document.querySelector('.withdrawal-row')`,
  );
  await clickText('Conferir e fechar turno');
  await waitFor(`!!document.querySelector('.closing-counts')`);
  const counts = await evaluate(
    `[...document.querySelectorAll('.closing-counts > div')].map(row=>({name:row.querySelector('input').name,value:row.querySelector('p').textContent.split(' · ')[0].replace(/[^0-9,]/g,'').replace(',','.')}))`,
  );
  for (const field of counts) await setInput(`[name="${field.name}"]`, field.value);
  await evaluate(`document.querySelector('dialog[open] input[type="checkbox"]').click()`);
  await fillForm({ signature: 'Juliana Santos', reason: '' });
  await waitFor(`!!document.querySelector('dialog[open] .finance-report')`);
  assert.ok(
    await evaluate(
      `document.querySelector('dialog[open] .finance-report').textContent.includes('Recolhimento para o cofre')`,
    ),
  );
  await screenshot('bordero-desktop.png');
  await closeDocument();
  await navigate('/financeiro/recebimentos');
  assert.ok(
    await evaluate(
      `document.body.textContent.includes('Abra o caixa para registrar novos recebimentos.')`,
    ),
  );
  await navigate('/financeiro');
  await clickText('Abrir caixa');
  await waitFor(`!!document.querySelector('dialog[open]')`);
  await fillForm({ opening: '100.00' });
  await waitFor(
    `!document.querySelector('dialog[open]') && !!document.querySelector('.shift-summary')`,
  );
  process.stdout.write(
    'PASS: dinheiro com troco, Pix validado, sangria, fechamento, borderô e novo turno\n',
  );
  await navigate('/servicos');
  assert.equal(await evaluate(`document.querySelectorAll('.services-table tbody tr').length`), 8);
  await clickText('Novo serviço');
  await waitFor(`!!document.querySelector('dialog[open]')`);
  await setInput('dialog [name="price"]', '220.00');
  await setInput('dialog [name="commissionRate"]', '40');
  assert.ok(
    await evaluate(
      `document.querySelector('dialog .cash-available strong').textContent.includes('88,00')`,
    ),
  );
  await screenshot('catalogo-cadastro-desktop.png');
  await fillForm({ name: 'Serviço Teste Integrado', category: 'Clínica Geral', duration: '45' });
  await waitFor(
    `!document.querySelector('dialog[open]') && document.querySelectorAll('.services-table tbody tr').length===9`,
  );
  await setInput('[aria-label="Buscar serviço..."]', 'servico teste integrado');
  await waitFor(`document.querySelectorAll('.services-table tbody tr').length===1`);
  await clickText('Editar');
  await waitFor(`!!document.querySelector('dialog[open]')`);
  await setInput('dialog [name="price"]', '250.00');
  await setInput('dialog [name="commissionRate"]', '45');
  await evaluate(`document.querySelector('dialog form').requestSubmit()`);
  await waitFor(
    `!document.querySelector('dialog[open]') && document.querySelector('.services-table').textContent.includes('250,00')`,
  );
  await screenshot('catalogo-desktop.png');

  await navigate('/agenda');
  await clickText('Novo agendamento');
  await waitFor(`!!document.querySelector('dialog[open]')`);
  await chooseService('dialog', 'Serviço Teste Integrado');
  assert.equal(await evaluate(`document.querySelector('dialog [name="duration"]').value`), '45');
  await screenshot('agendamento-servico-desktop.png');
  await fillForm({
    patientId: 'p12',
    dentistId: 'd2',
    time: '16:00',
    reason: 'Serviço conhecido na marcação',
  });
  await waitFor(
    `!document.querySelector('dialog[open]') && document.querySelectorAll('.appointment').length===13`,
  );
  await clickText('Novo agendamento');
  await waitFor(`!!document.querySelector('dialog[open]')`);
  assert.equal(await evaluate(`document.querySelector('dialog [name="serviceId"]').value`), '');
  await fillForm({
    patientId: 'p11',
    dentistId: 'd2',
    time: '17:00',
    duration: '30',
    reason: 'Avaliação sem procedimento definido',
  });
  await waitFor(
    `!document.querySelector('dialog[open]') && document.querySelectorAll('.appointment').length===14`,
  );
  await evaluate(
    `(()=>{const card=[...document.querySelectorAll('.appointment')].find(a=>a.textContent.includes('Larissa Fontes')&&a.textContent.includes('17:00'));card.click()})()`,
  );
  await waitFor(`!!document.querySelector('dialog[open]')`);
  await evaluate(
    `(()=>{const link=[...document.querySelectorAll('dialog a')].find(a=>a.textContent==='Acertar atendimento no caixa');link.click()})()`,
  );
  await waitFor(`!!document.querySelector('.checkout-layout')`);
  await evaluate(`document.querySelector('[name="courtesy"]').click()`);
  await setInput('[name="authorizedBy"]', 'u1');
  await setInput(
    '[name="authorizationReason"]',
    'Avaliação inicial gratuita autorizada pela clínica',
  );
  await evaluate(`document.querySelector('.payment-layout').requestSubmit()`);
  await waitFor(`!!document.querySelector('dialog[open] .finance-document')`);
  assert.ok(
    await evaluate(
      `document.querySelector('dialog[open] .finance-document').textContent.includes('sem cobrança ou movimentação financeira')`,
    ),
  );
  await screenshot('avaliacao-gratuita-desktop.png');
  await closeDocument();
  await navigate('/financeiro');
  assert.ok(
    await evaluate(
      `document.querySelector('.stat-primary .stat-value').textContent.includes('0,00')`,
    ),
  );
  process.stdout.write(
    'PASS: catálogo, busca sem acento, edição, duração automática e avaliação gratuita\n',
  );

  await navigate('/agenda');
  await evaluate(
    `(()=>{const card=[...document.querySelectorAll('.appointment')].find(a=>a.textContent.includes('Lucas Ferreira')&&a.textContent.includes('16:00'));card.click()})()`,
  );
  await waitFor(`!!document.querySelector('dialog[open]')`);
  await evaluate(
    `(()=>{const link=[...document.querySelectorAll('dialog a')].find(a=>a.textContent==='Acertar atendimento no caixa');link.click()})()`,
  );
  await waitFor(`!!document.querySelector('.planned-service')`);
  await clickText('Confirmar serviço executado');
  await waitFor(`document.querySelectorAll('.basket-line').length===1`);
  await evaluate(`document.querySelector('.basket-line [aria-label^="Remover"]').click()`);
  await chooseService('.basket-add', 'Profilaxia e Limpeza');
  await clickText('Adicionar serviço');
  await chooseService('.basket-add', 'Restauração Resina (1 Face)');
  await clickText('Adicionar serviço');
  await waitFor(`document.querySelectorAll('.basket-line').length===2`);
  await setInput('[name="quantity-0"]', '-1');
  assert.ok(
    await evaluate(
      `document.querySelector('h1').textContent.includes('Lançamento de Recebimento')`,
    ),
  );
  await setInput('[name="quantity-0"]', '1');
  await setInput('[name="dentist-0"]', 'd1');
  assert.ok(
    await evaluate(
      `document.querySelector('.payment-settled strong').textContent.includes('400,00')`,
    ),
  );
  assert.ok(
    await evaluate(
      `document.querySelector('.checkout-commissions').textContent.includes('72,00')&&document.querySelector('.checkout-commissions').textContent.includes('88,00')`,
    ),
  );
  await screenshot('comanda-servicos-desktop.png');
  await setInput('[name="discount"]', '40.00');
  await setInput('[name="authorizedBy"]', 'u1');
  await setInput('[name="authorizationReason"]', 'Desconto autorizado para o convênio do paciente');
  await evaluate(`document.querySelector('input[name="method"][value="pix"]').click()`);
  await clickText('Dividir pagamento em outra forma');
  await waitFor(`document.querySelectorAll('.payment-entry').length===2`);
  await evaluate(
    `document.querySelector('input[name="payment-1-method"][value="credit"]').click()`,
  );
  await setInput('[name="proof"]', 'UI-CHECKOUT-PIX');
  await evaluate(`document.querySelector('[name="pixVerified"]').click()`);
  await setInput('[name="payment-1-proof"]', 'UI-CHECKOUT-CREDIT');
  await setInput('[name="payment-1-installments"]', '2');
  assert.equal(await evaluate(`document.querySelector('[name="amount"]').value`), '180.00');
  assert.equal(
    await evaluate(`document.querySelector('[name="payment-1-amount"]').value`),
    '180.00',
  );
  await screenshot('comanda-pagamento-dividido-desktop.png');
  await evaluate(`document.querySelector('.payment-layout').requestSubmit()`);
  await waitFor(`!!document.querySelector('dialog[open] .receipt-items')`);
  assert.equal(
    await evaluate(`document.querySelectorAll('dialog .receipt-items tbody tr').length`),
    2,
  );
  assert.equal(await evaluate(`document.querySelectorAll('dialog .receipt-payment').length`), 2);
  await screenshot('recibo-servicos-desktop.png');
  await closeDocument();
  await navigate('/financeiro');
  assert.ok(
    await evaluate(
      `document.querySelector('.stat-primary .stat-value').textContent.includes('360,00')`,
    ),
  );
  const mixedLedger = await evaluate(`document.querySelector('.finance-ledger').textContent`);
  assert.ok(mixedLedger.includes('UI-CHECKOUT-PIX') && mixedLedger.includes('UI-CHECKOUT-CREDIT'));
  await navigate('/servicos?q=servico%20teste');
  await clickText('Editar');
  await waitFor(`!!document.querySelector('dialog[open]')`);
  await evaluate(`document.querySelector('dialog [name="active"]').click()`);
  await evaluate(`document.querySelector('dialog form').requestSubmit()`);
  await waitFor(
    `!document.querySelector('dialog[open]') && document.body.textContent.includes('Nenhum resultado encontrado')`,
  );
  await setInput('[aria-label="Situação dos serviços"]', 'inactive');
  await waitFor(`document.querySelectorAll('.services-table tbody tr').length===1`);
  process.stdout.write(
    'PASS: comanda de vários serviços, dois dentistas, desconto, Pix + crédito e recibo detalhado\n',
  );
  await navigate('/gestao-financeira');
  await waitFor(`document.querySelectorAll('.management-kpi').length===4`);
  await screenshot('gestao-financeira-desktop.png');
  const initialRevenue = await evaluate(
    `document.querySelector('.management-kpi strong').textContent`,
  );
  await clickText('Dia');
  await waitFor(
    `document.querySelector('[aria-pressed="true"]')?.textContent==='Dia' && document.querySelectorAll('.management-kpi').length===4`,
  );
  await clickText('Semana');
  await waitFor(
    `document.querySelector('[aria-pressed="true"]')?.textContent==='Semana' && document.querySelectorAll('.management-kpi').length===4`,
  );
  await clickText('Ano');
  await waitFor(`document.querySelectorAll('.management-chart-detail option').length===12`);
  await clickText('Mês');
  await waitFor(
    `document.querySelector('[aria-pressed="true"]')?.textContent==='Mês' && document.querySelectorAll('.management-kpi').length===4`,
  );
  await evaluate(`document.querySelectorAll('.management-filter summary')[2].click()`);
  await evaluate(
    `document.querySelectorAll('.management-filter-options')[2].querySelectorAll('input')[3].click()`,
  );
  await waitFor(
    `location.search.includes('pix') && document.querySelector('.management-kpi strong')?.textContent!==${JSON.stringify(initialRevenue)} && document.querySelectorAll('.management-kpi').length===4`,
  );
  assert.notEqual(
    await evaluate(`document.querySelector('.management-kpi strong').textContent`),
    initialRevenue,
  );
  await clickText('Limpar filtros');
  await waitFor(
    `document.querySelector('.management-kpi strong')?.textContent===${JSON.stringify(initialRevenue)}`,
  );
  await evaluate(`document.querySelectorAll('.management-filter summary')[2].click()`);
  await clickText('Despesas');
  await clickText('Nova despesa');
  await fillForm({
    description: 'Laboratório teste dashboard',
    category: 'laboratory',
    amount: '123.45',
    reference: 'UI-DRE-123',
  });
  await waitFor(`document.querySelector('dialog')?.textContent.includes('UI-DRE-123')`);
  await evaluate(
    `(()=>{const row=[...document.querySelectorAll('dialog tbody tr')].find(r=>r.textContent.includes('UI-DRE-123'));[...row.querySelectorAll('button')].find(b=>b.textContent==='Editar').click()})()`,
  );
  await fillForm({ amount: '135.79' });
  await waitFor(`document.querySelector('dialog')?.textContent.includes('135,79')`);
  await evaluate(
    `(()=>{const row=[...document.querySelectorAll('dialog tbody tr')].find(r=>r.textContent.includes('UI-DRE-123'));[...row.querySelectorAll('button')].find(b=>b.textContent==='Cancelar').click()})()`,
  );
  await fillForm({ reason: 'Cancelamento de verificação do dashboard' });
  await waitFor(`document.querySelector('dialog')?.textContent.includes('Cancelada:')`);
  await closeDocument();
  await clickText('Configurar meta');
  await fillForm({ amount: '3500.00' });
  await waitFor(
    `!document.querySelector('dialog[open]') && document.querySelector('.management-goal')?.textContent.includes('3.500,00')`,
  );
  await evaluate(`document.querySelector('.management-bottom-grid tbody button').click()`);
  await waitFor(
    `document.querySelector('dialog')?.textContent.includes('Extrato de produção e repasses')`,
  );
  assert.ok(await evaluate(`document.querySelectorAll('dialog tbody tr').length>0`));
  await closeDocument();
  await clickText('Exportar DRE');
  await setInput('dialog input', 'Michel Santos');
  await command('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: profile });
  await clickText('Baixar Excel (.xlsx)');
  await waitFor(`document.body.textContent.includes('Planilha Excel gerada')`);
  const filename = await evaluate(
    `(()=>{const d=JSON.parse(localStorage.getItem('odontoflow-demo-v1'));const date=d.finance.receipts.at(-1).paidAt;const now=new Date(date);const yyyy=now.getFullYear();const mm=String(now.getMonth()+1).padStart(2,'0');const last=new Date(yyyy,now.getMonth()+1,0).getDate();return 'DRE-'+yyyy+'-'+mm+'-01-'+yyyy+'-'+mm+'-'+last+'.xlsx'})()`,
  );
  let workbook;
  for (let i = 0; i < 30; i++) {
    try {
      workbook = await readFile(join(profile, filename));
      break;
    } catch {
      await pause(100);
    }
  }
  assert.ok(workbook && workbook.readUInt32LE(0) === 0x04034b50);
  await command('Emulation.setEmulatedMedia', { media: 'print' });
  const pdf = await command('Page.printToPDF', { printBackground: true, preferCSSPageSize: true });
  await writeFile(join(profile, 'dre-gerencial.pdf'), Buffer.from(pdf.data, 'base64'));
  await command('Emulation.setEmulatedMedia', { media: '' });
  await screenshot('dre-gerencial-desktop.png');
  await closeDocument();
  await clickText('Personalizado');
  await setInput('.management-date-controls input', '2000-01-01');
  await setInput('.management-date-controls label:nth-of-type(2) input', '2000-01-03');
  await waitFor(`document.body.textContent.includes('Nenhum recebimento no período')`);
  await reloadPage();
  await waitFor(`document.body.textContent.includes('Nenhum recebimento no período')`);
  assert.equal(
    await evaluate(`document.querySelector('.management-date-controls input').value`),
    '2000-01-01',
  );
  process.stdout.write(
    'PASS: dashboard, filtros, períodos, despesas, meta, extrato, Excel e PDF\n',
  );
  await navigate('/equipe');
  await clickText('+ Novo usuário');
  await fillForm({
    name: 'Recepção Convidada',
    email: 'convite@odontoflow.com',
    phone: '(85) 99999-2222',
  });
  await waitFor(
    `!document.querySelector('dialog[open]') && document.body.textContent.includes('convite@odontoflow.com')`,
  );
  await screenshot('equipe-desktop.png');
  await navigate('/permissoes');
  await evaluate(`document.querySelector('[aria-label="Agendar, remarcar e confirmar"]').click()`);
  await evaluate(`document.querySelector('form').requestSubmit()`);
  await waitFor(`document.body.textContent.includes('Permissões e limites salvos')`);
  await screenshot('permissoes-desktop.png');
  await clickText('Restaurar padrão seguro');
  await evaluate(`document.querySelector('form').requestSubmit()`);
  await waitFor(
    `document.querySelector('[aria-label="Agendar, remarcar e confirmar"]').getAttribute('aria-checked')==='true' && !document.querySelector('.spinner')`,
  );
  await command('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  for (const path of [
    '/agenda',
    '/pacientes',
    '/prontuarios?patient=p12',
    '/dentistas',
    '/configuracoes',
    '/financeiro',
    '/financeiro/recebimentos?patient=p8&treatment=t-p8-1',
    '/servicos',
    '/gestao-financeira',
    '/equipe',
    '/permissoes',
  ]) {
    await navigate(path);
    assert.equal(await evaluate(`document.querySelectorAll('.nav-link.active').length`), 1);
    const dimensions = await evaluate(
      `({ viewport: innerWidth, document: document.documentElement.scrollWidth })`,
    );
    assert.ok(
      dimensions.document <= dimensions.viewport,
      `Overflow em ${path}: ${JSON.stringify(dimensions)}`,
    );
    await screenshot(`${path.split('?')[0].slice(1).replaceAll('/', '-')}-mobile.png`);
  }
  await evaluate(`document.querySelector('[aria-label="Abrir menu"]').click()`);
  assert.ok(await evaluate(`!!document.querySelector('.sidebar-open')`));
  assert.deepEqual(errors, []);
  await evaluate(`document.querySelector('[aria-label="Abrir menu"]').click()`);
  await clickText('Sair da conta');
  await waitFor(`location.pathname==='/login'`);
  await signIn('juliana@odontoflow.com');
  assert.equal(await evaluate(`location.pathname`), '/agenda');
  assert.equal(
    await evaluate(`!!document.querySelector('nav a[href^="/gestao-financeira"]')`),
    false,
  );
  await navigate('/gestao-financeira');
  assert.equal(await evaluate(`location.pathname`), '/sem-acesso');
  await navigate('/prontuarios?patient=p12&tab=anamnesis');
  assert.equal(
    await evaluate(`document.querySelector('.anamnesis-panel textarea').matches(':disabled')`),
    true,
  );
  await screenshot('prontuario-recepcao-mobile.png');
  await navigate('/servicos');
  assert.equal(await evaluate(`document.body.textContent.includes('Novo serviço')`), false);
  await clickText('Sair da conta');
  await waitFor(`location.pathname==='/login'`);
  await signIn('camila@odontoflow.com');
  assert.ok(
    await evaluate(`location.search.includes('individual') && location.search.includes('d1')`),
  );
  await navigate('/meus-repasses');
  await screenshot('meus-repasses-mobile.png');
  await navigate('/financeiro');
  assert.equal(await evaluate(`location.pathname`), '/sem-acesso');
  await clickText('Sair da conta');
  await navigate('/recuperar-senha');
  await setInput('input[name="email"]', 'convite@odontoflow.com');
  await evaluate(`document.querySelector('.auth-form').requestSubmit()`);
  await waitFor(`document.body.textContent.includes('Se houver uma conta ativa')`);
  await screenshot('recuperacao-mobile.png');
  await navigate('/emails-demo');
  await waitFor(`!!document.querySelector('a[href^="/redefinir-senha"]')`);
  await evaluate(`document.querySelector('a[href^="/redefinir-senha"]').click()`);
  await waitFor(
    `location.pathname==='/redefinir-senha' && document.querySelector('input[name="password"]')`,
  );
  await setInput('input[name="password"]', 'ConviteNovo123!');
  await setInput('input[name="confirmation"]', 'ConviteNovo123!');
  await evaluate(`document.querySelector('.auth-form').requestSubmit()`);
  await waitFor(`document.body.textContent.includes('Senha salva')`);
  await signIn('convite@odontoflow.com', 'ConviteNovo123!');
  assert.equal(await evaluate(`location.pathname`), '/agenda');
  await evaluate(`(()=>{const original=Date.now;Date.now=()=>original()+61*60000})()`);
  await waitFor(`location.pathname==='/login'`);
  assert.deepEqual(errors, []);
  process.stdout.write(
    'PASS: onze páginas responsivas, autenticação, convites, recuperação e isolamento dos três perfis\n',
  );
} finally {
  socket?.close();
  chrome.kill();
  // Keep only this isolated temporary profile and screenshots for manual inspection.
}
