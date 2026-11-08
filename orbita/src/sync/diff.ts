/**
 * Pure helpers for item-level sync. Every entity is stored as one row:
 *   (collection, id) → data jsonb | deleted
 * so two devices editing different items never overwrite each other.
 */
import type { AppData } from '../domain/types';
import { emptyData } from '../seed/defaults';

export const LIST_COLLECTIONS = ['areas', 'tasks', 'routine', 'logs', 'vocab', 'chords', 'songs', 'skills', 'content', 'lives', 'goals', 'activity'] as const;
export type ListCollection = (typeof LIST_COLLECTIONS)[number];
/** Singletons are stored in collection "meta" */
export const META_IDS = ['settings', 'tags'] as const;
export type SyncCollection = ListCollection | 'meta';

export interface Change { collection: SyncCollection; id: string; data: unknown | null; deleted: boolean }
export interface RemoteRow extends Change { updated_at: string }

const key = (c: SyncCollection, id: string) => `${c}:${id}`;
export const changeKey = (c: Change) => key(c.collection, c.id);

/** Settings that only make sense on this device are not synced. */
const LOCAL_ONLY_SETTINGS = ['theme', 'notifications'] as const;
const syncedSettings = (s: AppData['settings']) => {
  const copy: Record<string, unknown> = { ...s };
  LOCAL_ONLY_SETTINGS.forEach((k) => delete copy[k]);
  return copy;
};

/** Changes between two states. Relies on immutable updates: unchanged items keep their reference. */
export function diffData(prev: AppData, next: AppData): Change[] {
  const out: Change[] = [];
  for (const c of LIST_COLLECTIONS) {
    const a = prev[c] as { id: string }[], b = next[c] as { id: string }[];
    if (a === b) continue;
    const before = new Map(a.map((x) => [x.id, x]));
    const after = new Set<string>();
    for (const item of b) {
      after.add(item.id);
      if (before.get(item.id) !== item) out.push({ collection: c, id: item.id, data: item, deleted: false });
    }
    for (const id of before.keys()) if (!after.has(id)) out.push({ collection: c, id, data: null, deleted: true });
  }
  if (prev.tags !== next.tags) out.push({ collection: 'meta', id: 'tags', data: next.tags, deleted: false });
  if (JSON.stringify(syncedSettings(prev.settings)) !== JSON.stringify(syncedSettings(next.settings)))
    out.push({ collection: 'meta', id: 'settings', data: syncedSettings(next.settings), deleted: false });
  return out;
}

/** Every item of a state as changes (used for the first upload). */
export function allChanges(d: AppData): Change[] {
  const lists = diffData({ ...emptyBase(), settings: d.settings, tags: d.tags }, d);
  return [...lists, { collection: 'meta', id: 'tags', data: d.tags, deleted: false }, { collection: 'meta', id: 'settings', data: syncedSettings(d.settings), deleted: false }];
}

/** Empty state with no template areas — the base for data that comes entirely from the server. */
export const emptyBase = (): AppData => ({ ...emptyData(), areas: [], tags: [] });

/**
 * Applies remote rows onto local data. Rows whose key is in `pending` (local edits not yet uploaded)
 * are skipped, so local changes are never lost to an older server copy.
 */
export function applyRemote(d: AppData, rows: RemoteRow[], pending: Set<string> = new Set()): AppData {
  if (!rows.length) return d;
  const next: AppData = { ...d };
  const touched = new Map<ListCollection, Map<string, unknown>>();
  for (const r of rows) {
    if (pending.has(changeKey(r))) continue;
    if (r.collection === 'meta') {
      if (r.id === 'tags' && Array.isArray(r.data)) next.tags = r.data as string[];
      if (r.id === 'settings' && r.data && typeof r.data === 'object') next.settings = { ...next.settings, ...(r.data as object) };
      continue;
    }
    if (!(LIST_COLLECTIONS as readonly string[]).includes(r.collection)) continue;
    const c = r.collection;
    if (!touched.has(c)) touched.set(c, new Map((next[c] as { id: string }[]).map((x) => [x.id, x])));
    const m = touched.get(c)!;
    if (r.deleted) m.delete(r.id);
    else m.set(r.id, r.data);
  }
  for (const [c, m] of touched) (next as unknown as Record<string, unknown[]>)[c] = [...m.values()];
  return next;
}
