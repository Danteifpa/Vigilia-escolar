# Roadmap — Vigília Escolar PA

Legenda: ✅ feito · 🟡 em andamento · ⬜ a fazer

## Fase 1 — Setup, Auth e RLS 🟡
- ✅ Schema, RLS, funções de tramitação, testes do banco e CI
- ✅ Supabase CLI (`supabase/config.toml`): sem autocadastro, senha forte, templates de e-mail em português
- ✅ Perfil no JWT (hook) + `middleware.ts` direcionando cada perfil
- ✅ Login, recuperação e definição de senha, sair
- ✅ Convite de usuários (Gestão Estadual: todos os perfis; DRE: escolas do polo) e ativar/desativar
- ✅ Componentes base (`src/components/ui`)
- ✅ Testes ponta a ponta no CI com Supabase real
- ⬜ Projeto Supabase de homologação + deploy (Vercel) + `supabase db push`
- ⬜ Tipos gerados (`npm run db:types`)

## Fase 2 — Painel e Checklist da Escola
- ✅ Painel, banner da bandeira, ações obrigatórias, indicadores, fila offline, PWA base
- ⬜ Formulário do checklist (react-hook-form + zod, offline)
- ⬜ Realtime: mudança de bandeira sem recarregar
- ⬜ Ícones do PWA e teste de instalação em Android
- ⬜ Tela de pendências da fila offline · histórico de 7 dias

## Fase 3 — Memorando Anexo I e PDF
- ✅ Tabelas, máquina de estados, API rascunho/envio/tramitação
- ⬜ **Conferir campos com o modelo oficial (bloqueante)**
- ⬜ Formulário em etapas com salvamento local · fotos no Storage · linha do tempo
- ⬜ PDF (`@react-pdf/renderer`) em `/api/memorandos/[id]/pdf` com QR de verificação

## Fase 4 — Painéis DRE e Gestão Estadual
- 🟡 Resumo inicial com contadores (provisório)
- ⬜ DRE: fila de triagem, escolas por bandeira, escolas sem checklist, tramitação, Realtime
- ⬜ Gestão Estadual: visão estadual, decretação de bandeiras, regime pedagógico, exportação CSV

## Fase 5 — Piloto e ajustes finais
- ⬜ Piloto em uma DRE + polo ribeirinho · LGPD · Sentry e backups · manual e treinamento

## Decisões pendentes
1. Modelo oficial do Anexo I
2. Precedência escola × município na bandeira
3. Login individual (recomendado) ou por escola
