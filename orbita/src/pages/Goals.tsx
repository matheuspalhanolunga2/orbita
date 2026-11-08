import { Archive, CheckCircle2, Pencil, Plus, Target, Trash2, TrendingDown, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { AreaIcon, Card, Empty, Field, Modal, PageHead, Ring } from '../components/ui';
import { toast } from '../components/toast';
import { activeAreas, area, firstArea } from '../domain/areas';
import { goalStatus } from '../domain/goals';
import type { AreaId, Goal, GoalKind } from '../domain/types';
import { useToday } from '../hooks/useNow';
import { getData, stamp, useStore } from '../store/useStore';
import { chartTooltip } from '../components/chartTheme';

export const KIND: Record<GoalKind, { label: string; unit: string; help: string }> = {
  tasks: { label: 'Tarefas concluídas', unit: 'tarefas', help: 'Conta as tarefas concluídas da área desde a criação da meta.' },
  minutes: { label: 'Minutos de prática', unit: 'min', help: 'Soma os minutos registrados na área.' },
  sessions: { label: 'Sessões / treinos', unit: 'sessões', help: 'Conta os registros de prática ou treino da área.' },
  published: { label: 'Vídeos publicados', unit: 'vídeos', help: 'Conta os conteúdos movidos para "Publicados".' },
  lives: { label: 'Lives realizadas', unit: 'lives', help: 'Conta as lives marcadas como realizadas.' },
  manual: { label: 'Progresso manual', unit: '%', help: 'Você atualiza o valor manualmente.' },
};

const SUGGESTIONS: { title: string; area: AreaId; kind: GoalKind }[] = [
  { title: 'Evoluir em programação', area: 'programacao', kind: 'tasks' },
  { title: 'Aprender inglês', area: 'ingles', kind: 'minutes' },
  { title: 'Aprender guitarra', area: 'guitarra', kind: 'minutes' },
  { title: 'Manter frequência na academia', area: 'academia', kind: 'sessions' },
  { title: 'Publicar vídeos', area: 'conteudo', kind: 'published' },
  { title: 'Fazer lives', area: 'lives', kind: 'lives' },
];

export default function Goals() {
  const today = useToday();
  const { goals } = useStore();
  const [edit, setEdit] = useState<Partial<Goal> | null>(null);
  const [archived, setArchived] = useState(false);
  const data = getData();
  const list = goals.filter((g) => !!g.archived === archived);
  useStore((s) => s.areas);
  const ids = new Set(activeAreas().map((a) => a.id));
  const unused = SUGGESTIONS.filter((s) => ids.has(s.area) && !goals.some((g) => g.title === s.title));
  return (
    <>
      <PageHead title={<>Metas e <span className="grad-text">evolução</span></>} sub="O progresso é calculado automaticamente a partir dos seus registros.">
        <button className="btn sm" onClick={() => setArchived((x) => !x)}><Archive size={15} />{archived ? 'Ativas' : 'Arquivadas'}</button>
        <button className="btn primary" onClick={() => setEdit({})}><Plus size={17} />Nova meta</button>
      </PageHead>

      {!archived && unused.length > 0 && (
        <Card title="Sugestões para você" icon={<Target size={17} />} style={{ marginBottom: 18 }}>
          <p className="small muted" style={{ marginBottom: 12 }}>Escolha uma e defina o alvo e o prazo. Nada é criado sem a sua confirmação.</p>
          <div className="row wrap">{unused.map((s) => <button key={s.title} className="chip" onClick={() => setEdit({ title: s.title, area: s.area, kind: s.kind, unit: KIND[s.kind].unit })}><AreaIcon id={s.area} size={13} />{s.title}</button>)}</div>
        </Card>
      )}

      {list.length ? <div className="grid g2">{list.map((g) => <GoalCard key={g.id} g={g} st={goalStatus(g, data, today)} onEdit={() => setEdit(g)} />)}</div>
        : <Empty>{archived ? 'Nenhuma meta arquivada.' : 'Crie sua primeira meta para acompanhar a evolução.'}</Empty>}
      {edit && <GoalModal init={edit} onClose={() => setEdit(null)} />}
    </>
  );
}

function GoalCard({ g, st, onEdit }: { g: Goal; st: ReturnType<typeof goalStatus>; onEdit: () => void }) {
  const today = useToday();
  const { update, remove } = useStore();
  const [val, setVal] = useState('');
  const c = area(g.area).color;
  const chart = st.history.map((h) => ({ d: h.date.slice(8) + '/' + h.date.slice(5, 7), v: h.value }));
  return (
    <Card>
      <div className="row" style={{ gap: 16, alignItems: 'flex-start' }}>
        <Ring pct={st.pct} size={84} stroke={9} />
        <div className="grow">
          <div className="row between"><span className="row bold" style={{ gap: 8, fontSize: 17 }}><AreaIcon id={g.area} size={17} />{g.title}</span>
            <span className="row" style={{ gap: 2 }}>
              <button className="btn ghost sm icon" onClick={onEdit} aria-label="Editar"><Pencil size={15} /></button>
              <button className="btn ghost sm icon" onClick={() => update('goals', g.id, { archived: !g.archived })} aria-label="Arquivar"><Archive size={15} /></button>
              <button className="btn ghost sm icon danger" onClick={() => { remove('goals', g.id, `Excluiu a meta "${g.title}"`); }} aria-label="Excluir"><Trash2 size={15} /></button>
            </span></div>
          <div className="small muted">{KIND[g.kind].label} · {st.value} de {g.target} {g.unit}</div>
          <div className="row wrap small" style={{ marginTop: 10, gap: 14 }}>
            {g.deadline && <span><b>{st.daysLeft! >= 0 ? st.daysLeft : 0}</b> <span className="muted">{st.daysLeft! >= 0 ? 'dias restantes' : 'prazo vencido'}</span></span>}
            {st.perDayNeeded !== null && st.pct < 100 && <span><b>{Math.ceil(st.perDayNeeded * 10) / 10}</b> <span className="muted">{g.unit}/dia necessários</span></span>}
            {g.kind !== 'manual' && <span><b>{st.last7}</b> <span className="muted">nos últimos 7 dias</span></span>}
            {st.pct >= 100 ? <span className="row" style={{ gap: 4, color: 'var(--ok)' }}><CheckCircle2 size={15} />Concluída</span>
              : st.onTrack !== null && <span className="row" style={{ gap: 4, color: st.onTrack ? 'var(--ok)' : 'var(--media)' }}>{st.onTrack ? <TrendingUp size={15} /> : <TrendingDown size={15} />}{st.onTrack ? 'No ritmo' : 'Abaixo do ritmo'}</span>}
          </div>
        </div>
      </div>
      {chart.length > 1 && (
        <div style={{ height: 90, marginTop: 12 }}>
          <ResponsiveContainer>
            <AreaChart data={chart} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
              <defs><linearGradient id={'gg' + g.id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={c} stopOpacity={0.45} /><stop offset="1" stopColor={c} stopOpacity={0} /></linearGradient></defs>
              <XAxis dataKey="d" hide />
              <Tooltip {...chartTooltip} />
              <Area type="monotone" dataKey="v" name={g.unit} stroke={c} strokeWidth={2} fill={`url(#gg${g.id})`} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
      {g.kind === 'manual' && (
        <form className="row" style={{ marginTop: 12 }} onSubmit={(e) => { e.preventDefault(); const v = Number(val); if (Number.isFinite(v) && val !== '') {
          update('goals', g.id, { manualValue: v, manualHistory: [...(g.manualHistory ?? []).filter((h) => h.date !== today), { date: today, value: v }] }, `Atualizou a meta "${g.title}" para ${v} ${g.unit}`); setVal(''); toast('Progresso registrado'); } }}>
          <input className="input" type="number" value={val} onChange={(e) => setVal(e.target.value)} placeholder={`Valor atual (${g.unit})`} />
          <button className="btn">Atualizar</button>
        </form>
      )}
    </Card>
  );
}

function GoalModal({ init, onClose }: { init: Partial<Goal>; onClose: () => void }) {
  const { add, update } = useStore();
  const [f, setF] = useState<Partial<Goal>>({ area: firstArea(), kind: 'tasks', unit: 'tarefas', ...init });
  const save = () => {
    if (!f.title?.trim()) return toast('Dê um nome para a meta');
    if (!f.target || f.target <= 0) return toast('Defina um alvo maior que zero');
    if (init.id) update('goals', init.id, f, `Editou a meta "${f.title}"`);
    else add('goals', { title: f.title.trim(), area: f.area!, kind: f.kind!, target: f.target, unit: f.unit || KIND[f.kind!].unit, deadline: f.deadline, createdAt: stamp(), manualValue: f.kind === 'manual' ? 0 : undefined }, `Criou a meta "${f.title}"`);
    onClose();
  };
  return (
    <Modal title={init.id ? 'Editar meta' : 'Nova meta'} onClose={onClose} footer={<><button className="btn ghost" onClick={onClose}>Cancelar</button><button className="btn primary" onClick={save}>Salvar</button></>}>
      <div className="form-grid">
        <Field label="Meta" full><input className="input" autoFocus value={f.title ?? ''} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Ex.: Aprender inglês" /></Field>
        <Field label="Área"><select className="select" value={f.area} onChange={(e) => setF({ ...f, area: e.target.value as AreaId })}>{activeAreas().map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}</select></Field>
        <Field label="Como medir"><select className="select" value={f.kind} disabled={!!init.id} onChange={(e) => { const k = e.target.value as GoalKind; setF({ ...f, kind: k, unit: KIND[k].unit }); }}>{Object.entries(KIND).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></Field>
        <p className="full tiny muted" style={{ marginTop: -6 }}>{KIND[f.kind!].help}</p>
        <Field label="Alvo"><input type="number" min={1} className="input" value={f.target ?? ''} onChange={(e) => setF({ ...f, target: Number(e.target.value) })} placeholder="Ex.: 600" /></Field>
        <Field label="Unidade"><input className="input" value={f.unit ?? ''} onChange={(e) => setF({ ...f, unit: e.target.value })} /></Field>
        <Field label="Prazo" full><input type="date" className="input" value={f.deadline ?? ''} onChange={(e) => setF({ ...f, deadline: e.target.value || undefined })} /></Field>
      </div>
    </Modal>
  );
}
