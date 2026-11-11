import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { supabaseServidor } from '@/lib/supabase/server';
import { HOME_DO_PERFIL, type Perfil } from './perfis';

export interface PerfilUsuario {
  id: string;
  nome: string;
  email: string;
  perfil: Perfil;
  escola_id: string | null;
  dre_id: string | null;
  cargo: string | null;
  ativo: boolean;
}

/**
 * Sessão no servidor, lida do banco (fonte de verdade — não das claims).
 * `cache` evita consultas repetidas na mesma renderização.
 */
export const obterSessao = cache(async () => {
  const db = await supabaseServidor();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return null;
  const { data } = await db
    .from('users')
    .select('id, nome, email, perfil, escola_id, dre_id, cargo, ativo')
    .eq('id', user.id)
    .maybeSingle<PerfilUsuario>();
  return { db, user, perfil: data };
});

/** Use no topo de páginas/ações restritas. Redireciona se não houver permissão. */
export async function exigirPerfil(...permitidos: Perfil[]) {
  const sessao = await obterSessao();
  if (!sessao) redirect('/entrar');
  const { perfil } = sessao;
  if (!perfil?.ativo) redirect('/entrar?erro=sem_perfil');
  if (!permitidos.includes(perfil.perfil)) redirect(HOME_DO_PERFIL[perfil.perfil]);
  return { db: sessao.db, user: sessao.user, perfil };
}
