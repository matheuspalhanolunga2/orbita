import { DndContext, PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { ArrowUpDown, Plus, Search, SlidersHorizontal } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TaskItem } from '../components/TaskItem';
import { useTaskForm } from '../components/TaskForm';
import { AreaIcon, Empty, PageHead, Ring, Seg } from '../components/ui';
import { toast } from '../components/toast';
import { activeAreas, firstArea } from '../domain/areas';
import { filterTasks, isDoneOn, isOverdue, occursOn } from '../domain/tasks';
import type { AreaId, Priority } from '../domain/types';
import { useToday } from '../hooks/useNow';
import { useStore } from '../store/useStore';

type Status = 'todas' | 'pendentes' | 'concluidas' | 'atrasadas';
type Scope = 'tudo' | 'hoje' | 'proximas' | 'sem-data' | 'recorrentes';

export default function Tasks() {
  const today = useToday();
  const { tasks, tags, addTask, organizeTasks, clearDone, moveTask } = useStore();
  const openTask = useTaskForm((s) => s.open);
  const [params, setParams] = useSearchParams();
  const [title, setTitle] = useState('');
  const [prio, setPrio] = useState<Priority>('media');
  const [newArea, setNewArea] = useState<AreaId>(() => firstArea());
  const [status, setStatus] = useState<Status>((params.get('status') as Status) || 'todas');
  const [scope, setScope] = useState<Scope>('tudo');
  const [areaF, setAreaF] = useState<AreaId | 'todas'>((params.get('area') as AreaId) || 'todas');
  const [prioF, setPrioF] = useState<Priority | 'todas'>('todas');
  const [tagF, setTagF] = useState<string>('');
  const [filters, setFilters] = useState(false);
  const q = params.get('q') ?? '';
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }));

  const list = useMemo(() => {
    let l = filterTasks(tasks, { search: q, area: areaF, priority: prioF, tag: tagF || undefined, status: status === 'atrasadas' ? 'todas' : status }, today);
    if (status === 'atrasadas') l = l.filter((t) => isOverdue(t, today));
    if (scope === 'hoje') l = l.filter((t) => occursOn(t, today) || isOverdue(t, today));
    if (scope === 'proximas') l = l.filter((t) => !t.recurrence && t.date && t.date > today);
    if (scope === 'sem-data') l = l.filter((t) => !t.date && !t.recurrence);
    if (scope === 'recorrentes') l = l.filter((t) => t.recurrence);
    return [...l].sort((a, b) => a.order - b.order);
  }, [tasks, q, areaF, prioF, tagF, status, scope, today]);

  const doneCount = tasks.filter((t) => (t.recurrence ? isDoneOn(t, today) : t.done)).length;
  const pct = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0;
  const pending = tasks.length - doneCount;

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    addTask({ title, priority: prio, area: newArea, date: today });
    setTitle('');
  };
  const onDragEnd = (e: DragEndEvent) => {
    const a = e.active.data.current?.taskId, o = e.over?.data.current?.taskId;
    if (a && o && a !== o) moveTask(a, o);
  };

  return (
    <>
      <PageHead title={<>Minhas <span className="grad-text">Tarefas</span></>} sub={q ? <>Resultados para “{q}” <button className="btn sm ghost" onClick={() => setParams({})}>limpar</button></> : 'Tudo o que você precisa fazer, em um só lugar.'}>
        <Ring pct={pct} size={70} stroke={7} />
      </PageHead>

      <form className="card row wrap" onSubmit={add} style={{ padding: 10, marginBottom: 16, gap: 8 }}>
        <input className="input grow" style={{ border: 0, background: 'transparent', minWidth: 200 }} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="O que você precisa fazer?" maxLength={120} aria-label="Nova tarefa" />
        <select className="select" style={{ width: 'auto' }} value={newArea} onChange={(e) => setNewArea(e.target.value as AreaId)} aria-label="Área">
          {activeAreas().map((a) => <option key={a.id} value={a.id}>{a.short}</option>)}
        </select>
        <select className="select" style={{ width: 'auto' }} value={prio} onChange={(e) => setPrio(e.target.value as Priority)} aria-label="Prioridade">
          <option value="alta">Alta</option><option value="media">Média</option><option value="baixa">Baixa</option>
        </select>
        <button className="btn primary" type="submit">Adicionar</button>
        <button className="btn icon" type="button" onClick={() => openTask(undefined, { area: newArea, priority: prio, title })} aria-label="Mais opções" title="Mais opções (data, horário, recorrência…)"><Plus size={18} /></button>
      </form>

      <div className="row between wrap" style={{ marginBottom: 12, gap: 10 }}>
        <Seg value={status} onChange={setStatus} options={[{ v: 'todas', l: 'Todas' }, { v: 'pendentes', l: 'Pendentes' }, { v: 'concluidas', l: 'Concluídas' }, { v: 'atrasadas', l: 'Atrasadas' }]} />
        <div className="row">
          <button className={`btn sm ${filters ? 'primary' : ''}`} onClick={() => setFilters((x) => !x)}><SlidersHorizontal size={15} />Filtros</button>
          <button className="btn sm" onClick={() => { organizeTasks(); toast('Organizadas: pendentes primeiro, por prioridade'); }}><ArrowUpDown size={15} />Organizar</button>
        </div>
      </div>

      {filters && (
        <div className="card col" style={{ marginBottom: 14, padding: 16 }}>
          <div className="row wrap"><span className="small muted bold" style={{ width: 80 }}>Quando</span>
            {([['tudo', 'Tudo'], ['hoje', 'Hoje'], ['proximas', 'Próximas'], ['sem-data', 'Sem data'], ['recorrentes', 'Recorrentes']] as [Scope, string][]).map(([v, l]) => <button key={v} className={`chip ${scope === v ? 'on' : ''}`} onClick={() => setScope(v)}>{l}</button>)}
          </div>
          <div className="row wrap"><span className="small muted bold" style={{ width: 80 }}>Área</span>
            <button className={`chip ${areaF === 'todas' ? 'on' : ''}`} onClick={() => setAreaF('todas')}>Todas</button>
            {activeAreas().map((a) => <button key={a.id} className={`chip ${areaF === a.id ? 'on' : ''}`} onClick={() => setAreaF(a.id)}><AreaIcon id={a.id} size={13} />{a.short}</button>)}
          </div>
          <div className="row wrap"><span className="small muted bold" style={{ width: 80 }}>Prioridade</span>
            {(['todas', 'alta', 'media', 'baixa'] as const).map((p) => <button key={p} className={`chip ${prioF === p ? 'on' : ''}`} onClick={() => setPrioF(p)}>{p === 'todas' ? 'Todas' : p === 'media' ? 'Média' : p[0].toUpperCase() + p.slice(1)}</button>)}
          </div>
          <div className="row wrap"><span className="small muted bold" style={{ width: 80 }}>Etiqueta</span>
            <button className={`chip ${!tagF ? 'on' : ''}`} onClick={() => setTagF('')}>Todas</button>
            {tags.map((t) => <button key={t} className={`chip ${tagF === t ? 'on' : ''}`} onClick={() => setTagF(t)}>#{t}</button>)}
          </div>
        </div>
      )}

      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        {list.length ? (
          <ul className="tlist">{list.map((t) => <TaskItem key={t.id} t={t} date={today} today={today} draggable showDate />)}</ul>
        ) : <Empty>{q || areaF !== 'todas' || tagF || prioF !== 'todas' ? <><Search size={16} style={{ verticalAlign: -3 }} /> Nenhuma tarefa com esses filtros.</> : 'Nada por aqui ✨'}</Empty>}
      </DndContext>

      <div className="row between small muted" style={{ marginTop: 16, padding: '0 4px' }}>
        <span>{pending ? `${pending} pendente${pending > 1 ? 's' : ''}` : 'Tudo concluído 🎉'}</span>
        <button className="btn sm ghost" onClick={() => { clearDone(); toast('Concluídas removidas'); }}>Limpar concluídas</button>
      </div>
    </>
  );
}
