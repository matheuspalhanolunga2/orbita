import { BarChart3, Bot, Cloud, CalendarDays, CheckSquare, Grid2x2, LayoutDashboard, Menu, Moon, Plus, Search, Settings, Sun, Target } from 'lucide-react';
import { Suspense, useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AreaIcon, Modal } from '../components/ui';
import { useTaskForm } from '../components/TaskForm';
import { activeAreas } from '../domain/areas';
import { overdueTasks } from '../domain/tasks';
import { useToday } from '../hooks/useNow';
import { useStore } from '../store/useStore';
import { cloudConfigured } from '../services/supabase';
import { useSync } from '../sync/engine';

const NAV = [
  { to: '/', label: 'Painel', icon: LayoutDashboard },
  { to: '/tarefas', label: 'Tarefas', icon: CheckSquare },
  { to: '/agenda', label: 'Agenda', icon: CalendarDays },
  { to: '/metas', label: 'Metas', icon: Target },
  { to: '/assistente', label: 'Meu Assistente', icon: Bot },
];

export function Logo({ size = 36 }: { size?: number }) {
  return (
    <span className="brand-logo" style={{ width: size, height: size }}>
      <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round">
        <ellipse cx="12" cy="12" rx="10" ry="4.2" transform="rotate(-28 12 12)" opacity=".75" /><circle cx="12" cy="12" r="3.4" fill="#fff" stroke="none" />
      </svg>
    </span>
  );
}

export function AppShell() {
  const { settings, setSettings, tasks } = useStore();
  useStore((s) => s.areas);
  const AREA_LIST = activeAreas();
  const openTask = useTaskForm((s) => s.open);
  const today = useToday();
  const late = overdueTasks(tasks, today).length;
  const nav = useNavigate();
  const loc = useLocation();
  const [q, setQ] = useState('');
  const [more, setMore] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => { document.documentElement.dataset.theme = settings.theme; }, [settings.theme]);
  useEffect(() => { setMore(false); window.scrollTo(0, 0); }, [loc.pathname]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const typing = /INPUT|TEXTAREA|SELECT/.test((e.target as HTMLElement).tagName);
      if (e.key === '/' && !typing) { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key.toLowerCase() === 'n' && !typing && !e.metaKey && !e.ctrlKey) { e.preventDefault(); openTask(); }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [openTask]);

  const search = (e: React.FormEvent) => { e.preventDefault(); nav(`/tarefas?q=${encodeURIComponent(q)}`); };
  const toggleTheme = () => setSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' });

  return (
    <div className="shell">
      <aside className="side">
        <div className="brand"><Logo /> Órbita</div>
        {NAV.map(({ to, label, icon: I }) => (
          <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <I size={19} />{label}{to === '/tarefas' && late > 0 && <span className="nav-count">{late}</span>}
          </NavLink>
        ))}
        <div className="nav-label">Áreas</div>
        {AREA_LIST.map((a) => (
          <NavLink key={a.id} to={`/areas/${a.id}`} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <AreaIcon id={a.id} size={18} />{a.label}
          </NavLink>
        ))}
        <div style={{ marginTop: 'auto' }} />
        <NavLink to="/areas" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}><Grid2x2 size={19} />Visão das áreas</NavLink>
        <NavLink to="/config" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}><Settings size={19} />Configurações</NavLink>
      </aside>

      <div className="main">
        <header className="topbar">
          <span className="show-m"><Logo size={32} /></span>
          <form className="search" onSubmit={search} role="search">
            <Search size={17} />
            <input ref={searchRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pesquisar tarefas…" aria-label="Pesquisar tarefas" />
            <span className="kbd hide-m">/</span>
          </form>
          {cloudConfigured && <SyncDot />}
          <button className="btn icon ghost" onClick={toggleTheme} aria-label="Alternar tema">{settings.theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}</button>
          <button className="btn primary hide-m" onClick={() => openTask()}><Plus size={18} />Nova tarefa <span className="kbd" style={{ color: '#fff9', borderColor: '#fff5' }}>N</span></button>
        </header>
        <main className="content" key={loc.pathname}><Suspense fallback={<div className="muted small">Carregando…</div>}><Outlet /></Suspense></main>
      </div>

      <nav className="bottom-nav" aria-label="Navegação">
        <NavLink to="/" end><LayoutDashboard size={22} />Painel</NavLink>
        <NavLink to="/tarefas"><CheckSquare size={22} />Tarefas</NavLink>
        <button onClick={() => openTask()} aria-label="Nova tarefa"><span className="plus"><Plus size={26} /></span></button>
        <NavLink to="/agenda"><CalendarDays size={22} />Agenda</NavLink>
        <button onClick={() => setMore(true)}><Menu size={22} />Mais</button>
      </nav>

      {more && (
        <Modal title="Mais" onClose={() => setMore(false)}>
          <div className="col">
            {[{ to: '/metas', l: 'Metas', i: <Target size={19} /> }, { to: '/assistente', l: 'Meu Assistente', i: <Bot size={19} /> }, { to: '/areas', l: 'Visão das áreas', i: <BarChart3 size={19} /> }].map((x) => (
              <NavLink key={x.to} to={x.to} className="nav-item">{x.i}{x.l}</NavLink>
            ))}
            <div className="nav-label">Áreas</div>
            {AREA_LIST.map((a) => <NavLink key={a.id} to={`/areas/${a.id}`} className="nav-item"><AreaIcon id={a.id} />{a.label}</NavLink>)}
            <div className="divider" />
            <NavLink to="/config" className="nav-item"><Settings size={19} />Configurações</NavLink>
          </div>
        </Modal>
      )}
    </div>
  );
}

function SyncDot() {
  const { status, pending } = useSync();
  const map = { idle: ['var(--ok)', 'Tudo salvo na nuvem'], syncing: ['var(--media)', 'Sincronizando…'], offline: ['var(--faint)', 'Sem internet — salvo neste aparelho'], error: ['var(--alta)', 'Erro ao sincronizar'] } as const;
  const [c, t] = pending && status === 'idle' ? (['var(--media)', 'Salvando…'] as const) : map[status];
  return <NavLink to="/config" className="btn icon ghost" title={t} aria-label={t}><Cloud size={19} color={c} /></NavLink>;
}
