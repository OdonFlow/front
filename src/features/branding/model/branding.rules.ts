import { fontScales, maxImageBytes, type BrandingInput } from './types.ts';
export const validHex = (value: string) => /^#[\da-f]{6}$/i.test(value);
const rgb = (hex: string) => [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16));
const hexColor = (values: number[]) =>
  `#${values.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
export const darken = (color: string, amount = 0.1) =>
  hexColor(rgb(validHex(color) ? color : '#0D9488').map((v) => v * (1 - amount)));
export const tint = (color: string, amount = 0.95) =>
  hexColor(rgb(color).map((v) => v + (255 - v) * amount));
export function contrastRatio(a: string, b: string): number {
  if (!validHex(a) || !validHex(b)) return 0;
  const luminance = (color: string) =>
    rgb(color)
      .map((v) => {
        const s = v / 255;
        return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      })
      .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
  const first = luminance(a),
    second = luminance(b);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}
export function contrastAssessment(foreground: string, background: string) {
  const ratio = contrastRatio(foreground, background);
  return {
    ratio,
    normalAA: ratio >= 4.5,
    normalAAA: ratio >= 7,
    largeAA: ratio >= 3,
    largeAAA: ratio >= 4.5,
    label:
      ratio >= 7
        ? 'AAA — Excelente'
        : ratio >= 4.5
          ? 'AA — Aprovado'
          : ratio >= 3
            ? 'AA somente para texto grande'
            : 'Baixo contraste',
  };
}
export function validateBranding(input: BrandingInput): string | undefined {
  if (![input.primary, input.hover, input.secondary, input.tertiary].every(validHex))
    return 'Informe cores HEX com seis dígitos (ex.: #0D9488).';
  if (!['light_sidebar', 'dark_sidebar'].includes(input.defaultLayout))
    return 'Selecione um layout padrão válido.';
  if (!fontScales.some((scale) => scale.id === input.fontScale))
    return 'Selecione uma escala de fonte válida.';
  for (const asset of [input.logo, input.icon])
    if (
      asset &&
      (!asset.id ||
        asset.size > maxImageBytes ||
        asset.size <= 0 ||
        !['image/png', 'image/svg+xml'].includes(asset.mime))
    )
      return 'A imagem informada é inválida.';
}
export function themeTokens(input: BrandingInput): Record<string, string> {
  const primary = validHex(input.primary) ? input.primary : '#0D9488';
  const hover = validHex(input.hover) ? input.hover : darken(primary);
  const secondary = validHex(input.secondary) ? input.secondary : '#1E293B';
  const tertiary = validHex(input.tertiary) ? input.tertiary : '#F59E0B';
  const scale = fontScales.find((s) => s.id === input.fontScale) ?? fontScales[1];
  const defaultPalette = primary.toUpperCase() === '#0D9488';
  const surface = defaultPalette ? '#F0FDFA' : tint(primary);
  const text = defaultPalette
    ? '#0F766E'
    : contrastRatio(primary, '#FFFFFF') >= 4.5
      ? primary
      : darkenToContrast(primary, '#FFFFFF');
  return {
    '--color-primary': primary,
    '--color-primary-hover': hover,
    '--color-secondary': secondary,
    '--color-tertiary': tertiary,
    '--color-ink': darkenToContrast(secondary, '#FFFFFF'),
    '--color-on-secondary': readableText(secondary),
    '--color-on-tertiary': readableText(tertiary),
    '--color-secondary-border':
      secondary.toUpperCase() === '#1E293B' ? '#334155' : tint(secondary, 0.12),
    '--color-alert-soft': tint(tertiary, 0.9),
    '--color-alert-border': tint(tertiary, 0.55),
    '--color-alert-text': darkenToContrast(tertiary, tint(tertiary, 0.9)),
    '--color-brand': primary,
    '--color-brand-dark': hover,
    '--color-brand-light': surface,
    '--color-brand-text': text,
    '--color-on-primary': '#FFFFFF',
    '--color-on-primary-hover': '#FFFFFF',
    '--color-surface': '#F8FAFC',
    '--color-canvas': '#F8FAFC',
    '--color-brand-soft': defaultPalette ? '#CCFBF1' : tint(primary, 0.86),
    '--color-brand-border': defaultPalette ? '#99F6E4' : tint(primary, 0.6),
    '--color-brand-ink': defaultPalette ? '#115E59' : darkenToContrast(primary, surface),
    '--color-brand-focus': `${primary}30`,
    '--color-brand-shadow': `${primary}15`,
    '--font-size-base': `${scale.size}px`,
    '--font-line-height': String(scale.lineHeight),
    '--clinic-logo-url': input.logo
      ? `url("${input.logo.url.replaceAll('"', '%22').replaceAll('\\', '%5C')}")`
      : 'url("/logo-default.svg")',
  };
}
export function readableText(background: string) {
  if (contrastRatio('#FFFFFF', background) >= 4.5) return '#FFFFFF';
  return contrastRatio('#1E293B', background) >= 4.5 ? '#1E293B' : '#000000';
}
function darkenToContrast(color: string, background: string) {
  let result = color;
  for (let i = 0; i < 24 && contrastRatio(result, background) < 4.5; i++)
    result = darken(result, 0.12);
  return result;
}
