import { BookOpen, Briefcase, Church, Clapperboard, Code2, Coffee, Dumbbell, Gamepad2, GraduationCap, Guitar, Heart, Home, Languages, Music, Palette, Plane, Radio, Sprout, Star, User, Wallet, X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { area as areaMeta, PRIORITY_LABEL } from '../domain/areas';
import type { AreaId, Priority } from '../domain/types';

export const ICONS = { code: Code2, languages: Languages, guitar: Guitar, dumbbell: Dumbbell, clapperboard: Clapperboard, radio: Radio, user: User, book: BookOpen, briefcase: Briefcase, heart: Heart, home: Home, wallet: Wallet, graduation: GraduationCap, music: Music, palette: Palette, coffee: Coffee, plane: Plane, sprout: Sprout, gamepad: Gamepad2, church: Church, star: Star };

export function AreaIcon({ id, size = 18, boxed = false }: { id: AreaId; size?: number; boxed?: boolean }) {
  const a = areaMeta(id);
  const I = ICONS[a.icon] ?? Star;
  if (!boxed) return <I size={size} color={a.color} />;
  return <span className="area-ico" style={{ background: a.color + '22' }}><I size={size} color={a.color} /></span>;
}

export function AreaChip({ id }: { id: AreaId }) {
  const a = areaMeta(id);
  return <span className="chip" style={{ borderColor: a.color + '55', color: a.color, background: a.color + '14' }}>{a.short}</span>;
}

export const PriorityTag = ({ p }: { p: Priority }) => <span className={`tag ${p}`}>{PRIORITY_LABEL[p]}</span>;

export function Card({ title, icon, action, children, className = '', style }: { title?: ReactNode; icon?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <section className={`card ${className}`} style={style}>
      {(title || action) && <div className="card-head"><h3 className="card-title">{icon}{title}</h3>{action}</div>}
      {children}
    </section>
  );
}

export function Ring({ pct, size = 76, stroke = 8, children }: { pct: number; size?: number; stroke?: number; children?: ReactNode }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  return (
    <div className="ring-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <defs><linearGradient id="rg" x1="0" x2="1"><stop offset="0" stopColor="#8b7bff" /><stop offset="1" stopColor="#ff8a5c" /></linearGradient></defs>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--panel3)" strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke="url(#rg)" strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (c * Math.min(100, pct)) / 100} style={{ transition: 'stroke-dashoffset .6s cubic-bezier(.2,.8,.2,1)' }} />
      </svg>
      <div className="ring-label">{children ?? <b>{pct}%</b>}</div>
    </div>
  );
}

export function Modal({ title, onClose, children, footer, wide }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} style={wide ? { maxWidth: 820 } : undefined}>
        <div className="modal-head"><h3>{title}</h3><button className="btn ghost sm icon" onClick={onClose} aria-label="Fechar"><X size={18} /></button></div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function Seg<T extends string>({ value, options, onChange }: { value: T; options: { v: T; l: ReactNode }[]; onChange: (v: T) => void }) {
  return <div className="seg" role="tablist">{options.map((o) => <button key={o.v} role="tab" aria-selected={value === o.v} className={value === o.v ? 'on' : ''} onClick={() => onChange(o.v)}>{o.l}</button>)}</div>;
}

export const Field = ({ label, children, full }: { label: string; children: ReactNode; full?: boolean }) =>
  <label className={`field ${full ? 'full' : ''}`}><span>{label}</span>{children}</label>;

export const Bar = ({ pct, color }: { pct: number; color?: string }) =>
  <div className="bar"><i style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: color }} /></div>;

export const Empty = ({ children }: { children: ReactNode }) => <div className="empty">{children}</div>;

export function PageHead({ title, sub, children }: { title: ReactNode; sub?: ReactNode; children?: ReactNode }) {
  return <div className="page-head"><div><h1>{title}</h1>{sub && <p>{sub}</p>}</div>{children && <div className="row wrap">{children}</div>}</div>;
}
