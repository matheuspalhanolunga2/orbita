import { ArrowRight, CalendarRange, Database, LayoutGrid, Sparkles } from 'lucide-react';
import { TEMPLATES, type TemplateId } from '../domain/areas';
import { ICONS } from '../components/ui';
import { useState } from 'react';
import { Logo } from '../layout/AppShell';
import { personalSeed } from '../seed/defaults';
import { useStore } from '../store/useStore';
import { displayName, useAuth } from '../services/supabase';

type R = 'personal' | 'example' | 'empty';

export default function Onboarding() {
  const { startFresh, tasks } = useStore();
  const session = useAuth((x) => x.session);
  const [name, setName] = useState(personalSeed?.name ?? displayName(session).split(' ')[0] ?? '');
  const [routine, setRoutine] = useState<R>(personalSeed ? 'personal' : 'empty');
  const [demo, setDemo] = useState(false);
  const [template, setTemplate] = useState<TemplateId>('criador');
  const tpls: { v: TemplateId; t: string; d: string }[] = [
    { v: 'criador', t: 'Estudante e criador de conteúdo', d: 'Programação, Inglês, Guitarra, Academia, Conteúdo, Lives e Pessoal.' },
    { v: 'basico', t: 'Básico', d: 'Pessoal, Estudos, Trabalho e Saúde.' },
  ];
  const opts: { v: R; t: string; d: string; show: boolean }[] = [
    { v: 'personal', t: 'Minha rotina', d: `${personalSeed?.routine?.length ?? 0} blocos já configurados (arquivo local privado). Horários não informados ficam em aberto para você preencher.`, show: !!personalSeed },
    { v: 'example', t: 'Rotina de exemplo', d: 'Alguns blocos genéricos para você editar.', show: true },
    { v: 'empty', t: 'Começar sem rotina', d: 'Você monta tudo em Configurações → Rotina semanal.', show: true },
  ];
  return (
    <div className="onb">
      <div className="card">
        <div className="row" style={{ gap: 14, marginBottom: 22 }}><Logo size={46} /><div><h1 style={{ fontSize: 26 }}>Bem-vindo ao <span className="grad-text">Órbita</span></h1><p className="muted small">Sua rotina, estudos, projetos e conteúdo em um só lugar.</p></div></div>
        <label className="field"><span>Como você quer ser chamado?</span><input className="input" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" /></label>
        <div className="field" style={{ marginTop: 18 }}><span><LayoutGrid size={13} style={{ verticalAlign: -2 }} /> Áreas para começar (dá para editar tudo depois)</span>
          <div className="col" style={{ gap: 8 }}>{tpls.map((o) => (
            <button key={o.v} className={`choice ${template === o.v ? 'on' : ''}`} onClick={() => setTemplate(o.v)}>
              <input type="radio" readOnly checked={template === o.v} style={{ marginTop: 3, accentColor: 'var(--accent)' }} />
              <div><div className="bold">{o.t}</div><div className="row" style={{ gap: 6, marginTop: 6 }}>{TEMPLATES[o.v].map((a) => { const I = ICONS[a.icon]; return <span key={a.id} title={a.label}><I size={16} color={a.color} /></span>; })}</div><div className="small muted" style={{ marginTop: 4 }}>{o.d}</div></div>
            </button>))}</div>
        </div>
        <div className="field" style={{ marginTop: 18 }}><span><CalendarRange size={13} style={{ verticalAlign: -2 }} /> Rotina semanal</span>
          <div className="col" style={{ gap: 8 }}>{opts.filter((o) => o.show).map((o) => (
            <button key={o.v} className={`choice ${routine === o.v ? 'on' : ''}`} onClick={() => setRoutine(o.v)}>
              <input type="radio" readOnly checked={routine === o.v} style={{ marginTop: 3, accentColor: 'var(--accent)' }} />
              <div><div className="bold">{o.t}</div><div className="small muted">{o.d}</div></div>
            </button>))}</div>
        </div>
        {template === 'criador' && <label className="choice" style={{ marginTop: 14 }}>
          <input type="checkbox" checked={demo} onChange={(e) => setDemo(e.target.checked)} style={{ marginTop: 3, accentColor: 'var(--accent)' }} />
          <div><div className="bold"><Sparkles size={14} style={{ verticalAlign: -2 }} /> Incluir dados de exemplo</div><div className="small muted">Tarefas, registros e metas fictícios para explorar as telas. Dá para apagar depois.</div></div>
        </label>}
        {tasks.length > 0 && <p className="small" style={{ marginTop: 12, color: 'var(--ok)' }}><Database size={14} style={{ verticalAlign: -2 }} /> {tasks.length} tarefa(s) do app anterior serão mantidas.</p>}
        <button className="btn primary" style={{ width: '100%', marginTop: 22, height: 48 }} onClick={() => startFresh({ name, demo: demo && template === 'criador', routine, template })}>Começar <ArrowRight size={18} /></button>
      </div>
    </div>
  );
}
