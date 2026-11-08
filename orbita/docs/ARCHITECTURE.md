# Arquitetura do Órbita

## Visão geral

```
┌────────────── UI (React) ──────────────┐
│ pages/  layout/  components/           │  só apresentação e interação
└───────────────┬────────────────────────┘
                │ hooks (useStore, useNow)
┌───────────────▼────────────────────────┐
│ store/ (Zustand + persist)             │  estado, ações, histórico, migração
└───────┬─────────────────────┬──────────┘
        │                     │ assina mudanças
┌───────▼────────┐   ┌────────▼──────────────────┐
│ domain/        │   │ services/                 │
│ regras puras   │   │ supabase · notifications  │
│ (testadas)     │   │ ai (interface)            │
└────────────────┘   └───────────────────────────┘
```

**Princípio:** toda regra de negócio fica em `src/domain` como função pura (dados entram, resultado sai, sem React nem `localStorage`). É o que torna os testes simples e permite reaproveitar a lógica num backend no futuro.

## Modelo de dados (`src/domain/types.ts`)

| Entidade | Papel |
|---|---|
| `Task` | Tarefa única ou recorrente (`recurrence` + `doneDates` por data). Data, horário, duração, lembrete, área, subcategoria, prioridade, etiquetas, ordem manual |
| `RoutineBlock` | Bloco da rotina semanal: dia da semana, área, `fixed`, `period` e `start`/`end` opcionais |
| `LogEntry` | Registro de prática ou treino (área, data, minutos, tipo) |
| `VocabItem`, `Chord`, `Song`, `Skill` | Módulos de inglês e guitarra |
| `ContentItem` | Item do pipeline de conteúdo (etapa, plataformas, roteiro, `publishedAt`) |
| `Live` | Live planejada ou realizada (início, duração, meta, resultado) |
| `Goal` | Meta com `kind` que define a fonte do progresso |
| `Activity` | Histórico de ações (últimas 300) |
| `Settings` | Nome, tema, janela do dia, notificações, meta semanal de treino |

### Decisões importantes

- **Horários desconhecidos não são inventados.** Um `RoutineBlock` pode ter só período (“manhã”), só início (“10:35”), só fim (“até 12:00”) ou nada. Só blocos com início e fim entram no cálculo de tempo livre. Os outros aparecem na agenda como “sem horário” e o assistente pede para completá-los.
- **Atraso é derivado, não armazenado.** Tarefa única com data passada e não concluída é atrasada (`isOverdue`). Ela continua pendente até ser concluída ou reagendada.
- **Recorrência por modelo.** Uma tarefa recorrente é um modelo; cada ocorrência é concluída por data (`doneDates`). Arrastar uma recorrente na agenda muda o horário de todas as repetições.
- **Metas medem dados reais.** O progresso vem dos registros (`goalEvents`) a partir da criação da meta. Só o tipo `manual` aceita valor digitado.
- **Datas locais.** Datas são `YYYY-MM-DD` e carimbos são `YYYY-MM-DDTHH:mm` no fuso local, para evitar o deslocamento do UTC perto da meia-noite.

## Persistência

- `zustand/persist` salva o estado em `localStorage` (chave `orbita-data`) a cada alteração: é o **salvamento automático**.
- `store/migrate.ts` valida e normaliza qualquer entrada (backup importado, dados antigos) e converte o formato do protótipo (`tarefas-v1`).
- Exportação: backup JSON completo e CSV de tarefas (com BOM, separador `;`, abre direto no Excel em pt-BR).

## Contas e nuvem: Supabase

Ativada quando `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` existem. Sem elas, o app roda em modo local, sem login.

**Autenticação** (`services/supabase.ts`): e-mail/senha, Google (OAuth com PKCE), recuperação de senha (`resetPasswordForEmail` → rota `/redefinir-senha` → evento `PASSWORD_RECOVERY` → `updateUser`). As mensagens de erro do Supabase são traduzidas para português. O SDK é carregado sob demanda.

**Fluxo da interface** (`App.tsx`): sem sessão → rotas públicas (landing, entrar, cadastro, esqueci a senha, privacidade, termos). Com sessão → espera a primeira sincronização → onboarding (se a conta é nova) → app.

**Banco** (`supabase/schema.sql`): uma tabela `items (user_id, collection, id, data jsonb, deleted, updated_at)`, uma linha por entidade.
- RLS: `auth.uid() = user_id` em todas as operações; `anon` sem acesso.
- `updated_at` vem do relógio do servidor (trigger com `clock_timestamp()`). Exclusões viram *tombstones* (`deleted = true`, `data = null`).
- `delete_my_account()` (`security definer`) apaga o usuário de `auth.users`; os itens caem em cascata.
- Limites: coleção validada por `check` e tamanho máximo por item.

**Sincronização** (`sync/`):
- `diff.ts` (puro): compara o estado anterior e o novo por referência (o Zustand atualiza de forma imutável) e gera mudanças por item. Tema e notificações ficam só no aparelho.
- `engine.ts`: as mudanças entram numa **fila persistida** (`orbita-outbox`) e são enviadas 0,8 s depois. O recebimento é incremental pelo cursor `updated_at`, com janela de sobreposição de 30 s (reaplicar uma linha não tem efeito colateral; perder uma, sim). Roda ao iniciar, ao focar a aba, ao voltar a conexão e a cada 30 s.
- Conflitos: itens com edição local pendente não são sobrescritos pelo servidor; entre aparelhos, vale a última gravação no servidor, por item.
- Troca de usuário ou logout limpa os dados locais (`orbita-owner`).

**Privacidade do código público:** `src/seed/personal.local.ts` é ignorado pelo Git e nunca entra num build com Supabase configurado.

## Assistente e IA

O assistente atual (`domain/assistant.ts`) é um **motor de regras**:

| Função | O que faz |
|---|---|
| `insights` | Diagnóstico: atrasadas, sobrecarga (minutos planejados × livres), horários livres, blocos sem horário, metas abaixo do ritmo, treinos da semana |
| `planDay` | Encaixe guloso das tarefas sem horário e das atrasadas nos horários livres, por prioridade, com 5 min de intervalo |
| `studyPlan` | Distribui sessões de estudo por área nas próximas semanas, respeitando sessões por semana e no máximo uma por área por dia |
| `assistantContext` | Resumo compacto que pode ser enviado a uma IA |

`services/ai.ts` define a interface `AIProvider` e um provedor genérico que faz `POST` em `VITE_AI_ENDPOINT` com `{ task, question?, context }` e espera `{ answer }`. **Nenhuma IA está conectada.** Para conectar:

1. Criar um endpoint no servidor (por exemplo, uma Supabase Edge Function) que guarde a chave do provedor de IA. A chave nunca vai no frontend.
2. Validar o JWT do usuário (o app envia o `Authorization: Bearer` da sessão Supabase).
3. Definir `VITE_AI_ENDPOINT`.

A tela do assistente mostra exatamente o contexto que seria enviado.

## Notificações

`services/notifications.ts` verifica a cada 30 s as tarefas com horário e lembrete e dispara uma `Notification` do navegador (com toast interno de reserva). Sem servidor de push, os lembretes só disparam com o app aberto ou instalado em execução. Isso aparece documentado na própria tela de configurações.

## UI e responsividade

- Design system em `styles/global.css` com tokens CSS (`--panel`, `--accent`, `--grad`…) e dois temas (`[data-theme]`).
- No desktop: barra lateral fixa e topo com busca. Até 900 px: barra inferior com botão central, modais viram folhas que sobem de baixo, a agenda abre na visão “Dia” e o kanban rola com snap.
- Arrastar e soltar com `@dnd-kit/core`, com sensores de ponteiro e toque (toque longo de 180–200 ms, para não brigar com a rolagem).
- Rotas carregadas com `React.lazy` e respeito a `prefers-reduced-motion`.

## Testes

`src/domain/domain.test.ts` (Vitest) cobre as regras críticas. Como o domínio é puro, os testes rodam em milissegundos sem DOM.

## Segurança e privacidade

- Nenhum segredo no código; `.env` ignorado e `.env.example` documentado.
- Dados pessoais da rotina ficam em `src/seed/personal.local.ts`, ignorado pelo Git.
- Imports validados por `migrate()` antes de entrar no estado.
- Conteúdo do usuário é renderizado como texto pelo React (sem `dangerouslySetInnerHTML`).
