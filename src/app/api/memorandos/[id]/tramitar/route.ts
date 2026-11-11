import { supabaseServidor } from '@/lib/supabase/server';
import { falhaBanco, falhaValidacao, lerJson, ok } from '@/lib/http/respostas';
import { tramitarSchema } from '@/modules/ocorrencias/schema';
import { tramitarMemorando } from '@/modules/ocorrencias/repositorio';

/**
 * POST /api/memorandos/:id/tramitar  { acao, parecer? }
 * DRE:   receber | devolver | encaminhar_estadual | atender | arquivar
 * Gestão Estadual: devolver (volta à DRE) | atender | arquivar
 * Transições e exigência de parecer: tabela `memorando_transicoes`.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const corpo = tramitarSchema.safeParse(await lerJson(req));
  if (!corpo.success) return falhaValidacao(corpo.error);

  const db = await supabaseServidor();
  const { data, error } = await tramitarMemorando(db, id, corpo.data);
  return error ? falhaBanco(error) : ok(data);
}
