import { describe, expect, it } from 'vitest';
import { planDay, studyPlan, insights } from './assistant';
import { addDays, monthGrid, weekDates } from './dates';
import { goalStatus } from './goals';
import { dayLoad, freeSlots, nextCommitment } from './schedule';
import { filterTasks, isDoneOn, isOverdue, occursOn, sortByPriority } from './tasks';
import type { AppData, Task } from './types';
import { emptyData } from '../seed/defaults';
import { migrate } from '../store/migrate';

const T = (p: Partial<Task>): Task => ({ id: Math.random().toString(), title: 'x', area: 'pessoal', priority: 'media', tags: [], done: false, createdAt: '2026-11-01T00:00', order: 0, ...p });
const MON = '2026-11-09'; // segunda-feira
const data = (p: Partial<AppData> = {}): AppData => ({ ...emptyData(), ...p });

describe('dates', () => {
  it('week starts on Monday', () => {
    expect(weekDates('2026-11-08')[0]).toBe('2026-11-02');
    expect(weekDates(MON)[6]).toBe('2026-11-15');
  });
  it('month grid has 42 days starting Monday', () => {
    const g = monthGrid('2026-11-20');
    expect(g).toHaveLength(42);
    expect(g[0]).toBe('2026-10-26');
  });
});

describe('tasks', () => {
  it('weekly recurrence only on chosen weekdays and after start', () => {
    const t = T({ recurrence: { type: 'weekly', days: [1, 3] }, date: MON });
    expect(occursOn(t, MON)).toBe(true);
    expect(occursOn(t, addDays(MON, 1))).toBe(false);
    expect(occursOn(t, addDays(MON, -7))).toBe(false);
  });
  it('recurring completion is per date', () => {
    const t = T({ recurrence: { type: 'daily' }, doneDates: [MON] });
    expect(isDoneOn(t, MON)).toBe(true);
    expect(isDoneOn(t, addDays(MON, 1))).toBe(false);
  });
  it('unfinished past task stays pending as overdue', () => {
    expect(isOverdue(T({ date: '2026-11-01' }), MON)).toBe(true);
    expect(isOverdue(T({ date: '2026-11-01', done: true }), MON)).toBe(false);
    expect(isOverdue(T({ date: '2026-11-01', recurrence: { type: 'daily' } }), MON)).toBe(false);
  });
  it('organize: pending first then priority (original app rule)', () => {
    const r = sortByPriority([T({ id: 'a', priority: 'baixa' }), T({ id: 'b', priority: 'alta', done: true }), T({ id: 'c', priority: 'alta' })]);
    expect(r.map((x) => x.id)).toEqual(['c', 'a', 'b']);
  });
  it('search ignores accents and matches tags', () => {
    const list = [T({ title: 'Revisão de código' }), T({ title: 'Outra', tags: ['portfólio'] })];
    expect(filterTasks(list, { search: 'revisao' })).toHaveLength(1);
    expect(filterTasks(list, { search: 'portfolio' })).toHaveLength(1);
  });
});

describe('schedule', () => {
  const settings = { dayStart: '08:00', dayEnd: '12:00' };
  it('free slots exclude timed blocks and tasks', () => {
    const routine = [{ id: 'r', weekday: 1, title: 'Aula', area: 'programacao' as const, start: '08:00', end: '10:00', fixed: true }];
    const tasks = [T({ date: MON, start: '10:30', duration: 30 })];
    expect(freeSlots(MON, routine, tasks, settings)).toEqual([{ start: 600, end: 630 }, { start: 660, end: 720 }]);
  });
  it('blocks without full time range do not consume free time but are reported', () => {
    const routine = [{ id: 'r', weekday: 1, title: 'Faculdade', area: 'programacao' as const, start: '10:35', fixed: true }];
    expect(freeSlots(MON, routine, [], settings)).toEqual([{ start: 480, end: 720 }]);
    expect(dayLoad(MON, routine, [], settings).untimedBlocks).toHaveLength(1);
  });
  it('detects overload', () => {
    const tasks = Array.from({ length: 6 }, () => T({ date: MON, duration: 60 }));
    expect(dayLoad(MON, [], tasks, settings).overloaded).toBe(true);
  });
  it('next commitment includes blocks with only a start time', () => {
    const routine = [{ id: 'r', weekday: 3, title: 'Faculdade', area: 'programacao' as const, start: '10:35', fixed: true }];
    const n = nextCommitment(routine, [], new Date(2026, 10, 9, 9, 0), MON);
    expect(n?.date).toBe('2026-11-11');
    expect(n?.time).toBe('10:35');
  });
});

describe('assistant', () => {
  it('plans unscheduled + overdue tasks into free slots by priority', () => {
    const d = data({ settings: { ...emptyData().settings, dayStart: '08:00', dayEnd: '09:10' },
      tasks: [T({ id: 'low', date: MON, priority: 'baixa', duration: 30 }), T({ id: 'late', date: '2026-11-01', priority: 'alta', duration: 30 }), T({ id: 'mid', date: MON, duration: 30 })] });
    const r = planDay(d, MON);
    expect(r.placements.map((p) => [p.taskId, p.start])).toEqual([['late', '08:00'], ['mid', '08:35']]);
    expect(r.leftover.map((t) => t.id)).toEqual(['low']);
  });
  it('study plan respects sessions per week and one session per area per day', () => {
    const d = data({ settings: { ...emptyData().settings, dayStart: '08:00', dayEnd: '10:00' } });
    const p = studyPlan(d, { areas: ['ingles', 'guitarra'], minutes: 30, sessionsPerWeek: 3, weeks: 1, start: MON });
    expect(p.filter((x) => x.title.includes('Inglês'))).toHaveLength(3);
    expect(p.filter((x) => x.title.includes('Guitarra'))).toHaveLength(3);
    expect(new Set(p.map((x) => x.date + x.title)).size).toBe(p.length);
  });
  it('reports overdue tasks', () => {
    const ins = insights(data({ tasks: [T({ date: '2026-11-01' })] }), MON, new Date(2026, 10, 9, 8));
    expect(ins[0].id).toBe('late');
  });
});

describe('goals', () => {
  it('sums logged minutes since creation', () => {
    const d = data({ logs: [{ id: '1', area: 'ingles', date: '2026-11-05', minutes: 30, kind: 'x' }, { id: '2', area: 'ingles', date: '2026-10-01', minutes: 99, kind: 'x' }] });
    const st = goalStatus({ id: 'g', title: 'g', area: 'ingles', kind: 'minutes', target: 60, unit: 'min', createdAt: '2026-11-01T00:00' }, d, MON);
    expect(st.value).toBe(30);
    expect(st.pct).toBe(50);
    expect(st.history.at(-1)?.value).toBe(30);
  });
});

describe('migration', () => {
  it('imports tasks from the original app format', () => {
    const d = migrate({ legacyTasks: [{ id: 1, t: 'Comprar café', p: 'baixa', d: true, q: 'Ontem' }] });
    expect(d.tasks[0]).toMatchObject({ title: 'Comprar café', priority: 'baixa', done: true });
  });
  it('upgrades v1 data (no areas) to the original area template', () => {
    const d = migrate({ tasks: [], settings: { name: 'x' } });
    expect(d.areas.map((a) => a.id)).toContain('guitarra');
    expect(d.settings.name).toBe('x');
  });
  it('rejects invalid backups', () => {
    expect(() => migrate('nope')).toThrow();
  });
});
