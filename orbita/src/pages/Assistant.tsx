import { AlertTriangle, Bot, CalendarCheck, CheckCircle2, Cpu, GraduationCap, Info, Lightbulb, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AreaIcon, Card, Empty, Field, PageHead } from '../components/ui';
import { toast } from '../components/toast';
import { activeAreas, area, WEEKDAYS_SHORT } from '../domain/areas';
import { assistantContext, insights, planDay, studyPlan, type Placement } from '../domain/assistant';
import { addDays, fmtDuration, fromISO } from '../domain/dates';
import { overdueTasks } from '../domain/tasks';
import type { AreaId } from '../domain/types';
import { useNow, useToday } from '../hooks/useNow';
import { aiConfigured, aiProvider } from '../services/ai';
import { getData, useStore } from '../store/useStore';

const LV_ICON = { alerta: AlertTriangle, atencao: Lightbulb, info: Info, ok: CheckCircle2 };

export default function Assistant() {
  const today = useToday();
  const now = useNow(60_000);
  const s = useStore();
  const data = getData();
  const list = useMemo(() => insights(data, today, now), [data, today, now]);
  const [preview, setPreview] = useState<ReturnType<typeof planDay> | null>(null);
  const late = overdueTasks(s.tasks, today);

  const runPlan = () => setPreview(planDay(getData(), today, now));
  const apply = (ps: Placement[]) => {
    ps.forEach((p) => s.reschedule(p.taskId, p.date, p.start));
    toast(`${ps.length} tarefa(s) organizada(s) no seu dia`);
    setPreview(null);
  };
  const action = (a?: string) => {
    if (a === 'plan-day') runPlan();
    if (a === 'reschedule-overdue') { late.forEach((t) => s.reschedule(t.id, today)); toast(`${late.length} tarefa(s) trazida(s) para hoje`); }
  };

  return (
    <>
      <PageHead title={<span className="row" style={{ gap: 12 }}><Bot size={28} color="var(--accent)" />Meu <span className="grad-text">Assistente</span></span>}
        sub="Análises feitas por regras sobre os seus dados, direto no aparelho.">
        <span className="chip"><Cpu size={14} />Regras locais: ativas</span>
        <span className="chip" style={{ color: aiConfigured ? 'var(--ok)' : 'var(--muted)' }}><Sparkles size={14} />IA: {aiConfigured ? aiProvider!.label : 'não conectada'}</span>
      </PageHead>

      <div className="grid g3" style={{ alignItems: 'start' }}>
        <div className="span2 col" style={{ gap: 18 }}>
          <Card title="Diagnóstico de hoje" icon={<Lightbulb size={17} />}>
            <div className="col" style={{ gap: 10 }}>
              {list.map((i) => {
                const I = LV_ICON[i.level];
                return (
                  <div key={i.id} className={`insight lv-${i.level}`}>
                    <span className="ico"><I size={18} /></span>
                    <div className="grow"><div className="bold">{i.title}</div><div className="small muted" style={{ marginTop: 2 }}>{i.detail}</div></div>
                    {i.action === 'plan-day' && <button className="btn sm" onClick={() => action(i.action)}>Organizar</button>}
                    {i.action === 'reschedule-overdue' && <button className="btn sm" onClick={() => action(i.action)}>Trazer p/ hoje</button>}
                    {i.action === 'open-routine' && <Link className="btn sm" to="/config">Definir</Link>}
                    {i.action === 'open-goals' && <Link className="btn sm" to="/metas">Ver meta</Link>}
                  </div>
                );
              })}
            </div>
          </Card>

          <Card title="Organizar meu dia" icon={<CalendarCheck size={17} />} action={<button className="btn sm primary" onClick={runPlan}><Sparkles size={15} />Gerar proposta</button>}>
            <p className="small muted" style={{ marginBottom: 12 }}>Encaixa as tarefas sem horário (e as atrasadas) nos horários livres de hoje, da maior para a menor prioridade, com 5 min de intervalo. Nada é alterado até você aplicar.</p>
            {preview ? (
              <>
                {preview.placements.length ? <div className="col" style={{ gap: 8 }}>{preview.placements.map((p) => {
                  const t = s.tasks.find((x) => x.id === p.taskId)!;
                  return <div key={p.taskId} className="mini"><b style={{ width: 54 }}>{p.start}</b><AreaIcon id={t.area} size={15} /><span className="grow">{p.title}</span><span className="small muted">{fmtDuration(p.duration)}</span></div>;
                })}</div> : <Empty>Nenhuma tarefa coube nos horários livres restantes.</Empty>}
                {preview.leftover.length > 0 && <p className="small" style={{ color: 'var(--media)', marginTop: 10 }}>Não couberam hoje: {preview.leftover.map((t) => t.title).join(', ')}. Considere reagendar para outro dia.</p>}
                <div className="row" style={{ marginTop: 12, justifyContent: 'flex-end' }}>
                  <button className="btn ghost" onClick={() => setPreview(null)}>Descartar</button>
                  {preview.placements.length > 0 && <button className="btn primary" onClick={() => apply(preview.placements)}>Aplicar na agenda</button>}
                </div>
              </>
            ) : null}
          </Card>

          <StudyPlan />
        </div>

        <div className="col" style={{ gap: 18 }}>
          <Card title="Integração com IA" icon={<Sparkles size={17} />}>
            {aiConfigured ? <p className="small">Conectado a <b>{aiProvider!.label}</b>.</p> : (
              <>
                <p className="small muted">A arquitetura está pronta, mas nenhuma IA está conectada. As sugestões acima são calculadas por regras, sem inteligência artificial.</p>
                <ol className="small" style={{ margin: '12px 0 0 18px', display: 'grid', gap: 6, color: 'var(--text2)' }}>
                  <li>Crie um endpoint no servidor (ex.: Edge Function) que guarde a chave da IA.</li>
                  <li>Defina <code>VITE_AI_ENDPOINT</code> no arquivo <code>.env</code>.</li>
                  <li>O app envia apenas o resumo abaixo.</li>
                </ol>
              </>
            )}
            <details style={{ marginTop: 12 }}>
              <summary className="small bold" style={{ cursor: 'pointer' }}>Ver o contexto que seria enviado</summary>
              <pre className="tiny" style={{ marginTop: 8, maxHeight: 260, overflow: 'auto', background: 'var(--panel2)', padding: 10, borderRadius: 10, whiteSpace: 'pre-wrap' }}>{JSON.stringify(assistantContext(data, today), null, 2)}</pre>
            </details>
          </Card>
        </div>
      </div>
    </>
  );
}

function StudyPlan() {
  const today = useToday();
  const { addTask } = useStore();
  const [areas, setAreas] = useState<AreaId[]>(() => activeAreas().filter((a) => a.modules.includes('registro')).slice(0, 2).map((a) => a.id));
  const [minutes, setMinutes] = useState(30);
  const [per, setPer] = useState(3);
  const [weeks, setWeeks] = useState(1);
  const [start, setStart] = useState(addDays(today, 1));
  const [plan, setPlan] = useState<Placement[] | null>(null);
  const gen = () => {
    if (!areas.length) return toast('Escolha ao menos uma área');
    setPlan(studyPlan(getData(), { areas, minutes, sessionsPerWeek: per, weeks, start }));
  };
  const create = () => {
    plan!.forEach((p) => {
      const a = activeAreas().find((x) => p.title.endsWith(x.label))!;
      addTask({ title: p.title, area: a.id, date: p.date, start: p.start, duration: p.duration, tags: ['plano-de-estudos'] });
    });
    toast(`${plan!.length} sessões criadas na agenda`);
    setPlan(null);
  };
  return (
    <Card title="Plano de estudos" icon={<GraduationCap size={17} />}>
      <div className="form-grid">
        <div className="field full"><span>Áreas</span><div className="row wrap">{activeAreas().map((a) => <button key={a.id} type="button" className={`chip ${areas.includes(a.id) ? 'on' : ''}`} onClick={() => setAreas((x) => (x.includes(a.id) ? x.filter((y) => y !== a.id) : [...x, a.id]))}><AreaIcon id={a.id} size={13} />{a.short}</button>)}</div></div>
        <Field label="Minutos por sessão"><input type="number" min={10} step={5} className="input" value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} /></Field>
        <Field label="Sessões por semana (cada área)"><input type="number" min={1} max={7} className="input" value={per} onChange={(e) => setPer(Number(e.target.value))} /></Field>
        <Field label="Começar em"><input type="date" className="input" value={start} min={today} onChange={(e) => setStart(e.target.value)} /></Field>
        <Field label="Semanas"><input type="number" min={1} max={8} className="input" value={weeks} onChange={(e) => setWeeks(Number(e.target.value))} /></Field>
      </div>
      <button className="btn primary" style={{ marginTop: 14 }} onClick={gen}><Sparkles size={15} />Gerar plano</button>
      {plan && (
        <div style={{ marginTop: 14 }}>
          {plan.length ? <>
            <div className="col" style={{ gap: 6, maxHeight: 300, overflow: 'auto' }}>{plan.map((p, i) => {
              const a = activeAreas().find((x) => p.title.endsWith(x.label))!;
              return <div key={i} className="mini small"><b style={{ width: 92 }}>{WEEKDAYS_SHORT[fromISO(p.date).getDay()]} {p.date.slice(8)}/{p.date.slice(5, 7)}</b><span style={{ width: 48 }}>{p.start}</span><AreaIcon id={a.id} size={14} /><span className="grow" style={{ color: area(a.id).color }}>{a.label}</span><span className="muted">{p.duration} min</span></div>;
            })}</div>
            <p className="tiny muted" style={{ marginTop: 8 }}>Usa apenas horários livres dentro da sua janela do dia; blocos da rotina sem horário não são considerados.</p>
            <div className="row" style={{ justifyContent: 'flex-end', marginTop: 10 }}><button className="btn ghost" onClick={() => setPlan(null)}>Descartar</button><button className="btn primary" onClick={create}>Criar {plan.length} sessões</button></div>
          </> : <Empty>Não encontrei horários livres suficientes nesse período.</Empty>}
        </div>
      )}
    </Card>
  );
}
