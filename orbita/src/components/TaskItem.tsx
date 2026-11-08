import { useDraggable, useDroppable } from '@dnd-kit/core';
import { Check, Clock, GripVertical, Repeat, Trash2 } from 'lucide-react';
import { area } from '../domain/areas';
import { fmtDuration } from '../domain/dates';
import { daysLate, isDoneOn, isOverdue } from '../domain/tasks';
import type { ISODate, Task } from '../domain/types';
import { useStore } from '../store/useStore';
import { PriorityTag } from './ui';
import { useTaskForm } from './TaskForm';

const fmtDate = (d?: string) => (d ? d.split('-').reverse().slice(0, 2).join('/') : '');

export function TaskItem({ t, date, today, draggable = false, showDate = false }: { t: Task; date: ISODate; today: ISODate; draggable?: boolean; showDate?: boolean }) {
  const { toggleTask, remove } = useStore();
  const open = useTaskForm((s) => s.open);
  const done = isDoneOn(t, date);
  const late = isOverdue(t, today);
  const drag = useDraggable({ id: 'task:' + t.id, disabled: !draggable, data: { taskId: t.id } });
  const drop = useDroppable({ id: 'item:' + t.id, disabled: !draggable, data: { taskId: t.id } });
  const a = area(t.area);
  return (
    <li ref={drop.setNodeRef} className={`titem ${done ? 'done' : ''} ${drop.isOver && !drag.isDragging ? 'over' : ''} ${drag.isDragging ? 'dragging' : ''}`} style={{ borderLeft: `3px solid ${a.color}` }}>
      {draggable && <span className="grip" ref={drag.setNodeRef} {...drag.listeners} {...drag.attributes} aria-label="Arrastar para reordenar"><GripVertical size={16} /></span>}
      <button className="chk" onClick={() => toggleTask(t.id, date)} aria-label={done ? 'Reabrir' : 'Concluir'}><Check size={14} strokeWidth={3.5} /></button>
      <div className="ttext" onClick={() => open(t.id)}>
        <p>{t.title}</p>
        <div className="tmeta">
          <span style={{ color: a.color, fontWeight: 600 }}>{t.sub ?? a.short}</span>
          {t.start && <span className="row" style={{ gap: 4 }}><Clock size={12} />{t.start}{t.duration ? ` · ${fmtDuration(t.duration)}` : ''}</span>}
          {late && <span className="late">Atrasada {daysLate(t, today)}d · {fmtDate(t.date)}</span>}
          {showDate && !late && t.date && !t.recurrence && <span>{fmtDate(t.date)}</span>}
          {t.recurrence && <span className="row" style={{ gap: 4 }}><Repeat size={12} />{t.recurrence.type === 'daily' ? 'Diária' : 'Semanal'}</span>}
          {t.tags.map((x) => <span key={x}>#{x}</span>)}
        </div>
      </div>
      <PriorityTag p={t.priority} />
      <button className="del" onClick={() => remove('tasks', t.id, `Excluiu "${t.title}"`)} aria-label="Excluir"><Trash2 size={17} /></button>
    </li>
  );
}
