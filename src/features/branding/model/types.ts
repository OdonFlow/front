export type FontScale = 'compact' | 'standard' | 'accessible';
export type AssetKind = 'logo' | 'icon';
export type LayoutMode = 'light_sidebar' | 'dark_sidebar';
export const layoutModes = [
  { id: 'light_sidebar', label: 'Modo Clínico Claro' },
  { id: 'dark_sidebar', label: 'Alto Contraste (Tríade)' },
] as const;
export interface BrandAsset {
  id: string;
  url: string;
  name: string;
  mime: 'image/png' | 'image/svg+xml';
  size: number;
  originalSize: number;
  width: number;
  height: number;
}
export interface BrandingInput {
  primary: string;
  hover: string;
  secondary: string;
  tertiary: string;
  defaultLayout: LayoutMode;
  fontScale: FontScale;
  logo: BrandAsset | null;
  icon: BrandAsset | null;
}
export interface ClinicBranding {
  clinicId: string;
  clinicName: string;
  config: BrandingInput;
  revision: number;
  updatedAt: string | null;
}
export interface BrandingRecord {
  config: BrandingInput;
  assets: Record<string, BrandAsset>;
  revision: number;
  updatedAt: string | null;
}
export interface BrandingSaveInput extends BrandingInput {
  revision: number;
}
export const maxImageBytes = 2 * 1024 * 1024;
export const fontScales = [
  {
    id: 'compact',
    label: 'Compacta',
    size: 13,
    lineHeight: 1.45,
    description: 'Mais informações em telas menores.',
  },
  {
    id: 'standard',
    label: 'Padrão',
    size: 14,
    lineHeight: 1.6,
    description: 'Equilíbrio para a rotina clínica.',
  },
  {
    id: 'accessible',
    label: 'Acessível',
    size: 16,
    lineHeight: 1.7,
    description: 'Mais conforto para leituras prolongadas.',
  },
] as const;
export const palettes = [
  { id: 'teal', name: 'Clínico Teal', primary: '#0D9488', hover: '#0F766E' },
  { id: 'navy', name: 'Navy Confiança', primary: '#1E3A8A', hover: '#1B347C' },
  { id: 'sage', name: 'Sálvia Suave', primary: '#059669', hover: '#04875E' },
  { id: 'bordeaux', name: 'Bordeaux & Rose', primary: '#9F1239', hover: '#8F1033' },
] as const;
export const defaultBranding = (): BrandingInput => ({
  primary: '#0D9488',
  hover: '#0F766E',
  secondary: '#1E293B',
  tertiary: '#F59E0B',
  defaultLayout: 'dark_sidebar',
  fontScale: 'standard',
  logo: null,
  icon: null,
});
