import { test } from 'node:test';
import assert from 'node:assert/strict';
import axios from 'axios';
import { deflateSync, inflateSync } from 'node:zlib';
import { createDatabase } from '../src/features/clinic/model/fixtures.ts';
import { initializeAccess, login, saveTeamUser } from '../src/features/access/model/access.mock.ts';
import { defaultBranding, palettes } from '../src/features/branding/model/types.ts';
import {
  contrastRatio,
  contrastAssessment,
  darken,
  themeTokens,
  validateBranding,
} from '../src/features/branding/model/branding.rules.ts';
import {
  getBranding,
  saveBranding,
  uploadBrandAsset,
} from '../src/features/branding/model/branding.mock.ts';
import { prepareBrandImage, optimizePng } from '../src/features/branding/model/images.ts';
import { sanitizeSvg } from '../src/features/branding/model/svg.ts';
import { mockAdapter } from '../src/shared/lib/http/mockAdapter.ts';
import { loginAs } from './helpers/auth.ts';
const svg =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 64"><rect x="2" y="2" width="60" height="60" fill="#1E3A8A"/><text x="75" y="40" fill="#0f172a">Clínica Exemplo</text></svg>';
async function setup() {
  const db = createDatabase();
  await initializeAccess(db);
  const result = await login(
    db,
    { email: 'admin@odontoflow.com', password: 'Odonto123!', remember: false },
    'Teste',
  );
  return { db, session: result.session };
}
function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(name: string, data: Uint8Array) {
  const result = Buffer.alloc(data.length + 12);
  result.writeUInt32BE(data.length);
  result.write(name, 4, 'ascii');
  result.set(data, 8);
  result.writeUInt32BE(crc32(result.subarray(4, -4)), result.length - 4);
  return result;
}
function pngFixture() {
  const width = 16,
    height = 16;
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  const rgba = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const at = y * (width * 4 + 1) + 1 + x * 4;
      rgba.set([20, 148, 136, x % 2 ? 0 : 128], at);
    }
  return {
    rgba,
    bytes: Buffer.concat([
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      chunk('IHDR', header),
      chunk('IDAT', deflateSync(rgba, { level: 0 })),
      chunk('IEND', new Uint8Array()),
    ]),
  };
}
test('contraste informa os limites WCAG e os botões preservam o texto branco do protótipo', () => {
  assert.equal(contrastRatio('#000000', '#FFFFFF'), 21);
  assert.equal(contrastRatio('#ffffff', '#ffffff'), 1);
  assert.equal(contrastRatio('invalid', '#FFFFFF'), 0);
  assert.ok(Math.abs(contrastRatio('#0D9488', '#FFFFFF') - 3.74) < 0.02);
  assert.equal(contrastAssessment('#FFFFFF', '#1E3A8A').normalAAA, true);
  assert.equal(contrastAssessment('#FFFFFF', '#0D9488').normalAA, false);
  assert.equal(contrastAssessment('#FFFFFF', '#0D9488').largeAA, true);
  assert.equal(darken('#808080'), '#737373');
  for (const palette of [
    ...palettes,
    { primary: '#FFFFFF' },
    { primary: '#777777' },
    { primary: '#FFFF00' },
  ]) {
    const tokens = themeTokens({
      ...defaultBranding(),
      primary: palette.primary,
      hover: palette.primary,
    });
    assert.equal(tokens['--color-on-primary'], '#FFFFFF');
    assert.equal(tokens['--color-on-primary-hover'], '#FFFFFF');
  }
});
test('tokens mantêm escalas proporcionais, cores derivadas e validam entradas', () => {
  for (const [fontScale, size] of [
    ['compact', '13px'],
    ['standard', '14px'],
    ['accessible', '16px'],
  ] as const)
    assert.equal(themeTokens({ ...defaultBranding(), fontScale })['--font-size-base'], size);
  assert.equal(
    themeTokens({ ...defaultBranding(), primary: '#1E3A8A' })['--color-primary'],
    '#1E3A8A',
  );
  assert.equal(
    validateBranding({ ...defaultBranding(), primary: 'red' }),
    'Informe cores HEX com seis dígitos (ex.: #0D9488).',
  );
});
test('SVG aceita vetores estáticos e rejeita conteúdo ativo, entidades e recursos externos', () => {
  const safe = sanitizeSvg(`<?xml version="1.0"?>\n<!-- comentário -->${svg}`);
  assert.ok(
    sanitizeSvg(
      svg.replace('<rect', '<style>.mark { fill: #9F1239; }</style><rect class="mark"'),
    ).text.includes('style'),
  );
  assert.throws(() =>
    sanitizeSvg(svg.replace('<rect', '<style>@import "https://evil.example/a";</style><rect')),
  );
  assert.throws(() =>
    sanitizeSvg(svg.replace('<rect', '<style>.a { fill: url(//evil.example/a); }</style><rect')),
  );
  assert.equal(safe.width, 280);
  assert.equal(safe.height, 64);
  assert.ok(!safe.text.includes('comentário'));
  for (const content of [
    svg.replace('<rect', '<script>alert(1)</script><rect'),
    svg.replace('<rect', '<rect onload="alert(1)"'),
    svg.replace('<rect', '<image href="https://evil.example/logo.png"/><rect'),
    svg.replace('<rect', '<use href="javascript:alert(1)"/><rect'),
    svg.replace('<rect', '<rect style="fill:url(https://evil.example/a)"'),
    `<!DOCTYPE svg [<!ENTITY x SYSTEM "file:///secret">]>${svg}`,
    svg.replace('</svg>', '</g>'),
  ])
    assert.throws(() => sanitizeSvg(content));
});
test('upload comprime PNG sem alterar bytes de pixels nem transparência e valida formato/tamanho', async () => {
  const fixture = pngFixture();
  const optimized = await optimizePng(new Uint8Array(fixture.bytes));
  assert.equal(optimized.width, 16);
  assert.equal(optimized.height, 16);
  assert.ok(optimized.bytes.length < fixture.bytes.length);
  const parts: Uint8Array[] = [];
  let at = 8;
  while (at < optimized.bytes.length) {
    const length = new DataView(optimized.bytes.buffer).getUint32(at);
    const name = new TextDecoder().decode(optimized.bytes.slice(at + 4, at + 8));
    if (name === 'IDAT') parts.push(optimized.bytes.slice(at + 8, at + 8 + length));
    at += length + 12;
  }
  assert.deepEqual(inflateSync(Buffer.concat(parts)), fixture.rgba);
  const asset = await prepareBrandImage(
    new File([fixture.bytes], 'icone.png', { type: 'image/png' }),
  );
  assert.match(asset.url, /^data:image\/png;base64,/);
  assert.equal(asset.originalSize, fixture.bytes.length);
  await assert.rejects(
    prepareBrandImage(new File([svg], 'logo.jpg', { type: 'image/jpeg' })),
    /Formato/,
  );
  await assert.rejects(
    prepareBrandImage(
      new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'grande.png', { type: 'image/png' }),
    ),
    /2 MB/,
  );
  await assert.rejects(
    prepareBrandImage(new File(['fake'], 'fake.png', { type: 'image/png' })),
    /PNG/,
  );
});
test('marca é isolada por clínica, aceita apenas arquivos próprios e evita sobrescrita concorrente', async () => {
  const { db, session } = await setup();
  const asset = await uploadBrandAsset(
    db,
    session,
    'logo',
    new File([svg], 'logo.svg', { type: 'image/svg+xml' }),
  );
  const saved = saveBranding(db, session, {
    ...defaultBranding(),
    primary: '#1E3A8A',
    logo: asset,
    revision: 0,
  });
  assert.equal(saved.revision, 1);
  db.users[0].clinicId = 'other-clinic';
  const otherLogin = await login(
    db,
    { email: db.users[0].email, password: 'Odonto123!', remember: false },
    'Teste',
  );
  const other = otherLogin.session;
  assert.equal(other.clinicId, 'other-clinic');
  assert.equal(getBranding(db, other.clinicId).config.primary, '#0D9488');
  const admin = db.users.find((u) => u.role === 'admin');
  assert.ok(admin);
  const otherAdmin = { ...session, clinicId: 'other-clinic' };
  assert.throws(
    () => saveBranding(db, otherAdmin, { ...defaultBranding(), logo: asset, revision: 0 }),
    /não pertence/,
  );
  assert.throws(
    () => saveBranding(db, session, { ...defaultBranding(), revision: 0 }),
    /outro administrador/,
  );
  const reset = saveBranding(db, session, { ...defaultBranding(), revision: 1 });
  assert.equal(reset.config.logo, null);
  assert.equal(reset.config.fontScale, 'standard');
  assert.equal(Object.keys(db.branding?.[session.clinicId].assets ?? {}).length, 0);
  const updated = saveTeamUser(
    db,
    {
      ...admin,
      name: admin.name,
      phone: admin.phone ?? '85999991234',
      active: true,
      clinicId: 'forged',
    } as Parameters<typeof saveTeamUser>[1],
    admin,
    admin.id,
  );
  assert.notEqual(updated.clinicId, 'forged');
});
test('API autoriza leitura pública, gravação administrativa, multipart e restauração persistente', async () => {
  const anonymous = axios.create({ adapter: mockAdapter });
  assert.equal((await anonymous.get('/public/branding')).data.clinicId, 'demo-clinic');
  await assert.rejects(
    anonymous.get('/clinics/demo-clinic/branding'),
    (e: unknown) => axios.isAxiosError(e) && e.response?.status === 401,
  );
  const reception = axios.create({ adapter: mockAdapter });
  await loginAs(reception, 'juliana@odontoflow.com');
  assert.equal((await reception.get('/clinics/demo-clinic/branding')).status, 200);
  await assert.rejects(
    reception.put('/clinics/demo-clinic/branding', { ...defaultBranding(), revision: 0 }),
    (e: unknown) => axios.isAxiosError(e) && e.response?.status === 403,
  );
  const admin = axios.create({ adapter: mockAdapter });
  await loginAs(admin);
  const form = new FormData();
  form.set('kind', 'logo');
  form.set('file', new File([svg], 'clinica.svg', { type: 'image/svg+xml' }));
  const asset = (await admin.post('/clinics/demo-clinic/branding/assets', form)).data;
  assert.equal(asset.mime, 'image/svg+xml');
  const response = (
    await admin.put('/clinics/demo-clinic/branding', {
      ...defaultBranding(),
      primary: '#9F1239',
      fontScale: 'accessible',
      logo: asset,
      revision: 0,
    })
  ).data;
  assert.equal(response.config.fontScale, 'accessible');
  assert.equal((await anonymous.get('/public/branding')).data.config.logo.id, asset.id);
  await assert.rejects(
    admin.get('/clinics/other-clinic/branding'),
    (e: unknown) => axios.isAxiosError(e) && e.response?.status === 403,
  );
  await assert.rejects(
    admin.put('/clinics/demo-clinic/branding', { ...defaultBranding(), revision: 0 }),
    (e: unknown) => axios.isAxiosError(e) && e.response?.status === 409,
  );
  await admin.put('/clinics/demo-clinic/branding', {
    ...defaultBranding(),
    revision: response.revision,
  });
  assert.equal((await anonymous.get('/public/branding')).data.config.logo, null);
});

test('erro de armazenamento não aplica uma marca sem persistência', async () => {
  const admin = axios.create({ adapter: mockAdapter });
  await loginAs(admin);
  const before = (await admin.get('/clinics/demo-clinic/branding')).data;
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: () => null,
      setItem: () => {
        throw new Error('Quota excedida');
      },
    },
  });
  try {
    await assert.rejects(
      admin.put('/clinics/demo-clinic/branding', {
        ...before.config,
        primary: '#1E3A8A',
        revision: before.revision,
      }),
      (e: unknown) => axios.isAxiosError(e) && e.response?.status === 507,
    );
    const after = (await admin.get('/clinics/demo-clinic/branding')).data;
    assert.equal(after.config.primary, before.config.primary);
    assert.equal(after.revision, before.revision);
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});
