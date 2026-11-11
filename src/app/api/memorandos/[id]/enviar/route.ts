import { supabaseServidor } from '@/lib/supabase/server';
import { falhaBanco, ok } from '@/lib/http/respostas';
import { enviarMemorando } from '@/modules/ocorrencias/repositorio';

/**
 * POST /api/memorandos/:id/enviar — despacho formal da escola para a DRE.
 * O banco valida os campos do Anexo I, atribui o número oficial
 * (MEMO-<INEP>-<ANO>-<SEQ>) e grava a tramitação, tudo numa transação.
 *  200 → memorando enviado | 422 → campos faltando (lista em `erro.campos`)
 *  409 → já despachado     | 403/404 → não é da escola do usuário
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await supabaseServidor();
  const { data, error } = await enviarMemorando(db, id);
  return error ? falhaBanco(error) : ok(data);
}
