import { supabaseServidor } from '@/lib/supabase/server';
import { falha, falhaBanco, falhaValidacao, lerJson, ok } from '@/lib/http/respostas';
import { criarRascunhoSchema } from '@/modules/ocorrencias/schema';
import { criarRascunho, listarMemorandos } from '@/modules/ocorrencias/repositorio';
import type { StatusMemorando } from '@/types/dominio';

/**
 * GET /api/memorandos?status=enviado,em_analise_dre&escola=<uuid>&cursor=<iso>
 * A RLS já recorta: escola vê os seus; DRE vê o polo (sem rascunhos); SEDUC vê todos.
 */
export async function GET(req: Request) {
  const db = await supabaseServidor();
  const p = new URL(req.url).searchParams;
  const { data, error } = await listarMemorandos(db, {
    status: p.get('status')?.split(',').filter(Boolean) as StatusMemorando[] | undefined,
    escolaId: p.get('escola') ?? undefined,
    cursor: p.get('cursor') ?? undefined,
    limite: Number(p.get('limite') ?? 30),
  });
  if (error) return falhaBanco(error);
  return ok({ itens: data, proximo_cursor: data.length ? data[data.length - 1].created_at : null });
}

/**
 * POST /api/memorandos — cria rascunho do Anexo I.
 * Idempotente pelo `id` gerado no aparelho: 201 na criação, 200 em reenvio da fila offline.
 */
export async function POST(req: Request) {
  const corpo = criarRascunhoSchema.safeParse(await lerJson(req));
  if (!corpo.success) return falhaValidacao(corpo.error);

  const db = await supabaseServidor();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return falha(401, 'nao_autenticado', 'Sessão expirada. Entre novamente.');

  const r = await criarRascunho(db, corpo.data);
  if (r.erro) return falhaBanco(r.erro);
  return ok(r.dados, r.criado ? 201 : 200);
}
