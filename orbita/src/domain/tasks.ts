import { PRIORITY_WEIGHT } from './areas';
import { diffDays, toMin, weekdayOf } from './dates';
import type { AreaId, ISODate, Priority, Task } from './types';

/** Does a task appear on the given date? */
export function occursOn(t: Task, date: ISODate): boolean {
  if (t.recurrence) {
    if (t.date && date < t.date) return false;
    if (t.recurrence.type === 'daily') return true;
    return (t.recurrence.days ?? []).includes(weekdayOf(date));
  }
  return t.date === date;
}

export function isDoneOn(t: Task, date: ISODate): boolean {
  return t.recurrence ? (t.doneDates ?? []).includes(date) : t.done;
}

/** Single tasks planned before today and not completed. They stay pending until rescheduled or done. */
export function isOverdue(t: Task, today: ISODate): boolean {
  return !t.recurrence && !t.done && !!t.date && t.date < today;
}

export const overdueTasks = (tasks: Task[], today: ISODate) =>
  tasks.filter((t) => isOverdue(t, today)).sort((a, b) => (a.date! < b.date! ? -1 : 1));

export function daysLate(t: Task, today: ISODate): number {
  return t.date ? diffDays(today, t.date) : 0;
}

/** Tasks shown in a day: occurrences + (for today) overdue ones are kept separately by callers */
export function tasksForDate(tasks: Task[], date: ISODate): Task[] {
  return sortByTime(tasks.filter((t) => occursOn(t, date)));
}

export function sortByTime(list: Task[]): Task[] {
  return [...list].sort((a, b) => {
    if (a.start && b.start) return toMin(a.start) - toMin(b.start);
    if (a.start) return -1;
    if (b.start) return 1;
    return PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority] || a.order - b.order;
  });
}

/** Same rule as the original app's "Organizar": pending first, then by priority */
export function sortByPriority(list: Task[], date?: ISODate): Task[] {
  const done = (t: Task) => (date ? isDoneOn(t, date) : t.done) ? 1 : 0;
  return [...list].sort((a, b) => done(a) - done(b) || PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority]);
}

export interface TaskQuery {
  search?: string;
  area?: AreaId | 'todas';
  priority?: Priority | 'todas';
  tag?: string;
  status?: 'todas' | 'pendentes' | 'concluidas';
}

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function filterTasks(tasks: Task[], q: TaskQuery, refDate?: ISODate): Task[] {
  const s = q.search ? norm(q.search.trim()) : '';
  return tasks.filter((t) => {
    if (s && !norm(`${t.title} ${t.notes ?? ''} ${t.tags.join(' ')} ${t.sub ?? ''}`).includes(s)) return false;
    if (q.area && q.area !== 'todas' && t.area !== q.area) return false;
    if (q.priority && q.priority !== 'todas' && t.priority !== q.priority) return false;
    if (q.tag && !t.tags.includes(q.tag)) return false;
    const done = refDate && t.recurrence ? isDoneOn(t, refDate) : t.done;
    if (q.status === 'pendentes' && done) return false;
    if (q.status === 'concluidas' && !done) return false;
    return true;
  });
}

/** All completion events (single + recurring occurrences) as dates */
export function completionDates(tasks: Task[]): { date: ISODate; area: AreaId }[] {
  const out: { date: ISODate; area: AreaId }[] = [];
  for (const t of tasks) {
    if (t.recurrence) (t.doneDates ?? []).forEach((d) => out.push({ date: d, area: t.area }));
    else if (t.done && t.doneAt) out.push({ date: t.doneAt.slice(0, 10), area: t.area });
  }
  return out;
}
