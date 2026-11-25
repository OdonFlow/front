import { Icon } from '../../../shared/components/Icon';
import type { useAppearanceViewModel } from '../viewmodel/useAppearanceViewModel';

export function SidebarThemeToggle({ vm }: { vm: ReturnType<typeof useAppearanceViewModel> }) {
  return (
    <div className="sidebar-theme-control">
      <button
        type="button"
        className="sidebar-control theme-toggle"
        aria-label={vm.themeActionLabel}
        title={vm.themeActionLabel}
        aria-busy={vm.saving}
        disabled={vm.pending || vm.saving}
        onClick={vm.toggleTheme}
      >
        <Icon name={vm.layout === 'dark_sidebar' ? 'sun' : 'moon'} size={19} />
      </button>
      <span className="sr-only" role="status">
        {vm.saving ? 'Salvando tema…' : ''}
      </span>
      {vm.error && (
        <div className="sidebar-theme-error" role="alert">
          <p>{vm.error.message}</p>
          <button type="button" onClick={vm.retry}>
            Tentar novamente
          </button>
        </div>
      )}
    </div>
  );
}
