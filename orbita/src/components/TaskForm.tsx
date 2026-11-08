import { useState } from 'react';
import { create } from 'zustand';
import { activeAreas, area as areaMeta, firstArea, WEEKDAYS_SHORT } from '../domain/areas';
import { todayISO } from '../domain/dates';
import type { Task } from '../domain/types';
import { useStore } from '../store/useStore';
import { Field, Modal } from './ui';
import { toast } from './toast';

interface UIState { form: null | { id?: string; defaults?: Partial<Task> }; open: (id?: string, defaults?: Partial<Task>) => void; close: () => void }
export const useTaskForm = create<UIState>((set) => ({
  form: null,
  open: (id, defaults) => set({ form: { id, defaults } }),
  close: () => set({ form: null }),
}));

type Rec = 'none' | 'daily' | 'weekly';

export function TaskFormHost() {
  const form = useTaskForm((s) => s.form);
  if (!form) return null;
  return <TaskForm key={form.id ?? 'new'} id={form.id} defaults={form.defaults} />;
}

function TaskForm({ id, defaults }: { id?: string; defaults?: Partial<Task> }) {
  const close = useTaskForm((s) => s.close);
  const { tasks, tags, addTask, update, remove, addTag } = useStore();
  const existing = id ? tasks.find((t) => t.id === id) : undefined;
  const init: Partial<Task> = existing ?? { date: todayISO(), priority: 'media', area: firstArea(), tags: [], ...defaults };
  const [f, setF] = useState<Partial<Task>>(init);
  const [rec, setRec] = useState<Rec>(init.recurrence?.type ?? 'none');
  const [days, setDays] = useState<number[]>(init.recurrence?.days ?? []);
  const [newTag, setNewTag] = useState('');
  const set = (p: Partial<Task>) => setF((x) => ({ ...x, ...p }));
  const subs = areaMeta(f.area ?? '').subs;

  const save = () => {
    if (!f.title?.trim()) return toast('Dê um título para a tarefa');
    if (rec === 'weekly' && !days.length) return toast('Escolha os dias da semana');
    const recurrence = rec === 'none' ? undefined : { type: rec, days: rec === 'weekly' ? [...days].sort() : undefined };
    const data = { ...f, title: f.title.trim(), recurrence, start: f.start || undefined, duration: f.duration || undefined, date: f.date || undefined, reminder: f.reminder ?? undefined };
    if (existing) {
      update('tasks', existing.id, { ...data, doneDates: recurrence ? existing.doneDates ?? [] : undefined }, `Editou "${data.title}"`);
      toast('Tarefa atualizada');
    } else {
      addTask(data as Task);
      toast('Tarefa criada');
    }
    close();
  };

  return (
    <Modal title={existing ? 'Editar tarefa' : 'Nova tarefa'} onClose={close}
      footer={<>
        {existing && <button className="btn danger ghost" style={{ marginRight: 'auto' }} onClick={() => { remove('tasks', existing.id, `Excluiu "${existing.title}"`); toast('Tarefa excluída'); close(); }}>Excluir</button>}
        <button className="btn ghost" onClick={close}>Cancelar</button>
        <button className="btn primary" onClick={save}>{existing ? 'Salvar' : 'Adicionar'}</button>
      </>}>
      <form className="form-grid" onSubmit={(e) => { e.preventDefault(); save(); }}>
        <Field label="Título" full><input className="input" autoFocus value={f.title ?? ''} onChange={(e) => set({ title: e.target.value })} placeholder="O que você precisa fazer?" maxLength={120} /></Field>
        <Field label="Área">
          <select className="select" value={f.area} onChange={(e) => set({ area: e.target.value as Task['area'], sub: undefined })}>
            {activeAreas().map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
          </select>
        </Field>
        <Field label="Subcategoria">
          <select className="select" value={f.sub ?? ''} onChange={(e) => set({ sub: e.target.value || undefined })}>
            <option value="">—</option>{subs.map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Prioridade">
          <select className="select" value={f.priority} onChange={(e) => set({ priority: e.target.value as Task['priority'] })}>
            <option value="alta">Alta</option><option value="media">Média</option><option value="baixa">Baixa</option>
          </select>
        </Field>
        <Field label={rec === 'none' ? 'Data' : 'Começa em'}><input type="date" className="input" value={f.date ?? ''} onChange={(e) => set({ date: e.target.value })} /></Field>
        <Field label="Horário (opcional)"><input type="time" className="input" value={f.start ?? ''} onChange={(e) => set({ start: e.target.value })} /></Field>
        <Field label="Duração (min)"><input type="number" min={5} step={5} className="input" value={f.duration ?? ''} onChange={(e) => set({ duration: e.target.value ? Number(e.target.value) : undefined })} placeholder="30" /></Field>
        <Field label="Repetir">
          <select className="select" value={rec} onChange={(e) => setRec(e.target.value as Rec)}>
            <option value="none">Não repetir</option><option value="daily">Todos os dias</option><option value="weekly">Dias da semana</option>
          </select>
        </Field>
        <Field label="Lembrete">
          <select className="select" value={f.reminder ?? ''} disabled={!f.start} onChange={(e) => set({ reminder: e.target.value === '' ? undefined : Number(e.target.value) })}>
            <option value="">{f.start ? 'Sem lembrete' : 'Defina um horário'}</option><option value="0">Na hora</option><option value="10">10 min antes</option><option value="30">30 min antes</option><option value="60">1 h antes</option>
          </select>
        </Field>
        {rec === 'weekly' && (
          <div className="full row wrap">{WEEKDAYS_SHORT.map((d, i) => (
            <button type="button" key={d} className={`chip ${days.includes(i) ? 'on' : ''}`} onClick={() => setDays((x) => (x.includes(i) ? x.filter((y) => y !== i) : [...x, i]))}>{d}</button>
          ))}</div>
        )}
        <div className="field full"><span>Etiquetas</span>
          <div className="row wrap">
            {tags.map((t) => <button type="button" key={t} className={`chip ${f.tags?.includes(t) ? 'on' : ''}`} onClick={() => set({ tags: f.tags?.includes(t) ? f.tags.filter((x) => x !== t) : [...(f.tags ?? []), t] })}>#{t}</button>)}
            <input className="input" style={{ width: 150, height: 32 }} placeholder="+ nova etiqueta" value={newTag} onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); const t = newTag.trim().toLowerCase(); if (t) { addTag(t); set({ tags: [...(f.tags ?? []), t] }); setNewTag(''); } } }} />
          </div>
        </div>
        <Field label="Observações" full><textarea className="textarea" value={f.notes ?? ''} onChange={(e) => set({ notes: e.target.value })} /></Field>
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}
