# Publicar o Órbita para todo mundo (grátis)

Guia passo a passo para colocar o site no ar com contas de usuário. Leva uns 30–40 minutos na primeira vez.

```
Visitante ──► Vercel (site)  ──►  Supabase (login + banco de dados)
                                     └─► Google (botão "Continuar com o Google")
```

Você vai precisar de contas gratuitas no **GitHub**, na **Vercel**, no **Supabase** e no **Google Cloud**. Nenhuma pede cartão para o que usamos aqui.

---

## 1. Subir o código para o GitHub

No terminal do VS Code, dentro da pasta `orbita`:

```bash
git init
git add .
git status        # confira: src/seed/personal.local.ts e .env NÃO podem aparecer
git commit -m "Órbita: app de produtividade"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/orbita.git
git push -u origin main
```

## 2. Criar o banco de dados (Supabase)

1. Acesse **supabase.com → Start your project → New project**.
   - Nome: `orbita` · Região: **South America (São Paulo)** · crie uma senha forte para o banco e guarde-a.
2. Quando o projeto terminar de criar, abra **SQL Editor → New query**, cole todo o conteúdo de [`supabase/schema.sql`](../supabase/schema.sql) e clique em **Run**. Deve aparecer “Success”.
3. Vá em **Project Settings → API** e copie:
   - **Project URL** → vai virar `VITE_SUPABASE_URL`
   - **anon public key** → vai virar `VITE_SUPABASE_ANON_KEY`
   > A chave *anon* é pública por design: quem protege os dados são as regras de segurança (RLS) criadas pelo `schema.sql`. **Nunca** use a chave `service_role` no site.

## 3. Publicar o site (Vercel)

1. **vercel.com → Sign up com GitHub → Add New → Project →** escolha o repositório `orbita` → **Import**.
2. Abra **Environment Variables** e adicione as duas variáveis do passo 2.3.
3. Clique em **Deploy**. Você ganha um endereço como `https://orbita-xxxx.vercel.app`. Anote-o.

## 4. Dizer ao Supabase qual é o endereço do site

Em **Supabase → Authentication → URL Configuration**:

- **Site URL:** `https://orbita-xxxx.vercel.app`
- **Redirect URLs** (clique em *Add URL* para cada um):
  - `https://orbita-xxxx.vercel.app/**`
  - `http://localhost:5173/**` (para testar no seu computador)

Sem isso, os links de confirmação de e-mail e de “esqueci minha senha” não funcionam.

## 5. Login com Google

**No Google Cloud** (console.cloud.google.com):
1. Crie um projeto chamado `Órbita`.
2. **APIs e serviços → Tela de consentimento OAuth (Google Auth Platform)**: tipo **Externo**, nome do app `Órbita`, seu e-mail de suporte. Em *Domínios autorizados* adicione `supabase.co` (e o seu domínio, se tiver). Publique o app (*Publish app*) para qualquer pessoa conseguir entrar.
3. **Credenciais → Criar credenciais → ID do cliente OAuth → Aplicativo da Web**:
   - *Origens JavaScript autorizadas:* `https://orbita-xxxx.vercel.app`
   - *URIs de redirecionamento autorizados:* `https://SEU-PROJETO.supabase.co/auth/v1/callback`
     (o endereço exato aparece no Supabase em **Authentication → Providers → Google → Callback URL**)
4. Copie o **Client ID** e o **Client Secret**.

**No Supabase:** **Authentication → Providers (Sign In / Providers) → Google** → ative, cole o Client ID e o Client Secret → **Save**.

## 6. E-mails de confirmação e recuperação de senha

O envio de e-mails padrão do Supabase é só para testes: tem limite baixo por hora e não serve para um site aberto ao público. Configure um provedor de e-mail:

1. Crie uma conta gratuita num serviço de e-mail transacional (por exemplo, **Resend** ou **Brevo**) e gere as credenciais SMTP.
2. No Supabase: **Authentication → Emails → SMTP Settings → Enable custom SMTP** e preencha host, porta, usuário, senha e o remetente (ex.: `nao-responda@seudominio.com.br`).
3. (Opcional) Em **Authentication → Emails → Templates**, traduza os textos para português.

> Enquanto isso não estiver configurado, o login com Google funciona normalmente. O cadastro por e-mail funciona, mas com limite baixo de envios.

**Segurança recomendada** (Authentication → Providers/Policies): mantenha **Confirm email** ligado e, se disponível no seu plano, ative a proteção contra senhas vazadas.

## 7. Preencher seus dados nas páginas legais

Edite [`src/config/site.ts`](../src/config/site.ts):

```ts
owner: 'Seu nome completo',
contactEmail: 'contato@seudominio.com.br',
```

Faça `git add . && git commit -m "dados de contato" && git push`. A Vercel publica sozinha em ~1 minuto.

## 8. Testar

1. Abra o site numa janela anônima → **Criar conta** com um e-mail seu → confirme pelo e-mail → faça o onboarding.
2. Crie uma tarefa. Entre com a mesma conta no celular: ela tem que aparecer.
3. Teste **Continuar com o Google** e **Esqueci minha senha**.

## 9. Domínio próprio (opcional)

1. Registre o domínio (um `.com.br` custa cerca de R$ 40/ano no registro.br).
2. Na Vercel: **Project → Settings → Domains → Add** e siga as instruções de DNS.
3. Atualize o domínio novo nos passos 4 (Supabase) e 5 (Google).

---

## Limites dos planos gratuitos (o que observar)

- **Supabase Free:** 500 MB de banco, 50 mil usuários ativos/mês. **O projeto pausa após 7 dias sem nenhum acesso.** Com usuários ativos isso não acontece; se pausar, reative no painel.
- **Vercel Hobby:** para uso pessoal e **não comercial**. Se um dia cobrar pelo app ou colocar anúncios, migre para um plano pago ou outra hospedagem.
- Confira os limites atuais nas páginas de preço, porque eles mudam com o tempo.

## Problemas comuns

| Sintoma | Causa provável |
|---|---|
| Tela “Carregando…” para sempre | Variáveis de ambiente erradas na Vercel → corrija e faça **Redeploy** |
| Google mostra “redirect_uri_mismatch” | O URI de redirecionamento no Google Cloud não é exatamente o Callback URL do Supabase |
| Link do e-mail abre `localhost` | **Site URL** do Supabase ainda está como localhost (passo 4) |
| “Muitas tentativas” no cadastro | Falta configurar o SMTP (passo 6) |
| Página 404 ao recarregar | O `vercel.json` precisa estar no repositório |
