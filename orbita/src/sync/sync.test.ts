import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { applyRemote, diffData, emptyBase, type Change, type RemoteRow } from './diff';
import { emptyData } from '../seed/defaults';
import type { AppData, Task } from '../domain/types';

const task = (id: string, title = id): Task => ({ id, title, area: 'pessoal', priority: 'media', tags: [], done: false, createdAt: '', order: 0 });

describe('diffData', () => {
  it('detects added, changed and removed items by reference', () => {
    const a = task('a'), b = task('b');
    const prev: AppData = { ...emptyData(), tasks: [a, b] };
    const next: AppData = { ...prev, tasks: [{ ...a, title: 'A2' }, task('c')] };
    const ch = diffData(prev, next);
    expect(ch.map((c) => `${c.collection}:${c.id}:${c.deleted}`).sort()).toEqual(['tasks:a:false', 'tasks:b:true', 'tasks:c:false']);
  });
  it('ignores device-only settings (theme)', () => {
    const prev = emptyData();
    expect(diffData(prev, { ...prev, settings: { ...prev.settings, theme: 'light' } })).toHaveLength(0);
    expect(diffData(prev, { ...prev, settings: { ...prev.settings, name: 'Ana' } })[0]).toMatchObject({ collection: 'meta', id: 'settings' });
  });
});

describe('applyRemote', () => {
  const row = (p: Partial<RemoteRow>): RemoteRow => ({ collection: 'tasks', id: 'x', data: null, deleted: false, updated_at: '2026-01-01T00:00:00Z', ...p });
  it('upserts, deletes and applies meta', () => {
    const base: AppData = { ...emptyBase(), tasks: [task('a'), task('b')] };
    const d = applyRemote(base, [row({ id: 'a', data: task('a', 'novo') }), row({ id: 'b', deleted: true }), row({ collection: 'meta', id: 'settings', data: { name: 'Ana', onboarded: true } })]);
    expect(d.tasks).toEqual([task('a', 'novo')]);
    expect(d.settings.name).toBe('Ana');
    expect(d.settings.onboarded).toBe(true);
  });
  it('never overwrites items with local pending edits', () => {
    const base: AppData = { ...emptyBase(), tasks: [task('a', 'local')] };
    const d = applyRemote(base, [row({ id: 'a', data: task('a', 'servidor') })], new Set(['tasks:a']));
    expect(d.tasks[0].title).toBe('local');
  });
});

describe('engine', () => {
  beforeEach(() => { vi.stubGlobal('navigator', { onLine: true }); vi.stubGlobal('window', { addEventListener() {}, removeEventListener() {} }); localStorage.clear(); });
  afterEach(() => vi.unstubAllGlobals());

  it('two devices converge through the server without losing edits', async () => {
    const { startSync, flush, pull, stopSync } = await import('./engine');
    const { useStore } = await import('../store/useStore');
    // fake server
    const rows = new Map<string, RemoteRow>(); let clock = 0;
    const server = {
      async pull(since?: string) { return [...rows.values()].filter((r) => !since || r.updated_at >= since).sort((a, b) => (a.updated_at < b.updated_at ? -1 : 1)); },
      async push(ch: Change[]) { for (const c of ch) rows.set(`${c.collection}:${c.id}`, { ...c, data: c.deleted ? null : c.data, updated_at: new Date(Date.UTC(2026, 0, 1, 0, 0, ++clock)).toISOString() }); },
    };
    // device 1 signs in, creates a task
    await startSync('u1', server);
    useStore.getState().addTask({ title: 'Do celular' });
    await flush();
    expect([...rows.values()].some((r) => (r.data as Task | null)?.title === 'Do celular')).toBe(true);
    // device 2 = same store after a full reset with another cursor: simulate by clearing local and restarting
    stopSync(); localStorage.removeItem('orbita-cursor'); useStore.getState().replaceAll(emptyBase());
    await startSync('u1', server);
    expect(useStore.getState().tasks.map((t) => t.title)).toContain('Do celular');
    // remote edit arrives while a local edit to another item is pending
    const id = useStore.getState().tasks[0].id;
    await server.push([{ collection: 'tasks', id, data: { ...useStore.getState().tasks[0], title: 'Editado no PC' }, deleted: false }]);
    useStore.getState().addTask({ title: 'Local pendente' });
    await pull();
    const titles = useStore.getState().tasks.map((t) => t.title);
    expect(titles).toContain('Editado no PC');
    expect(titles).toContain('Local pendente');
    stopSync();
  });

  it('switching user clears the previous user data', async () => {
    const { startSync, stopSync } = await import('./engine');
    const { useStore } = await import('../store/useStore');
    const empty = { async pull() { return []; }, async push() {} };
    await startSync('a', empty);
    useStore.getState().addTask({ title: 'Segredo de A' });
    stopSync();
    await startSync('b', empty);
    expect(useStore.getState().tasks).toHaveLength(0);
    stopSync();
  });
});
