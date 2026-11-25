import { useState, type ReactNode } from 'react';
import { Icon } from '../../../shared/components/Icon';
import { useBranding } from '../viewmodel/useBranding';
import type { BrandAsset } from '../model/types';
function AssetImage({
  asset,
  alt,
  className,
  fallback,
}: {
  asset: BrandAsset;
  alt: string;
  className: string;
  fallback: ReactNode;
}) {
  const [failed, setFailed] = useState(false);
  return failed ? (
    fallback
  ) : (
    <img src={asset.url} alt={alt} className={className} onError={() => setFailed(true)} />
  );
}
export function BrandMark({
  asset,
  name = 'Ícone da clínica',
}: {
  asset: BrandAsset | null;
  name?: string;
}) {
  const fallback = (
    <span className="brand-mark">
      <Icon name="tooth" size={23} />
    </span>
  );
  return asset ? (
    <AssetImage
      key={asset.url}
      asset={asset}
      alt={name}
      className="clinic-brand-icon"
      fallback={fallback}
    />
  ) : (
    fallback
  );
}
export function ClinicBrand({ name, compact = false }: { name?: string; compact?: boolean }) {
  const branding = useBranding();
  const label = name ?? branding.clinicName;
  const asset = compact ? branding.config.icon : branding.config.logo;
  const fallback = (
    <>
      <BrandMark asset={branding.config.icon} />
      {!compact && <span>{label}</span>}
    </>
  );
  return (
    <span
      className={`brand clinic-brand ${compact ? 'clinic-brand-compact' : ''}`}
      aria-label={compact ? label : undefined}
    >
      {asset ? (
        <AssetImage
          key={asset.url}
          asset={asset}
          alt={compact ? `Ícone de ${label}` : label}
          className={compact ? 'clinic-brand-icon' : 'clinic-brand-logo'}
          fallback={fallback}
        />
      ) : (
        fallback
      )}
    </span>
  );
}
