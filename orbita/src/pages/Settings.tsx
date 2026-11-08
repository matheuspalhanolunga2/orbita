import { Bell, Cloud, Download, LogOut, History, Palette, Plus, RotateCcw, Tag, Trash2, Upload, User, CalendarRange } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { AreaIcon, Card, Field, PageHead, Seg } from '../components/ui';
import { toast } from '../components/toast';
import { activeAreas, PERIOD_LABEL, WEEKDAYS, firstArea } from '../domain/areas';
import { isValidTime, todayISO, toMin } from '../domain/dates';
import type { AreaId, Period, RoutineBlock } from '../domain/types';
import { cloudConfigured, deleteAccount, signOut, useAuth } from '../services/supabase';
import { useSync } from '../sync/engine';
import { notifSupported, notify, requestPermission } from '../services/notifications';
import { getData, useStore } from '../store/useStore';
import { AreasManager } from './AreasManager';

export default function Settings() {
  const { settings, setSettings } = useStore();
  useEffect(() => { if (location.hash) setTimeout(() => document.querySelector(location.hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150); }, []);
  return (
    <>
      <PageHead title="Configurações" sub="Personalize o Órbita. Tudo é salvo automaticamente." />
      <div className="grid g2" style={{ alignItems: 'start' }}>
        <div className="col" style={{ gap: 18 }}>
          <Card title="Perfil e aparência" icon={<User size={17} />}>
            <div className="form-grid">
              <Field label="Como quer ser chamado" full><input className="input" value={settings.name} onChange={(e) => setSettings({ name: e.target.value })} placeholder="Seu nome" /></Field>
              <div className="field"><span>Tema</span><Seg value={settings.theme} onChange={(v) => setSettings({ theme: v })} options={[{ v: 'dark', l: 'Escuro' }, { v: 'light', l: 'Claro' }]} /></div>
              <div />
              <Field label="Início do seu dia"><input type="time" className="input" value={settings.dayStart} onChange={(e) => e.target.value && setSettings({ dayStart: e.target.value })} /></Field>
              <Field label="Fim do seu dia"><input type="time" className="input" value={settings.dayEnd} onChange={(e) => e.target.value && setSettings({ dayEnd: e.target.value })} /></Field>
              <p className="full tiny muted" style={{ marginTop: -4 }}>Usado para calcular horários livres e distribuir tarefas. <Palette size={11} style={{ verticalAlign: -1 }} /> Ajuste conforme a sua rotina real.</p>
            </div>
          </Card>
          <NotifCard />
          <TagsCard />
          <DataCard />
          <CloudCard />
        </div>
        <div className="col" style={{ gap: 18 }}>
          <AreasManager />
          <RoutineEditor />
          <ActivityCard />
        </div>
      </div>
    </>
  );
}

function RoutineEditor() {
  const { routine, add, update, remove } = useStore();
  const [day, setDay] = useState<number>(new Date().getDay());
  const blocks = routine.filter((b) => b.weekday === day);
  const untimed = routine.filter((b) => !(isValidTime(b.start) && isValidTime(b.end))).length;
  const order = [1, 2, 3, 4, 5, 6, 0];
  return (
    <Card title="Rotina semanal" icon={<CalendarRange size={17} />} action={<span className="small muted">{routine.length} blocos</span>}>
      <div id="rotina" className="row wrap" style={{ marginBottom: 14 }}>{order.map((d) => <button key={d} className={`chip ${day === d ? 'on' : ''}`} onClick={() => setDay(d)}>{WEEKDAYS[d].slice(0, 3)}<span className="muted">{routine.filter((b) => b.weekday === d).length}</span></button>)}</div>
      {untimed > 0 && <p className="tiny muted" style={{ marginBottom: 12 }}>{untimed} bloco(s) ainda sem início e fim. Preencha quando souber os horários; até lá eles aparecem na agenda como “sem horário”.</p>}
      <div className="col" style={{ gap: 10 }}>
        {blocks.map((b) => <BlockRow key={b.id} b={b} onChange={(p) => update('routine', b.id, p)} onRemove={() => remove('routine', b.id, `Removeu "${b.title}" da rotina`)} />)}
        {!blocks.length && <p className="small muted">Nenhum bloco para {WEEKDAYS[day].toLowerCase()}.</p>}
      </div>
      <button className="btn sm" style={{ marginTop: 12 }} onClick={() => add('routine', { weekday: day, title: 'Novo bloco', area: firstArea(), fixed: false } as Omit<RoutineBlock, 'id'>)}><Plus size={15} />Adicionar bloco</button>
    </Card>
  );
}

function BlockRow({ b, onChange, onRemove }: { b: RoutineBlock; onChange: (p: Partial<RoutineBlock>) => void; onRemove: () => void }) {
  const bad = isValidTime(b.start) && isValidTime(b.end) && toMin(b.end!) <= toMin(b.start!);
  return (
    <div className="mini" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
      <div className="row">
        <AreaIcon id={b.area} />
        <input className="input grow" style={{ height: 36 }} value={b.title} onChange={(e) => onChange({ title: e.target.value })} aria-label="Título do bloco" />
        <button className="del" onClick={onRemove} aria-label="Remover bloco"><Trash2 size={15} /></button>
      </div>
      <div className="row wrap" style={{ gap: 8 }}>
        <select className="select" style={{ height: 34, width: 'auto' }} value={b.area} onChange={(e) => onChange({ area: e.target.value as AreaId })} aria-label="Área">{activeAreas().map((a) => <option key={a.id} value={a.id}>{a.short}</option>)}</select>
        <select className="select" style={{ height: 34, width: 'auto' }} value={b.period ?? ''} onChange={(e) => onChange({ period: (e.target.value || undefined) as Period | undefined })} aria-label="Período">
          <option value="">Período —</option>{Object.entries(PERIOD_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <input type="time" className="input" style={{ height: 34, width: 110 }} value={b.start ?? ''} onChange={(e) => onChange({ start: e.target.value || undefined })} aria-label="Início" />
        <span className="muted">até</span>
        <input type="time" className="input" style={{ height: 34, width: 110, borderColor: bad ? 'var(--alta)' : undefined }} value={b.end ?? ''} onChange={(e) => onChange({ end: e.target.value || undefined })} aria-label="Fim" />
        <label className="row small" style={{ gap: 6 }}><input type="checkbox" checked={b.fixed} onChange={(e) => onChange({ fixed: e.target.checked })} />Fixo</label>
      </div>
      {b.note && <div className="tiny muted">{b.note}</div>}
    </div>
  );
}

function NotifCard() {
  const { settings, setSettings } = useStore();
  const perm = notifSupported ? Notification.permission : 'denied';
  const toggle = async () => {
    if (!settings.notifications) {
      const ok = await requestPermission();
      setSettings({ notifications: true });
      toast(ok ? 'Notificações ativadas' : 'Avisos ativados dentro do app (o navegador bloqueou notificações do sistema)');
    } else setSettings({ notifications: false });
  };
  return (
    <Card title="Notificações e lembretes" icon={<Bell size={17} />}>
      <div className="row between"><span className="small">Lembretes de tarefas com horário</span><button className={`btn sm ${settings.notifications ? 'primary' : ''}`} onClick={toggle}>{settings.notifications ? 'Ativadas' : 'Ativar'}</button></div>
      <p className="tiny muted" style={{ marginTop: 10 }}>Funciona enquanto o app está aberto (ou instalado e em execução). Permissão do navegador: {perm === 'granted' ? 'concedida' : perm === 'denied' ? 'bloqueada' : 'não solicitada'}.</p>
      {settings.notifications && <button className="btn sm ghost" style={{ marginTop: 8 }} onClick={() => notify('Teste', 'Seus lembretes estão funcionando')}>Enviar teste</button>}
    </Card>
  );
}

function TagsCard() {
  const { tags, addTag, removeTag } = useStore();
  const [t, setT] = useState('');
  return (
    <Card title="Etiquetas" icon={<Tag size={17} />}>
      <div className="row wrap">{tags.map((x) => <span key={x} className="chip">#{x}<button onClick={() => removeTag(x)} aria-label={`Remover ${x}`} className="muted"><Trash2 size={12} /></button></span>)}</div>
      <form className="row" style={{ marginTop: 12 }} onSubmit={(e) => { e.preventDefault(); const v = t.trim().toLowerCase(); if (v) { addTag(v); setT(''); } }}>
        <input className="input" value={t} onChange={(e) => setT(e.target.value)} placeholder="Nova etiqueta" /><button className="btn icon" aria-label="Adicionar"><Plus size={17} /></button>
      </form>
    </Card>
  );
}

function download(name: string, content: string, type: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], { type }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

function DataCard() {
  const { importData, resetAll, tasks } = useStore();
  const file = useRef<HTMLInputElement>(null);
  const [armed, setArmed] = useState(false);
  const exportJSON = () => download(`orbita-backup-${todayISO()}.json`, JSON.stringify(getData(), null, 2), 'application/json');
  const exportCSV = () => {
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = [['titulo', 'area', 'subcategoria', 'prioridade', 'data', 'horario', 'duracao_min', 'concluida', 'etiquetas', 'recorrencia'],
      ...tasks.map((t) => [t.title, t.area, t.sub, t.priority, t.date, t.start, t.duration, t.done ? 'sim' : 'não', t.tags.join(' '), t.recurrence ? t.recurrence.type : ''])];
    download(`orbita-tarefas-${todayISO()}.csv`, '﻿' + rows.map((r) => r.map(esc).join(';')).join('\n'), 'text/csv');
  };
  const onFile = async (f?: File) => {
    if (!f) return;
    try { importData(JSON.parse(await f.text())); toast('Backup importado'); } catch (e) { toast(`Não foi possível importar: ${(e as Error).message}`); }
    if (file.current) file.current.value = '';
  };
  return (
    <Card title="Dados" icon={<Download size={17} />}>
      <p className="small muted" style={{ marginBottom: 12 }}>{cloudConfigured ? 'Tudo é salvo automaticamente na sua conta.' : 'Salvamento automático ativo neste navegador. Faça backups de vez em quando.'}</p>
      <div className="row wrap">
        <button className="btn sm" onClick={exportJSON}><Download size={15} />Backup (JSON)</button>
        <button className="btn sm" onClick={exportCSV}><Download size={15} />Tarefas (CSV)</button>
        <button className="btn sm" onClick={() => file.current?.click()}><Upload size={15} />Importar backup</button>
        <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => onFile(e.target.files?.[0])} />
        <button className="btn sm danger ghost" onClick={() => { if (!armed) { setArmed(true); setTimeout(() => setArmed(false), 4000); return; } resetAll(); setArmed(false); toast('Dados apagados'); }}><RotateCcw size={15} />{armed ? 'Clique de novo para confirmar' : 'Apagar todos os dados'}</button>
      </div>
    </Card>
  );
}

function CloudCard() {
  const { session } = useAuth();
  const { status, lastSync, pending, error } = useSync();
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  if (!cloudConfigured) return (
    <Card title="Conta e sincronização" icon={<Cloud size={17} />}>
      <p className="small muted">Modo local: seus dados ficam só neste navegador. Para contas com login e sincronização, configure o Supabase (veja docs/DEPLOY.md).</p>
    </Card>
  );
  const label = status === 'syncing' ? 'Sincronizando…' : status === 'offline' ? `Sem internet — ${pending} alteração(ões) aguardando` : status === 'error' ? `Erro ao sincronizar: ${error}` : pending ? `${pending} alteração(ões) aguardando` : lastSync ? `Tudo salvo na nuvem · ${new Date(lastSync).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : 'Pronto';
  return (
    <Card title="Conta" icon={<Cloud size={17} />}>
      <p className="small">Conectado como <b>{session?.user.email}</b>{session?.user.app_metadata?.provider === 'google' ? ' (Google)' : ''}</p>
      <p className="small muted" style={{ marginTop: 4 }}>{label}</p>
      <div className="row wrap" style={{ marginTop: 12 }}>
        <button className="btn sm" onClick={() => signOut()}><LogOut size={15} />Sair</button>
        <a className="btn sm ghost" href="/privacidade">Privacidade</a>
      </div>
      <div className="divider" />
      <details>
        <summary className="small bold" style={{ cursor: 'pointer', color: 'var(--alta)' }}>Excluir conta</summary>
        <p className="small muted" style={{ margin: '10px 0' }}>Apaga sua conta e <b>todos</b> os seus dados de forma permanente. Faça um backup antes, se quiser. Para confirmar, digite <b>EXCLUIR</b>.</p>
        <div className="row">
          <input className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="EXCLUIR" aria-label="Confirmação" />
          <button className="btn danger" disabled={confirm !== 'EXCLUIR' || busy} onClick={async () => { setBusy(true); try { await deleteAccount(); toast('Conta excluída'); } catch (e) { toast((e as Error).message); setBusy(false); } }}><Trash2 size={15} />Excluir</button>
        </div>
      </details>
    </Card>
  );
}

function ActivityCard() {
  const { activity } = useStore();
  return (
    <Card title="Histórico de atividades" icon={<History size={17} />}>
      {activity.length ? <div className="col" style={{ gap: 8, maxHeight: 460, overflow: 'auto' }}>{activity.slice(0, 100).map((a) => (
        <div key={a.id} className="row small" style={{ gap: 10, alignItems: 'flex-start' }}>
          <span className="muted" style={{ width: 92, flex: 'none' }}>{a.at.slice(8, 10)}/{a.at.slice(5, 7)} {a.at.slice(11, 16)}</span>
          {a.area && <AreaIcon id={a.area} size={14} />}<span className="grow">{a.text}</span>
        </div>))}</div> : <p className="small muted">Suas ações aparecerão aqui.</p>}
    </Card>
  );
}
