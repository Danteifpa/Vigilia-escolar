-- =============================================================================
-- Vigília Escolar PA — Migration 002: regras de negócio, tramitação e RLS
-- Princípio: o banco é a autoridade. A API e o front apenas espelham as regras.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Helpers de contexto do usuário autenticado (usados nas policies)
-- -----------------------------------------------------------------------------
create or replace function app.perfil() returns perfil_usuario
language sql stable security definer set search_path = public as $$
  select perfil from public.users where id = auth.uid() and ativo
$$;

create or replace function app.escola_id() returns uuid
language sql stable security definer set search_path = public as $$
  select escola_id from public.users where id = auth.uid() and ativo
$$;

-- DRE do usuário: própria (perfil dre) ou a da sua escola (perfil escola)
create or replace function app.dre_id() returns uuid
language sql stable security definer set search_path = public as $$
  select coalesce(u.dre_id, e.dre_id)
  from public.users u
  left join public.escolas e on e.id = u.escola_id
  where u.id = auth.uid() and u.ativo
$$;

-- -----------------------------------------------------------------------------
-- Bandeira vigente: decreto específico da escola prevalece sobre o do município;
-- sem decreto, a escola está em VERDE (prevenção e monitoramento).
-- -----------------------------------------------------------------------------
create or replace view vw_bandeira_vigente
with (security_invoker = true) as
select
  e.id                                                        as escola_id,
  coalesce(be.cor, bm.cor, 'verde'::cor_bandeira)             as cor,
  coalesce(be.regime_pedagogico, bm.regime_pedagogico,
           'presencial'::regime_pedagogico)                   as regime_pedagogico,
  case when be.id is not null then 'escola'
       when bm.id is not null then 'municipio'
       else 'padrao' end                                      as origem,
  coalesce(be.id, bm.id)                                      as historico_id,
  coalesce(be.vigente_desde, bm.vigente_desde)                as vigente_desde,
  coalesce(be.justificativa, bm.justificativa)                as justificativa,
  coalesce(be.ato_referencia, bm.ato_referencia)              as ato_referencia
from escolas e
left join historico_bandeiras be
       on be.escopo = 'escola' and be.escola_id = e.id and be.vigente_ate is null
left join historico_bandeiras bm
       on bm.escopo = 'municipio' and bm.municipio_id = e.municipio_id and bm.vigente_ate is null;

create or replace function app.cor_vigente(p_escola_id uuid) returns cor_bandeira
language sql stable security definer set search_path = public as $$
  select cor from vw_bandeira_vigente where escola_id = p_escola_id
$$;

-- Ao decretar nova bandeira, encerra a anterior do mesmo alvo (histórico imutável)
create or replace function app.tg_hb_encerrar_anterior() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update historico_bandeiras
     set vigente_ate = new.vigente_desde
   where vigente_ate is null
     and escopo = new.escopo
     and ((new.escopo = 'municipio' and municipio_id = new.municipio_id)
       or (new.escopo = 'escola'    and escola_id    = new.escola_id));
  return new;
end $$;

create trigger hb_encerrar_anterior
  before insert on historico_bandeiras
  for each row execute function app.tg_hb_encerrar_anterior();

-- -----------------------------------------------------------------------------
-- Triggers de preenchimento automático (o cliente não decide vínculos/snapshots)
-- -----------------------------------------------------------------------------
create or replace function app.tg_memo_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.escola_id   := coalesce(app.escola_id(), new.escola_id);
  new.dre_id      := (select dre_id from escolas where id = new.escola_id);
  new.criado_por  := coalesce(auth.uid(), new.criado_por);
  new.bandeira_cor_no_registro := coalesce(app.cor_vigente(new.escola_id), 'verde');
  new.status      := 'rascunho';
  new.numero      := null;
  new.enviado_em  := null;
  new.enviado_por := null;
  return new;
end $$;

create trigger memo_before_insert
  before insert on memorandos_ocorrencia
  for each row execute function app.tg_memo_before_insert();

create or replace function app.tg_set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger memo_updated_at before update on memorandos_ocorrencia
  for each row execute function app.tg_set_updated_at();

create or replace function app.tg_checklist_before_write() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.escola_id := coalesce(app.escola_id(), new.escola_id);
  else
    new.id        := old.id;          -- upsert vindo de outro aparelho não troca a PK
    new.escola_id := old.escola_id;   -- vínculo imutável
    new.data      := old.data;
  end if;
  new.preenchido_por := coalesce(auth.uid(), new.preenchido_por);
  new.bandeira_cor   := coalesce(app.cor_vigente(new.escola_id), 'verde');
  new.updated_at     := now();
  return new;
end $$;

create trigger checklist_before_write
  before insert or update on checklists_diarios
  for each row execute function app.tg_checklist_before_write();

-- -----------------------------------------------------------------------------
-- Máquina de estados do Memorando (tabela = fonte única das transições)
-- -----------------------------------------------------------------------------
create table memorando_transicoes (
  perfil         perfil_usuario   not null,
  acao           text             not null,
  de_status      status_memorando not null,
  para_status    status_memorando not null,
  exige_parecer  boolean          not null default false,
  primary key (perfil, acao, de_status)
);

insert into memorando_transicoes (perfil, acao, de_status, para_status, exige_parecer) values
  ('escola', 'enviar',           'rascunho',          'enviado',           false),
  ('escola', 'enviar',           'devolvido',         'enviado',           false),
  ('dre',    'receber',          'enviado',           'em_analise_dre',    false),
  ('dre',    'devolver',         'enviado',           'devolvido',         true),
  ('dre',    'devolver',         'em_analise_dre',    'devolvido',         true),
  ('dre',    'encaminhar_seduc', 'em_analise_dre',    'encaminhado_seduc', true),
  ('dre',    'atender',          'em_analise_dre',    'atendido',          true),
  ('dre',    'arquivar',         'atendido',          'arquivado',         false),
  ('seduc',  'devolver',         'encaminhado_seduc', 'em_analise_dre',    true),
  ('seduc',  'atender',          'encaminhado_seduc', 'atendido',          true),
  ('seduc',  'arquivar',         'atendido',          'arquivado',         false);

-- Despacho pela escola: valida o Anexo I, numera e registra a tramitação
create or replace function public.enviar_memorando(p_memorando_id uuid)
returns memorandos_ocorrencia
language plpgsql security definer set search_path = public as $$
declare
  v_memo     memorandos_ocorrencia;
  v_faltando text[] := '{}';
  v_ano      smallint := extract(year from (now() at time zone 'America/Belem'))::smallint;
  v_seq      integer;
  v_inep     text;
  v_de       status_memorando;
begin
  if app.perfil() is distinct from 'escola' then
    raise exception 'Somente a escola pode despachar o memorando' using errcode = '42501';
  end if;

  select * into v_memo from memorandos_ocorrencia where id = p_memorando_id for update;
  if not found or v_memo.escola_id is distinct from app.escola_id() then
    raise exception 'Memorando não encontrado' using errcode = 'P0002';
  end if;
  if v_memo.status not in ('rascunho', 'devolvido') then
    raise exception 'Memorando já despachado (status: %)', v_memo.status using errcode = '55000';
  end if;

  if length(trim(coalesce(v_memo.descricao_situacao,   ''))) = 0 then v_faltando := array_append(v_faltando, 'descricao_situacao'); end if;
  if length(trim(coalesce(v_memo.impactos_pedagogicos, ''))) = 0 then v_faltando := array_append(v_faltando, 'impactos_pedagogicos'); end if;
  if length(trim(coalesce(v_memo.impactos_operacionais,''))) = 0 then v_faltando := array_append(v_faltando, 'impactos_operacionais'); end if;
  if length(trim(coalesce(v_memo.providencias_tomadas, ''))) = 0 then v_faltando := array_append(v_faltando, 'providencias_tomadas'); end if;
  if length(trim(coalesce(v_memo.apoio_necessario_dre, ''))) = 0 then v_faltando := array_append(v_faltando, 'apoio_necessario_dre'); end if;
  if cardinality(v_faltando) > 0 then
    raise exception 'Campos obrigatórios do Anexo I não preenchidos'
      using errcode = '23514', detail = array_to_string(v_faltando, ',');
  end if;

  -- Numeração oficial só no primeiro despacho (rascunhos não consomem número)
  if v_memo.numero is null then
    insert into memorando_contadores as c (escola_id, ano, ultimo)
    values (v_memo.escola_id, v_ano, 1)
    on conflict (escola_id, ano) do update set ultimo = c.ultimo + 1
    returning ultimo into v_seq;

    select codigo_inep into v_inep from escolas where id = v_memo.escola_id;
    v_memo.numero := format('MEMO-%s-%s-%s', v_inep, v_ano, lpad(v_seq::text, 4, '0'));
  end if;

  v_de := v_memo.status;
  update memorandos_ocorrencia
     set status = 'enviado', numero = v_memo.numero,
         enviado_por = auth.uid(), enviado_em = now()
   where id = p_memorando_id
  returning * into v_memo;

  insert into memorando_tramitacoes (memorando_id, acao, de_status, para_status, ator_id, ator_perfil)
  values (p_memorando_id, case when v_de = 'devolvido' then 'reenviar' else 'enviar' end,
          v_de, 'enviado', auth.uid(), 'escola');

  return v_memo;
end $$;

-- Tramitação pela DRE / SEDUC
create or replace function public.tramitar_memorando(
  p_memorando_id uuid, p_acao text, p_parecer text default null)
returns memorandos_ocorrencia
language plpgsql security definer set search_path = public as $$
declare
  v_perfil perfil_usuario := app.perfil();
  v_memo   memorandos_ocorrencia;
  v_t      memorando_transicoes;
begin
  if v_perfil is null or v_perfil = 'escola' then
    raise exception 'Perfil sem permissão para tramitar' using errcode = '42501';
  end if;

  select * into v_memo from memorandos_ocorrencia where id = p_memorando_id for update;
  if not found or v_memo.status = 'rascunho'
     or (v_perfil = 'dre' and v_memo.dre_id is distinct from app.dre_id()) then
    raise exception 'Memorando não encontrado' using errcode = 'P0002';
  end if;

  select * into v_t from memorando_transicoes
   where perfil = v_perfil and acao = p_acao and de_status = v_memo.status;
  if not found then
    raise exception 'Ação "%" não permitida para o status "%"', p_acao, v_memo.status
      using errcode = '55000';
  end if;
  if v_t.exige_parecer and length(trim(coalesce(p_parecer, ''))) = 0 then
    raise exception 'Parecer obrigatório para a ação "%"', p_acao
      using errcode = '23514', detail = 'parecer';
  end if;

  update memorandos_ocorrencia set status = v_t.para_status
   where id = p_memorando_id returning * into v_memo;

  insert into memorando_tramitacoes (memorando_id, acao, de_status, para_status, parecer, ator_id, ator_perfil)
  values (p_memorando_id, p_acao, v_t.de_status, v_t.para_status, nullif(trim(p_parecer), ''), auth.uid(), v_perfil);

  return v_memo;
end $$;

-- -----------------------------------------------------------------------------
-- Privilégios
-- -----------------------------------------------------------------------------
grant usage on schema app to authenticated;
grant execute on all functions in schema app to authenticated;

revoke all on function public.enviar_memorando(uuid)               from public, anon;
revoke all on function public.tramitar_memorando(uuid, text, text) from public, anon;
grant execute on function public.enviar_memorando(uuid)               to authenticated;
grant execute on function public.tramitar_memorando(uuid, text, text) to authenticated;

grant select on dres, municipios, escolas, users, protocolo_acoes, memorando_transicoes,
                historico_bandeiras, vw_bandeira_vigente, memorando_tramitacoes to authenticated;
grant insert on historico_bandeiras to authenticated;
grant select, insert, update on checklists_diarios to authenticated;
grant select, insert, delete on memorando_anexos to authenticated;

-- Memorando: status, número, vínculos e despacho só mudam pelas funções acima
revoke all on memorandos_ocorrencia from authenticated, anon;
grant select, delete on memorandos_ocorrencia to authenticated;
grant insert (id, prioridade, tipos_ameaca, ameaca_outros_descricao, data_hora_ocorrencia,
              descricao_situacao, impactos_pedagogicos, impactos_operacionais, alunos_afetados,
              aulas_suspensas, providencias_tomadas, apoio_necessario_dre, client_updated_at)
  on memorandos_ocorrencia to authenticated;
grant update (prioridade, tipos_ameaca, ameaca_outros_descricao, data_hora_ocorrencia,
              descricao_situacao, impactos_pedagogicos, impactos_operacionais, alunos_afetados,
              aulas_suspensas, providencias_tomadas, apoio_necessario_dre, client_updated_at)
  on memorandos_ocorrencia to authenticated;

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
alter table dres                  enable row level security;
alter table municipios            enable row level security;
alter table escolas               enable row level security;
alter table users                 enable row level security;
alter table protocolo_acoes       enable row level security;
alter table memorando_transicoes  enable row level security;
alter table historico_bandeiras   enable row level security;
alter table checklists_diarios    enable row level security;
alter table memorandos_ocorrencia enable row level security;
alter table memorando_anexos      enable row level security;
alter table memorando_tramitacoes enable row level security;
alter table memorando_contadores  enable row level security;   -- sem policies: só via função

-- Catálogos: leitura para qualquer usuário autenticado
create policy dres_leitura        on dres                 for select to authenticated using (true);
create policy municipios_leitura  on municipios           for select to authenticated using (true);
create policy acoes_leitura       on protocolo_acoes      for select to authenticated using (true);
create policy transicoes_leitura  on memorando_transicoes for select to authenticated using (true);

-- Escolas: escola vê a si; DRE vê o seu polo; SEDUC vê todas
create policy escolas_leitura on escolas for select to authenticated using (
     app.perfil() = 'seduc'
  or (app.perfil() = 'dre'    and dre_id = app.dre_id())
  or (app.perfil() = 'escola' and id = app.escola_id())
);

-- Usuários: a si mesmo; DRE vê usuários do polo; SEDUC vê todos
create policy users_leitura on users for select to authenticated using (
     id = auth.uid()
  or app.perfil() = 'seduc'
  or (app.perfil() = 'dre' and (
        dre_id = app.dre_id()
     or escola_id in (select id from escolas where dre_id = app.dre_id())))
);

-- Bandeiras: transparência total na leitura; decretação exclusiva da SEDUC
create policy hb_leitura on historico_bandeiras for select to authenticated using (true);
create policy hb_decretar_seduc on historico_bandeiras for insert to authenticated
  with check (app.perfil() = 'seduc' and decretada_por = auth.uid());

-- Checklists: escola escreve o seu; DRE lê o polo; SEDUC lê tudo
create policy checklist_leitura on checklists_diarios for select to authenticated using (
     app.perfil() = 'seduc'
  or (app.perfil() = 'dre'    and escola_id in (select id from escolas where dre_id = app.dre_id()))
  or (app.perfil() = 'escola' and escola_id = app.escola_id())
);
create policy checklist_insert_escola on checklists_diarios for insert to authenticated
  with check (app.perfil() = 'escola' and escola_id = app.escola_id());
create policy checklist_update_escola on checklists_diarios for update to authenticated
  using      (app.perfil() = 'escola' and escola_id = app.escola_id() and data >= current_date - 1)
  with check (app.perfil() = 'escola' and escola_id = app.escola_id());

-- Memorandos
create policy memo_leitura on memorandos_ocorrencia for select to authenticated using (
     (app.perfil() = 'escola' and escola_id = app.escola_id())
  or (app.perfil() = 'dre'    and dre_id = app.dre_id() and status <> 'rascunho')
  or (app.perfil() = 'seduc'  and status <> 'rascunho')
);
create policy memo_insert_escola on memorandos_ocorrencia for insert to authenticated
  with check (app.perfil() = 'escola' and escola_id = app.escola_id() and status = 'rascunho');
create policy memo_update_escola on memorandos_ocorrencia for update to authenticated
  using      (app.perfil() = 'escola' and escola_id = app.escola_id() and status in ('rascunho', 'devolvido'))
  with check (app.perfil() = 'escola' and escola_id = app.escola_id() and status in ('rascunho', 'devolvido'));
create policy memo_descartar_rascunho on memorandos_ocorrencia for delete to authenticated
  using (app.perfil() = 'escola' and escola_id = app.escola_id() and status = 'rascunho');

-- Anexos e tramitações herdam a visibilidade do memorando
create policy anexos_leitura on memorando_anexos for select to authenticated
  using (exists (select 1 from memorandos_ocorrencia m where m.id = memorando_id));
create policy anexos_insert_escola on memorando_anexos for insert to authenticated
  with check (enviado_por = auth.uid() and exists (
    select 1 from memorandos_ocorrencia m
     where m.id = memorando_id and m.escola_id = app.escola_id()
       and m.status in ('rascunho', 'devolvido')));
create policy anexos_delete_escola on memorando_anexos for delete to authenticated
  using (enviado_por = auth.uid() and exists (
    select 1 from memorandos_ocorrencia m
     where m.id = memorando_id and m.status in ('rascunho', 'devolvido')));

create policy tramitacoes_leitura on memorando_tramitacoes for select to authenticated
  using (exists (select 1 from memorandos_ocorrencia m where m.id = memorando_id));
