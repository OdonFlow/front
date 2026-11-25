import type { CSSProperties } from 'react';
import { Link } from '@tanstack/react-router';
import { Dialog, Feedback, Field, PageHeading, QueryState } from '../../../shared/components/ui';
import { useBrandingViewModel, type BrandingViewModel } from '../viewmodel/useBrandingViewModel';
import { fontScales, palettes, layoutModes, type AssetKind, type BrandAsset } from '../model/types';
import { BrandMark } from './ClinicBrand';
import { Icon } from '../../../shared/components/Icon';
function LogoUpload({
  kind,
  asset,
  vm,
}: {
  kind: AssetKind;
  asset: BrandAsset | null;
  vm: BrandingViewModel;
}) {
  const title = kind === 'logo' ? 'Logo horizontal' : 'Ícone / Favicon';
  return (
    <section
      className="brand-upload"
      aria-label={title}
      onDragOver={(e) => {
        e.preventDefault();
      }}
      onDrop={(e) => {
        e.preventDefault();
        if (!vm.saving && !vm.uploading) {
          if (e.dataTransfer.files.length !== 1) {
            vm.rejectUpload('Arraste apenas uma imagem por área de upload.');
            return;
          }
          vm.upload(kind, e.dataTransfer.files[0]);
        }
      }}
    >
      <h3>{title}</h3>
      <div className={`brand-upload-thumbnail ${kind === 'icon' ? 'brand-upload-square' : ''}`}>
        {asset ? (
          <img src={asset.url} alt={`Prévia de ${title}`} />
        ) : kind === 'icon' ? (
          <BrandMark asset={null} />
        ) : (
          <span className="brand">
            <Icon name="tooth" />
            OdontoFlow
          </span>
        )}
      </div>
      <p>{kind === 'logo' ? 'Recomendado: 280 × 64px' : 'Recomendado: 64 × 64px ou 128 × 128px'}</p>
      <div className="flex flex-wrap justify-center gap-2">
        <label
          className={`btn btn-secondary brand-upload-button ${vm.saving || vm.uploading ? 'brand-upload-disabled' : ''}`}
        >
          <input
            className="sr-only"
            type="file"
            aria-label={`Carregar ${title}`}
            accept="image/png,image/svg+xml,.png,.svg"
            disabled={vm.saving || vm.uploading}
            onChange={(e) => {
              vm.upload(kind, e.target.files?.[0]);
              e.target.value = '';
            }}
          />
          {vm.uploadKind === kind ? 'Processando…' : asset ? 'Substituir' : 'Carregar imagem'}
        </label>
        <button
          type="button"
          className="text-button"
          disabled={!asset || vm.saving || vm.uploading}
          onClick={() => vm.remove(kind)}
        >
          Remover
        </button>
      </div>
      <p>Ou arraste um arquivo para esta área.</p>
      {asset && (
        <p className="brand-asset-meta">
          {asset.name} · {asset.width} × {asset.height}px ·{' '}
          {(asset.size / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} KB
          {asset.originalSize > asset.size &&
            ` · Economia de ${((1 - asset.size / asset.originalSize) * 100).toFixed(1)}% sem perda`}
        </p>
      )}
      {asset && kind === 'icon' && Math.abs(asset.width - asset.height) > 1 && (
        <p className="brand-upload-warning">Prefira uma imagem quadrada para o ícone.</p>
      )}
    </section>
  );
}
export function BrandingPage() {
  const vm = useBrandingViewModel();
  return (
    <>
      <PageHeading
        title="Identidade visual da clínica"
        subtitle="Personalize a marca, as cores e a leitura com prévia ao vivo"
      >
        <Link className="btn btn-secondary" to="/configuracoes">
          Voltar às configurações
        </Link>
      </PageHeading>
      <QueryState pending={vm.pending} error={vm.error} retry={vm.retry}>
        <div className="branding-layout">
          <form
            className="branding-controls"
            onSubmit={(e) => {
              e.preventDefault();
              vm.apply();
            }}
          >
            <Feedback error={vm.formError} success={vm.success} />
            <section className="panel branding-section">
              <header>
                <h2>1. Logomarcas da clínica</h2>
                <span>PNG ou SVG · até 2 MB por arquivo</span>
              </header>
              <div className="branding-uploads">
                <LogoUpload kind="logo" asset={vm.value.logo} vm={vm} />
                <LogoUpload kind="icon" asset={vm.value.icon} vm={vm} />
              </div>
              <p className="secondary-text">
                Imagens transparentes são aceitas. O upload prepara o arquivo; a marca da equipe só
                muda após salvar.
              </p>
            </section>
            <section className="panel branding-section">
              <header>
                <h2>2. Tríade de cores</h2>
              </header>
              <p className="secondary-text">
                60% de base neutra, 30% de estrutura e 10% de destaques: 7% para ações e 3% para
                alertas.
              </p>
              <div
                className="triad-guide"
                style={vm.previewTokens as CSSProperties}
                aria-label="Distribuição visual das cores"
              >
                <span className="triad-neutral">60% · Neutra</span>
                <span className="triad-secondary">30%</span>
                <span className="triad-primary" title="Primária · 7%" />
                <span className="triad-tertiary" title="Terciária · 3%" />
              </div>
              <div className="branding-palettes" role="group" aria-label="Temas rápidos">
                {palettes.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    aria-pressed={vm.value.primary === p.primary && vm.value.hover === p.hover}
                    onClick={() => vm.choosePalette(p.id)}
                    className="branding-palette"
                  >
                    <span
                      style={{
                        background: `linear-gradient(90deg,${p.primary} 50%,${p.hover} 50%)`,
                      }}
                    />
                    <strong>{p.name}</strong>
                  </button>
                ))}
              </div>
              <div className="form-grid">
                <ColorField
                  label="Cor primária"
                  color={vm.value.primary}
                  valid={vm.validPrimary}
                  onChange={vm.setPrimary}
                />
                <ColorField
                  label="Cor secundária"
                  color={vm.value.secondary}
                  valid={vm.validSecondary}
                  onChange={vm.setSecondary}
                />
                <ColorField
                  label="Cor terciária"
                  color={vm.value.tertiary}
                  valid={vm.validTertiary}
                  onChange={vm.setTertiary}
                />
                <ColorField
                  label="Hover da cor primária"
                  color={vm.value.hover}
                  valid={vm.validHover}
                  onChange={vm.setHover}
                />
              </div>
              <p className="secondary-text">
                Primária: ações e conclusões. Secundária: menu, títulos e estrutura. Terciária:
                alertas médicos, espera e pendências no caixa.
              </p>
              <button
                className="text-button"
                type="button"
                onClick={vm.automaticHover}
                disabled={!vm.validPrimary}
              >
                Calcular hover: 10% mais escuro
              </button>
              <p className="secondary-text">
                {vm.hoverAutomatic
                  ? 'Hover calculado automaticamente.'
                  : 'Você pode ajustar o hover manualmente.'}
              </p>
              <div className="branding-contrast" aria-live="polite">
                <Contrast label="Branco sobre cor primária" assessment={vm.primaryContrast} />
                <Contrast label="Branco sobre hover" assessment={vm.hoverContrast} />
                <Contrast label="Texto aplicado ao botão" assessment={vm.effectiveContrast} />
                <Contrast
                  label="Texto sobre a estrutura secundária"
                  assessment={vm.secondaryContrast}
                />
                <Contrast label="Texto sobre o alerta terciário" assessment={vm.tertiaryContrast} />
              </div>
              <p className="branding-contrast-note">
                Os botões com fundo de marca mantêm o texto branco, como no protótipo. O indicador
                avalia esses pares de cores; não certifica a acessibilidade de toda a interface.{' '}
                <a
                  href="https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html"
                  target="_blank"
                  rel="noreferrer"
                >
                  Critérios WCAG
                </a>
              </p>
            </section>
            <section className="panel branding-section">
              <header>
                <h2>3. Layout padrão da clínica</h2>
              </header>
              <div
                className="branding-layout-options"
                role="group"
                aria-label="Layout padrão da clínica"
              >
                {layoutModes.map((mode) => (
                  <button
                    type="button"
                    key={mode.id}
                    aria-pressed={vm.value.defaultLayout === mode.id}
                    onClick={() => vm.setDefaultLayout(mode.id)}
                  >
                    <span
                      className={`layout-thumbnail ${mode.id === 'dark_sidebar' ? 'layout-thumbnail-dark' : ''}`}
                      aria-hidden="true"
                    >
                      <i />
                      <span>
                        <b />
                        <b />
                        <b />
                      </span>
                    </span>
                    <strong>{mode.label}</strong>
                    <span>
                      {mode.id === 'dark_sidebar'
                        ? 'Menu escuro, área de trabalho clara.'
                        : 'Menu e área de trabalho claros.'}
                    </span>
                  </button>
                ))}
              </div>
              <p className="secondary-text">
                Aplicado a novos colaboradores e a quem segue o padrão da clínica. Cada usuário pode
                alternar seu layout pelo ícone de sol/lua no menu lateral.
              </p>
            </section>
            <section className="panel branding-section">
              <header>
                <h2>4. Escala tipográfica</h2>
              </header>
              <div className="branding-fonts" role="group" aria-label="Escala de fontes">
                {fontScales.map((scale) => (
                  <button
                    key={scale.id}
                    type="button"
                    aria-pressed={vm.value.fontScale === scale.id}
                    onClick={() => vm.setFont(scale.id)}
                  >
                    <strong>
                      {scale.label} ({scale.size}px)
                    </strong>
                    <span>{scale.description}</span>
                  </button>
                ))}
              </div>
              <p className="secondary-text">
                A escala é aplicada proporcionalmente à interface da equipe desta clínica, mantendo
                as cores de alertas clínicos.
              </p>
              <div className="branding-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={vm.saving || vm.uploading}
                  onClick={vm.showRestore}
                >
                  Restaurar padrão OdontoFlow
                </button>
                <button
                  className="btn btn-primary"
                  disabled={
                    vm.saving ||
                    vm.uploading ||
                    !vm.validPrimary ||
                    !vm.validHover ||
                    !vm.validSecondary ||
                    !vm.validTertiary
                  }
                >
                  {vm.saving ? 'Salvando…' : 'Salvar e aplicar identidade'}
                </button>
              </div>
              {vm.dirty && (
                <div className="flex flex-wrap items-center justify-between gap-2 mt-4">
                  <span className="secondary-text">
                    Há alterações na prévia que ainda não foram aplicadas.
                  </span>
                  <button
                    type="button"
                    className="text-button"
                    disabled={vm.saving || vm.uploading}
                    onClick={vm.discard}
                  >
                    Descartar alterações
                  </button>
                </div>
              )}
            </section>
          </form>
          <aside className="branding-preview-column">
            <BrandPreview vm={vm} />
            <p>
              Prévia isolada. Ao salvar, a identidade será aplicada para a equipe desta clínica.
            </p>
          </aside>
        </div>
      </QueryState>
      {vm.restoreOpen && (
        <Dialog title="Restaurar identidade padrão?" onClose={vm.closeRestore}>
          <div className="form-content">
            <p>
              A restauração aplica a tríade Teal, Slate e Amber, menu escuro, fonte de 14px e as
              marcas padrão do OdontoFlow, removendo as imagens personalizadas.
            </p>
            <Feedback error={vm.formError} />
            <div className="dialog-actions">
              <button className="btn btn-secondary" disabled={vm.saving} onClick={vm.closeRestore}>
                Cancelar
              </button>
              <button className="btn btn-primary" disabled={vm.saving} onClick={vm.restore}>
                Restaurar e aplicar
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </>
  );
}
function ColorField({
  label,
  color,
  valid,
  onChange,
}: {
  label: string;
  color: string;
  valid: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <div className="branding-color-input">
        <input
          type="color"
          aria-label={`Selecionar ${label.toLowerCase()}`}
          value={valid ? color : '#0D9488'}
          onChange={(e) => onChange(e.target.value)}
        />
        <input
          aria-label={`${label} HEX`}
          value={color}
          onChange={(e) => onChange(e.target.value)}
          maxLength={7}
          placeholder="#0D9488"
          spellCheck={false}
          aria-invalid={!valid}
        />
      </div>
    </Field>
  );
}
function Contrast({
  label,
  assessment,
}: {
  label: string;
  assessment: { ratio: number; label: string; normalAA: boolean };
}) {
  return (
    <div className={assessment.normalAA ? 'contrast-approved' : 'contrast-warning'}>
      <strong>
        {label}: {assessment.ratio.toFixed(2)}:1
      </strong>
      <span>{assessment.label}</span>
    </div>
  );
}
function BrandPreview({ vm }: { vm: BrandingViewModel }) {
  return (
    <section
      className="brand-live-preview"
      style={vm.previewTokens as CSSProperties}
      aria-label="Simulador da identidade visual"
    >
      <div
        className={`brand-preview-screen triad-preview ${vm.preview.defaultLayout === 'dark_sidebar' ? 'triad-preview-dark' : ''}`}
      >
        <nav className="triad-preview-nav" aria-label="Menu ilustrativo da prévia">
          <BrandMark asset={vm.preview.icon} />
          <span className="active">Agenda</span>
          <span>Pacientes</span>
          <span>Prontuários</span>
          <span>Caixa</span>
        </nav>
        <div className="triad-preview-workspace">
          <header>
            <span className="brand-preview-logo">
              {vm.preview.logo ? (
                <img src={vm.preview.logo.url} alt="Logo na prévia" />
              ) : (
                <>
                  <BrandMark asset={vm.preview.icon} />
                  <strong>{vm.clinicName}</strong>
                </>
              )}
            </span>
            <span className="brand-preview-badge">Prévia ao vivo</span>
          </header>
          <div className="brand-preview-content">
            <article className="brand-preview-appointment">
              <span>Amanhã, 09:30 · Dra. Camila</span>
              <h3>Limpeza e profilaxia</h3>
              <p>Mariana Souza</p>
              <button type="button">Confirmar consulta</button>
            </article>
            <div className="brand-preview-list">
              <p className="triad-preview-alert">⚠ Alergia a Penicilina</p>
              <p>
                08:00 · João Lima <span className="brand-preview-confirmed">Confirmado</span>
              </p>
              <p>
                10:30 · Ana Prado <span className="brand-preview-pending">Pendente</span>
              </p>
              <p>
                14:00 · Paulo Reis <span className="brand-preview-completed">Concluído</span>
              </p>
            </div>
            <p className="brand-preview-reading">
              Uma leitura confortável acompanha cada atendimento.
            </p>
          </div>
        </div>
      </div>
      <div className="brand-preview-monitor" />
    </section>
  );
}
