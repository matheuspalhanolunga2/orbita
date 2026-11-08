import { TEMPLATE_CRIADOR } from '../domain/areas';
import type { AppData, Priority, Task } from '../domain/types';
import { emptyData, uid } from '../seed/defaults';
import { todayISO } from '../domain/dates';

interface LegacyTask { id: number; t: string; p: Priority; d: boolean; q?: string }

/** Converts tasks from the original single-file app (localStorage "tarefas-v1"). */
export function fromLegacy(list: LegacyTask[]): Task[] {
  const now = todayISO();
  return list.filter((x) => x && typeof x.t === 'string').map((x, i) => ({
    id: uid(), title: x.t, area: 'pessoal', priority: (['alta', 'media', 'baixa'] as const).includes(x.p) ? x.p : 'media',
    tags: [], done: !!x.d, doneAt: x.d ? `${now}T00:00` : undefined, date: x.q === 'Hoje' ? now : undefined, createdAt: `${now}T00:00`, order: i,
  }));
}

/** Validates and upgrades any imported/persisted payload into the current AppData shape. */
export function migrate(raw: unknown): AppData {
  const base = emptyData();
  if (!raw || typeof raw !== 'object') throw new Error('Arquivo inválido');
  const r = raw as Record<string, unknown>;
  if (Array.isArray(r.legacyTasks)) return { ...base, tasks: fromLegacy(r.legacyTasks as LegacyTask[]) };
  if (Array.isArray(raw)) return { ...base, tasks: fromLegacy(raw as LegacyTask[]) };
  const arr = <K extends keyof AppData>(k: K) => (Array.isArray(r[k]) ? (r[k] as AppData[K]) : base[k]);
  const d: AppData = {
    version: 2,
    // version 1 had no editable areas: it used exactly the 'criador' template
    areas: Array.isArray(r.areas) && r.areas.length ? (r.areas as AppData['areas']) : TEMPLATE_CRIADOR.map((a) => ({ ...a })),
    tasks: arr('tasks'), routine: arr('routine'), logs: arr('logs'), vocab: arr('vocab'), chords: arr('chords'),
    songs: arr('songs'), skills: arr('skills'), content: arr('content'), lives: arr('lives'), goals: arr('goals'),
    activity: arr('activity'), tags: arr('tags'),
    settings: { ...base.settings, ...(typeof r.settings === 'object' && r.settings ? (r.settings as object) : {}) },
  };
  if (d.tasks.some((t) => typeof t.title !== 'string' || !t.id)) throw new Error('Tarefas com formato inválido');
  return d;
}
