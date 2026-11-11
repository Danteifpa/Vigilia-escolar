import { supabaseServidor } from '@/lib/supabase/server';
import { falha, ok } from '@/lib/http/respostas';
import { carregarPainelEscola } from '@/modules/escola/painel';

/**
 * GET /api/escola/painel — snapshot do painel da escola do usuário logado.
 * O service worker guarda a última resposta (NetworkFirst) para uso offline.
 */
export async function GET() {
  const db = await supabaseServidor();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return falha(401, 'nao_autenticado', 'Sessão expirada');

  const { data: perfil } = await db.from('users').select('perfil, escola_id').eq('id', user.id).single();
  if (perfil?.perfil !== 'escola' || !perfil.escola_id) return falha(403, 'sem_permissao', 'Painel exclusivo do perfil Escola');

  try {
    return ok(await carregarPainelEscola(db, perfil.escola_id));
  } catch (e) {
    console.error('[painel]', e);
    return falha(500, 'erro_interno', 'Não foi possível carregar o painel');
  }
}
