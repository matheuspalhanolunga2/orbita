import { AlertTriangle, ArrowRight, CalendarClock, CheckCircle2, CircleDashed, Flame, Plus, Target, TrendingUp, Zap } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { chartTooltip } from '../components/chartTheme';
import { useTaskForm } from '../components/TaskForm';
import { TaskItem } from '../components/TaskItem';
import { AreaIcon, Bar as PBar, Card, Empty, Ring } from '../components/ui';
import { toast } from '../components/toast';
import { area, PERIOD_LABEL, WEEKDAYS_SHORT } from '../domain/areas';
import { fmtDuration, fromISO, fromMin, isValidTime, nowMin, toMin } from '../domain/dates';
import { goalStatus } from '../domain/goals';
import { blocksForDay, nextCommitment, timedItems } from '../domain/schedule';
import { dayProgress, productivitySeries, weekSummary } from '../domain/stats';
import { isDoneOn, overdueTasks, tasksForDate } from '../domain/tasks';
import { useNow } from '../hooks/useNow';
import { getData, useStore } from '../store/useStore';
import { DndContext, type DragEndEvent } from '@dnd-kit/core';

const greet = (h: number) => (h < 5 ? 'Boa madrugada' : h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite');

export default function Dashboard() {
  const now = useNow(1000);
  const today = useMemo(() => { const d = now; return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }, [now]);
  const s = useStore();
  const { settings, addTask, routine, tasks, goals } = s;
  const openTask = useTaskForm((x) => x.open);
  const [quick, setQuick] = useState('');
  const data = getData();
  const prog = dayProgress(tasks, today);
  const late = overdueTasks(tasks, today);
  const todayList = tasksForDate(tasks, today);
  const next = nextCommitment(routine, tasks, now, today);
  const nm = nowMin(now);
  const current = timedItems(today, routine, tasks).find((i) => i.start <= nm && i.end > nm && !(i.kind === 'task' && isDoneOn(tasks.find((t) => t.id === i.id)!, today)));
  const week = weekSummary(data, today);
  const series = productivitySeries(data, today, 14).map((x) => ({ ...x, dia: x.date.slice(8) + '/' + x.date.slice(5, 7) }));
  const activeGoals = goals.filter((g) => !g.archived).map((g) => ({ g, st: goalStatus(g, data, today) })).sort((a, b) => b.st.pct - a.st.pct).slice(0, 4);
  const blocks = blocksForDay(routine, today);
  const weekMin = Object.values(week.minutesByArea).reduce((a, b) => a + (b ?? 0), 0);

  const quickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quick.trim()) return;
    addTask({ title: quick, date: today });
    setQuick('');
    toast('Tarefa adicionada para hoje');
  };

  const pending = todayList.filter((t) => !isDoneOn(t, today));
  const doneToday = todayList.filter((t) => isDoneOn(t, today));

  return (
    <div className="grid" style={{ gap: 18 }}>
      <section className="card hero">
        <div className="row between wrap" style={{ gap: 20 }}>
          <div className="grow">
            <div className="muted" style={{ textTransform: 'capitalize', fontWeight: 600 }}>{now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
            <h1 style={{ marginTop: 6 }}>{greet(now.getHours())}{settings.name ? `, ${settings.name}` : ''} <span className="grad-text">✦</span></h1>
            <p className="muted" style={{ marginTop: 6 }}>
              {prog.total ? `${prog.done} de ${prog.total} tarefas de hoje concluídas` : 'Nenhuma tarefa planejada para hoje'}
              {late.length ? ` · ${late.length} atrasada${late.length > 1 ? 's' : ''}` : ''}
            </p>
            <form onSubmit={quickAdd} className="row" style={{ marginTop: 18, maxWidth: 560 }}>
              <input className="input" value={quick} onChange={(e) => setQuick(e.target.value)} placeholder="Adicionar tarefa rápida para hoje…" aria-label="Tarefa rápida" />
              <button className="btn primary" type="submit"><Plus size={18} /><span className="hide-m">Adicionar</span></button>
            </form>
          </div>
          <div className="row" style={{ gap: 22 }}>
            <div style={{ textAlign: 'right' }}>
              <div className="clock">{now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}<span className="muted" style={{ fontSize: '.45em' }}>:{String(now.getSeconds()).padStart(2, '0')}</span></div>
            </div>
            <Ring pct={prog.pct} size={104} stroke={10}><b style={{ fontSize: 22 }}>{prog.pct}%</b><div className="tiny muted">do dia</div></Ring>
          </div>
        </div>
      </section>

      <div className="grid g4">
        <Stat icon={<CheckCircle2 size={18} color="var(--ok)" />} label="Concluídas hoje" value={prog.done} />
        <Stat icon={<CircleDashed size={18} color="var(--media)" />} label="Pendentes hoje" value={prog.pending} />
        <Stat icon={<AlertTriangle size={18} color="var(--alta)" />} label="Atrasadas" value={late.length} to="/tarefas?status=atrasadas" />
        <Stat icon={<Flame size={18} color="var(--accent2)" />} label="Minutos na semana" value={weekMin} sub={`${week.completed} tarefas concluídas`} />
      </div>

      <div className="grid g3">
        <Card className="now-card" title="Agora" icon={<Zap size={17} />}>
          {current ? (
            <div className="mini" style={{ borderColor: area(current.ref.area).color }}>
              <AreaIcon id={current.ref.area} boxed />
              <div className="grow"><div className="bold">{current.title}</div><div className="small muted">até {fromMin(current.end)}</div></div>
            </div>
          ) : <p className="muted small" style={{ marginBottom: 10 }}>Nenhum compromisso com horário acontecendo agora.</p>}
          <div className="divider" />
          <div className="small muted bold" style={{ marginBottom: 8 }}>Próximo compromisso</div>
          {next ? (
            <div className="mini">
              <CalendarClock size={18} color="var(--accent)" />
              <div className="grow"><div className="bold">{next.title}</div>
                <div className="small muted">{next.date === today ? 'Hoje' : WEEKDAYS_SHORT[fromISO(next.date).getDay()] + ' ' + next.date.slice(8) + '/' + next.date.slice(5, 7)} às {next.time}{next.date === today && ` · em ${fmtDuration(toMin(next.time) - nm)}`}</div></div>
            </div>
          ) : <p className="muted small">Nada com horário nos próximos 7 dias.</p>}
          {late.length > 0 && <Link to="/assistente" className="btn sm" style={{ marginTop: 12, width: '100%' }}><AlertTriangle size={15} color="var(--alta)" />Reagendar {late.length} atrasada{late.length > 1 ? 's' : ''}</Link>}
        </Card>

        <Card className="span2" title="Hoje" icon={<CheckCircle2 size={17} />} action={<Link to="/agenda" className="btn sm ghost">Agenda <ArrowRight size={15} /></Link>}>
          {blocks.length > 0 && (
            <div className="row wrap" style={{ marginBottom: 12 }}>
              {blocks.map((b) => (
                <span key={b.id} className="chip" style={{ borderColor: area(b.area).color + '66' }} title={b.note}>
                  <AreaIcon id={b.area} size={13} />{b.title}<span className="muted">· {isValidTime(b.start) ? `${b.start}${b.end ? '–' + b.end : ''}` : b.end ? `até ${b.end}` : b.period ? PERIOD_LABEL[b.period] : 'sem horário'}</span>
                </span>
              ))}
            </div>
          )}
          <DndContext onDragEnd={(e: DragEndEvent) => { const a = e.active.data.current?.taskId, o = e.over?.data.current?.taskId; if (a && o) s.moveTask(a, o); }}>
            {pending.length || late.length ? (
              <ul className="tlist">
                {late.slice(0, 3).map((t) => <TaskItem key={t.id} t={t} date={today} today={today} />)}
                {pending.slice(0, 7).map((t) => <TaskItem key={t.id} t={t} date={today} today={today} />)}
              </ul>
            ) : <Empty>{prog.total ? 'Tudo concluído por hoje 🎉' : 'Sem tarefas para hoje.'} <button className="btn sm" style={{ marginLeft: 8 }} onClick={() => openTask()}><Plus size={14} />Planejar</button></Empty>}
            {doneToday.length > 0 && <p className="small muted" style={{ marginTop: 10 }}>{doneToday.length} concluída{doneToday.length > 1 ? 's' : ''} hoje: {doneToday.map((t) => t.title).join(', ')}</p>}
          </DndContext>
        </Card>
      </div>

      <div className="grid g3">
        <Card className="span2" title="Produtividade — últimos 14 dias" icon={<TrendingUp size={17} />}>
          <div style={{ height: 230 }}>
            <ResponsiveContainer>
              <AreaChart data={series} margin={{ left: -18, right: 6, top: 6 }}>
                <defs>
                  <linearGradient id="gA" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8b7bff" stopOpacity={0.5} /><stop offset="1" stopColor="#8b7bff" stopOpacity={0} /></linearGradient>
                  <linearGradient id="gB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ff8a5c" stopOpacity={0.35} /><stop offset="1" stopColor="#ff8a5c" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid stroke="var(--line)" vertical={false} />
                <XAxis dataKey="dia" tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} interval={1} />
                <YAxis yAxisId="l" allowDecimals={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="r" orientation="right" hide />
                <Tooltip {...chartTooltip} />
                <Area yAxisId="r" type="monotone" dataKey="minutos" name="Minutos registrados" stroke="#ff8a5c" fill="url(#gB)" strokeWidth={2} />
                <Area yAxisId="l" type="monotone" dataKey="concluidas" name="Tarefas concluídas" stroke="#8b7bff" fill="url(#gA)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Metas em andamento" icon={<Target size={17} />} action={<Link to="/metas" className="btn sm ghost">Ver <ArrowRight size={15} /></Link>}>
          {activeGoals.length ? <div className="col" style={{ gap: 14 }}>
            {activeGoals.map(({ g, st }) => (
              <div key={g.id}>
                <div className="row between small" style={{ marginBottom: 6 }}><span className="row bold" style={{ gap: 8 }}><AreaIcon id={g.area} size={15} />{g.title}</span><span className="muted">{st.pct}%</span></div>
                <PBar pct={st.pct} color={area(g.area).color} />
                <div className="tiny muted" style={{ marginTop: 5 }}>{st.value}/{g.target} {g.unit}{st.daysLeft !== null ? ` · ${st.daysLeft >= 0 ? `${st.daysLeft} dias restantes` : 'prazo vencido'}` : ''}</div>
              </div>
            ))}
          </div> : <Empty>Nenhuma meta ainda. <Link to="/metas" className="grad-text bold">Criar meta</Link></Empty>}
        </Card>
      </div>

      <Card title="Resumo da semana" icon={<CalendarClock size={17} />} action={<span className="small muted">{week.workouts} treino(s) · {week.lives} live(s) · {week.published} publicação(ões)</span>}>
        <div className="grid g2" style={{ alignItems: 'center' }}>
          <div className="week-strip">
            {week.days.map((d) => (
              <div key={d.date} className={`wday ${d.date === today ? 'today' : ''}`}>
                <div className="tiny muted bold">{WEEKDAYS_SHORT[fromISO(d.date).getDay()]}</div>
                <b>{d.date.slice(8)}</b>
                <div className="tiny" style={{ color: d.total && d.done === d.total ? 'var(--ok)' : 'var(--muted)' }}>{d.done}/{d.total}</div>
              </div>
            ))}
          </div>
          <div style={{ height: 150 }}>
            <ResponsiveContainer>
              <BarChart data={week.days.map((d) => ({ dia: WEEKDAYS_SHORT[fromISO(d.date).getDay()], concluidas: d.completed }))} margin={{ left: -24, right: 0 }}>
                <XAxis dataKey="dia" tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip {...chartTooltip} cursor={{ fill: 'var(--panel2)' }} />
                <Bar dataKey="concluidas" name="Concluídas" radius={[8, 8, 0, 0]} fill="url(#gBar)" />
                <defs><linearGradient id="gBar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8b7bff" /><stop offset="1" stopColor="#ff8a5c" /></linearGradient></defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Card>
    </div>
  );
}

function Stat({ icon, label, value, sub, to }: { icon: React.ReactNode; label: string; value: number | string; sub?: string; to?: string }) {
  const body = <div className="card" style={{ padding: 18, height: '100%' }}>
    <div className="row small muted bold">{icon}{label}</div>
    <div className="stat-num" style={{ marginTop: 8 }}>{value}</div>
    {sub && <div className="tiny muted">{sub}</div>}
  </div>;
  return to ? <Link to={to}>{body}</Link> : body;
}
