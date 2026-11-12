-- =============================================================================
-- Vigília Escolar PA — Migration 006: search_path fixo no trigger de updated_at
-- Apontado pelo verificador de segurança do Supabase (lint 0011).
-- =============================================================================
alter function app.tg_set_updated_at() set search_path = '';
