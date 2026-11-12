# Publicação — ambiente de homologação (gratuito)

| Peça | Onde | Plano |
|---|---|---|
| Banco, login, tempo real | Supabase · projeto `vigilia-escolar-homolog` · região São Paulo (`sa-east-1`) | Free |
| App (o link) | Netlify, ligado a este repositório | Free (permite uso comercial) |
| E-mails | SMTP padrão do Supabase (só entrega para membros da organização no Supabase) | Free |

O banco já está criado, com as migrations 001–006 e o catálogo do protocolo aplicados.

## 1. Supabase (painel: supabase.com/dashboard → projeto `vigilia-escolar-homolog`)

1. **Authentication → Hooks → Customize Access Token (JWT) Claims hook** → Enable →
   tipo *Postgres*, schema `public`, função `custom_access_token_hook` → Save.
   *(Sem isso o login funciona, mas ninguém é direcionado para a sua área.)*
2. **Authentication → Sign In / Providers → Email**: desligar *Allow new users to sign up*
   (contas só por convite).
3. **Authentication → Policies (ou Passwords)**: senha mínima 10, *letters and digits*.
4. **Authentication → Email Templates**: colar `supabase/templates/convite.html` em *Invite user*
   e `supabase/templates/recuperacao.html` em *Reset password*.
5. **Authentication → URL Configuration**: *Site URL* = endereço da Netlify
   (ex.: `https://vigilia-escolar.netlify.app`) e, em *Redirect URLs*, `https://vigilia-escolar.netlify.app/**`.
6. **Primeiro usuário (Gestão Estadual)**: Authentication → Users → *Add user* → *Create new user*
   com e-mail e senha e *Auto Confirm User* marcado. Depois, no SQL Editor:
   ```sql
   insert into public.users (id, nome, email, perfil)
   select id, 'Seu nome', email, 'estadual' from auth.users where email = 'seu@email';
   ```
   Os demais usuários são convidados pela própria tela (`/estadual/usuarios`).

## 2. Netlify (app.netlify.com)

1. *Add new project → Import an existing project → GitHub* → `Danteifpa/Vigilia-escolar`, branch `main`.
2. *Site configuration → Environment variables*:

   | Variável | Valor |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://gtfsbsfnpqxoyyuetqsr.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | chave *publishable* (Supabase → Project Settings → API Keys) |
   | `SUPABASE_SERVICE_ROLE_KEY` | chave *secret / service_role* (mesmo lugar) — **marcar como secreta** |
   | `NEXT_PUBLIC_APP_URL` | o endereço da Netlify |

3. *Deploys → Trigger deploy*. Cada atualização na `main` publica sozinha a partir daí.

> A `SUPABASE_SERVICE_ROLE_KEY` dá acesso total ao banco: cole direto na Netlify, nunca em
> chat, e-mail ou no código.

## 3. No celular

Abrir o endereço → entrar → **Android**: "Instalar app" (ou menu ⋮ → *Adicionar à tela inicial*);
**iPhone (Safari)**: Compartilhar → *Adicionar à Tela de Início*.

## Limites do plano gratuito

- O Supabase Free **pausa após 7 dias sem uso**; os dados ficam guardados e o projeto volta com um
  clique no painel. Para o piloto com escolas reais, migrar para o Supabase Pro.
- O SMTP padrão do Supabase só entrega convites para e-mails de membros da organização no Supabase.
  Para convidar outras pessoas, configurar um SMTP próprio (ex.: Resend Free) em
  *Authentication → Emails → SMTP Settings*.
