-- =============================================================================
-- Vigília Escolar PA — Migration 005: Realtime para memorandos e checklists
-- A fila da DRE e o acompanhamento da Gestão Estadual atualizam sozinhos quando
-- uma escola envia um memorando, quando ele muda de status ou quando um
-- checklist é registrado. A RLS continua decidindo quem recebe cada evento
-- (ex.: a DRE nunca recebe rascunhos nem dados de outro polo).
-- =============================================================================
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.memorandos_ocorrencia, public.checklists_diarios;
  end if;
end $$;
