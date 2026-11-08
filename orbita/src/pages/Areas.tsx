import { DndContext, PointerSensor, TouchSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { ArrowRight, BookOpen, Settings2, Check, Clock, Flame, History, ListChecks, Music, Plus, Radio, Trash2, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Bar as RBar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { TaskItem } from '../components/TaskItem';
import { useTaskForm } from '../components/TaskForm';
import { AreaIcon, Bar, Card, Empty, Field, Modal, PageHead } from '../components/ui';
import { toast } from '../components/toast';
import { activeAreas, area, hasModule } from '../domain/areas';
import { addDays, fmtDuration, fromISO, weekDates } from '../domain/dates';
import { streak, weeklyCounts } from '../domain/stats';
import { isDoneOn, isOverdue, occursOn } from '../domain/tasks';
import type { AreaId, ContentItem, ContentStage, Live, Platform } from '../domain/types';
import { useToday } from '../hooks/useNow';
import { getData, stamp, useStore } from '../store/useStore';
import { chartTooltip } from '../components/chartTheme';

/* ------------------------------ overview ------------------------------ */
export function AreasOverview() {
  const today = useToday();
  const { tasks, logs } = useStore();
  useStore((s) => s.areas);
  const week = weekDates(today);
  const list = activeAreas();
  return (
    <>
      <PageHead title="Áreas da vida" sub={`${list.length} frentes que você está desenvolvendo.`}>
        <Link to="/config#areas" className="btn sm"><Settings2 size={15} />Gerenciar áreas</Link>
      </PageHead>
      <div className="grid g3">
        {list.map((a) => {
          const pend = tasks.filter((t) => t.area === a.id && (t.recurrence ? occursOn(t, today) && !isDoneOn(t, today) : !t.done)).length;
          const min = logs.filter((l) => l.area === a.id && l.date >= week[0]).reduce((s, l) => s + (l.minutes ?? 0), 0);
          const st = streak(getData(), a.id, today);
          return (
            <Link key={a.id} to={`/areas/${a.id}`} className="card area-tile" style={{ borderTop: `3px solid ${a.color}` }}>
              <div className="row between"><AreaIcon id={a.id} boxed size={20} /><ArrowRight size={18} className="muted" /></div>
              <div><div className="bold" style={{ fontSize: 18 }}>{a.label}</div><div className="small muted">{a.subs.slice(0, 4).join(' · ')}</div></div>
              <div className="row between small">
                <span><b>{pend}</b> <span className="muted">pendentes</span></span>
                <span><b>{fmtDuration(min)}</b> <span className="muted">na semana</span></span>
                <span className="row" style={{ gap: 4 }}><Flame size={14} color={st ? 'var(--accent2)' : 'var(--faint)'} /><b>{st}</b></span>
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}

/* ------------------------------ area page ------------------------------ */
export function AreaPage() {
  const { id } = useParams();
  useStore((s) => s.areas);
  const a = activeAreas().find((x) => x.id === id);
  if (!a) return <Navigate to="/areas" replace />;
  return <AreaView key={a.id} id={a.id} />;
}


function AreaView({ id }: { id: AreaId }) {
  const a = area(id);
  const today = useToday();
  const { logs } = useStore();
  const d = getData();
  const st = streak(d, id, today);
  const weeks = weeklyCounts(d, id, today, 8);
  const thisWeek = weeks[weeks.length - 1];
  const total = logs.filter((l) => l.area === id).reduce((s, l) => s + (l.minutes ?? 0), 0);
  const hasLogs = hasModule(id, 'registro') || hasModule(id, 'frequencia');
  const side = hasLogs || hasModule(id, 'habilidades');
  return (
    <>
      <PageHead title={<span className="row" style={{ gap: 14 }}><AreaIcon id={id} boxed size={22} />{a.label}</span>}
        sub={hasLogs ? `Esta semana: ${fmtDuration(thisWeek.minutes)} em ${thisWeek.count} sessão(ões) · sequência de ${st} dia(s) · total ${fmtDuration(total)}` : a.subs.join(' · ')} />
      <div className={side ? 'grid g3' : 'col'} style={{ alignItems: 'start', gap: 18 }}>
        <div className={side ? 'span2 col' : 'col'} style={{ gap: 18 }}>
          {hasModule(id, 'conteudo') && <ContentBoard />}
          {hasModule(id, 'lives') && <LivesPanel />}
          <AreaTasks id={id} />
          {hasLogs && <EvolutionChart id={id} />}
          {hasModule(id, 'vocabulario') && <VocabPanel />}
          {hasModule(id, 'musica') && <GuitarPanel />}
          {hasModule(id, 'frequencia') && <GymHeatmap id={id} />}
        </div>
        {side && <div className="col" style={{ gap: 18 }}>
          {hasLogs && <LogPanel id={id} />}
          {hasModule(id, 'habilidades') && <SkillsPanel id={id} />}
          {hasModule(id, 'frequencia') && <GymGoal id={id} />}
        </div>}
      </div>
    </>
  );
}

function AreaTasks({ id }: { id: AreaId }) {
  const today = useToday();
  const { tasks } = useStore();
  const open = useTaskForm((s) => s.open);
  const [sub, setSub] = useState('');
  const subs = area(id).subs;
  const list = tasks.filter((t) => t.area === id && (!sub || t.sub === sub))
    .filter((t) => (t.recurrence ? true : !t.done || (t.doneAt ?? '').startsWith(today)))
    .sort((x, y) => Number(isOverdue(y, today)) - Number(isOverdue(x, today)) || x.order - y.order);
  return (
    <Card title="Tarefas" icon={<ListChecks size={17} />} action={<button className="btn sm primary" onClick={() => open(undefined, { area: id, sub: sub || undefined })}><Plus size={15} />Tarefa</button>}>
      <div className="row wrap" style={{ marginBottom: 12 }}>
        <button className={`chip ${!sub ? 'on' : ''}`} onClick={() => setSub('')}>Todas</button>
        {subs.map((s) => <button key={s} className={`chip ${sub === s ? 'on' : ''}`} onClick={() => setSub(s)}>{s}</button>)}
      </div>
      {list.length ? <ul className="tlist">{list.map((t) => <TaskItem key={t.id} t={t} date={today} today={today} showDate />)}</ul> : <Empty>Nenhuma tarefa pendente{sub ? ` em ${sub}` : ''}.</Empty>}
    </Card>
  );
}

function LogPanel({ id }: { id: AreaId }) {
  const today = useToday();
  const { logs, add, remove } = useStore();
  const kinds = area(id).subs.length ? area(id).subs : ['Sessão'];
  const freq = hasModule(id, 'frequencia');
  const [f, setF] = useState({ date: today, minutes: freq ? 60 : 30, kind: kinds[0], note: '' });
  const recent = logs.filter((l) => l.area === id).sort((x, y) => (x.date < y.date ? 1 : -1)).slice(0, 8);
  const save = (e: React.FormEvent) => {
    e.preventDefault();
    add('logs', { area: id, date: f.date, minutes: f.minutes || undefined, kind: f.kind, note: f.note || undefined }, `Registrou ${f.minutes} min de ${area(id).label} (${f.kind})`);
    setF({ ...f, note: '' });
    toast('Sessão registrada');
  };
  return (
    <Card title={freq ? 'Registrar sessão' : 'Registrar prática'} icon={<Clock size={17} />}>
      <form className="form-grid" onSubmit={save}>
        <Field label="Data"><input type="date" className="input" value={f.date} max={today} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
        <Field label="Minutos"><input type="number" min={1} className="input" value={f.minutes} onChange={(e) => setF({ ...f, minutes: Number(e.target.value) })} /></Field>
        <Field label="Tipo" full><select className="select" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>{kinds.map((k) => <option key={k}>{k}</option>)}</select></Field>
        <Field label="Observação" full><input className="input" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="O que você fez?" /></Field>
        <button className="btn primary full" type="submit"><Plus size={16} />Registrar</button>
      </form>
      <div className="divider" />
      <div className="small muted bold row" style={{ marginBottom: 8 }}><History size={14} />Histórico</div>
      {recent.length ? <div className="col" style={{ gap: 6 }}>{recent.map((l) => (
        <div key={l.id} className="row small" style={{ gap: 8 }}>
          <span className="muted" style={{ width: 44 }}>{l.date.slice(8)}/{l.date.slice(5, 7)}</span>
          <span className="grow"><b>{l.kind}</b>{l.note ? <span className="muted"> · {l.note}</span> : ''}</span>
          <span>{l.minutes ? fmtDuration(l.minutes) : ''}</span>
          <button className="del" style={{ width: 26, height: 26 }} onClick={() => remove('logs', l.id)} aria-label="Remover registro"><Trash2 size={14} /></button>
        </div>))}</div> : <p className="small muted">Nada registrado ainda.</p>}
    </Card>
  );
}

function EvolutionChart({ id }: { id: AreaId }) {
  const today = useToday();
  useStore((s) => s.logs);
  const data = weeklyCounts(getData(), id, today, 10).map((w) => ({ semana: w.week.slice(8) + '/' + w.week.slice(5, 7), minutos: w.minutes, sessoes: w.count }));
  const c = area(id).color;
  return (
    <Card title="Evolução semanal" icon={<TrendingUp size={17} />} action={<span className="small muted">minutos por semana</span>}>
      <div style={{ height: 200 }}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ left: -20, right: 4 }}>
            <XAxis dataKey="semana" tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip {...chartTooltip} cursor={{ fill: 'var(--panel2)' }} />
            <RBar dataKey="minutos" name="Minutos" fill={c} radius={[7, 7, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function SkillsPanel({ id }: { id: AreaId }) {
  const { skills, add, update, remove } = useStore();
  const [name, setName] = useState('');
  const list = skills.filter((s) => s.area === id);
  return (
    <Card title="Progresso por habilidade" icon={<TrendingUp size={17} />}>
      <div className="col" style={{ gap: 14 }}>
        {list.map((s) => (
          <div key={s.id}>
            <div className="row between small"><b>{s.name}</b><span className="row" style={{ gap: 6 }}><span className="muted">{s.level}%</span><button className="del" style={{ width: 24, height: 24 }} onClick={() => remove('skills', s.id)} aria-label="Remover"><Trash2 size={13} /></button></span></div>
            <input type="range" className="slider" min={0} max={100} step={5} value={s.level} onChange={(e) => update('skills', s.id, { level: Number(e.target.value) })} aria-label={s.name} />
          </div>
        ))}
        {!list.length && <p className="small muted">Adicione habilidades e avalie seu nível de 0 a 100.</p>}
        <form className="row" onSubmit={(e) => { e.preventDefault(); if (name.trim()) { add('skills', { area: id, name: name.trim(), level: 10 }); setName(''); } }}>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nova habilidade" />
          <button className="btn icon" aria-label="Adicionar habilidade"><Plus size={17} /></button>
        </form>
      </div>
    </Card>
  );
}

/* ------------------------------ inglês ------------------------------ */
function VocabPanel() {
  const { vocab, add, update, remove } = useStore();
  const [w, setW] = useState({ word: '', meaning: '' });
  const [show, setShow] = useState<'todas' | 'aprendendo'>('aprendendo');
  const list = vocab.filter((v) => show === 'todas' || !v.learned);
  const learned = vocab.filter((v) => v.learned).length;
  return (
    <Card title="Vocabulário" icon={<BookOpen size={17} />} action={<span className="small muted">{learned}/{vocab.length} aprendidas</span>}>
      <form className="row wrap" onSubmit={(e) => { e.preventDefault(); if (w.word.trim()) { add('vocab', { word: w.word.trim(), meaning: w.meaning.trim(), learned: false, createdAt: stamp() }, `Nova palavra: ${w.word}`); setW({ word: '', meaning: '' }); } }}>
        <input className="input grow" style={{ minWidth: 140 }} placeholder="Palavra / expressão" value={w.word} onChange={(e) => setW({ ...w, word: e.target.value })} />
        <input className="input grow" style={{ minWidth: 140 }} placeholder="Significado" value={w.meaning} onChange={(e) => setW({ ...w, meaning: e.target.value })} />
        <button className="btn primary"><Plus size={16} />Adicionar</button>
      </form>
      <div className="row" style={{ margin: '12px 0' }}>
        <button className={`chip ${show === 'aprendendo' ? 'on' : ''}`} onClick={() => setShow('aprendendo')}>Aprendendo</button>
        <button className={`chip ${show === 'todas' ? 'on' : ''}`} onClick={() => setShow('todas')}>Todas</button>
      </div>
      {list.length ? <div className="grid g2" style={{ gap: 8 }}>{list.map((v) => (
        <div key={v.id} className="mini">
          <button className={`chk ${v.learned ? 'on' : ''}`} onClick={() => update('vocab', v.id, { learned: !v.learned })} aria-label="Marcar como aprendida"><Check size={13} strokeWidth={3.5} /></button>
          <div className="grow"><b style={{ textDecoration: v.learned ? 'line-through' : undefined }}>{v.word}</b><div className="small muted">{v.meaning}</div></div>
          <button className="del" onClick={() => remove('vocab', v.id)} aria-label="Remover"><Trash2 size={15} /></button>
        </div>))}</div> : <Empty>Nenhuma palavra {show === 'aprendendo' ? 'pendente' : 'cadastrada'}.</Empty>}
    </Card>
  );
}

/* ------------------------------ guitarra ------------------------------ */
function GuitarPanel() {
  const { chords, songs, add, update, remove } = useStore();
  const [chord, setChord] = useState('');
  const [song, setSong] = useState({ title: '', artist: '' });
  return (
    <div className="grid g2">
      <Card title="Acordes" icon={<Music size={17} />} action={<span className="small muted">{chords.filter((c) => c.status === 'dominado').length} dominados</span>}>
        <div className="row wrap" style={{ marginBottom: 12 }}>
          {chords.map((c) => (
            <button key={c.id} className={`chip ${c.status === 'dominado' ? 'on' : ''}`} title="Clique para alternar · clique direito remove"
              onClick={() => update('chords', c.id, { status: c.status === 'dominado' ? 'aprendendo' : 'dominado' })}
              onContextMenu={(e) => { e.preventDefault(); remove('chords', c.id); }}>{c.status === 'dominado' && <Check size={12} />}{c.name}</button>
          ))}
          {!chords.length && <span className="small muted">Adicione os acordes que está estudando.</span>}
        </div>
        <form className="row" onSubmit={(e) => { e.preventDefault(); if (chord.trim()) { add('chords', { name: chord.trim(), status: 'aprendendo' }); setChord(''); } }}>
          <input className="input" value={chord} onChange={(e) => setChord(e.target.value)} placeholder="Ex.: Bm7" />
          <button className="btn icon" aria-label="Adicionar acorde"><Plus size={17} /></button>
        </form>
        <p className="tiny muted" style={{ marginTop: 8 }}>Toque para alternar entre aprendendo e dominado.</p>
      </Card>
      <Card title="Músicas para aprender" icon={<Music size={17} />}>
        <div className="col" style={{ gap: 12 }}>
          {songs.map((s) => (
            <div key={s.id}>
              <div className="row between small"><span><b>{s.title}</b>{s.artist && <span className="muted"> · {s.artist}</span>}</span><span className="row" style={{ gap: 4 }}><span className="muted">{s.progress}%</span><button className="del" style={{ width: 24, height: 24 }} onClick={() => remove('songs', s.id)} aria-label="Remover"><Trash2 size={13} /></button></span></div>
              <input type="range" className="slider" min={0} max={100} step={5} value={s.progress} onChange={(e) => update('songs', s.id, { progress: Number(e.target.value) })} aria-label={s.title} />
            </div>
          ))}
          <form className="col" style={{ gap: 8 }} onSubmit={(e) => { e.preventDefault(); if (song.title.trim()) { add('songs', { title: song.title.trim(), artist: song.artist.trim() || undefined, progress: 0 }, `Nova música: ${song.title}`); setSong({ title: '', artist: '' }); } }}>
            <div className="row"><input className="input" placeholder="Música" value={song.title} onChange={(e) => setSong({ ...song, title: e.target.value })} /><input className="input" placeholder="Artista" value={song.artist} onChange={(e) => setSong({ ...song, artist: e.target.value })} /></div>
            <button className="btn sm"><Plus size={15} />Adicionar música</button>
          </form>
        </div>
      </Card>
    </div>
  );
}

/* ------------------------------ academia ------------------------------ */
function GymHeatmap({ id }: { id: AreaId }) {
  const today = useToday();
  const { logs } = useStore();
  const weeks = 16;
  const start = addDays(weekDates(today)[0], -7 * (weeks - 1));
  const days = Array.from({ length: weeks * 7 }, (_, i) => addDays(start, i));
  const set = new Set(logs.filter((l) => l.area === id).map((l) => l.date));
  const count = days.filter((d) => set.has(d) && d <= today).length;
  return (
    <Card title="Frequência" icon={<Flame size={17} />} action={<span className="small muted">{count} dias em {weeks} semanas</span>}>
      <div className="row" style={{ alignItems: 'flex-start', gap: 10, overflowX: 'auto' }}>
        <div className="col tiny muted" style={{ gap: 4, paddingTop: 0 }}>{['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((x, i) => <span key={i} style={{ height: 16, lineHeight: '16px' }}>{x}</span>)}</div>
        <div className="heat">{days.map((d) => <i key={d} title={fromISO(d).toLocaleDateString('pt-BR')} style={{ background: set.has(d) ? 'var(--ok)' : d > today ? 'transparent' : undefined, outline: d === today ? '2px solid var(--accent)' : undefined }} />)}</div>
      </div>
    </Card>
  );
}

function GymGoal({ id }: { id: AreaId }) {
  const today = useToday();
  const { settings, setSettings, logs } = useStore();
  const w = weekDates(today);
  const done = logs.filter((l) => l.area === id && l.date >= w[0] && l.date <= w[6]);
  const target = settings.weeklyWorkoutTarget;
  return (
    <Card title="Meta semanal" icon={<Flame size={17} />}>
      <div className="row between"><span className="stat-num">{done.length}<span className="muted" style={{ fontSize: 18 }}>/{target || '—'}</span></span>
        <label className="field" style={{ width: 120 }}><span>Dias/semana</span><input type="number" min={0} max={7} className="input" value={target} onChange={(e) => setSettings({ weeklyWorkoutTarget: Number(e.target.value) })} /></label></div>
      {target > 0 ? <div style={{ marginTop: 12 }}><Bar pct={(done.length / target) * 100} color="var(--ok)" /></div> : <p className="small muted" style={{ marginTop: 8 }}>Defina quantos treinos por semana você quer fazer.</p>}
      <div className="week-strip" style={{ marginTop: 14, gap: 5 }}>{w.map((d) => <div key={d} className={`wday ${d === today ? 'today' : ''}`} style={{ padding: '6px 2px' }}><div className="tiny muted">{['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'][w.indexOf(d)]}</div><b style={{ fontSize: 14, color: done.some((l) => l.date === d) ? 'var(--ok)' : 'var(--faint)' }}>{done.some((l) => l.date === d) ? '●' : '○'}</b></div>)}</div>
    </Card>
  );
}

/* ------------------------------ conteúdo ------------------------------ */
const STAGES: { id: ContentStage; label: string }[] = [
  { id: 'ideia', label: 'Ideias' }, { id: 'roteiro', label: 'Roteiros' }, { id: 'gravar', label: 'Para gravar' }, { id: 'edicao', label: 'Em edição' }, { id: 'publicado', label: 'Publicados' },
];
const PLATFORMS: Platform[] = ['TikTok', 'Instagram', 'YouTube'];
const PCOLOR: Record<Platform, string> = { TikTok: '#ff3d6e', Instagram: '#c86bff', YouTube: '#ff4d4d' };

function ContentBoard() {
  const { content, update } = useStore();
  const [edit, setEdit] = useState<ContentItem | 'new' | null>(null);
  const [pf, setPf] = useState<Platform | ''>('');
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }));
  const onEnd = (e: DragEndEvent) => {
    const id = e.active.data.current?.id as string, stage = e.over?.data.current?.stage as ContentStage | undefined;
    const it = content.find((c) => c.id === id);
    if (!it || !stage || it.stage === stage) return;
    update('content', id, { stage, publishedAt: stage === 'publicado' ? it.publishedAt ?? stamp() : undefined }, `Moveu "${it.title}" para ${STAGES.find((s) => s.id === stage)!.label}`);
  };
  const list = content.filter((c) => !pf || c.platforms.includes(pf));
  return (
    <Card title="Pipeline de conteúdo" icon={<ListChecks size={17} />} action={<button className="btn sm primary" onClick={() => setEdit('new')}><Plus size={15} />Ideia</button>}>
      <div className="row wrap" style={{ marginBottom: 12 }}>
        <button className={`chip ${!pf ? 'on' : ''}`} onClick={() => setPf('')}>Todas</button>
        {PLATFORMS.map((p) => <button key={p} className={`chip ${pf === p ? 'on' : ''}`} onClick={() => setPf(p)}><span className="nav-dot" style={{ background: PCOLOR[p], margin: 0 }} />{p}</button>)}
      </div>
      <DndContext sensors={sensors} onDragEnd={onEnd}>
        <div className="kanban">{STAGES.map((s) => <KCol key={s.id} stage={s.id} label={s.label} items={list.filter((c) => c.stage === s.id)} onOpen={setEdit} />)}</div>
      </DndContext>
      {edit && <ContentModal item={edit === 'new' ? null : edit} onClose={() => setEdit(null)} />}
    </Card>
  );
}

function KCol({ stage, label, items, onOpen }: { stage: ContentStage; label: string; items: ContentItem[]; onOpen: (c: ContentItem) => void }) {
  const drop = useDroppable({ id: 'k:' + stage, data: { stage } });
  return (
    <div ref={drop.setNodeRef} className={`kcol ${drop.isOver ? 'over' : ''}`}>
      <div className="row between small bold"><span>{label}</span><span className="muted">{items.length}</span></div>
      {items.map((c) => <KCard key={c.id} c={c} onOpen={onOpen} />)}
    </div>
  );
}

function KCard({ c, onOpen }: { c: ContentItem; onOpen: (c: ContentItem) => void }) {
  const drag = useDraggable({ id: 'kc:' + c.id, data: { id: c.id } });
  return (
    <div ref={drag.setNodeRef} {...drag.listeners} {...drag.attributes} className="kcard" onClick={() => onOpen(c)}
      style={{ transform: drag.transform ? `translate(${drag.transform.x}px,${drag.transform.y}px)` : undefined, zIndex: drag.isDragging ? 20 : undefined, position: 'relative', opacity: drag.isDragging ? 0.85 : 1 }}>
      <div className="bold small">{c.title}</div>
      <div className="row wrap" style={{ gap: 5, marginTop: 8 }}>{c.platforms.map((p) => <span key={p} className="tag" style={{ background: PCOLOR[p] + '22', color: PCOLOR[p] }}>{p}</span>)}</div>
      {c.date && <div className="tiny muted" style={{ marginTop: 6 }}>{c.date.split('-').reverse().join('/')}</div>}
    </div>
  );
}

function ContentModal({ item, onClose }: { item: ContentItem | null; onClose: () => void }) {
  const { add, update, remove } = useStore();
  const [f, setF] = useState<Partial<ContentItem>>(item ?? { stage: 'ideia', platforms: ['TikTok'] });
  const save = () => {
    if (!f.title?.trim()) return toast('Dê um título');
    if (item) update('content', item.id, { ...f, publishedAt: f.stage === 'publicado' ? item.publishedAt ?? stamp() : undefined });
    else add('content', { title: f.title.trim(), stage: f.stage ?? 'ideia', platforms: f.platforms ?? [], script: f.script, date: f.date, createdAt: stamp(), publishedAt: f.stage === 'publicado' ? stamp() : undefined }, `Nova ideia de vídeo: ${f.title}`);
    onClose();
  };
  return (
    <Modal title={item ? 'Editar conteúdo' : 'Nova ideia de vídeo'} onClose={onClose} footer={<>
      {item && <button className="btn ghost danger" style={{ marginRight: 'auto' }} onClick={() => { remove('content', item.id); onClose(); }}>Excluir</button>}
      <button className="btn ghost" onClick={onClose}>Cancelar</button><button className="btn primary" onClick={save}>Salvar</button></>}>
      <div className="form-grid">
        <Field label="Título" full><input className="input" autoFocus value={f.title ?? ''} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
        <Field label="Etapa"><select className="select" value={f.stage} onChange={(e) => setF({ ...f, stage: e.target.value as ContentStage })}>{STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></Field>
        <Field label="Data prevista"><input type="date" className="input" value={f.date ?? ''} onChange={(e) => setF({ ...f, date: e.target.value || undefined })} /></Field>
        <div className="field full"><span>Plataformas</span><div className="row">{PLATFORMS.map((p) => <button type="button" key={p} className={`chip ${f.platforms?.includes(p) ? 'on' : ''}`} onClick={() => setF({ ...f, platforms: f.platforms?.includes(p) ? f.platforms.filter((x) => x !== p) : [...(f.platforms ?? []), p] })}>{p}</button>)}</div></div>
        <Field label="Roteiro" full><textarea className="textarea" style={{ minHeight: 160 }} value={f.script ?? ''} onChange={(e) => setF({ ...f, script: e.target.value })} placeholder="Gancho, desenvolvimento, chamada para ação…" /></Field>
      </div>
    </Modal>
  );
}

/* ------------------------------ lives ------------------------------ */
function LivesPanel() {
  const today = useToday();
  const { lives } = useStore();
  const [edit, setEdit] = useState<Live | 'new' | null>(null);
  const planned = lives.filter((l) => l.status === 'planejada').sort((a, b) => (a.date < b.date ? -1 : 1));
  const done = lives.filter((l) => l.status === 'realizada').sort((a, b) => (a.date < b.date ? 1 : -1));
  const totalMin = done.reduce((s, l) => s + (l.duration ?? 0), 0);
  const month = done.filter((l) => l.date.slice(0, 7) === today.slice(0, 7)).length;
  return (
    <>
      <div className="grid g3">
        <div className="card"><div className="small muted bold">Lives realizadas</div><div className="stat-num">{done.length}</div></div>
        <div className="card"><div className="small muted bold">Neste mês</div><div className="stat-num">{month}</div></div>
        <div className="card"><div className="small muted bold">Tempo ao vivo</div><div className="stat-num">{fmtDuration(totalMin)}</div></div>
      </div>
      <Card title="Planejamento" icon={<Radio size={17} />} action={<button className="btn sm primary" onClick={() => setEdit('new')}><Plus size={15} />Planejar live</button>}>
        {planned.length ? <div className="col" style={{ gap: 8 }}>{planned.map((l) => <LiveRow key={l.id} l={l} today={today} onOpen={() => setEdit(l)} />)}</div> : <Empty>Nenhuma live planejada.</Empty>}
      </Card>
      <Card title="Histórico" icon={<History size={17} />}>
        {done.length ? <div className="col" style={{ gap: 8 }}>{done.map((l) => <LiveRow key={l.id} l={l} today={today} onOpen={() => setEdit(l)} />)}</div> : <Empty>As lives marcadas como realizadas aparecem aqui.</Empty>}
      </Card>
      {edit && <LiveModal item={edit === 'new' ? null : edit} onClose={() => setEdit(null)} />}
    </>
  );
}

function LiveRow({ l, today, onOpen }: { l: Live; today: string; onOpen: () => void }) {
  return (
    <button className="mini" style={{ textAlign: 'left', width: '100%' }} onClick={onOpen}>
      <span className="area-ico" style={{ background: '#ff8a5c22' }}><Radio size={17} color="#ff8a5c" /></span>
      <div className="grow"><div className="bold">{l.title}</div>
        <div className="small muted">{l.date.split('-').reverse().join('/')}{l.start ? ` às ${l.start}` : ' · horário a definir'}{l.duration ? ` · ${fmtDuration(l.duration)}` : ''} · {l.platform}{l.status === 'planejada' && l.date < today ? ' · data passou' : ''}</div>
        {(l.goal || l.result) && <div className="small" style={{ marginTop: 3 }}>{l.goal && <span className="muted">Meta: {l.goal}</span>}{l.result && <span> · Resultado: {l.result}</span>}</div>}
      </div>
      <span className={`tag ${l.status === 'realizada' ? 'baixa' : 'media'}`}>{l.status === 'realizada' ? 'Realizada' : 'Planejada'}</span>
    </button>
  );
}

function LiveModal({ item, onClose }: { item: Live | null; onClose: () => void }) {
  const today = useToday();
  const { add, update, remove } = useStore();
  const [f, setF] = useState<Partial<Live>>(item ?? { date: today, platform: 'TikTok', status: 'planejada' });
  const save = () => {
    if (!f.title?.trim()) return toast('Dê um título para a live');
    const data = { ...f, title: f.title.trim(), start: f.start || undefined, duration: f.duration || undefined } as Live;
    if (item) update('lives', item.id, data, f.status === 'realizada' && item.status !== 'realizada' ? `Live realizada: ${data.title}` : undefined);
    else add('lives', data, `Planejou a live "${data.title}"`, );
    onClose();
  };
  return (
    <Modal title={item ? 'Editar live' : 'Planejar live'} onClose={onClose} footer={<>
      {item && <button className="btn ghost danger" style={{ marginRight: 'auto' }} onClick={() => { remove('lives', item.id); onClose(); }}>Excluir</button>}
      <button className="btn ghost" onClick={onClose}>Cancelar</button><button className="btn primary" onClick={save}>Salvar</button></>}>
      <div className="form-grid">
        <Field label="Título / tema" full><input className="input" autoFocus value={f.title ?? ''} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
        <Field label="Data"><input type="date" className="input" value={f.date ?? ''} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
        <Field label="Início"><input type="time" className="input" value={f.start ?? ''} onChange={(e) => setF({ ...f, start: e.target.value })} /></Field>
        <Field label="Duração (min)"><input type="number" min={5} className="input" value={f.duration ?? ''} onChange={(e) => setF({ ...f, duration: e.target.value ? Number(e.target.value) : undefined })} /></Field>
        <Field label="Plataforma"><input className="input" value={f.platform ?? ''} onChange={(e) => setF({ ...f, platform: e.target.value })} list="plats" /><datalist id="plats"><option>TikTok</option><option>Instagram</option><option>YouTube</option><option>Twitch</option></datalist></Field>
        <Field label="Meta da transmissão" full><input className="input" value={f.goal ?? ''} onChange={(e) => setF({ ...f, goal: e.target.value })} placeholder="O que você quer alcançar nessa live?" /></Field>
        <Field label="Status"><select className="select" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as Live['status'] })}><option value="planejada">Planejada</option><option value="realizada">Realizada</option></select></Field>
        <Field label="Resultado"><input className="input" value={f.result ?? ''} onChange={(e) => setF({ ...f, result: e.target.value })} placeholder="Ex.: terminei o CRUD" /></Field>
        <Field label="Observações" full><textarea className="textarea" value={f.notes ?? ''} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
      </div>
    </Modal>
  );
}
