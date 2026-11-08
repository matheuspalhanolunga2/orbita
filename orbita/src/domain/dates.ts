import type { HHmm, ISODate } from './types';

const pad = (n: number) => String(n).padStart(2, '0');

export function toISO(d: Date): ISODate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export function fromISO(s: ISODate): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}
export const todayISO = (now = new Date()) => toISO(now);
export function addDays(s: ISODate, n: number): ISODate {
  const d = fromISO(s);
  d.setDate(d.getDate() + n);
  return toISO(d);
}
export const weekdayOf = (s: ISODate) => fromISO(s).getDay();
export function diffDays(a: ISODate, b: ISODate): number {
  return Math.round((fromISO(a).getTime() - fromISO(b).getTime()) / 86_400_000);
}
/** Monday-based week containing the date */
export function weekDates(s: ISODate): ISODate[] {
  const wd = weekdayOf(s);
  const monday = addDays(s, wd === 0 ? -6 : 1 - wd);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}
/** 6x7 grid (Monday first) covering the month of the date */
export function monthGrid(s: ISODate): ISODate[] {
  const d = fromISO(s);
  const first = toISO(new Date(d.getFullYear(), d.getMonth(), 1));
  const start = weekDates(first)[0];
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}
export function toMin(t: HHmm): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}
export function fromMin(m: number): HHmm {
  const c = Math.max(0, Math.min(24 * 60 - 1, Math.round(m)));
  return `${pad(Math.floor(c / 60))}:${pad(c % 60)}`;
}
export const nowMin = (now = new Date()) => now.getHours() * 60 + now.getMinutes();
export const isValidTime = (t?: string): t is HHmm => !!t && /^([01]\d|2[0-3]):[0-5]\d$/.test(t);

export function fmtDuration(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60), m = min % 60;
  return m ? `${h}h${pad(m)}` : `${h}h`;
}
