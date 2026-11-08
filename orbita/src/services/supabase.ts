/**
 * Authentication (e-mail/password, Google, password recovery) and the Supabase sync backend.
 * Enabled only when VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set (see .env.example and docs/DEPLOY.md).
 * Without them the app runs in local mode (data only in this browser).
 */
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { create } from 'zustand';
import type { Change, RemoteRow } from '../sync/diff';
import { clearLocal, startSync, type SyncBackend } from '../sync/engine';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
export const cloudConfigured = !!(url && key) || !!(globalThis as { __ORBITA_FAKE_BACKEND__?: unknown }).__ORBITA_FAKE_BACKEND__;

let supabase: SupabaseClient | null = null;
/** The SDK is loaded on demand. Tests can inject a fake client through window.__ORBITA_FAKE_BACKEND__. */
async function client(): Promise<SupabaseClient> {
  if (supabase) return supabase;
  const fake = (globalThis as { __ORBITA_FAKE_BACKEND__?: SupabaseClient }).__ORBITA_FAKE_BACKEND__;
  if (fake) return (supabase = fake);
  const { createClient } = await import('@supabase/supabase-js');
  supabase = createClient(url!, key!, { auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  return supabase;
}

interface AuthState { ready: boolean; session: Session | null; recovery: boolean }
export const useAuth = create<AuthState>(() => ({ ready: !cloudConfigured, session: null, recovery: false }));

const origin = () => window.location.origin;
const ptError = (e: { message?: string; code?: string } | null): Error => {
  const m = e?.message ?? 'Erro desconhecido';
  const map: [RegExp, string][] = [
    [/invalid login credentials/i, 'E-mail ou senha incorretos.'],
    [/email not confirmed/i, 'Confirme seu e-mail pelo link que enviamos antes de entrar.'],
    [/user already registered/i, 'Já existe uma conta com este e-mail. Tente entrar ou recuperar a senha.'],
    [/password should be at least/i, 'A senha precisa ter pelo menos 6 caracteres.'],
    [/rate limit|too many/i, 'Muitas tentativas. Aguarde alguns minutos e tente de novo.'],
    [/same password|different from the old/i, 'A nova senha precisa ser diferente da anterior.'],
    [/failed to fetch|network/i, 'Sem conexão com o servidor. Verifique sua internet.'],
  ];
  return new Error(map.find(([r]) => r.test(m))?.[1] ?? m);
};

export async function signIn(email: string, password: string) {
  const { error } = await (await client()).auth.signInWithPassword({ email, password });
  if (error) throw ptError(error);
}
/** Returns true when the account needs e-mail confirmation before the first login. */
export async function signUp(name: string, email: string, password: string): Promise<boolean> {
  const { data, error } = await (await client()).auth.signUp({ email, password, options: { data: { full_name: name }, emailRedirectTo: origin() } });
  if (error) throw ptError(error);
  return !data.session;
}
export async function signInWithGoogle() {
  const { error } = await (await client()).auth.signInWithOAuth({ provider: 'google', options: { redirectTo: origin() } });
  if (error) throw ptError(error);
}
export async function sendPasswordReset(email: string) {
  const { error } = await (await client()).auth.resetPasswordForEmail(email, { redirectTo: `${origin()}/redefinir-senha` });
  if (error) throw ptError(error);
}
export async function updatePassword(password: string) {
  const { error } = await (await client()).auth.updateUser({ password });
  if (error) throw ptError(error);
}
export const finishRecovery = () => useAuth.setState({ recovery: false });
export async function signOut() {
  clearLocal();
  await (await client()).auth.signOut();
}
/** Deletes the account and all its data (see supabase/schema.sql → delete_my_account). */
export async function deleteAccount() {
  const { error } = await (await client()).rpc('delete_my_account');
  if (error) throw ptError(error);
  await signOut();
}
export const displayName = (s: Session | null) => (s?.user.user_metadata?.full_name as string | undefined) ?? (s?.user.user_metadata?.name as string | undefined) ?? '';

/* ---------------- sync backend (table public.items) ---------------- */
const PAGE = 1000;
const OVERLAP_MS = 30_000; // re-read a small window: applying a row twice is harmless, missing one is not

function backendFor(sb: SupabaseClient, userId: string): SyncBackend {
  return {
    async pull(since) {
      const out: RemoteRow[] = [];
      const from = since ? new Date(new Date(since).getTime() - OVERLAP_MS).toISOString() : undefined;
      for (let page = 0; ; page++) {
        let q = sb.from('items').select('collection,id,data,deleted,updated_at').order('updated_at', { ascending: true }).order('id', { ascending: true }).range(page * PAGE, page * PAGE + PAGE - 1);
        if (from) q = q.gte('updated_at', from);
        const { data, error } = await q;
        if (error) throw ptError(error);
        out.push(...(data as RemoteRow[]));
        if (!data || data.length < PAGE) break;
      }
      return out;
    },
    async push(changes: Change[]) {
      for (let i = 0; i < changes.length; i += 500) {
        const rows = changes.slice(i, i + 500).map((c) => ({ user_id: userId, collection: c.collection, id: c.id, data: c.data, deleted: c.deleted }));
        const { error } = await sb.from('items').upsert(rows, { onConflict: 'user_id,collection,id' });
        if (error) throw ptError(error);
      }
    },
  };
}

let started: string | null = null;
async function onSession(session: Session | null) {
  useAuth.setState({ session });
  if (session && started !== session.user.id) {
    started = session.user.id;
    await startSync(session.user.id, backendFor(await client(), session.user.id));
  }
  if (!session) started = null;
}

/** Call once at startup. */
export async function initAuth() {
  if (!cloudConfigured) return;
  const sb = await client();
  sb.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY') useAuth.setState({ recovery: true });
    // defer: never await Supabase calls inside this callback
    setTimeout(() => void onSession(session), 0);
  });
  const { data } = await sb.auth.getSession();
  await onSession(data.session);
  if (location.pathname === '/redefinir-senha' && data.session) useAuth.setState({ recovery: true });
  useAuth.setState({ ready: true });
}
