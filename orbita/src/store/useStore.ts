import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { area, setAreaRegistry, TEMPLATES, type TemplateId } from '../domain/areas';
import { todayISO, toISO } from '../domain/dates';
import { sortByPriority } from '../domain/tasks';
import type { Activity, AppData, AreaId, HHmm, ISODate, Settings, Task } from '../domain/types';
import { demoData, EXAMPLE_ROUTINE, emptyData, personalSeed, uid } from '../seed/defaults';
import { migrate } from './migrate';

/** Collections that share the generic CRUD actions */
export type Collection = 'areas' | 'tasks' | 'routine' | 'logs' | 'vocab' | 'chords' | 'songs' | 'skills' | 'content' | 'lives' | 'goals';
type Item<C extends Collection> = AppData[C][number];

export const stamp = (d = new Date()) => `${toISO(d)}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

interface Actions {
  add: <C extends Collection>(c: C, item: Omit<Item<C>, 'id'> & { id?: string }, log?: string) => string;
  update: <C extends Collection>(c: C, id: string, patch: Partial<Item<C>>, log?: string) => void;
  remove: (c: Collection, id: string, log?: string) => void;
  addTask: (t: Partial<Task> & { title: string }) => string;
  toggleTask: (id: string, date?: ISODate) => void;
  reschedule: (id: string, date: ISODate | undefined, start?: HHmm | null) => void;
  moveTask: (fromId: string, toId: string) => void;
  organizeTasks: () => void;
  clearDone: () => void;
  setSettings: (s: Partial<Settings>) => void;
  addTag: (tag: string) => void;
  removeTag: (tag: string) => void;
  log: (text: string, area?: AreaId) => void;
  importData: (d: unknown) => void;
  replaceAll: (d: AppData) => void;
  startFresh: (opts: { name: string; demo: boolean; routine: 'personal' | 'example' | 'empty'; template: TemplateId }) => void;
  removeArea: (id: string, moveTo: string) => void;
  resetAll: () => void;
}

export type Store = AppData & Actions;

const withLog = (s: AppData, text: string | undefined, a?: AreaId): Pick<AppData, 'activity'> | object => {
  if (!text) return {};
  const entry: Activity = { id: uid(), at: stamp(), text, area: a };
  return { activity: [entry, ...s.activity].slice(0, 300) };
};

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      ...emptyData(),

      add: (c, item, log) => {
        const id = item.id ?? uid();
        set((s) => ({ [c]: [...(s[c] as unknown[]), { ...item, id }], ...withLog(s, log, (item as { area?: AreaId }).area) }) as Partial<Store>);
        return id;
      },
      update: (c, id, patch, log) =>
        set((s) => ({ [c]: (s[c] as { id: string }[]).map((x) => (x.id === id ? { ...x, ...patch } : x)), ...withLog(s, log) }) as Partial<Store>),
      remove: (c, id, log) => set((s) => ({ [c]: (s[c] as { id: string }[]).filter((x) => x.id !== id), ...withLog(s, log) }) as Partial<Store>),

      addTask: (t) => {
        const s = get();
        const id = uid();
        const minOrder = s.tasks.reduce((m, x) => Math.min(m, x.order), 0);
        const task: Task = {
          id, title: t.title.trim(), area: t.area ?? 'pessoal', priority: t.priority ?? 'media', tags: t.tags ?? [], done: false,
          createdAt: stamp(), order: minOrder - 1, date: t.date, start: t.start, duration: t.duration, sub: t.sub, notes: t.notes,
          recurrence: t.recurrence, reminder: t.reminder, doneDates: t.recurrence ? [] : undefined,
        };
        set((st) => ({ tasks: [task, ...st.tasks], ...withLog(st, `Criou "${task.title}"`, task.area) }));
        return id;
      },
      toggleTask: (id, date = todayISO()) =>
        set((s) => {
          const t = s.tasks.find((x) => x.id === id);
          if (!t) return {};
          let next: Task;
          let done: boolean;
          if (t.recurrence) {
            const dd = new Set(t.doneDates ?? []);
            done = !dd.has(date);
            if (done) dd.add(date); else dd.delete(date);
            next = { ...t, doneDates: [...dd] };
          } else {
            done = !t.done;
            next = { ...t, done, doneAt: done ? stamp() : undefined };
          }
          return { tasks: s.tasks.map((x) => (x.id === id ? next : x)), ...withLog(s, `${done ? 'Concluiu' : 'Reabriu'} "${t.title}"`, t.area) };
        }),
      reschedule: (id, date, start) =>
        set((s) => {
          const t = s.tasks.find((x) => x.id === id);
          if (!t) return {};
          const patch: Partial<Task> = { date };
          if (start !== undefined) patch.start = start ?? undefined;
          const when = date ? `${date.split('-').reverse().join('/')}${patch.start ? ' ' + patch.start : ''}` : 'sem data';
          return { tasks: s.tasks.map((x) => (x.id === id ? { ...x, ...patch } : x)), ...withLog(s, `Reagendou "${t.title}" para ${when}`, t.area) };
        }),
      moveTask: (fromId, toId) =>
        set((s) => {
          const ordered = [...s.tasks].sort((a, b) => a.order - b.order);
          const from = ordered.findIndex((x) => x.id === fromId), to = ordered.findIndex((x) => x.id === toId);
          if (from < 0 || to < 0 || from === to) return {};
          const [x] = ordered.splice(from, 1);
          ordered.splice(to, 0, x);
          return { tasks: ordered.map((t, i) => ({ ...t, order: i })) };
        }),
      organizeTasks: () =>
        set((s) => ({ tasks: sortByPriority([...s.tasks].sort((a, b) => a.order - b.order), todayISO()).map((t, i) => ({ ...t, order: i })), ...withLog(s, 'Organizou as tarefas por prioridade') })),
      clearDone: () => set((s) => ({ tasks: s.tasks.filter((t) => t.recurrence || !t.done), ...withLog(s, 'Limpou tarefas concluídas') })),
      setSettings: (p) => set((s) => ({ settings: { ...s.settings, ...p } })),
      addTag: (tag) => set((s) => (s.tags.includes(tag) ? {} : { tags: [...s.tags, tag] })),
      removeTag: (tag) => set((s) => ({ tags: s.tags.filter((x) => x !== tag), tasks: s.tasks.map((t) => ({ ...t, tags: t.tags.filter((x) => x !== tag) })) })),
      log: (text, a) => set((s) => withLog(s, text, a) as Partial<Store>),
      importData: (raw) => {
        const d = migrate(raw);
        set({ ...d, ...withLog(d, 'Importou um backup') } as Partial<Store>);
      },
      replaceAll: (d) => set(d),
      startFresh: ({ name, demo, routine, template }) => {
        let d = emptyData();
        d.areas = TEMPLATES[template].map((a) => ({ ...a }));
        const ids = new Set(d.areas.map((a) => a.id));
        const src = routine === 'personal' ? personalSeed?.routine ?? [] : routine === 'example' ? EXAMPLE_ROUTINE : [];
        d.routine = src.filter((b) => ids.has(b.area)).map((b) => ({ ...b, id: uid() }));
        d.settings = { ...d.settings, name: name.trim(), onboarded: true, theme: get().settings.theme };
        // keep tasks migrated from the original app (legacy) if any
        const legacy = get().tasks;
        if (demo && template === 'criador') d = demoData(d);
        d.tasks = [...legacy, ...d.tasks];
        set({ ...d, activity: [{ id: uid(), at: stamp(), text: 'Começou a usar o Órbita' }] });
      },
      removeArea: (id, moveTo) =>
        set((s) => {
          const label = s.areas.find((a) => a.id === id)?.label ?? id;
          const mv = <T extends { area: string }>(l: T[]) => l.map((x) => (x.area === id ? { ...x, area: moveTo } : x));
          return {
            areas: s.areas.filter((a) => a.id !== id), tasks: mv(s.tasks), routine: mv(s.routine), logs: mv(s.logs), skills: mv(s.skills), goals: mv(s.goals),
            ...withLog(s, `Excluiu a área "${label}"`),
          } as Partial<Store>;
        }),
      resetAll: () => set({ ...emptyData() }),
    }),
    {
      name: 'orbita-data',
      version: 2,
      migrate: (persisted) => migrate(persisted) as unknown as Store,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => {
        const { version, areas, tasks, routine, logs, vocab, chords, songs, skills, content, lives, goals, activity, tags, settings } = s;
        return { version, areas, tasks, routine, logs, vocab, chords, songs, skills, content, lives, goals, activity, tags, settings };
      },
      onRehydrateStorage: () => (state) => {
        // First run: bring over tasks saved by the original single-file app (same browser/origin).
        if (state && !state.settings.onboarded && !state.tasks.length) {
          try {
            const legacy = JSON.parse(localStorage.getItem('tarefas-v1') ?? 'null');
            if (Array.isArray(legacy) && legacy.length) state.replaceAll({ ...state, tasks: migrate({ legacyTasks: legacy }).tasks });
          } catch { /* ignore */ }
        }
      },
    },
  ),
);

/** Snapshot of the persisted data (without actions) */
export function getData(): AppData {
  const s = useStore.getState();
  const { version, areas, tasks, routine, logs, vocab, chords, songs, skills, content, lives, goals, activity, tags, settings } = s;
  return { version, areas, tasks, routine, logs, vocab, chords, songs, skills, content, lives, goals, activity, tags, settings };
}

export const areaLabel = (a: AreaId) => area(a).label;

// keep the area registry used by domain helpers in sync with the store
setAreaRegistry(useStore.getState().areas);
useStore.subscribe((s, prev) => { if (s.areas !== prev.areas) setAreaRegistry(s.areas); });
