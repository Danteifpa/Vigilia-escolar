-- =============================================================================
-- Vigília Escolar PA — Migration 001: schema inicial
-- Protocolo de Gestão e Resposta aos Efeitos do El Niño nas Escolas (SEDUC/PA 2026-2027)
-- Alvo: PostgreSQL 15+ (Supabase). Depende do schema `auth` do Supabase (auth.users, auth.uid()).
-- =============================================================================

create schema if not exists app;   -- funções auxiliares internas (helpers de RLS, triggers)

-- -----------------------------------------------------------------------------
-- Tipos de domínio
-- -----------------------------------------------------------------------------
create type perfil_usuario     as enum ('escola', 'dre', 'seduc');
create type cor_bandeira       as enum ('verde', 'amarela', 'vermelha');
create type escopo_bandeira    as enum ('municipio', 'escola');
create type regime_pedagogico  as enum ('presencial', 'presencial_adaptado', 'nao_presencial', 'cemep');

-- Campos do Memorando do Anexo I
create type tipo_ameaca        as enum ('fumaca_queimadas', 'estiagem_agua', 'outros');
create type prioridade_memo    as enum ('normal', 'alta', 'critica');
create type status_memorando   as enum (
  'rascunho',           -- escola editando (pode existir só no aparelho, offline)
  'enviado',            -- despachado pela escola, aguardando recebimento da DRE
  'em_analise_dre',     -- DRE recebeu e está tratando / articulando Defesa Civil, Saúde
  'devolvido',          -- DRE devolveu à escola para complementação
  'encaminhado_seduc',  -- pedido extraordinário encaminhado à SEDUC / Comitê de Crise
  'atendido',           -- demanda atendida
  'arquivado'
);

-- Checklist diário
create type situacao_agua      as enum ('normal', 'reduzida', 'critica', 'sem_agua');
create type nivel_fumaca       as enum ('ausente', 'leve', 'moderada', 'intensa');
create type situacao_acesso    as enum ('normal', 'restrito', 'interrompido');
create type zona_escola        as enum ('urbana', 'rural', 'ribeirinha', 'indigena', 'quilombola');

-- -----------------------------------------------------------------------------
-- Estrutura territorial e administrativa
-- -----------------------------------------------------------------------------
create table dres (
  id          uuid primary key default gen_random_uuid(),
  codigo      text not null unique,             -- ex.: 'BELEM-06'
  nome        text not null,                    -- ex.: 'DRE Belém 06'
  email       text,
  telefone    text,
  created_at  timestamptz not null default now()
);

create table municipios (
  id          integer primary key,              -- código IBGE (7 dígitos)
  nome        text not null,
  uf          char(2) not null default 'PA'
);

create table escolas (
  id                    uuid primary key default gen_random_uuid(),
  codigo_inep           char(8) not null unique,
  nome                  text not null,
  dre_id                uuid not null references dres(id),
  municipio_id          integer not null references municipios(id),
  zona                  zona_escola not null default 'urbana',
  endereco              text,
  latitude              numeric(9,6),
  longitude             numeric(9,6),
  telefone              text,
  total_matriculas      integer check (total_matriculas >= 0),
  fonte_agua            text,                   -- ex.: 'rede pública', 'poço', 'caminhão-pipa'
  capacidade_reservatorio_litros integer check (capacidade_reservatorio_litros >= 0),
  risco_isolamento      boolean not null default false,  -- acesso fluvial/estradas vicinais em estiagem
  ativo                 boolean not null default true,
  created_at            timestamptz not null default now()
);
create index escolas_dre_idx       on escolas (dre_id);
create index escolas_municipio_idx on escolas (municipio_id);

-- -----------------------------------------------------------------------------
-- Usuários (perfil de aplicação vinculado a auth.users do Supabase)
-- -----------------------------------------------------------------------------
create table users (
  id          uuid primary key references auth.users(id) on delete cascade,
  nome        text not null,
  email       text not null unique,
  perfil      perfil_usuario not null,
  escola_id   uuid references escolas(id),
  dre_id      uuid references dres(id),
  cargo       text,                             -- ex.: 'Diretor(a)', 'Coord. DRE', 'Comitê de Crise'
  telefone    text,
  ativo       boolean not null default true,
  created_at  timestamptz not null default now(),
  -- Cada perfil tem exatamente o vínculo que lhe cabe
  constraint users_vinculo_por_perfil check (
       (perfil = 'escola' and escola_id is not null and dre_id is null)
    or (perfil = 'dre'    and dre_id    is not null and escola_id is null)
    or (perfil = 'seduc'  and dre_id    is null     and escola_id is null)
  )
);
create index users_escola_idx on users (escola_id);
create index users_dre_idx    on users (dre_id);

-- -----------------------------------------------------------------------------
-- Ações do protocolo por bandeira (catálogo; alimenta o dashboard e o checklist)
-- -----------------------------------------------------------------------------
create table protocolo_acoes (
  id           uuid primary key default gen_random_uuid(),
  cor          cor_bandeira not null,
  codigo       text not null unique,            -- ex.: 'AMA-HIDRATACAO'
  titulo       text not null,
  descricao    text,
  obrigatoria  boolean not null default true,
  diaria       boolean not null default true,   -- entra no checklist do dia
  ordem        smallint not null default 0,
  ativo        boolean not null default true
);
create index protocolo_acoes_cor_idx on protocolo_acoes (cor, ordem) where ativo;

-- -----------------------------------------------------------------------------
-- Histórico de bandeiras (append-only; decretação exclusiva da SEDUC)
-- -----------------------------------------------------------------------------
create table historico_bandeiras (
  id                 uuid primary key default gen_random_uuid(),
  escopo             escopo_bandeira not null,
  municipio_id       integer references municipios(id),
  escola_id          uuid references escolas(id),
  cor                cor_bandeira not null,
  regime_pedagogico  regime_pedagogico not null default 'presencial',
  justificativa      text not null check (length(trim(justificativa)) >= 10),
  ato_referencia     text,                       -- nº da portaria / ata do Comitê de Crise
  vigente_desde      timestamptz not null default now(),
  vigente_ate        timestamptz,                -- null = vigente
  decretada_por      uuid not null references users(id),
  created_at         timestamptz not null default now(),
  constraint hb_alvo_coerente check (
       (escopo = 'municipio' and municipio_id is not null and escola_id is null)
    or (escopo = 'escola'    and escola_id    is not null and municipio_id is null)
  ),
  constraint hb_periodo_valido check (vigente_ate is null or vigente_ate > vigente_desde),
  -- Atividades não presenciais / CEMEP só sob bandeira vermelha (validação SEDUC)
  constraint hb_regime_coerente check (
    regime_pedagogico in ('presencial', 'presencial_adaptado') or cor = 'vermelha'
  )
);
-- No máximo uma bandeira aberta por alvo
create unique index hb_vigente_municipio_uq on historico_bandeiras (municipio_id)
  where escopo = 'municipio' and vigente_ate is null;
create unique index hb_vigente_escola_uq    on historico_bandeiras (escola_id)
  where escopo = 'escola' and vigente_ate is null;
create index hb_escola_hist_idx    on historico_bandeiras (escola_id, vigente_desde desc);
create index hb_municipio_hist_idx on historico_bandeiras (municipio_id, vigente_desde desc);

-- -----------------------------------------------------------------------------
-- Checklist diário da escola (1 por escola/dia; upsert idempotente p/ offline)
-- -----------------------------------------------------------------------------
create table checklists_diarios (
  id                       uuid primary key default gen_random_uuid(),  -- gerado no cliente
  escola_id                uuid not null references escolas(id),
  data                     date not null,
  bandeira_cor             cor_bandeira not null,       -- snapshot da bandeira no dia
  situacao_agua            situacao_agua not null,
  reservatorio_percentual  smallint check (reservatorio_percentual between 0 and 100),
  temperatura_max_c        numeric(4,1) check (temperatura_max_c between 10 and 60),
  nivel_fumaca             nivel_fumaca not null,
  situacao_acesso          situacao_acesso not null,
  alunos_presentes         integer check (alunos_presentes >= 0),
  alunos_com_sintomas      integer not null default 0 check (alunos_com_sintomas >= 0),
  acoes                    jsonb not null default '{}'::jsonb,  -- { "AMA-HIDRATACAO": true, ... }
  observacoes              text,
  preenchido_por           uuid not null references users(id),
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  constraint checklist_unico_dia unique (escola_id, data),
  constraint checklist_acoes_objeto check (jsonb_typeof(acoes) = 'object')
);
create index checklists_data_idx on checklists_diarios (data desc);

-- -----------------------------------------------------------------------------
-- Memorando de Ocorrência — Anexo I
-- -----------------------------------------------------------------------------
create table memorandos_ocorrencia (
  id                        uuid primary key default gen_random_uuid(),  -- gerado no cliente (idempotência offline)
  numero                    text unique,                 -- atribuído no despacho: MEMO-<INEP>-<ANO>-<SEQ>
  escola_id                 uuid not null references escolas(id),
  dre_id                    uuid not null references dres(id),           -- snapshot da DRE no registro
  bandeira_cor_no_registro  cor_bandeira not null default 'verde',
  prioridade                prioridade_memo not null default 'normal',

  -- ===== Campos do Anexo I =====
  tipos_ameaca              tipo_ameaca[] not null,
  ameaca_outros_descricao   text,
  data_hora_ocorrencia      timestamptz not null default now(),
  descricao_situacao        text,
  impactos_pedagogicos      text,
  impactos_operacionais     text,
  alunos_afetados           integer check (alunos_afetados >= 0),
  aulas_suspensas           boolean not null default false,
  providencias_tomadas      text,
  apoio_necessario_dre      text,
  -- =============================

  status                    status_memorando not null default 'rascunho',
  criado_por                uuid not null references users(id),
  enviado_por               uuid references users(id),
  enviado_em                timestamptz,
  client_updated_at         timestamptz,                 -- relógio do aparelho (auditoria offline)
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),

  constraint memo_ameaca_nao_vazia check (cardinality(tipos_ameaca) >= 1),
  constraint memo_outros_descrito check (
    not ('outros' = any (tipos_ameaca))
    or length(trim(coalesce(ameaca_outros_descricao, ''))) > 0
  ),
  -- Fora do rascunho, o formulário do Anexo I está obrigatoriamente completo
  constraint memo_completo_apos_envio check (
    status = 'rascunho' or (
          length(trim(coalesce(descricao_situacao,   ''))) > 0
      and length(trim(coalesce(impactos_pedagogicos, ''))) > 0
      and length(trim(coalesce(impactos_operacionais,''))) > 0
      and length(trim(coalesce(providencias_tomadas, ''))) > 0
      and length(trim(coalesce(apoio_necessario_dre, ''))) > 0
      and numero is not null and enviado_em is not null
    )
  )
);
create index memo_escola_idx     on memorandos_ocorrencia (escola_id, created_at desc);
create index memo_dre_status_idx on memorandos_ocorrencia (dre_id, status, prioridade);
create index memo_status_idx     on memorandos_ocorrencia (status) where status <> 'rascunho';

create table memorando_anexos (
  id             uuid primary key default gen_random_uuid(),
  memorando_id   uuid not null references memorandos_ocorrencia(id) on delete cascade,
  storage_path   text not null,          -- bucket 'memorandos' do Supabase Storage
  mime_type      text not null,
  tamanho_bytes  integer not null check (tamanho_bytes between 1 and 15728640),  -- 15 MB
  legenda        text,
  enviado_por    uuid not null references users(id),
  created_at     timestamptz not null default now()
);
create index memo_anexos_memo_idx on memorando_anexos (memorando_id);

-- Trilha de tramitação (append-only; trilha de auditoria do despacho)
create table memorando_tramitacoes (
  id             bigint generated always as identity primary key,
  memorando_id   uuid not null references memorandos_ocorrencia(id) on delete cascade,
  acao           text not null,
  de_status      status_memorando,
  para_status    status_memorando not null,
  parecer        text,
  ator_id        uuid not null references users(id),
  ator_perfil    perfil_usuario not null,
  created_at     timestamptz not null default now()
);
create index memo_tram_memo_idx on memorando_tramitacoes (memorando_id, created_at);

-- Sequencial anual por escola para numeração oficial
create table memorando_contadores (
  escola_id  uuid not null references escolas(id),
  ano        smallint not null,
  ultimo     integer not null default 0,
  primary key (escola_id, ano)
);
