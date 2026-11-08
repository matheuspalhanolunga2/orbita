import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { SITE } from '../config/site';
import { Logo } from '../layout/AppShell';
import { LegalFooter } from './Landing';

const owner = SITE.owner || '[responsável — preencher em src/config/site.ts]';
const email = SITE.contactEmail || '[e-mail de contato — preencher em src/config/site.ts]';
const date = SITE.legalUpdatedAt.split('-').reverse().join('/');

function Doc({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <header className="row between" style={{ maxWidth: 820, margin: '0 auto', padding: '20px 22px' }}>
        <Link to="/" className="brand" style={{ padding: 0 }}><Logo />{SITE.name}</Link>
        <Link to="/" className="btn ghost sm"><ArrowLeft size={15} />Voltar</Link>
      </header>
      <article className="card legal" style={{ maxWidth: 820, margin: '0 auto 40px', padding: 'clamp(20px, 4vw, 40px)', lineHeight: 1.65 }}>
        <h1 style={{ fontSize: 30, letterSpacing: '-.02em' }}>{title}</h1>
        <p className="small muted" style={{ marginBottom: 18 }}>Última atualização: {date}</p>
        {children}
      </article>
      <LegalFooter />
    </div>
  );
}

const H = ({ children }: { children: ReactNode }) => <h2 style={{ fontSize: 18, marginTop: 26, marginBottom: 8 }}>{children}</h2>;
const P = ({ children }: { children: ReactNode }) => <p style={{ color: 'var(--text2)', marginBottom: 10 }}>{children}</p>;
const UL = ({ items }: { items: ReactNode[] }) => <ul style={{ color: 'var(--text2)', margin: '0 0 10px 20px', display: 'grid', gap: 6 }}>{items.map((x, i) => <li key={i}>{x}</li>)}</ul>;

export function Privacy() {
  return (
    <Doc title="Política de privacidade">
      <P>Esta política explica como o {SITE.name} trata seus dados pessoais, em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD).</P>
      <H>1. Quem é o responsável</H>
      <P>O controlador dos dados é {owner}. Para qualquer assunto sobre privacidade, fale com a gente em <b>{email}</b>.</P>
      <H>2. Quais dados coletamos</H>
      <UL items={[
        <><b>Dados de cadastro:</b> nome e e-mail. Se você entrar com o Google, recebemos do Google seu nome e e-mail.</>,
        <><b>Conteúdo que você cria:</b> tarefas, rotina, áreas, metas, registros de prática, ideias de conteúdo, lives e configurações.</>,
        <><b>Dados técnicos:</b> informações de sessão necessárias para manter você conectado, guardadas no armazenamento local do navegador.</>,
      ]} />
      <P>Não usamos cookies de publicidade, não vendemos dados e não exibimos anúncios.</P>
      <H>3. Para que usamos</H>
      <UL items={['Criar e manter sua conta e permitir o login.', 'Guardar e sincronizar seu conteúdo entre seus aparelhos.', 'Enviar e-mails essenciais, como confirmação de cadastro e recuperação de senha.']} />
      <P>A base legal é a execução do serviço que você solicitou ao criar a conta (art. 7º, V, da LGPD).</P>
      <H>4. Com quem compartilhamos</H>
      <P>Usamos fornecedores que processam dados apenas para operar o serviço:</P>
      <UL items={[<><b>Supabase</b> — autenticação e banco de dados.</>, <><b>Vercel</b> — hospedagem do site.</>, <><b>Google</b> — somente se você escolher entrar com o Google.</>]} />
      <P>Esses fornecedores podem armazenar dados em servidores fora do Brasil, com garantias contratuais de proteção.</P>
      <H>5. Segurança</H>
      <P>A conexão é criptografada (HTTPS) e o banco de dados aplica regras que permitem a cada conta acessar somente os próprios dados. Senhas não são armazenadas em texto puro.</P>
      <H>6. Por quanto tempo guardamos</H>
      <P>Enquanto sua conta existir. Ao excluir a conta, seus dados são apagados do banco de dados.</P>
      <H>7. Seus direitos</H>
      <P>Você pode, a qualquer momento:</P>
      <UL items={[
        <><b>Acessar e exportar</b> seus dados em Configurações → Dados → Backup (JSON).</>,
        <><b>Corrigir</b> qualquer informação diretamente no app.</>,
        <><b>Excluir sua conta e todos os dados</b> em Configurações → Conta → Excluir conta.</>,
        <>Pedir informações sobre o tratamento ou exercer outros direitos do art. 18 da LGPD pelo e-mail {email}.</>,
      ]} />
      <H>8. Alterações</H>
      <P>Se esta política mudar, a data no topo será atualizada. Mudanças relevantes serão avisadas no app.</P>
    </Doc>
  );
}

export function Terms() {
  return (
    <Doc title="Termos de uso">
      <H>1. O serviço</H>
      <P>O {SITE.name} é um aplicativo gratuito de organização pessoal: tarefas, agenda, áreas, metas e registros. Ele é oferecido por {owner}, “como está”, e pode mudar ou ser descontinuado. Avisaremos com antecedência e você poderá exportar seus dados.</P>
      <H>2. Sua conta</H>
      <UL items={['Você é responsável por manter sua senha em segurança.', 'Use informações verdadeiras no cadastro.', 'Uma conta é pessoal e intransferível.']} />
      <H>3. Uso permitido</H>
      <P>Não é permitido usar o serviço para atividades ilegais, tentar acessar dados de outras pessoas, sobrecarregar ou atacar a infraestrutura, nem armazenar conteúdo que viole direitos de terceiros.</P>
      <H>4. Seu conteúdo</H>
      <P>Tudo o que você cria continua sendo seu. Usamos esse conteúdo apenas para fazer o app funcionar para você. Faça backups periodicamente: o serviço é gratuito e não garante disponibilidade ininterrupta.</P>
      <H>5. Assistente</H>
      <P>As sugestões do “Meu Assistente” são calculadas por regras a partir dos seus dados e servem como apoio. As decisões sobre sua rotina são suas.</P>
      <H>6. Encerramento</H>
      <P>Você pode excluir sua conta quando quiser. Contas usadas em violação destes termos podem ser suspensas.</P>
      <H>7. Privacidade</H>
      <P>O tratamento de dados pessoais segue a <Link to="/privacidade" className="grad-text bold">Política de privacidade</Link>.</P>
      <H>8. Contato</H>
      <P>Dúvidas: {email}. Estes termos são regidos pelas leis brasileiras.</P>
    </Doc>
  );
}
