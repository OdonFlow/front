import { useEffect, useLayoutEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useBranding } from './useBranding';
import { themeTokens } from '../model/branding.rules';
export function useBrandingRuntimeViewModel() {
  const query = useBranding();
  const client = useQueryClient();
  const config = query.config;
  useLayoutEffect(() => {
    const root = document.documentElement;
    const tokens = themeTokens(config);
    const previous = Object.keys(tokens).map(
      (key) => [key, root.style.getPropertyValue(key)] as const,
    );
    for (const [key, value] of Object.entries(tokens)) root.style.setProperty(key, value);
    const oldTitle = document.title;
    document.title = `${query.clinicName} | Gestão da clínica`;
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const oldMeta = meta?.content;
    if (meta) meta.content = config.primary;
    let favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    const existing = favicon;
    const oldHref = favicon?.getAttribute('href');
    const oldType = favicon?.getAttribute('type');
    if (!favicon) {
      favicon = document.createElement('link');
      favicon.rel = 'icon';
      document.head.append(favicon);
    }
    favicon.href = config.icon?.url ?? '/favicon-default.svg';
    favicon.type = config.icon?.mime ?? 'image/svg+xml';
    const fallbackIcon = () => {
      if (favicon.getAttribute('href') !== '/favicon-default.svg') {
        favicon.href = '/favicon-default.svg';
        favicon.type = 'image/svg+xml';
      }
    };
    favicon.addEventListener('error', fallbackIcon);
    return () => {
      favicon.removeEventListener('error', fallbackIcon);
      for (const [key, value] of previous) {
        if (value) root.style.setProperty(key, value);
        else root.style.removeProperty(key);
      }
      document.title = oldTitle;
      if (meta && oldMeta) meta.content = oldMeta;
      if (!existing) favicon.remove();
      else {
        if (oldHref) favicon.setAttribute('href', oldHref);
        else favicon.removeAttribute('href');
        if (oldType) favicon.setAttribute('type', oldType);
        else favicon.removeAttribute('type');
      }
    };
  }, [config, query.clinicName]);
  useEffect(() => {
    const update = (event: StorageEvent) => {
      if (event.key === 'odontoflow-demo-v1')
        void client.invalidateQueries({ queryKey: ['branding'] });
    };
    window.addEventListener('storage', update);
    return () => window.removeEventListener('storage', update);
  }, [client]);
}
