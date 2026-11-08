import { ArrowRight, Bot, CalendarDays, CheckCircle2, Cloud, LayoutGrid, Lock, Smartphone, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Logo } from '../layout/AppShell';

const FEATURES = [
  { i: CheckCircle2, t: 'Tarefas que fazem sentido', d: 'Prioridades, etiquetas, recorrência, lembretes e o que está atrasado sempre à vista.' },
  { i: CalendarDays, t: 'Agenda inteligente', d: 'Dia, semana e mês. Arraste tarefas entre horários e veja seu tempo livre.' },
  { i: LayoutGrid, t: 'Suas áreas da vida', d: 'Estudos, trabalho, treino, idiomas, música, conteúdo… do seu jeito.' },
  { i: Target, t: 'Metas com progresso real', d: 'O progresso vem do que você registra, com gráfico e ritmo necessário.' },
  { i: Bot, t: 'Assistente de rotina', d: 'Encontra sobrecarga, horários livres e monta um plano de estudos.' },
  { i: Smartphone, t: 'No celular e no computador', d: 'Instale como app e continue de onde parou em qualquer aparelho.' },
];

export default function Landing() {
  return (
    <div style={{ minHeight: '100vh' }}>
      <header className="row between" style={{ maxWidth: 1180, margin: '0 auto', padding: '20px 22px' }}>
        <div className="brand" style={{ padding: 0 }}><Logo />Órbita</div>
        <div className="row"><Link to="/entrar" className="btn ghost">Entrar</Link><Link to="/cadastro" className="btn primary">Criar conta</Link></div>
      </header>

      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '40px 22px 20px', textAlign: 'center' }}>
        <span className="chip" style={{ marginBottom: 18 }}>100% gratuito · em português</span>
        <h1 style={{ font: '800 clamp(36px, 6vw, 64px)/1.05 Montserrat', letterSpacing: '-.03em' }}>Sua rotina inteira<br /><span className="grad-text">em órbita.</span></h1>
        <p className="muted" style={{ fontSize: 18, maxWidth: 620, margin: '18px auto 0', lineHeight: 1.55 }}>Organize tarefas, agenda, estudos e metas em um só lugar. Veja o que importa agora, o que está atrasado e quanto tempo livre ainda sobra no seu dia.</p>
        <div className="row" style={{ justifyContent: 'center', marginTop: 28, flexWrap: 'wrap' }}>
          <Link to="/cadastro" className="btn primary" style={{ height: 50, padding: '0 26px', fontSize: 16 }}>Começar grátis <ArrowRight size={18} /></Link>
          <Link to="/entrar" className="btn" style={{ height: 50, padding: '0 22px', fontSize: 16 }}>Já tenho conta</Link>
        </div>
        <div style={{ position: 'relative', marginTop: 48 }}>
          <img src="/preview-desktop.png" alt="Painel do Órbita com progresso do dia, tarefas e gráfico de produtividade" className="hide-m" style={{ width: '100%', borderRadius: 22, border: '1px solid var(--line2)', boxShadow: '0 40px 120px -40px #8b7bff88' }} />
          <img src="/preview-mobile.png" alt="Órbita no celular" className="show-m" style={{ width: '78%', borderRadius: 30, border: '1px solid var(--line2)', boxShadow: '0 30px 80px -30px #8b7bff88' }} />
        </div>
      </section>

      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '40px 22px' }}>
        <div className="grid g3">
          {FEATURES.map(({ i: I, t, d }) => (
            <div key={t} className="card">
              <span className="area-ico" style={{ background: '#8b7bff22' }}><I size={19} color="var(--accent)" /></span>
              <h3 style={{ marginTop: 14, fontSize: 17 }}>{t}</h3>
              <p className="small muted" style={{ marginTop: 6, lineHeight: 1.5 }}>{d}</p>
            </div>
          ))}
        </div>
        <div className="card row wrap" style={{ marginTop: 18, gap: 18, justifyContent: 'space-between' }}>
          <div className="row" style={{ gap: 14 }}><Lock size={22} color="var(--ok)" /><div><b>Seus dados são só seus</b><div className="small muted">Cada conta enxerga apenas os próprios dados. Você pode exportar ou excluir tudo quando quiser.</div></div></div>
          <div className="row" style={{ gap: 14 }}><Cloud size={22} color="var(--baixa)" /><div><b>Sincronizado e offline</b><div className="small muted">Funciona sem internet e sincroniza quando a conexão volta.</div></div></div>
        </div>
      </section>

      <section style={{ textAlign: 'center', padding: '30px 22px 60px' }}>
        <h2 style={{ fontSize: 30, letterSpacing: '-.02em' }}>Pronto para organizar sua semana?</h2>
        <Link to="/cadastro" className="btn primary" style={{ height: 50, padding: '0 26px', fontSize: 16, marginTop: 18 }}>Criar minha conta grátis <ArrowRight size={18} /></Link>
      </section>

      <LegalFooter />
    </div>
  );
}

export function LegalFooter() {
  return (
    <footer className="row wrap small muted" style={{ justifyContent: 'center', gap: 18, padding: '22px', borderTop: '1px solid var(--line)' }}>
      <span>© {new Date().getFullYear()} Órbita</span>
      <Link to="/privacidade">Política de privacidade</Link>
      <Link to="/termos">Termos de uso</Link>
    </footer>
  );
}
