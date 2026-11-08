import { ArrowLeft, Eye, EyeOff, KeyRound, Lock, Mail, User } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Logo } from '../layout/AppShell';
import { finishRecovery, sendPasswordReset, signIn, signInWithGoogle, signUp, updatePassword } from '../services/supabase';

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

export function AuthShell({ title, sub, children, back = true }: { title: string; sub?: ReactNode; children: ReactNode; back?: boolean }) {
  return (
    <div className="onb">
      <div className="card" style={{ maxWidth: 440 }}>
        {back && <Link to="/" className="btn ghost sm" style={{ marginBottom: 10, marginLeft: -8 }}><ArrowLeft size={15} />Início</Link>}
        <div className="row" style={{ gap: 12, marginBottom: 20 }}><Logo size={42} /><div><h1 style={{ fontSize: 23 }}>{title}</h1>{sub && <p className="small muted">{sub}</p>}</div></div>
        {children}
      </div>
    </div>
  );
}

function Field({ icon, ...p }: React.InputHTMLAttributes<HTMLInputElement> & { icon: ReactNode }) {
  const [show, setShow] = useState(false);
  const pwd = p.type === 'password';
  return (
    <div className="search" style={{ maxWidth: 'none', height: 48, flex: 'none', background: 'var(--panel2)' }}>
      {icon}
      <input {...p} type={pwd && show ? 'text' : p.type} style={{ flex: 1, background: 'none', border: 0, outline: 0, color: 'var(--text)', minWidth: 0 }} />
      {pwd && <button type="button" className="muted" onClick={() => setShow((x) => !x)} aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}>{show ? <EyeOff size={17} /> : <Eye size={17} />}</button>}
    </div>
  );
}

const Msg = ({ kind, children }: { kind: 'erro' | 'ok'; children: ReactNode }) => (
  <div role={kind === 'erro' ? 'alert' : 'status'} className="small" style={{ padding: '10px 12px', borderRadius: 12, background: kind === 'erro' ? '#ff6b6b18' : '#3ddc9718', color: kind === 'erro' ? 'var(--alta)' : 'var(--ok)', border: `1px solid ${kind === 'erro' ? '#ff6b6b44' : '#3ddc9744'}` }}>{children}</div>
);

function useAction() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const run = async (fn: () => Promise<void>) => { setBusy(true); setErr(''); try { await fn(); } catch (e) { setErr((e as Error).message); } setBusy(false); };
  return { busy, err, run };
}

function GoogleButton() {
  const { busy, err, run } = useAction();
  return (
    <>
      <button type="button" className="btn" style={{ width: '100%', height: 46, background: '#fff', color: '#1f1f1f', borderColor: '#dadce0' }} disabled={busy} onClick={() => run(signInWithGoogle)}>
        <GoogleIcon />Continuar com o Google
      </button>
      {err && <div style={{ marginTop: 8 }}><Msg kind="erro">{err}</Msg></div>}
      <div className="row tiny muted" style={{ margin: '16px 0', gap: 12 }}><span className="divider grow" style={{ margin: 0 }} />ou com e-mail<span className="divider grow" style={{ margin: 0 }} /></div>
    </>
  );
}

export function SignIn() {
  const [f, setF] = useState({ email: '', password: '' });
  const { busy, err, run } = useAction();
  return (
    <AuthShell title="Entrar" sub="Bom te ver de novo.">
      <GoogleButton />
      <form className="col" style={{ gap: 12 }} onSubmit={(e) => { e.preventDefault(); run(() => signIn(f.email.trim(), f.password)); }}>
        <Field icon={<Mail size={17} />} type="email" required autoComplete="email" placeholder="E-mail" aria-label="E-mail" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        <Field icon={<Lock size={17} />} type="password" required autoComplete="current-password" placeholder="Senha" aria-label="Senha" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
        <Link to="/esqueci-senha" className="small grad-text bold" style={{ alignSelf: 'flex-end' }}>Esqueci minha senha</Link>
        {err && <Msg kind="erro">{err}</Msg>}
        <button className="btn primary" style={{ height: 46 }} disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</button>
      </form>
      <p className="small muted" style={{ marginTop: 18, textAlign: 'center' }}>Não tem conta? <Link to="/cadastro" className="grad-text bold">Criar conta grátis</Link></p>
    </AuthShell>
  );
}

export function SignUp() {
  const [f, setF] = useState({ name: '', email: '', password: '', accept: false });
  const [sent, setSent] = useState(false);
  const { busy, err, run } = useAction();
  if (sent) return (
    <AuthShell title="Confirme seu e-mail" sub={<>Enviamos um link para <b>{f.email}</b>.</>}>
      <p className="small muted">Abra o e-mail e clique no link para ativar sua conta. Não chegou? Confira o spam ou tente de novo em alguns minutos.</p>
      <Link to="/entrar" className="btn primary" style={{ width: '100%', marginTop: 18 }}>Ir para o login</Link>
    </AuthShell>
  );
  return (
    <AuthShell title="Criar conta grátis" sub="Tarefas, agenda e metas em um só lugar.">
      <GoogleButton />
      <form className="col" style={{ gap: 12 }} onSubmit={(e) => {
        e.preventDefault();
        run(async () => { if (!f.accept) throw new Error('Para criar a conta, aceite os termos e a política de privacidade.'); const needsConfirm = await signUp(f.name.trim(), f.email.trim(), f.password); if (needsConfirm) setSent(true); });
      }}>
        <Field icon={<User size={17} />} required autoComplete="name" placeholder="Seu nome" aria-label="Nome" maxLength={60} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <Field icon={<Mail size={17} />} type="email" required autoComplete="email" placeholder="E-mail" aria-label="E-mail" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        <Field icon={<Lock size={17} />} type="password" required minLength={8} autoComplete="new-password" placeholder="Senha (mín. 8 caracteres)" aria-label="Senha" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
        <label className="row small" style={{ alignItems: 'flex-start', gap: 10 }}>
          <input type="checkbox" checked={f.accept} onChange={(e) => setF({ ...f, accept: e.target.checked })} style={{ marginTop: 3, accentColor: 'var(--accent)' }} />
          <span className="muted">Li e aceito os <Link to="/termos" className="grad-text bold">Termos de uso</Link> e a <Link to="/privacidade" className="grad-text bold">Política de privacidade</Link>.</span>
        </label>
        {err && <Msg kind="erro">{err}</Msg>}
        <button className="btn primary" style={{ height: 46 }} disabled={busy}>{busy ? 'Criando…' : 'Criar conta'}</button>
      </form>
      <p className="tiny muted" style={{ marginTop: 12, textAlign: 'center' }}>Ao continuar com o Google, você também aceita os termos e a política.</p>
      <p className="small muted" style={{ marginTop: 14, textAlign: 'center' }}>Já tem conta? <Link to="/entrar" className="grad-text bold">Entrar</Link></p>
    </AuthShell>
  );
}

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const { busy, err, run } = useAction();
  return (
    <AuthShell title="Recuperar senha" sub="Vamos te enviar um link para criar uma nova senha.">
      {sent ? (
        <>
          <Msg kind="ok">Se existir uma conta com <b>{email}</b>, você vai receber um e-mail com o link em instantes. Confira também o spam.</Msg>
          <Link to="/entrar" className="btn" style={{ width: '100%', marginTop: 16 }}>Voltar para o login</Link>
        </>
      ) : (
        <form className="col" style={{ gap: 12 }} onSubmit={(e) => { e.preventDefault(); run(async () => { await sendPasswordReset(email.trim()); setSent(true); }); }}>
          <Field icon={<Mail size={17} />} type="email" required autoComplete="email" placeholder="Seu e-mail" aria-label="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
          {err && <Msg kind="erro">{err}</Msg>}
          <button className="btn primary" style={{ height: 46 }} disabled={busy}>{busy ? 'Enviando…' : 'Enviar link'}</button>
          <Link to="/entrar" className="small muted" style={{ textAlign: 'center' }}>Lembrei a senha</Link>
        </form>
      )}
    </AuthShell>
  );
}

export function ResetPassword() {
  const [p, setP] = useState({ a: '', b: '' });
  const [done, setDone] = useState(false);
  const { busy, err, run } = useAction();
  const nav = useNavigate();
  return (
    <AuthShell title="Nova senha" sub="Escolha uma senha nova para sua conta." back={false}>
      {done ? (
        <>
          <Msg kind="ok">Senha alterada com sucesso.</Msg>
          <button className="btn primary" style={{ width: '100%', marginTop: 16 }} onClick={() => { finishRecovery(); nav('/', { replace: true }); }}>Continuar</button>
        </>
      ) : (
        <form className="col" style={{ gap: 12 }} onSubmit={(e) => { e.preventDefault(); run(async () => { if (p.a !== p.b) throw new Error('As senhas não são iguais.'); await updatePassword(p.a); setDone(true); }); }}>
          <Field icon={<KeyRound size={17} />} type="password" required minLength={8} autoComplete="new-password" placeholder="Nova senha (mínimo 8)" aria-label="Nova senha" value={p.a} onChange={(e) => setP({ ...p, a: e.target.value })} />
          <Field icon={<KeyRound size={17} />} type="password" required minLength={8} autoComplete="new-password" placeholder="Repita a nova senha" aria-label="Repita a nova senha" value={p.b} onChange={(e) => setP({ ...p, b: e.target.value })} />
          {err && <Msg kind="erro">{err}</Msg>}
          <button className="btn primary" style={{ height: 46 }} disabled={busy}>{busy ? 'Salvando…' : 'Salvar nova senha'}</button>
        </form>
      )}
    </AuthShell>
  );
}
