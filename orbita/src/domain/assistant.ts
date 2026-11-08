/**
 * "Meu Assistente" — deterministic rules engine.
 * Everything here is plain logic over the user's own data (no AI). The AI layer lives in
 * src/services/ai and can later consume `assistantContext()` to generate natural-language help.
 */
import { activeAreas, PRIORITY_WEIGHT, area } from './areas';
import { addDays, fromMin, isValidTime, nowMin } from './dates';
import { goalStatus } from './goals';
import { DEFAULT_TASK_MIN, dayLoad, freeSlots, type Slot } from './schedule';
import { weekSummary } from './stats';
import { isDoneOn, occursOn, overdueTasks } from './tasks';
import type { AppData, AreaId, ISODate, Task } from './types';

export interface Insight {
  id: string;
  level: 'alerta' | 'atencao' | 'ok' | 'info';
  title: string;
  detail: string;
  action?: 'plan-day' | 'reschedule-overdue' | 'open-routine' | 'open-goals';
}

export interface Placement { taskId: string; title: string; date: ISODate; start: string; duration: number }

/** Greedy placement of unscheduled pending tasks (highest priority first) into free slots. */
export function planDay(d: AppData, date: ISODate, now?: Date, includeOverdue = true): { placements: Placement[]; leftover: Task[] } {
  const today = date;
  const from = now ? Math.ceil(nowMin(now) / 15) * 15 : undefined;
  const slots: Slot[] = freeSlots(date, d.routine, d.tasks, d.settings, 15, from).map((s) => ({ ...s }));
  const cands = [
    ...d.tasks.filter((t) => occursOn(t, date) && !isDoneOn(t, date) && !isValidTime(t.start)),
    ...(includeOverdue ? overdueTasks(d.tasks, today) : []),
  ].sort((a, b) => PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority] || a.order - b.order);
  const placements: Placement[] = [];
  const leftover: Task[] = [];
  for (const t of cands) {
    const need = t.duration ?? DEFAULT_TASK_MIN;
    const s = slots.find((x) => x.end - x.start >= need);
    if (!s) { leftover.push(t); continue; }
    placements.push({ taskId: t.id, title: t.title, date, start: fromMin(s.start), duration: need });
    s.start += need + 5; // 5 min buffer between items
  }
  return { placements, leftover };
}

export function insights(d: AppData, today: ISODate, now = new Date()): Insight[] {
  const out: Insight[] = [];
  const late = overdueTasks(d.tasks, today);
  if (late.length) out.push({ id: 'late', level: 'alerta', title: `${late.length} tarefa${late.length > 1 ? 's' : ''} atrasada${late.length > 1 ? 's' : ''}`,
    detail: late.slice(0, 3).map((t) => t.title).join(' · ') + (late.length > 3 ? ' …' : ''), action: 'reschedule-overdue' });

  const load = dayLoad(today, d.routine, d.tasks, d.settings);
  if (load.overloaded) out.push({ id: 'load', level: 'atencao', title: 'Dia sobrecarregado',
    detail: `${load.pending} pendentes · ~${load.plannedMin} min sem horário para ${load.freeMin} min livres na sua janela do dia.`, action: 'plan-day' });

  const free = freeSlots(today, d.routine, d.tasks, d.settings, 30, nowMin(now));
  const unscheduled = d.tasks.filter((t) => occursOn(t, today) && !isDoneOn(t, today) && !isValidTime(t.start));
  if (free.length && unscheduled.length) out.push({ id: 'free', level: 'info', title: `${free.length} horário${free.length > 1 ? 's' : ''} livre${free.length > 1 ? 's' : ''} hoje`,
    detail: `${free.map((s) => `${fromMin(s.start)}–${fromMin(s.end)}`).join(', ')}. ${unscheduled.length} tarefa(s) ainda sem horário.`, action: 'plan-day' });

  if (load.untimedBlocks.length) out.push({ id: 'untimed', level: 'info', title: 'Blocos da rotina sem horário',
    detail: `${load.untimedBlocks.map((b) => b.title).join(', ')}. Defina horários para o cálculo de tempo livre ficar preciso.`, action: 'open-routine' });

  for (const g of d.goals.filter((x) => !x.archived)) {
    const st = goalStatus(g, d, today);
    if (st.onTrack === false && st.pct < 100) out.push({ id: 'goal-' + g.id, level: 'atencao', title: `Meta abaixo do ritmo: ${g.title}`,
      detail: `${st.value}/${g.target} ${g.unit}` + (st.perDayNeeded ? ` · precisa de ~${Math.ceil(st.perDayNeeded * 10) / 10} ${g.unit}/dia` : ''), action: 'open-goals' });
  }

  const w = weekSummary(d, today);
  if (d.settings.weeklyWorkoutTarget > 0 && w.workouts < d.settings.weeklyWorkoutTarget)
    out.push({ id: 'gym', level: 'info', title: 'Academia na semana', detail: `${w.workouts} de ${d.settings.weeklyWorkoutTarget} treinos registrados.` });

  if (!out.length) out.push({ id: 'ok', level: 'ok', title: 'Tudo em dia', detail: 'Nenhuma tarefa atrasada e o dia cabe no seu tempo livre.' });
  return out;
}

export interface StudyPlanInput { areas: AreaId[]; minutes: number; sessionsPerWeek: number; weeks: number; start: ISODate }

/** Distributes study sessions into free slots of the next weeks, round-robin between areas. */
export function studyPlan(d: AppData, p: StudyPlanInput): Placement[] {
  const out: Placement[] = [];
  const shadow: Task[] = [...d.tasks];
  for (let w = 0; w < p.weeks; w++) {
    const count: Record<string, number> = {};
    let rr = 0;
    for (let i = 0; i < 7; i++) {
      const date = addDays(p.start, w * 7 + i);
      const usedToday = new Set<AreaId>();
      for (let k = 0; k < p.areas.length; k++) {
        const a = p.areas[(rr + k) % p.areas.length];
        if ((count[a] ?? 0) >= p.sessionsPerWeek || usedToday.has(a)) continue;
        const slot = freeSlots(date, d.routine, shadow, d.settings, p.minutes).find((s) => s.end - s.start >= p.minutes);
        if (!slot) break;
        const pl: Placement = { taskId: '', title: `Estudo: ${area(a).label}`, date, start: fromMin(slot.start), duration: p.minutes };
        out.push(pl);
        shadow.push({ id: 'shadow' + out.length, title: pl.title, area: a, priority: 'media', tags: [], done: false, date, start: pl.start, duration: p.minutes, createdAt: '', order: 0 });
        count[a] = (count[a] ?? 0) + 1;
        usedToday.add(a);
      }
      rr++;
    }
  }
  return out;
}

/** Compact, privacy-aware snapshot that a future AI provider can receive as context. */
export function assistantContext(d: AppData, today: ISODate) {
  return {
    today,
    overdue: overdueTasks(d.tasks, today).map((t) => ({ title: t.title, area: t.area, date: t.date })),
    todayTasks: d.tasks.filter((t) => occursOn(t, today)).map((t) => ({ title: t.title, area: t.area, start: t.start, done: isDoneOn(t, today), priority: t.priority })),
    freeSlots: freeSlots(today, d.routine, d.tasks, d.settings).map((s) => `${fromMin(s.start)}-${fromMin(s.end)}`),
    goals: d.goals.filter((g) => !g.archived).map((g) => ({ title: g.title, target: g.target, unit: g.unit, deadline: g.deadline, ...goalStatus(g, d, today), history: undefined })),
    areas: activeAreas().map((a) => a.label),
  };
}

export const minutesToText = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? String(m % 60).padStart(2, '0') : ''}` : `${m} min`);
