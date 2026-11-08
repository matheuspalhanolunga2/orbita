# Sugestão de publicação no LinkedIn

> Ajuste o tom e os detalhes antes de publicar. Inclua o link do repositório e, se fizer deploy, o link do app. Anexe 2 ou 3 capturas de `docs/screenshots/` (painel, agenda e uma do celular funcionam bem).

---

Comecei com um app de tarefas em um único arquivo HTML. Hoje ele virou o **Órbita**: um app gratuito onde qualquer pessoa cria a própria conta e organiza tarefas, agenda, estudos e metas. É o que eu uso para faculdade, programação, inglês, guitarra, academia, conteúdo e lives. 🪐

👉 Teste grátis: <link do site>

O que ele faz:
📊 Painel que mostra o que importa agora: próximo compromisso, atrasadas, progresso do dia e metas
🗓️ Agenda com visões dia, semana e mês, arrastar e soltar (inclusive no celular) e cálculo de horários livres
🎯 Metas com progresso calculado a partir dos meus registros reais e indicador de ritmo
🎬 Kanban de conteúdo (ideia → roteiro → gravação → edição → publicado)
🤖 Um assistente baseado em regras que identifica sobrecarga e distribui tarefas nos horários livres, com a arquitetura pronta para plugar uma IA no servidor
🔐 Contas com e-mail ou Google, recuperação de senha e dados isolados por usuário (Row Level Security)
🔄 Sincronização entre celular e computador, funcionando offline
📱 PWA instalável e modo claro/escuro

Stack: React 19, TypeScript, Vite, Zustand, Supabase (Auth + Postgres com RLS), Recharts, dnd-kit e Vitest. Hospedado na Vercel.

O que mais aprendi:
• Separar as regras de negócio em funções puras deixou tudo testável e fácil de evoluir
• Não inventar dados: blocos da rotina sem horário definido ficam explícitos, em vez de virarem números chutados
• Evoluir sem jogar fora: o protótipo original continua no repositório e as tarefas dele são migradas automaticamente

Usei ferramentas de IA (Claude) como assistente no planejamento, no código e na documentação. As decisões de produto, a revisão e os testes de uso foram meus.

Código no GitHub: <link>

#react #typescript #frontend #webdev #produtividade #portfolio
