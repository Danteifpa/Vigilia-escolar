import { z } from 'zod';
import { supabaseServidor } from '@/lib/supabase/server';
import { falha, falhaBanco, falhaValidacao, lerJson, ok } from '@/lib/http/respostas';
import { checklistSchema, dataPermitida } from '@/modules/escola/checklist.schema';
import { hojeBelem } from '@/modules/escola/painel';

/** PUT /api/escola/checklist — upsert do checklist (idempotente por escola+data; aceita envio offline atrasado). */
export async function PUT(req: Request) {
  const corpo = checklistSchema.safeParse(await lerJson(req));
  if (!corpo.success) return falhaValidacao(corpo.error);
  if (!dataPermitida(corpo.data.data, hojeBelem())) {
    return falha(422, 'validacao', 'Só é possível registrar o checklist de hoje ou dos 2 dias anteriores.', ['data']);
  }
  const db = await supabaseServidor();
  const { data, error } = await db
    .from('checklists_diarios')
    // escola_id, bandeira_cor e preenchido_por são definidos pelo trigger no banco
    .upsert({ ...corpo.data, bandeira_cor: 'verde' }, { onConflict: 'escola_id,data' })
    .select()
    .single();
  return error ? falhaBanco(error) : ok(data);
}

/** PATCH /api/escola/checklist — marca/desmarca ações do protocolo no checklist de hoje. */
export async function PATCH(req: Request) {
  const corpo = z.object({ acoes: z.record(z.boolean()) }).safeParse(await lerJson(req));
  if (!corpo.success) return falhaValidacao(corpo.error);
  const db = await supabaseServidor();
  const atual = await db.from('checklists_diarios').select('id, acoes').eq('data', hojeBelem()).maybeSingle();
  if (atual.error) return falhaBanco(atual.error);
  if (!atual.data) return falha(409, 'checklist_ausente', 'Preencha o checklist de hoje antes de marcar ações');
  const { data, error } = await db
    .from('checklists_diarios')
    .update({ acoes: { ...(atual.data.acoes as Record<string, boolean>), ...corpo.data.acoes } })
    .eq('id', atual.data.id)
    .select()
    .single();
  return error ? falhaBanco(error) : ok(data);
}
