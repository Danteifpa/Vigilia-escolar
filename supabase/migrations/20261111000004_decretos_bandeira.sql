-- =============================================================================
-- Vigília Escolar PA — Migration 004: decretação de bandeiras
--  - decretar_bandeiras(): decreto em lote (vários municípios ou escolas) numa
--    única transação — ou todos entram, ou nenhum.
--  - revogar_bandeira_escola(): encerra o decreto próprio de uma escola, que
--    volta a seguir a bandeira do município. Registra quem revogou e por quê.
--  - Realtime: mudanças em historico_bandeiras são transmitidas aos painéis.
-- =============================================================================

alter table historico_bandeiras
  add column revogada_por     uuid references users(id),
  add column motivo_revogacao text;

-- Lote de decretos. SECURITY INVOKER: a policy hb_decretar_estadual continua
-- valendo para cada linha inserida.
create or replace function public.decretar_bandeiras(
  p_escopo        escopo_bandeira,
  p_alvos         text[],
  p_cor           cor_bandeira,
  p_regime        regime_pedagogico,
  p_justificativa text,
  p_ato           text default null)
returns setof historico_bandeiras
language plpgsql security invoker set search_path = public as $$
declare
  v_alvo text;
  v_linha historico_bandeiras;
begin
  if app.perfil() is distinct from 'estadual' then
    raise exception 'Somente a Gestão Estadual decreta bandeiras' using errcode = '42501';
  end if;
  if coalesce(cardinality(p_alvos), 0) = 0 then
    raise exception 'Selecione ao menos um município ou escola' using errcode = '23514', detail = 'alvos';
  end if;

  foreach v_alvo in array p_alvos loop
    insert into historico_bandeiras
      (escopo, municipio_id, escola_id, cor, regime_pedagogico, justificativa, ato_referencia, decretada_por)
    values
      (p_escopo,
       case when p_escopo = 'municipio' then v_alvo::integer end,
       case when p_escopo = 'escola'    then v_alvo::uuid    end,
       p_cor, p_regime, trim(p_justificativa), nullif(trim(coalesce(p_ato, '')), ''), auth.uid())
    returning * into v_linha;
    return next v_linha;
  end loop;
end $$;

create or replace function public.revogar_bandeira_escola(p_escola_id uuid, p_motivo text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if app.perfil() is distinct from 'estadual' then
    raise exception 'Somente a Gestão Estadual revoga bandeiras' using errcode = '42501';
  end if;
  if length(trim(coalesce(p_motivo, ''))) < 10 then
    raise exception 'Informe o motivo da revogação (mínimo de 10 caracteres)' using errcode = '23514', detail = 'motivo';
  end if;

  update historico_bandeiras
     set vigente_ate = now(), revogada_por = auth.uid(), motivo_revogacao = trim(p_motivo)
   where escopo = 'escola' and escola_id = p_escola_id and vigente_ate is null;
  if not found then
    raise exception 'Esta escola não tem bandeira própria vigente' using errcode = 'P0002';
  end if;
end $$;

revoke all on function public.decretar_bandeiras(escopo_bandeira, text[], cor_bandeira, regime_pedagogico, text, text) from public, anon;
revoke all on function public.revogar_bandeira_escola(uuid, text) from public, anon;
grant execute on function public.decretar_bandeiras(escopo_bandeira, text[], cor_bandeira, regime_pedagogico, text, text) to authenticated;
grant execute on function public.revogar_bandeira_escola(uuid, text) to authenticated;

-- Realtime (Supabase): painéis recebem a mudança de bandeira na hora.
-- A leitura continua sujeita à RLS (hb_leitura).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.historico_bandeiras;
  end if;
end $$;
