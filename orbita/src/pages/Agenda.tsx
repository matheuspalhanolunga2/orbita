import { DndContext, PointerSensor, TouchSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { AlertTriangle, CalendarPlus, ChevronLeft, ChevronRight, Clock, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTaskForm } from '../components/TaskForm';
import { AreaIcon, Card, Empty, PageHead, Seg } from '../components/ui';
import { toast } from '../components/toast';
import { area, PERIOD_LABEL, WEEKDAYS_SHORT } from '../domain/areas';
import { planDay } from '../domain/assistant';
import { addDays, fromISO, fromMin, isValidTime, monthGrid, nowMin, toMin, weekDates } from '../domain/dates';
import { blocksForDay, freeSlots, isTimedBlock, slotLabel, timedItems, type TimedItem } from '../domain/schedule';
import { daysLate, isDoneOn, occursOn, overdueTasks } from '../domain/tasks';
import type { ISODate, RoutineBlock, Task } from '../domain/types';
import { useNow, useToday } from '../hooks/useNow';
import { getData, useStore } from '../store/useStore';

type View = 'dia' | 'semana' | 'mes';
const SLOT = 30, SLOT_H = 26;

export default function Agenda() {
  const today = useToday();
  const now = useNow(60_000);
  const { tasks, routine, settings, reschedule, update } = useStore();
  const openTask = useTaskForm((s) => s.open);
  const [view, setView] = useState<View>(() => (window.innerWidth < 900 ? 'dia' : 'semana'));
  const [cursor, setCursor] = useState<ISODate>(today);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }));

  const days = view === 'dia' ? [cursor] : view === 'semana' ? weekDates(cursor) : [];
  const startH = Math.min(6, Math.floor(toMin(settings.dayStart) / 60));
  const range = { start: startH * 60, end: 24 * 60 };
  const late = overdueTasks(tasks, today);

  const step = (n: number) => setCursor((c) => (view === 'mes' ? (() => { const d = fromISO(c); d.setMonth(d.getMonth() + n, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`; })() : addDays(c, n * (view === 'dia' ? 1 : 7))));
  const title = view === 'mes'
    ? fromISO(cursor).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    : view === 'dia' ? fromISO(cursor).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
    : `${fromISO(days[0]).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })} – ${fromISO(days[6]).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}`;

  const onDragEnd = (e: DragEndEvent) => {
    const taskId = e.active.data.current?.taskId as string | undefined;
    const target = e.over?.data.current as { date?: ISODate; start?: string | null } | undefined;
    if (!taskId || !target) return;
    const t = tasks.find((x) => x.id === taskId);
    if (!t) return;
    if (t.recurrence) {
      if (target.start === undefined) return toast('Tarefas recorrentes: arraste para um horário para mudar a hora');
      update('tasks', t.id, { start: target.start ?? undefined }, `Mudou o horário de "${t.title}"`);
      return toast(target.start ? `“${t.title}” agora às ${target.start} (todas as repetições)` : 'Horário removido');
    }
    reschedule(t.id, target.date, target.start);
    toast(`Reagendada para ${target.date?.split('-').reverse().slice(0, 2).join('/')}${target.start ? ' às ' + target.start : ''}`);
  };

  const plan = () => {
    const { placements, leftover } = planDay(getData(), cursor, cursor === today ? now : undefined);
    if (!placements.length) return toast(leftover.length ? 'Não há horários livres suficientes' : 'Nenhuma tarefa sem horário para distribuir');
    placements.forEach((p) => reschedule(p.taskId, p.date, p.start));
    toast(`${placements.length} tarefa(s) distribuída(s) nos horários livres${leftover.length ? ` · ${leftover.length} não couberam` : ''}`);
  };

  return (
    <>
      <PageHead title="Agenda" sub={<span style={{ textTransform: 'capitalize' }}>{title}</span>}>
        <Seg value={view} onChange={setView} options={[{ v: 'dia', l: 'Dia' }, { v: 'semana', l: 'Semana' }, { v: 'mes', l: 'Mês' }]} />
        <div className="row" style={{ gap: 4 }}>
          <button className="btn icon sm" onClick={() => step(-1)} aria-label="Anterior"><ChevronLeft size={18} /></button>
          <button className="btn sm" onClick={() => setCursor(today)}>Hoje</button>
          <button className="btn icon sm" onClick={() => step(1)} aria-label="Próximo"><ChevronRight size={18} /></button>
        </div>
      </PageHead>

      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className={`grid ${view === 'mes' ? '' : 'agenda-layout'}`} style={{ alignItems: 'start' }}>
          {view === 'mes'
            ? <Month cursor={cursor} today={today} tasks={tasks} routine={routine} onPick={(d) => { setCursor(d); setView('dia'); }} />
            : <TimeGrid days={days} today={today} now={now} range={range} tasks={tasks} routine={routine} onEmpty={(date, start) => openTask(undefined, { date, start })} onOpen={(id) => openTask(id)} />}
          {view !== 'mes' && (
            <div className="col hide-m" style={{ gap: 18, position: 'sticky', top: 90 }}>
              <SidePanel day={view === 'dia' ? cursor : today} late={late} today={today} onPlan={plan} />
            </div>
          )}
        </div>
        {view !== 'mes' && <div className="show-m col" style={{ marginTop: 18 }}><SidePanel day={cursor} late={late} today={today} onPlan={plan} /></div>}
      </DndContext>
    </>
  );
}

function SidePanel({ day, late, today, onPlan }: { day: ISODate; late: Task[]; today: ISODate; onPlan: () => void }) {
  const { tasks, routine, settings, reschedule } = useStore();
  const now = useNow(60_000);
  const slots = freeSlots(day, routine, tasks, settings, 30, day === today ? nowMin(now) : undefined);
  const untimed = blocksForDay(routine, day).filter((b) => !isTimedBlock(b));
  return (
    <>
      <Card title={`Horários livres · ${day === today ? 'hoje' : WEEKDAYS_SHORT[fromISO(day).getDay()] + ' ' + day.slice(8)}`} icon={<Clock size={16} />}>
        {slots.length ? <div className="row wrap">{slots.map((s) => <span key={s.start} className="chip" style={{ borderColor: '#3ddc9766', color: 'var(--ok)' }}>{slotLabel(s)}</span>)}</div>
          : <p className="small muted">Sem janelas livres de 30 min dentro de {settings.dayStart}–{settings.dayEnd}.</p>}
        {untimed.length > 0 && <p className="tiny muted" style={{ marginTop: 10 }}>{untimed.length} bloco(s) da rotina sem horário não entram no cálculo. <Link to="/config" className="grad-text bold">Definir horários</Link></p>}
        <button className="btn sm primary" style={{ marginTop: 12, width: '100%' }} onClick={onPlan}><Sparkles size={15} />Distribuir tarefas sem horário</button>
      </Card>
      <Card title="Atrasadas" icon={<AlertTriangle size={16} color="var(--alta)" />}>
        {late.length ? <div className="col" style={{ gap: 8 }}>
          {late.map((t) => (
            <div key={t.id} className="col" style={{ gap: 6 }}>
              <DraggablePill t={t} date={t.date!} />
              <div className="row" style={{ gap: 6 }}>
                <span className="tiny muted grow">{daysLate(t, today)} dia(s) de atraso</span>
                <button className="btn sm" onClick={() => reschedule(t.id, today)}>Hoje</button>
                <button className="btn sm" onClick={() => reschedule(t.id, addDays(today, 1))}>Amanhã</button>
              </div>
            </div>
          ))}
          <p className="tiny muted">Arraste para um dia ou horário da agenda para reagendar.</p>
        </div> : <p className="small muted">Nenhuma tarefa atrasada. 👌</p>}
      </Card>
    </>
  );
}

function blockLabel(b: RoutineBlock) {
  if (isValidTime(b.start)) return `${b.start}${b.end ? '–' + b.end : ' (início)'}`;
  if (b.end) return `até ${b.end}`;
  return b.period ? PERIOD_LABEL[b.period] : 'sem horário';
}

function TimeGrid({ days, today, now, range, tasks, routine, onEmpty, onOpen }: {
  days: ISODate[]; today: ISODate; now: Date; range: { start: number; end: number }; tasks: Task[]; routine: RoutineBlock[];
  onEmpty: (d: ISODate, s: string) => void; onOpen: (id: string) => void;
}) {
  const slots = useMemo(() => Array.from({ length: (range.end - range.start) / SLOT }, (_, i) => range.start + i * SLOT), [range.start, range.end]);
  const height = slots.length * SLOT_H;
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: `56px repeat(${days.length}, minmax(0,1fr))` }}>
        <div style={{ borderBottom: '1px solid var(--line)' }} />
        {days.map((d) => (
          <div key={d} className={`cal-h ${d === today ? 'today' : ''}`} style={{ position: 'static' }}>
            {WEEKDAYS_SHORT[fromISO(d).getDay()]}<b>{d.slice(8)}</b>
          </div>
        ))}
        <div className="tiny muted" style={{ padding: '8px 6px', borderBottom: '1px solid var(--line)', textAlign: 'right' }}>sem<br />horário</div>
        {days.map((d) => <TopLane key={d} date={d} tasks={tasks} routine={routine} onOpen={onOpen} />)}
      </div>
      <div style={{ maxHeight: '68vh', overflowY: 'auto' }} ref={(el) => { if (el && !el.dataset.scrolled) { el.dataset.scrolled = '1'; el.scrollTop = Math.max(0, ((Math.max(nowMin(now), 7 * 60) - range.start) / SLOT - 3) * SLOT_H); } }}>
        <div style={{ display: 'grid', gridTemplateColumns: `56px repeat(${days.length}, minmax(0,1fr))` }}>
          <div style={{ position: 'relative', height }}>
            {slots.filter((m) => m % 60 === 0).map((m) => <div key={m} className="tiny" style={{ position: 'absolute', top: ((m - range.start) / SLOT) * SLOT_H - 7, right: 8, color: 'var(--faint)' }}>{fromMin(m)}</div>)}
          </div>
          {days.map((d) => <DayColumn key={d} date={d} today={today} now={now} range={range} slots={slots} height={height} tasks={tasks} routine={routine} onEmpty={onEmpty} onOpen={onOpen} />)}
        </div>
      </div>
    </div>
  );
}

function TopLane({ date, tasks, routine, onOpen }: { date: ISODate; tasks: Task[]; routine: RoutineBlock[]; onOpen: (id: string) => void }) {
  const drop = useDroppable({ id: `top:${date}`, data: { date, start: null } });
  const untimedTasks = tasks.filter((t) => occursOn(t, date) && !isValidTime(t.start));
  const blocks = blocksForDay(routine, date).filter((b) => !isTimedBlock(b));
  return (
    <div ref={drop.setNodeRef} className={`cal-col-top ${drop.isOver ? 'over' : ''}`}>
      {blocks.map((b) => <div key={b.id} className="pill-ev block" style={{ borderLeftColor: area(b.area).color }} title={`${b.title} · ${blockLabel(b)}${b.note ? ' · ' + b.note : ''}`}>{b.title} <span className="muted">· {blockLabel(b)}</span></div>)}
      {untimedTasks.map((t) => <DraggablePill key={t.id} t={t} date={date} onOpen={onOpen} />)}
    </div>
  );
}

function DraggablePill({ t, date, onOpen }: { t: Task; date: ISODate; onOpen?: (id: string) => void }) {
  const drag = useDraggable({ id: `pill:${t.id}:${date}`, data: { taskId: t.id } });
  const done = isDoneOn(t, date);
  return (
    <div ref={drag.setNodeRef} {...drag.listeners} {...drag.attributes} onClick={() => onOpen?.(t.id)} className="pill-ev"
      style={{ borderLeftColor: area(t.area).color, opacity: drag.isDragging ? 0.5 : done ? 0.5 : 1, textDecoration: done ? 'line-through' : undefined,
        transform: drag.transform ? `translate(${drag.transform.x}px,${drag.transform.y}px)` : undefined, zIndex: drag.isDragging ? 30 : undefined, position: 'relative' }}>
      {t.title}
    </div>
  );
}

function Slot({ date, m, free, onEmpty }: { date: ISODate; m: number; free: boolean; onEmpty: (d: ISODate, s: string) => void }) {
  const drop = useDroppable({ id: `slot:${date}:${m}`, data: { date, start: fromMin(m) } });
  return <div ref={drop.setNodeRef} onClick={() => onEmpty(date, fromMin(m))} className={`cal-cell ${drop.isOver ? 'over' : free ? 'free' : ''}`}
    style={{ height: SLOT_H, borderTop: m % 60 === 0 ? '1px solid var(--line)' : '1px dashed color-mix(in srgb, var(--line) 50%, transparent)' }} />;
}

function lanes(items: TimedItem[]) {
  const out: { it: TimedItem; lane: number; of: number }[] = [];
  let group: { it: TimedItem; lane: number }[] = [], groupEnd = -1;
  const flush = () => { const of = Math.max(1, ...group.map((g) => g.lane + 1)); group.forEach((g) => out.push({ ...g, of })); group = []; };
  for (const it of items) {
    if (it.start >= groupEnd && group.length) flush();
    const used = new Set(group.filter((g) => g.it.end > it.start).map((g) => g.lane));
    let lane = 0; while (used.has(lane)) lane++;
    group.push({ it, lane }); groupEnd = Math.max(groupEnd, it.end);
  }
  flush();
  return out;
}

function DayColumn({ date, today, now, range, slots, height, tasks, routine, onEmpty, onOpen }: {
  date: ISODate; today: ISODate; now: Date; range: { start: number; end: number }; slots: number[]; height: number; tasks: Task[]; routine: RoutineBlock[];
  onEmpty: (d: ISODate, s: string) => void; onOpen: (id: string) => void;
}) {
  const settings = useStore((s) => s.settings);
  const free = freeSlots(date, routine, tasks, settings, 30);
  const isFree = (m: number) => free.some((f) => m >= f.start && m + SLOT <= f.end);
  const items = lanes(timedItems(date, routine, tasks));
  const nm = nowMin(now);
  // blocks with only a start time (e.g. Faculdade 10:35) get a marker line
  const startOnly = blocksForDay(routine, date).filter((b) => isValidTime(b.start) && !isTimedBlock(b));
  return (
    <div style={{ position: 'relative', height, borderLeft: '1px solid var(--line)' }}>
      {slots.map((m) => <Slot key={m} date={date} m={m} free={isFree(m)} onEmpty={onEmpty} />)}
      {items.map(({ it, lane, of }) => it.kind === 'block'
        ? <BlockEv key={it.id} it={it} range={range} lane={lane} of={of} />
        : <TaskEv key={it.id + date} it={it} date={date} range={range} lane={lane} of={of} onOpen={onOpen} />)}
      {startOnly.map((b) => (
        <div key={b.id} title={b.note} style={{ position: 'absolute', left: 0, right: 0, top: ((toMin(b.start!) - range.start) / SLOT) * SLOT_H, borderTop: `2px dashed ${area(b.area).color}`, zIndex: 3, pointerEvents: 'none' }}>
          <span className="tiny bold" style={{ background: 'var(--panel)', color: area(b.area).color, padding: '0 6px', borderRadius: 6, marginLeft: 4 }}>{b.start} {b.title}</span>
        </div>
      ))}
      {date === today && nm >= range.start && <div style={{ position: 'absolute', left: 0, right: 0, top: ((nm - range.start) / SLOT) * SLOT_H, height: 2, background: 'var(--alta)', zIndex: 4, pointerEvents: 'none' }}><span style={{ position: 'absolute', left: -5, top: -4, width: 10, height: 10, borderRadius: '50%', background: 'var(--alta)' }} /></div>}
    </div>
  );
}

const pos = (it: TimedItem, range: { start: number }, lane: number, of: number) => ({
  top: ((it.start - range.start) / SLOT) * SLOT_H + 1, height: Math.max(SLOT_H - 2, ((it.end - it.start) / SLOT) * SLOT_H - 2),
  left: `calc(${(lane / of) * 100}% + 3px)`, width: `calc(${100 / of}% - 6px)`, right: 'auto',
});

function BlockEv({ it, range, lane, of }: { it: TimedItem; range: { start: number }; lane: number; of: number }) {
  const b = it.ref as RoutineBlock, c = area(b.area).color;
  return <div className="ev block" title={b.note} style={{ ...pos(it, range, lane, of), background: c + '1f', borderLeftColor: c, color: 'var(--text)' }}>{b.title}<small>{fromMin(it.start)}–{fromMin(it.end)} · rotina</small></div>;
}

function TaskEv({ it, date, range, lane, of, onOpen }: { it: TimedItem; date: ISODate; range: { start: number }; lane: number; of: number; onOpen: (id: string) => void }) {
  const t = it.ref as Task, c = area(t.area).color;
  const drag = useDraggable({ id: `ev:${t.id}:${date}`, data: { taskId: t.id } });
  return (
    <div ref={drag.setNodeRef} {...drag.listeners} {...drag.attributes} onClick={() => onOpen(t.id)} className={`ev ${isDoneOn(t, date) ? 'done' : ''}`}
      style={{ ...pos(it, range, lane, of), background: `color-mix(in srgb, ${c} 26%, var(--panel))`, borderLeftColor: c,
        transform: drag.transform ? `translate(${drag.transform.x}px,${drag.transform.y}px)` : undefined, zIndex: drag.isDragging ? 30 : 2, opacity: drag.isDragging ? 0.85 : undefined }}>
      {t.title}<small>{fromMin(it.start)}–{fromMin(it.end)}</small>
    </div>
  );
}

function Month({ cursor, today, tasks, routine, onPick }: { cursor: ISODate; today: ISODate; tasks: Task[]; routine: RoutineBlock[]; onPick: (d: ISODate) => void }) {
  const grid = monthGrid(cursor);
  const month = cursor.slice(0, 7);
  return (
    <div className="month">
      {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((d) => <div key={d} className="month-h">{d}</div>)}
      {grid.map((d) => <MonthCell key={d} d={d} out={d.slice(0, 7) !== month} today={today} tasks={tasks} routine={routine} onPick={onPick} />)}
      {!tasks.length && <div style={{ gridColumn: '1/-1', padding: 16 }}><Empty><CalendarPlus size={16} style={{ verticalAlign: -3 }} /> Crie tarefas com data para vê-las aqui.</Empty></div>}
    </div>
  );
}

function MonthCell({ d, out, today, tasks, routine, onPick }: { d: ISODate; out: boolean; today: ISODate; tasks: Task[]; routine: RoutineBlock[]; onPick: (d: ISODate) => void }) {
  const drop = useDroppable({ id: `day:${d}`, data: { date: d } });
  const list = tasks.filter((t) => occursOn(t, d));
  const fixed = blocksForDay(routine, d).filter((b) => b.fixed);
  const max = 3;
  return (
    <div ref={drop.setNodeRef} className={`mcell ${out ? 'out' : ''} ${d === today ? 'today' : ''} ${drop.isOver ? 'over' : ''}`} onClick={() => onPick(d)}>
      <span className="mnum">{Number(d.slice(8))}</span>
      {fixed.slice(0, 1).map((b) => <span key={b.id} className="mdot muted" style={{ border: `1px dashed ${area(b.area).color}66` }}><AreaIcon id={b.area} size={10} /> {b.title}</span>)}
      {list.slice(0, max).map((t) => <MonthTask key={t.id} t={t} d={d} />)}
      {list.length > max && <span className="tiny muted">+{list.length - max} mais</span>}
    </div>
  );
}

function MonthTask({ t, d }: { t: Task; d: ISODate }) {
  const drag = useDraggable({ id: `m:${t.id}:${d}`, data: { taskId: t.id }, disabled: !!t.recurrence });
  const c = area(t.area).color;
  return <span ref={drag.setNodeRef} {...drag.listeners} {...drag.attributes} onClick={(e) => e.stopPropagation()} className="mdot"
    style={{ background: c + '26', color: 'var(--text)', textDecoration: isDoneOn(t, d) ? 'line-through' : undefined, transform: drag.transform ? `translate(${drag.transform.x}px,${drag.transform.y}px)` : undefined, position: 'relative', zIndex: drag.isDragging ? 30 : 1, touchAction: 'none' }}>
    {t.start ? t.start + ' ' : ''}{t.title}
  </span>;
}
