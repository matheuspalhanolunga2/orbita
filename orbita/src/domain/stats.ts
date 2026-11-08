import { addDays, weekDates } from './dates';
import { completionDates, isDoneOn, occursOn } from './tasks';
import type { AppData, AreaId, ISODate, Task } from './types';

export function dayProgress(tasks: Task[], date: ISODate) {
  const list = tasks.filter((t) => occursOn(t, date));
  const done = list.filter((t) => isDoneOn(t, date)).length;
  return { total: list.length, done, pending: list.length - done, pct: list.length ? Math.round((done / list.length) * 100) : 0 };
}

/** Completed tasks + logged minutes per day for the last n days */
export function productivitySeries(d: AppData, today: ISODate, n = 14) {
  const comp = completionDates(d.tasks);
  return Array.from({ length: n }, (_, i) => {
    const date = addDays(today, i - n + 1);
    return {
      date,
      concluidas: comp.filter((c) => c.date === date).length,
      minutos: d.logs.filter((l) => l.date === date).reduce((a, l) => a + (l.minutes ?? 0), 0),
    };
  });
}

export function weekSummary(d: AppData, today: ISODate) {
  const days = weekDates(today);
  const comp = completionDates(d.tasks);
  const perDay = days.map((date) => {
    const p = dayProgress(d.tasks, date);
    return { date, ...p, completed: comp.filter((c) => c.date === date).length };
  });
  const inWeek = (x: string) => x >= days[0] && x <= days[6];
  const minutesByArea: Record<AreaId, number> = {};
  d.logs.filter((l) => inWeek(l.date)).forEach((l) => { minutesByArea[l.area] = (minutesByArea[l.area] ?? 0) + (l.minutes ?? 0); });
  return {
    days: perDay,
    completed: comp.filter((c) => inWeek(c.date)).length,
    workouts: d.logs.filter((l) => l.area === 'academia' && inWeek(l.date)).length,
    lives: d.lives.filter((l) => l.status === 'realizada' && inWeek(l.date)).length,
    published: d.content.filter((c) => c.publishedAt && inWeek(c.publishedAt.slice(0, 10))).length,
    minutesByArea,
  };
}

/** Consecutive days (ending today or yesterday) with at least one log in the area */
export function streak(d: AppData, areaId: AreaId, today: ISODate): number {
  const dates = new Set(d.logs.filter((l) => l.area === areaId).map((l) => l.date));
  let n = 0;
  let day = dates.has(today) ? today : addDays(today, -1);
  while (dates.has(day)) { n++; day = addDays(day, -1); }
  return n;
}

/** Weekly counts of logs for an area, oldest first */
export function weeklyCounts(d: AppData, areaId: AreaId, today: ISODate, weeks = 12) {
  const thisMonday = weekDates(today)[0];
  return Array.from({ length: weeks }, (_, i) => {
    const start = addDays(thisMonday, -7 * (weeks - 1 - i));
    const end = addDays(start, 6);
    const logs = d.logs.filter((l) => l.area === areaId && l.date >= start && l.date <= end);
    return { week: start, count: logs.length, minutes: logs.reduce((a, l) => a + (l.minutes ?? 0), 0) };
  });
}
