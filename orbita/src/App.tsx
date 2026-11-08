import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { TaskFormHost } from './components/TaskForm';
import { Toasts } from './components/toast';
import { Logo } from './layout/AppShell';
import { AppShell } from './layout/AppShell';
import { ForgotPassword, ResetPassword, SignIn, SignUp } from './pages/Auth';
import Landing from './pages/Landing';
import { Privacy, Terms } from './pages/Legal';
import Onboarding from './pages/Onboarding';
import { startReminders } from './services/notifications';
import { cloudConfigured, initAuth, useAuth } from './services/supabase';
import { useStore } from './store/useStore';
import { useSync } from './sync/engine';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Tasks = lazy(() => import('./pages/Tasks'));
const Agenda = lazy(() => import('./pages/Agenda'));
const AreasOverview = lazy(() => import('./pages/Areas').then((m) => ({ default: m.AreasOverview })));
const AreaPage = lazy(() => import('./pages/Areas').then((m) => ({ default: m.AreaPage })));
const Goals = lazy(() => import('./pages/Goals'));
const Assistant = lazy(() => import('./pages/Assistant'));
const Settings = lazy(() => import('./pages/Settings'));

function Splash({ text }: { text: string }) {
  return <div className="onb"><div className="col" style={{ alignItems: 'center', gap: 16 }}><Logo size={54} /><span className="muted small">{text}</span></div></div>;
}

/** Routes for visitors who are not signed in (cloud mode only). */
function PublicRoutes() {
  return (
    <Routes>
      <Route index element={<Landing />} />
      <Route path="entrar" element={<SignIn />} />
      <Route path="cadastro" element={<SignUp />} />
      <Route path="esqueci-senha" element={<ForgotPassword />} />
      <Route path="privacidade" element={<Privacy />} />
      <Route path="termos" element={<Terms />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="privacidade" element={<Privacy />} />
      <Route path="termos" element={<Terms />} />
      <Route element={<AppShell />}>
        <Route index element={<Dashboard />} />
        <Route path="tarefas" element={<Tasks />} />
        <Route path="agenda" element={<Agenda />} />
        <Route path="areas" element={<AreasOverview />} />
        <Route path="areas/:id" element={<AreaPage />} />
        <Route path="metas" element={<Goals />} />
        <Route path="assistente" element={<Assistant />} />
        <Route path="config" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

function Gate() {
  const onboarded = useStore((s) => s.settings.onboarded);
  const { ready, session, recovery } = useAuth();
  const synced = useSync((s) => s.ready);
  if (cloudConfigured) {
    if (!ready) return <Splash text="Carregando…" />;
    if (recovery) return <ResetPassword />;
    if (!session) return <PublicRoutes />;
    if (!synced) return <Splash text="Sincronizando seus dados…" />;
  }
  if (!onboarded) return <Onboarding />;
  return <><AppRoutes /><TaskFormHost /></>;
}

export default function App() {
  const theme = useStore((s) => s.settings.theme);
  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  useEffect(() => { void initAuth(); const id = startReminders(); return () => clearInterval(id); }, []);
  return (
    <BrowserRouter>
      <Suspense fallback={<Splash text="Carregando…" />}><Gate /></Suspense>
      <Toasts />
    </BrowserRouter>
  );
}
