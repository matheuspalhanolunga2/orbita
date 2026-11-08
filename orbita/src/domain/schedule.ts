import { addDays, fromMin, isValidTime, nowMin, toMin, weekdayOf } from './dates';
import { isDoneOn, occursOn } from './tasks';
import type { HHmm, ISODate, RoutineBlock, Settings, Task } from './types';

export const DEFAULT_TASK_MIN = 30;

export interface TimedItem {
  kind: 'block' | 'task';
  id: string;
  title: string;
  start: number;
  end: number;
  ref: RoutineBlock | Task;
}

export interface Slot { start: number; end: number }

export const blocksForDay = (routine: RoutineBlock[], date: ISODate) =>
  routine.filter((b) => b.weekday === weekdayOf(date));

/** Block has a usable time range. A block with only a start (e.g. "Faculdade às 10:35") occupies an unknown length, so it is reported but not used for free-time math. */
export const isTimedBlock = (b: RoutineBlock) => isValidTime(b.start) && isValidTime(b.end) && toMin(b.end!) > toMin(b.start!);

export function timedItems(date: ISODate, routine: RoutineBlock[], tasks: Task[]): TimedItem[] {
  const items: TimedItem[] = [];
  for (const b of blocksForDay(routine, date)) {
    if (isTimedBlock(b)) items.push({ kind: 'block', id: b.id, title: b.title, start: toMin(b.start!), end: toMin(b.end!), ref: b });
  }
  for (const t of tasks) {
    if (!occursOn(t, date) || !isValidTime(t.start)) continue;
    const s = toMin(t.start);
    items.push({ kind: 'task', id: t.id, title: t.title, start: s, end: s + (t.duration ?? DEFAULT_TASK_MIN), ref: t });
  }
  return items.sort((a, b) => a.start - b.start);
}

/** Free intervals inside the user's day window, minus timed blocks and timed tasks. */
export function freeSlots(date: ISODate, routine: RoutineBlock[], tasks: Task[], s: Pick<Settings, 'dayStart' | 'dayEnd'>, minLen = 30, fromMinute?: number): Slot[] {
  let cursor = Math.max(toMin(s.dayStart), fromMinute ?? 0);
  const end = toMin(s.dayEnd);
  const busy = timedItems(date, routine, tasks).filter((i) => !(i.kind === 'task' && isDoneOn(i.ref as Task, date)));
  const out: Slot[] = [];
  for (const b of busy) {
    if (b.end <= cursor) continue;
    if (b.start > cursor) out.push({ start: cursor, end: Math.min(b.start, end) });
    cursor = Math.max(cursor, b.end);
    if (cursor >= end) break;
  }
  if (cursor < end) out.push({ start: cursor, end });
  return out.filter((x) => x.end - x.start >= minLen);
}

export const slotLabel = (x: Slot) => `${fromMin(x.start)}–${fromMin(x.end)}`;

export interface Load { plannedMin: number; freeMin: number; pending: number; overloaded: boolean; untimedBlocks: RoutineBlock[] }

/** Compares the time needed by the day's pending tasks with the free time left in the day window. */
export function dayLoad(date: ISODate, routine: RoutineBlock[], tasks: Task[], s: Pick<Settings, 'dayStart' | 'dayEnd'>): Load {
  const pending = tasks.filter((t) => occursOn(t, date) && !isDoneOn(t, date));
  const plannedMin = pending.filter((t) => !isValidTime(t.start)).reduce((a, t) => a + (t.duration ?? DEFAULT_TASK_MIN), 0);
  const freeMin = freeSlots(date, routine, tasks, s, 1).reduce((a, x) => a + x.end - x.start, 0);
  const untimedBlocks = blocksForDay(routine, date).filter((b) => !isTimedBlock(b));
  return { plannedMin, freeMin, pending: pending.length, overloaded: plannedMin > freeMin || pending.length > 8, untimedBlocks };
}

export interface NextItem { date: ISODate; time: HHmm; title: string; kind: 'block' | 'task'; area: string }

/** Next timed commitment from now, looking up to 7 days ahead. Blocks with only a start time count here. */
export function nextCommitment(routine: RoutineBlock[], tasks: Task[], now = new Date(), today: ISODate): NextItem | null {
  for (let i = 0; i < 7; i++) {
    const date = addDays(today, i);
    const from = i === 0 ? nowMin(now) : -1;
    const cand: NextItem[] = [];
    for (const b of blocksForDay(routine, date))
      if (isValidTime(b.start) && toMin(b.start) > from) cand.push({ date, time: b.start!, title: b.title, kind: 'block', area: b.area });
    for (const t of tasks)
      if (occursOn(t, date) && !isDoneOn(t, date) && isValidTime(t.start) && toMin(t.start) > from)
        cand.push({ date, time: t.start!, title: t.title, kind: 'task', area: t.area });
    cand.sort((a, b) => toMin(a.time) - toMin(b.time));
    if (cand.length) return cand[0];
  }
  return null;
}
