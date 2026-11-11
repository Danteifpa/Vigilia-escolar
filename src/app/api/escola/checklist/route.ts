import { z } from 'zod';
import { supabaseServidor } from '@/lib/supabase/server';
import { falha, falhaBanco, falhaValidacao, lerJson, ok } from '@/lib/http/respostas';
import { hojeBelem } from '@/modules/escola/painel';

const checklistSchema = z.object({
  id: z.string().uuid(),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  situacao_agua: z.enum(['normal', 'reduzida', 'critica', 'sem_agua']),
  reservatorio_percentual: z.number().int().min(0).max(100).nullish(),
  temperatura_max_c: z.number().min(10).max(60).nullish(),
  nivel_fumaca: z.enum(['ausente', 'leve', 'moderada', 'intensa']),
  situacao_acesso: z.enum(['normal', 'restrito', 'interrompido']),
  alunos_presentes: z.number().int().min(0).nullish(),
  alunos_com_sintomas: z.number().int().min(0).default(0),
  acoes: z.record(z.boolean()).default({}),
  observacoes: z.string().max(2000).nullish(),
});

/** PUT /api/escola/checklist — upsert do checklist do dia (idempotente por escola+data). */
export async function PUT(req: Request) {
  const corpo = checklistSchema.safeParse(await lerJson(req));
  if (!corpo.success) return falhaValidacao(corpo.error);
  const db = await supabaseServidor();
  const { data, error } = await db
    .from('checklists_diarios')
    // escola_id, bandeira_cor e preenchido_por são definidos pelo trigger no banco
    .upsert({ ...corpo.data, data: corpo.data.data ?? hojeBelem(), bandeira_cor: 'verde' }, { onConflict: 'escola_id,data' })
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
