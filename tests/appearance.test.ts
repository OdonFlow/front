import { test } from 'node:test';
import assert from 'node:assert/strict';
import axios from 'axios';
import { createDatabase } from '../src/features/clinic/model/fixtures.ts';
import { initializeAccess, login } from '../src/features/access/model/access.mock.ts';
import { defaultBranding } from '../src/features/branding/model/types.ts';
import {
  themeTokens,
  contrastRatio,
  validateBranding,
} from '../src/features/branding/model/branding.rules.ts';
import { getBranding, saveBranding } from '../src/features/branding/model/branding.mock.ts';
import {
  defaultAppearance,
  resolveLayout,
  appearanceCacheKey,
  readAppearanceCache,
  writeAppearanceCache,
  isAppearance,
} from '../src/features/appearance/model/appearance.ts';
import { getAppearance, saveAppearance } from '../src/features/appearance/model/appearance.mock.ts';
import { mockAdapter } from '../src/shared/lib/http/mockAdapter.ts';
import { waitingMinutes, isWaitingOverdue } from '../src/features/agenda/model/waiting.rules.ts';
import { loginAs } from './helpers/auth.ts';

test('tríade valida cores e mantém estrutura legível, canvas claro e CTAs brancos', () => {
  const config = defaultBranding();
  const tokens = themeTokens(config);
  assert.equal(config.defaultLayout, 'dark_sidebar');
  assert.equal(tokens['--color-secondary'], '#1E293B');
  assert.equal(tokens['--color-tertiary'], '#F59E0B');
  assert.equal(tokens['--color-canvas'], '#F8FAFC');
  assert.equal(tokens['--color-on-primary'], '#FFFFFF');
  for (const color of ['#FFFFFF', '#000000', '#F59E0B', '#1E293B', '#777777']) {
    const custom = themeTokens({ ...config, secondary: color, tertiary: color });
    assert.ok(contrastRatio(custom['--color-on-secondary'], color) >= 4.5);
    assert.ok(contrastRatio(custom['--color-on-tertiary'], color) >= 4.5);
    assert.ok(contrastRatio(custom['--color-alert-text'], custom['--color-alert-soft']) >= 4.5);
  }
  assert.ok(validateBranding({ ...config, secondary: '#XYZ123' }));
  assert.ok(validateBranding({ ...config, tertiary: '' }));
  assert.equal(validateBranding(config), undefined);
});

test('identidades anteriores ganham tríade sem perder cores e revisão salvas', () => {
  const db = createDatabase();
  const legacy = {
    primary: '#0D9488',
    hover: '#0F766E',
    fontScale: 'standard',
    logo: null,
    icon: null,
  };
  const old = JSON.parse(
    JSON.stringify({
      'demo-clinic': {
        config: { ...legacy, primary: '#9F1239', fontScale: 'accessible' },
        assets: {},
        revision: 7,
        updatedAt: '2026-01-01',
      },
    }),
  );
  db.branding = old;
  const migrated = getBranding(db);
  assert.equal(migrated.config.primary, '#9F1239');
  assert.equal(migrated.config.fontScale, 'accessible');
  assert.equal(migrated.config.secondary, '#1E293B');
  assert.equal(migrated.config.tertiary, '#F59E0B');
  assert.equal(migrated.revision, 7);
});

test('preferência pessoal prevalece e padrão acompanha mudanças da clínica sem afetar colegas', async () => {
  const db = createDatabase();
  await initializeAccess(db);
  const session = (
    await login(
      db,
      { email: 'admin@odontoflow.com', password: 'Odonto123!', remember: false },
      'Teste',
    )
  ).session;
  const colleague = { ...session, user: { ...session.user, id: 'other-user' } };
  const otherClinic = { ...session, clinicId: 'other-clinic' };
  const own = saveAppearance(db, session, {
    preferredLayout: 'light_sidebar',
    highContrastAlerts: false,
  });
  assert.equal(resolveLayout(own, 'dark_sidebar'), 'light_sidebar');
  assert.equal(getAppearance(db, colleague).preferredLayout, 'default');
  assert.equal(getAppearance(db, otherClinic).preferredLayout, 'default');
  assert.equal(resolveLayout(defaultAppearance(), 'dark_sidebar'), 'dark_sidebar');
  const branding = saveBranding(db, session, {
    ...defaultBranding(),
    defaultLayout: 'light_sidebar',
    revision: 0,
  });
  assert.equal(
    resolveLayout(getAppearance(db, colleague), branding.config.defaultLayout),
    'light_sidebar',
  );
  assert.throws(
    () => saveAppearance(db, session, { ...own, userId: colleague.user.id }),
    /somente/,
  );
  assert.throws(() => saveAppearance(db, session, { ...own, clinicId: 'forged' }), /somente/);
  assert.throws(
    () => saveAppearance(db, session, { preferredLayout: 'dark', highContrastAlerts: true }),
    /inválidas/,
  );
  assert.equal(isAppearance({ preferredLayout: 'default', highContrastAlerts: 'true' }), false);
});

test('cache de ergonomia é isolado por clínica/usuário e tolera corrupção e armazenamento indisponível', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const entries = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => entries.get(key) ?? null,
      setItem: (key: string, value: string) => entries.set(key, value),
    },
  });
  try {
    const value = { ...defaultAppearance(), clinicId: 'clinic', userId: 'user' };
    writeAppearanceCache(value);
    assert.deepEqual(readAppearanceCache('clinic', 'user'), value);
    assert.equal(readAppearanceCache('clinic', 'other'), undefined);
    assert.equal(readAppearanceCache('other', 'user'), undefined);
    assert.notEqual(appearanceCacheKey('a:b', 'c'), appearanceCacheKey('a', 'b:c'));
    entries.set(appearanceCacheKey('clinic', 'user'), '{bad json');
    assert.equal(readAppearanceCache('clinic', 'user'), undefined);
    entries.set(
      appearanceCacheKey('clinic', 'user'),
      JSON.stringify({ ...value, userId: 'other' }),
    );
    assert.equal(readAppearanceCache('clinic', 'user'), undefined);
    Reflect.deleteProperty(globalThis, 'localStorage');
    assert.equal(readAppearanceCache('clinic', 'user'), undefined);
    assert.doesNotThrow(() => writeAppearanceCache(value));
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});

test('API de perfil exige sessão e permite que recepção salve apenas suas próprias preferências', async () => {
  const anonymous = axios.create({ adapter: mockAdapter });
  await assert.rejects(
    anonymous.get('/profiles/me/preferences'),
    (error: unknown) => axios.isAxiosError(error) && error.response?.status === 401,
  );
  const reception = axios.create({ adapter: mockAdapter });
  await loginAs(reception, 'juliana@odontoflow.com');
  const before = (await reception.get('/profiles/me/preferences')).data;
  const saved = (
    await reception.put('/profiles/me/preferences', {
      ...before,
      preferredLayout: 'light_sidebar',
      highContrastAlerts: false,
    })
  ).data;
  assert.equal(saved.preferredLayout, 'light_sidebar');
  assert.deepEqual((await reception.get('/profiles/me/preferences')).data, saved);
  const admin = axios.create({ adapter: mockAdapter });
  await loginAs(admin);
  assert.equal((await admin.get('/profiles/me/preferences')).data.preferredLayout, 'default');
  await assert.rejects(
    reception.put('/profiles/me/preferences', { ...saved, userId: 'forged' }),
    (error: unknown) => axios.isAxiosError(error) && error.response?.status === 403,
  );
  await assert.rejects(
    reception.put('/profiles/me/preferences', { ...saved, preferredLayout: 'invalid' }),
    (error: unknown) => axios.isAxiosError(error) && error.response?.status === 400,
  );
});

test('falha de persistência da preferência mantém a versão anterior no servidor simulado', async () => {
  const admin = axios.create({ adapter: mockAdapter });
  await loginAs(admin);
  const before = (await admin.get('/profiles/me/preferences')).data;
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: () => null,
      setItem: () => {
        throw new Error('Quota');
      },
    },
  });
  try {
    await assert.rejects(
      admin.put('/profiles/me/preferences', { ...before, preferredLayout: 'light_sidebar' }),
      (error: unknown) => axios.isAxiosError(error) && error.response?.status === 507,
    );
    assert.deepEqual((await admin.get('/profiles/me/preferences')).data, before);
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});

test('fila destaca espera a partir de quinze minutos e ignora horários inválidos ou futuros', () => {
  const db = createDatabase();
  const appointment = {
    ...db.appointments[0],
    status: 'waiting' as const,
    arrivedAt: '2026-11-25T10:00:00Z',
  };
  assert.equal(isWaitingOverdue(appointment, new Date('2026-11-25T10:14:59Z')), false);
  assert.equal(isWaitingOverdue(appointment, new Date('2026-11-25T10:15:00Z')), true);
  assert.equal(
    isWaitingOverdue({ ...appointment, status: 'completed' }, new Date('2026-11-25T10:30:00Z')),
    false,
  );
  assert.equal(waitingMinutes(appointment, new Date('2026-11-25T09:00:00Z')), 0);
  assert.equal(waitingMinutes({ ...appointment, arrivedAt: 'invalid' }, new Date()), 0);
  assert.equal(waitingMinutes({ ...appointment, arrivedAt: undefined }, new Date()), 0);
});
