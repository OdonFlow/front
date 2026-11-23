import { useEffect, useRef, type ReactNode } from 'react';
import { initials } from '../../features/clinic/model/validation';
import { Icon } from './Icon';

export function Avatar({ name, large = false }: { name: string; large?: boolean }) {
  return (
    <span className={`avatar ${large ? 'avatar-large' : ''}`} aria-hidden="true">
      {initials(name)}
    </span>
  );
}
export function PageHeading({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children?: ReactNode;
}) {
  return (
    <header className="page-heading">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </header>
  );
}
export function QueryState({
  pending,
  error,
  retry,
  empty = false,
  children,
}: {
  pending: boolean;
  error: Error | null;
  retry: () => void;
  empty?: boolean;
  children: ReactNode;
}) {
  if (pending)
    return (
      <div className="empty-state" role="status">
        <span className="spinner" />
        Carregando os dados da clínica...
      </div>
    );
  if (error)
    return (
      <div className="empty-state" role="alert">
        <Icon name="alert" size={30} />
        <h2>Não foi possível carregar</h2>
        <p>{error.message}</p>
        <button className="btn btn-secondary" onClick={retry}>
          Tentar novamente
        </button>
      </div>
    );
  if (empty)
    return (
      <div className="empty-state">
        <Icon name="search" size={32} />
        <h2>Nenhum resultado encontrado</h2>
        <p>Experimente mudar a busca ou os filtros.</p>
      </div>
    );
  return children;
}
export function Feedback({ error, success }: { error?: Error | null; success?: string }) {
  return (
    <>
      {error && (
        <p className="feedback feedback-error" role="alert">
          {error.message}
        </p>
      )}
      {success && (
        <p className="feedback feedback-success" role="status">
          <Icon name="check" size={16} />
          {success}
        </p>
      )}
    </>
  );
}
export function Field({
  label,
  children,
  className = '',
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`field ${className}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}
export function Dialog({
  title,
  subtitle,
  children,
  onClose,
  drawer = false,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onClose: () => void;
  drawer?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement;
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={drawer ? 'dialog drawer' : 'dialog'}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          const rect = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom
          )
            onClose();
        }
      }}
      aria-labelledby="dialog-title"
    >
      <div className="dialog-heading">
        <div>
          <h2 id="dialog-title">{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <button type="button" className="icon-button" aria-label="Fechar" onClick={onClose}>
          <Icon name="close" />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function SearchInput({
  value,
  onChange,
  placeholder = 'Buscar por nome...',
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="search-input">
      <Icon name="search" size={18} />
      <input
        aria-label={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}
