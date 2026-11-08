import { addDays, diffDays } from './dates';
import { completionDates } from './tasks';
import type { AppData, Goal, ISODate } from './types';

export interface GoalPoint { date: ISODate; value: number }
export interface GoalStatus {
  value: number;
  pct: number;
  /** cumulative values per day since creation (max 60 points) */
  history: GoalPoint[];
  daysLeft: number | null;
  /** value needed per remaining day to reach the target */
  perDayNeeded: number | null;
  onTrack: boolean | null;
  last7: number;
}

/** Raw events (date, amount) that count toward a goal. Derived from real records, never estimated. */
export function goalEvents(g: Goal, d: AppData): GoalPoint[] {
  const since = g.createdAt.slice(0, 10);
  const inRange = (x: string) => x >= since;
  switch (g.kind) {
    case 'tasks':
      return completionDates(d.tasks).filter((c) => c.area === g.area && inRange(c.date)).map((c) => ({ date: c.date, value: 1 }));
    case 'minutes':
      return d.logs.filter((l) => l.area === g.area && inRange(l.date)).map((l) => ({ date: l.date, value: l.minutes ?? 0 }));
    case 'sessions':
      return d.logs.filter((l) => l.area === g.area && inRange(l.date)).map((l) => ({ date: l.date, value: 1 }));
    case 'published':
      return d.content.filter((c) => c.stage === 'publicado' && c.publishedAt && inRange(c.publishedAt.slice(0, 10)))
        .map((c) => ({ date: c.publishedAt!.slice(0, 10), value: 1 }));
    case 'lives':
      return d.lives.filter((l) => l.status === 'realizada' && inRange(l.date)).map((l) => ({ date: l.date, value: 1 }));
    case 'manual':
      return [];
  }
}

export function goalStatus(g: Goal, d: AppData, today: ISODate): GoalStatus {
  const since = g.createdAt.slice(0, 10);
  let history: GoalPoint[];
  let value: number;
  if (g.kind === 'manual') {
    history = [...(g.manualHistory ?? [])].sort((a, b) => (a.date < b.date ? -1 : 1));
    value = g.manualValue ?? 0;
  } else {
    const ev = goalEvents(g, d);
    value = ev.reduce((a, e) => a + e.value, 0);
    const span = Math.min(60, Math.max(1, diffDays(today, since) + 1));
    const start = addDays(today, -(span - 1));
    let acc = ev.filter((e) => e.date < start).reduce((a, e) => a + e.value, 0);
    history = [];
    for (let i = 0; i < span; i++) {
      const day = addDays(start, i);
      acc += ev.filter((e) => e.date === day).reduce((a, e) => a + e.value, 0);
      history.push({ date: day, value: acc });
    }
  }
  const last7 = g.kind === 'manual' ? 0 : goalEvents(g, d).filter((e) => e.date > addDays(today, -7)).reduce((a, e) => a + e.value, 0);
  const pct = g.target > 0 ? Math.min(100, Math.round((value / g.target) * 100)) : 0;
  const daysLeft = g.deadline ? diffDays(g.deadline, today) : null;
  const remaining = Math.max(0, g.target - value);
  const perDayNeeded = daysLeft !== null && daysLeft > 0 ? remaining / daysLeft : null;
  let onTrack: boolean | null = null;
  if (g.deadline) {
    const total = Math.max(1, diffDays(g.deadline, since));
    const elapsed = Math.min(total, Math.max(0, diffDays(today, since)));
    onTrack = value >= (g.target * elapsed) / total;
  }
  return { value, pct, history, daysLeft, perDayNeeded, onTrack, last7 };
}
