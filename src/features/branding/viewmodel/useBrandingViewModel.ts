import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { sessionOptions } from '../../access/model/access.queries';
import { brandingOptions } from '../model/branding.queries';
import { brandingApi } from '../model/branding.api';
import {
  contrastAssessment,
  darken,
  themeTokens,
  validateBranding,
  validHex,
} from '../model/branding.rules';
import {
  defaultBranding,
  palettes,
  type AssetKind,
  type BrandingInput,
  type BrandingSaveInput,
  type FontScale,
  type LayoutMode,
} from '../model/types';
export function useBrandingViewModel() {
  const session = useQuery(sessionOptions);
  const clinicId = session.data?.clinicId ?? '';
  const query = useQuery({ ...brandingOptions(clinicId), enabled: Boolean(clinicId) });
  const client = useQueryClient();
  const [draft, setDraft] = useState<{ config: BrandingInput; revision: number } | null>(null);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [success, setSuccess] = useState('');
  const [hoverAutomatic, setHoverAutomatic] = useState(false);
  const uploads = useRef<Record<AssetKind, number>>({ logo: 0, icon: 0 });
  const value = draft?.config ?? query.data?.config ?? defaultBranding();
  const update = (patch: Partial<BrandingInput>) => {
    setSuccess('');
    setError(null);
    setDraft((prev) => ({
      config: { ...(prev?.config ?? query.data?.config ?? defaultBranding()), ...patch },
      revision: prev?.revision ?? query.data?.revision ?? 0,
    }));
  };
  const save = useMutation({
    mutationFn: (input: BrandingSaveInput) => brandingApi.save({ ...input, clinicId }),
    onSuccess: async (saved) => {
      client.setQueryData(brandingOptions(clinicId).queryKey, saved);
      await client.invalidateQueries({ queryKey: ['branding', 'public'] });
      setDraft(null);
      setRestoreOpen(false);
      setSuccess('Identidade visual salva e aplicada à clínica.');
    },
  });
  const upload = useMutation({
    mutationFn: async ({
      kind,
      file,
      sequence,
    }: {
      kind: AssetKind;
      file: File;
      sequence: number;
    }) => ({ asset: await brandingApi.upload({ clinicId, kind, file }), kind, sequence }),
    onSuccess: ({ asset, kind, sequence }) => {
      if (uploads.current[kind] !== sequence) return;
      update({ [kind]: asset });
    },
    onError: (cause) => setError(cause),
  });
  const validPrimary = validHex(value.primary);
  const validHover = validHex(value.hover);
  const validSecondary = validHex(value.secondary);
  const validTertiary = validHex(value.tertiary);
  const preview = {
    ...value,
    primary: validPrimary ? value.primary : '#0D9488',
    hover: validHover ? value.hover : darken(validPrimary ? value.primary : '#0D9488'),
    secondary: validSecondary ? value.secondary : '#1E293B',
    tertiary: validTertiary ? value.tertiary : '#F59E0B',
  };
  const apply = () => {
    const problem = validateBranding(value);
    setError(problem ? new Error(problem) : null);
    if (!problem) save.mutate({ ...value, revision: draft?.revision ?? query.data?.revision ?? 0 });
  };
  return {
    value,
    preview,
    previewTokens: themeTokens(preview),
    clinicName: query.data?.clinicName ?? 'OdontoFlow',
    pending: query.isPending,
    error: query.error,
    retry: () => void query.refetch(),
    formError: error ?? save.error ?? upload.error,
    success,
    dirty: Boolean(draft),
    saving: save.isPending,
    uploading: upload.isPending,
    uploadKind: upload.isPending ? upload.variables.kind : null,
    rejectUpload: (message: string) => setError(new Error(message)),
    restoreOpen,
    showRestore: () => {
      setError(null);
      setRestoreOpen(true);
    },
    closeRestore: () => {
      if (!save.isPending) setRestoreOpen(false);
    },
    restore: () => save.mutate({ ...defaultBranding(), revision: query.data?.revision ?? 0 }),
    apply,
    discard: () => {
      setDraft(null);
      setError(null);
      save.reset();
      upload.reset();
      setSuccess('Alterações descartadas.');
    },
    choosePalette: (id: string) => {
      const palette = palettes.find((p) => p.id === id);
      if (palette) {
        update({ primary: palette.primary, hover: palette.hover });
        setHoverAutomatic(false);
      }
    },
    setPrimary: (primary: string) => {
      update({
        primary: primary.toUpperCase(),
        ...(validHex(primary) ? { hover: darken(primary) } : {}),
      });
      setHoverAutomatic(true);
    },
    setHover: (hover: string) => {
      update({ hover: hover.toUpperCase() });
      setHoverAutomatic(!hover);
    },
    automaticHover: () => {
      update({ hover: darken(value.primary) });
      setHoverAutomatic(true);
    },
    hoverAutomatic,
    setFont: (fontScale: FontScale) => update({ fontScale }),
    setSecondary: (secondary: string) => update({ secondary: secondary.toUpperCase() }),
    setTertiary: (tertiary: string) => update({ tertiary: tertiary.toUpperCase() }),
    setDefaultLayout: (defaultLayout: LayoutMode) => update({ defaultLayout }),
    remove: (kind: AssetKind) => {
      uploads.current[kind]++;
      update({ [kind]: null });
    },
    upload: (kind: AssetKind, file?: File) => {
      if (!file) return;
      setError(null);
      upload.reset();
      upload.mutate({ kind, file, sequence: ++uploads.current[kind] });
    },
    validPrimary,
    validHover,
    validSecondary,
    validTertiary,
    secondaryContrast: contrastAssessment(
      themeTokens(preview)['--color-on-secondary'],
      preview.secondary,
    ),
    tertiaryContrast: contrastAssessment(
      themeTokens(preview)['--color-on-tertiary'],
      preview.tertiary,
    ),
    primaryContrast: contrastAssessment('#FFFFFF', preview.primary),
    hoverContrast: contrastAssessment('#FFFFFF', preview.hover),
    effectiveContrast: contrastAssessment('#FFFFFF', preview.primary),
  };
}
export type BrandingViewModel = ReturnType<typeof useBrandingViewModel>;
