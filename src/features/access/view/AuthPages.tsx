import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { loginRoute, resetRoute } from '../../../app/router/router';
import { Icon } from '../../../shared/components/Icon';
import { Feedback, Field, QueryState } from '../../../shared/components/ui';
import { useAuthViewModel, useMailboxViewModel } from '../viewmodel/useAuthViewModel';

function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="auth-container">
      <section className="auth-card">
        <div className="brand">
          <span className="brand-mark">
            <Icon name="tooth" />
          </span>
          OdontoFlow
        </div>
        <header>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </header>
        {children}
      </section>
      <p className="auth-footer">Gestão clínica e odontológica integrada</p>
    </div>
  );
}
export function LoginPage() {
  const search = loginRoute.useSearch();
  const vm = useAuthViewModel('login', '', search.redirect);
  return (
    <AuthCard title="Acesse sua conta" subtitle="Um único acesso para cuidar da sua clínica.">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          vm.submit(new FormData(e.currentTarget));
        }}
        className="auth-form"
      >
        <Feedback
          error={vm.error}
          success={
            search.reason === 'expired'
              ? 'Sua sessão foi encerrada. Entre novamente para continuar.'
              : ''
          }
        />
        <Field label="E-mail corporativo">
          <input
            name="email"
            type="email"
            autoComplete="username"
            required
            maxLength={150}
            placeholder="seu.nome@clinica.com.br"
          />
        </Field>
        <Field label="Senha">
          <div className="auth-password">
            <input
              name="password"
              type={vm.showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              maxLength={128}
            />
            <button
              type="button"
              className="text-button"
              aria-label={vm.showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              onClick={vm.togglePassword}
            >
              {vm.showPassword ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>
        </Field>
        <div className="auth-options">
          <label>
            <input name="remember" type="checkbox" />
            Lembrar de mim por 30 dias
          </label>
          <Link to="/recuperar-senha">Esqueceu a senha?</Link>
        </div>
        <button className="btn btn-primary" disabled={vm.pending}>
          {vm.pending ? 'Entrando…' : 'Entrar no OdontoFlow'}
        </button>
      </form>
      {import.meta.env.VITE_USE_MOCK_API !== 'false' && (
        <details className="auth-demo">
          <summary>Acessos de demonstração</summary>
          <p>
            Senha dos perfis iniciais: <strong>Odonto123!</strong>
          </p>
          <p>Admin: admin@odontoflow.com</p>
          <p>Dentista: camila@odontoflow.com</p>
          <p>Recepção: juliana@odontoflow.com</p>
          <Link to="/emails-demo">Abrir caixa de e-mails demonstrativa</Link>
        </details>
      )}
      <p className="auth-security">Acesso individual conforme as permissões do seu perfil.</p>
    </AuthCard>
  );
}
export function RecoveryPage() {
  const vm = useAuthViewModel('recovery');
  return (
    <AuthCard
      title="Recuperar acesso"
      subtitle="Informe seu e-mail cadastrado para receber as instruções."
    >
      <form
        className="auth-form"
        onSubmit={(e) => {
          e.preventDefault();
          vm.submit(new FormData(e.currentTarget));
        }}
      >
        <Feedback error={vm.error} />
        <Field label="E-mail">
          <input name="email" type="email" autoComplete="email" required maxLength={150} />
        </Field>
        <button className="btn btn-primary" disabled={vm.pending}>
          Enviar link de recuperação
        </button>
        {vm.success && (
          <p role="status" className="feedback feedback-success">
            {vm.success} Destino informado: {vm.maskedEmail}
          </p>
        )}
        <p className="secondary-text">O link é de uso único e expira em 30 minutos.</p>
      </form>
      <div className="auth-links">
        <Link to="/login" search={{ redirect: '', reason: '' }}>
          ← Voltar para o login
        </Link>
        {import.meta.env.VITE_USE_MOCK_API !== 'false' && (
          <Link to="/emails-demo">Ver e-mails demonstrativos</Link>
        )}
      </div>
    </AuthCard>
  );
}
export function ResetPage() {
  const { token } = resetRoute.useSearch();
  const vm = useAuthViewModel('reset', token);
  return (
    <AuthCard
      title="Criar nova senha"
      subtitle="Use letras maiúsculas, minúsculas e números; no mínimo 8 caracteres."
    >
      <Feedback error={vm.error} success={vm.success} />
      {!vm.success && (
        <form
          className="auth-form"
          onSubmit={(e) => {
            e.preventDefault();
            vm.submit(new FormData(e.currentTarget));
          }}
        >
          <Field label="Nova senha">
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={128}
            />
          </Field>
          <Field label="Confirmar nova senha">
            <input
              name="confirmation"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={128}
            />
          </Field>
          <button className="btn btn-primary" disabled={vm.pending || !token}>
            Salvar nova senha
          </button>
          {!token && <p role="alert">Link inválido. Solicite uma nova recuperação.</p>}
        </form>
      )}
      <div className="auth-links">
        <Link to="/login" search={{ redirect: '', reason: '' }}>
          Voltar ao login
        </Link>
        <Link to="/recuperar-senha">Solicitar outro link</Link>
      </div>
    </AuthCard>
  );
}
export function MailboxPage() {
  const vm = useMailboxViewModel();
  if (import.meta.env.VITE_USE_MOCK_API === 'false')
    return (
      <AuthCard
        title="Recurso indisponível"
        subtitle="A caixa demonstrativa existe apenas no modo simulado."
      >
        <Link to="/login" search={{ redirect: '', reason: '' }}>
          Voltar
        </Link>
      </AuthCard>
    );
  return (
    <div className="auth-mailbox">
      <h1>Caixa de e-mails demonstrativa</h1>
      <p>Convites e recuperações locais. Nenhum e-mail é enviado externamente.</p>
      <div className="flex gap-3 my-5">
        <Link to="/login" search={{ redirect: '', reason: '' }} className="btn btn-secondary">
          Voltar ao login
        </Link>
        <button className="btn btn-primary" onClick={vm.retry}>
          Atualizar caixa
        </button>
      </div>
      <QueryState pending={vm.pending} error={vm.error} retry={vm.retry} empty={!vm.mails.length}>
        {vm.mails.map((mail) => (
          <article className="panel p-5 mb-4" key={mail.id}>
            <h2>
              {mail.kind === 'invitation' ? 'Bem-vindo ao OdontoFlow' : 'Redefinição de senha'}
            </h2>
            <p>
              Para: {mail.name} &lt;{mail.to}&gt;
            </p>
            <p className="secondary-text">
              Enviado em {new Date(mail.createdAt).toLocaleString('pt-BR')} · Expira em{' '}
              {new Date(mail.expiresAt).toLocaleString('pt-BR')}
            </p>
            {mail.usedAt || mail.expiresAt <= vm.now ? (
              <span className="badge badge-slate">Link utilizado ou expirado</span>
            ) : (
              <Link
                className="btn btn-primary mt-3"
                to="/redefinir-senha"
                search={{ token: mail.token }}
              >
                Criar minha senha
              </Link>
            )}
          </article>
        ))}
      </QueryState>
    </div>
  );
}
export function DeniedPage() {
  return (
    <div className="empty-state">
      <Icon name="alert" size={35} />
      <h1>Acesso não permitido</h1>
      <p>Este recurso não está disponível para o seu perfil.</p>
      <Link className="btn btn-primary" to="/">
        Voltar à minha área
      </Link>
    </div>
  );
}
