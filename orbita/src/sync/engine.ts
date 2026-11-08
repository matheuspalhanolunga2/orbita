/**
 * Sync engine: local-first store ⇄ server rows.
 *  - Local edits are diffed against the previous state and queued in an outbox (persisted, survives offline/reload).
 *  - The outbox is flushed (upsert) shortly after edits.
 *  - Remote changes are pulled incrementally (updated_at cursor) on start, on focus, when back online and every 30 s.
 * The backend is injected, so the engine is testable without a real server.
 */
import { create } from 'zustand';
import type { AppData } from '../domain/types';
import { getData, useStore } from '../store/useStore';
import { allChanges, applyRemote, changeKey, diffData, emptyBase, type Change, type RemoteRow } from './diff';

export interface SyncBackend {
  /** rows changed after `since` (all rows when undefined), ordered by updated_at */
  pull(since?: string): Promise<RemoteRow[]>;
  push(changes: Change[]): Promise<void>;
}

interface SyncState { status: 'idle' | 'syncing' | 'offline' | 'error'; lastSync?: string; error?: string; ready: boolean; pending: number }
export const useSync = create<SyncState>(() => ({ status: 'idle', ready: false, pending: 0 }));

const OUTBOX = 'orbita-outbox', CURSOR = 'orbita-cursor', OWNER = 'orbita-owner';
const ls = {
  get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* storage unavailable */ } },
  del: (k: string) => { try { localStorage.removeItem(k); } catch { /* */ } },
};

let backend: SyncBackend | null = null;
let outbox = new Map<string, Change>();
let applying = false;
let unsub: (() => void) | null = null;
let flushTimer: ReturnType<typeof setTimeout> | undefined;
let pollTimer: ReturnType<typeof setInterval> | undefined;

const saveOutbox = () => { ls.set(OUTBOX, JSON.stringify([...outbox.values()])); useSync.setState({ pending: outbox.size }); };
const loadOutbox = () => { try { outbox = new Map((JSON.parse(ls.get(OUTBOX) ?? '[]') as Change[]).map((c) => [changeKey(c), c])); } catch { outbox = new Map(); } };
const replaceLocal = (d: AppData) => { applying = true; useStore.getState().replaceAll(d); applying = false; };

function enqueue(changes: Change[]) {
  for (const c of changes) outbox.set(changeKey(c), c);
  saveOutbox();
  clearTimeout(flushTimer);
  flushTimer = setTimeout(() => void flush(), 800);
}

export async function flush() {
  if (!backend || !outbox.size) return;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) { useSync.setState({ status: 'offline' }); return; }
  const batch = [...outbox.values()];
  useSync.setState({ status: 'syncing' });
  try {
    await backend.push(batch);
    for (const c of batch) if (outbox.get(changeKey(c)) === c) outbox.delete(changeKey(c));
    saveOutbox();
    useSync.setState({ status: 'idle', lastSync: new Date().toISOString(), error: undefined });
  } catch (e) {
    useSync.setState({ status: 'error', error: (e as Error).message });
  }
}

export async function pull() {
  if (!backend) return;
  try {
    const rows = await backend.pull(ls.get(CURSOR) ?? undefined);
    if (rows.length) {
      replaceLocal(applyRemote(getData(), rows, new Set(outbox.keys())));
      ls.set(CURSOR, rows[rows.length - 1].updated_at);
    }
    useSync.setState({ lastSync: new Date().toISOString(), status: outbox.size ? useSync.getState().status : 'idle' });
  } catch (e) {
    useSync.setState({ status: navigator.onLine === false ? 'offline' : 'error', error: (e as Error).message });
  }
}

/** Starts syncing for a signed-in user. Resolves after the first download, so the UI can show real data. */
export async function startSync(userId: string, b: SyncBackend) {
  stopSync();
  backend = b;
  const theme = getData().settings.theme;
  const keepTheme = (d: AppData): AppData => ({ ...d, settings: { ...d.settings, theme } });
  // Data in this browser belongs to someone else (or to local mode): start clean.
  if (ls.get(OWNER) !== userId) { ls.del(OUTBOX); ls.del(CURSOR); replaceLocal(keepTheme(emptyBase())); }
  ls.set(OWNER, userId);
  loadOutbox();
  useSync.setState({ ready: false, status: 'syncing', pending: outbox.size });
  try {
    const hadCursor = !!ls.get(CURSOR);
    const rows = await b.pull(ls.get(CURSOR) ?? undefined);
    if (!hadCursor) {
      // first download on this device: server is the source of truth
      replaceLocal(keepTheme(rows.length ? applyRemote(emptyBase(), rows) : emptyBase()));
    } else if (rows.length) {
      replaceLocal(applyRemote(getData(), rows, new Set(outbox.keys())));
    }
    if (rows.length) ls.set(CURSOR, rows[rows.length - 1].updated_at);
    useSync.setState({ status: 'idle', lastSync: new Date().toISOString(), error: undefined });
  } catch (e) {
    // offline start: keep using the cached local copy
    useSync.setState({ status: navigator.onLine === false ? 'offline' : 'error', error: (e as Error).message });
  }
  unsub = useStore.subscribe((s, prev) => { if (!applying && s !== prev) { const ch = diffData(prev, s); if (ch.length) enqueue(ch); } });
  const onFocus = () => { void flush().then(pull); };
  window.addEventListener('focus', onFocus);
  window.addEventListener('online', onFocus);
  pollTimer = setInterval(onFocus, 30_000);
  const prevUnsub = unsub;
  unsub = () => { prevUnsub(); window.removeEventListener('focus', onFocus); window.removeEventListener('online', onFocus); };
  void flush();
  useSync.setState({ ready: true });
}

export function stopSync() {
  unsub?.(); unsub = null;
  clearInterval(pollTimer); clearTimeout(flushTimer);
  backend = null;
}

/** Sign-out: forget this user's data in this browser (shared computers). */
export function clearLocal() {
  stopSync();
  ls.del(OUTBOX); ls.del(CURSOR); ls.del(OWNER);
  outbox = new Map();
  replaceLocal(emptyBase());
  useSync.setState({ ready: false, status: 'idle', pending: 0, lastSync: undefined });
}

/** Uploads everything (used when the server is empty but this device has data). */
export const uploadAll = () => enqueue(allChanges(getData()));
