import { Archive, ArchiveRestore, ChevronDown, ChevronUp, LayoutGrid, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Card, ICONS, Modal } from '../components/ui';
import { toast } from '../components/toast';
import { AREA_COLORS, allAreas, MODULES } from '../domain/areas';
import type { Area, AreaIconName, AreaModule } from '../domain/types';
import { useStore } from '../store/useStore';

/** Create, edit, reorder, archive and delete the user's areas. */
export function AreasManager() {
  const { add, update } = useStore();
  useStore((s) => s.areas);
  const list = allAreas();
  const [del, setDel] = useState<Area | null>(null);
  const addArea = () => {
    add('areas', { label: 'Nova área', color: AREA_COLORS[list.length % AREA_COLORS.length], icon: 'star', subs: [], modules: [], order: list.length }, 'Criou uma área');
  };
  const move = (a: Area, dir: -1 | 1) => {
    const j = list.findIndex((x) => x.id === a.id) + dir;
    if (j < 0 || j >= list.length) return;
    update('areas', a.id, { order: list[j].order });
    update('areas', list[j].id, { order: a.order });
  };
  return (
    <Card title="Áreas" icon={<LayoutGrid size={17} />} action={<button className="btn sm" onClick={addArea}><Plus size={15} />Nova área</button>}>
      <div id="areas" className="col" style={{ gap: 10 }}>
        {list.map((a, i) => <AreaRow key={a.id} a={a} first={i === 0} last={i === list.length - 1} onMove={(d) => move(a, d)} onDelete={() => setDel(a)} />)}
      </div>
      {del && <DeleteArea a={del} onClose={() => setDel(null)} />}
    </Card>
  );
}

function AreaRow({ a, first, last, onMove, onDelete }: { a: Area; first: boolean; last: boolean; onMove: (d: -1 | 1) => void; onDelete: () => void }) {
  const { update } = useStore();
  const [open, setOpen] = useState(false);
  const [subs, setSubs] = useState(a.subs.join(', '));
  const I = ICONS[a.icon] ?? ICONS.star;
  const set = (p: Partial<Area>) => update('areas', a.id, p);
  return (
    <div className="mini" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10, opacity: a.archived ? 0.55 : 1 }}>
      <div className="row">
        <button className="area-ico" style={{ background: a.color + '22' }} onClick={() => setOpen((x) => !x)} aria-label="Editar ícone e cor"><I size={18} color={a.color} /></button>
        <input className="input grow" style={{ height: 36 }} value={a.label} maxLength={40} onChange={(e) => set({ label: e.target.value })} aria-label="Nome da área" />
        <button className="btn ghost sm icon" disabled={first} onClick={() => onMove(-1)} aria-label="Subir"><ChevronUp size={16} /></button>
        <button className="btn ghost sm icon" disabled={last} onClick={() => onMove(1)} aria-label="Descer"><ChevronDown size={16} /></button>
        <button className="btn ghost sm icon" onClick={() => setOpen((x) => !x)} aria-label="Mais opções">{open ? '−' : '+'}</button>
      </div>
      {open && (
        <div className="col" style={{ gap: 12 }}>
          <div className="row wrap" style={{ gap: 6 }}>{AREA_COLORS.map((c) => <button key={c} onClick={() => set({ color: c })} aria-label={`Cor ${c}`} style={{ width: 26, height: 26, borderRadius: 8, background: c, outline: a.color === c ? '2px solid var(--text)' : 'none', outlineOffset: 2 }} />)}</div>
          <div className="row wrap" style={{ gap: 4 }}>{(Object.keys(ICONS) as AreaIconName[]).map((k) => { const Ic = ICONS[k]; return <button key={k} className={`btn sm icon ${a.icon === k ? 'primary' : 'ghost'}`} onClick={() => set({ icon: k })} aria-label={`Ícone ${k}`}><Ic size={16} /></button>; })}</div>
          <label className="field"><span>Subcategorias (separadas por vírgula)</span>
            <input className="input" value={subs} onChange={(e) => setSubs(e.target.value)} onBlur={() => set({ subs: subs.split(',').map((x) => x.trim()).filter(Boolean) })} placeholder="Ex.: Provas, Trabalhos, Leituras" /></label>
          <div className="field"><span>Ferramentas da área</span>
            <div className="row wrap">{(Object.keys(MODULES) as AreaModule[]).map((m) => (
              <button key={m} title={MODULES[m].help} className={`chip ${a.modules.includes(m) ? 'on' : ''}`} onClick={() => set({ modules: a.modules.includes(m) ? a.modules.filter((x) => x !== m) : [...a.modules, m] })}>{MODULES[m].label}</button>
            ))}</div>
          </div>
          <div className="row">
            <button className="btn sm" onClick={() => set({ archived: !a.archived })}>{a.archived ? <><ArchiveRestore size={15} />Reativar</> : <><Archive size={15} />Arquivar</>}</button>
            <button className="btn sm ghost danger" onClick={onDelete}><Trash2 size={15} />Excluir</button>
          </div>
        </div>
      )}
    </div>
  );
}

function DeleteArea({ a, onClose }: { a: Area; onClose: () => void }) {
  const { removeArea, tasks } = useStore();
  const others = allAreas().filter((x) => x.id !== a.id);
  const [to, setTo] = useState(others[0]?.id ?? '');
  const n = tasks.filter((t) => t.area === a.id).length;
  if (!others.length) return <Modal title="Excluir área" onClose={onClose}><p>Você precisa ter pelo menos uma área.</p></Modal>;
  return (
    <Modal title={`Excluir "${a.label}"`} onClose={onClose} footer={<><button className="btn ghost" onClick={onClose}>Cancelar</button><button className="btn danger" onClick={() => { removeArea(a.id, to); toast('Área excluída'); onClose(); }}>Excluir área</button></>}>
      <p className="small">{n} tarefa(s), registros, metas e blocos da rotina desta área serão movidos para:</p>
      <select className="select" style={{ marginTop: 10 }} value={to} onChange={(e) => setTo(e.target.value)}>{others.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select>
      <p className="tiny muted" style={{ marginTop: 10 }}>Se só quiser esconder a área, use “Arquivar”.</p>
    </Modal>
  );
}

