-- =============================================================================
-- Vigília Escolar PA — Migration 003: perfil no JWT + auditoria de convites
--
-- Custom Access Token Hook do Supabase Auth: acrescenta ao token as claims
--   app_perfil, app_escola_id, app_dre_id
-- usadas pelo middleware do Next.js para DIRECIONAR o usuário sem consultar o
-- banco a cada requisição. A AUTORIZAÇÃO continua sendo feita pela RLS, que lê
-- a tabela `users` — desativar um usuário tem efeito imediato no banco, mesmo
-- que o token dele ainda carregue as claims até expirar.
--
-- Ativação: supabase/config.toml ([auth.hook.custom_access_token]) no ambiente
-- local; em nuvem, Dashboard → Authentication → Hooks → Customize Access Token.
-- =============================================================================

alter table users add column convidado_por uuid references users(id);

-- search_path vazio: o Auth chama o hook com search_path = auth, então tudo
-- aqui precisa ser qualificado (public.*) — inclusive os tipos.
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql stable
set search_path = ''
as $$
declare
  v_claims jsonb := coalesce(event -> 'claims', '{}'::jsonb);
  v_perfil public.perfil_usuario;
  v_escola uuid;
  v_dre    uuid;
begin
  select u.perfil, u.escola_id, coalesce(u.dre_id, e.dre_id)
    into v_perfil, v_escola, v_dre
    from public.users u
    left join public.escolas e on e.id = u.escola_id
   where u.id = (event ->> 'user_id')::uuid
     and u.ativo;

  if v_perfil is null then
    -- Conta sem perfil ativo: autentica, mas não acessa nenhuma área
    v_claims := v_claims - 'app_perfil' - 'app_escola_id' - 'app_dre_id';
  else
    v_claims := v_claims || jsonb_build_object(
      'app_perfil',    v_perfil,
      'app_escola_id', v_escola,
      'app_dre_id',    v_dre
    );
  end if;

  return jsonb_set(event, '{claims}', v_claims);
end $$;

-- Só o serviço de Auth executa o hook
grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook(jsonb) from authenticated, anon, public;

grant select on public.users, public.escolas to supabase_auth_admin;
create policy users_leitura_auth_admin   on users   for select to supabase_auth_admin using (true);
create policy escolas_leitura_auth_admin on escolas for select to supabase_auth_admin using (true);
