import { supabaseServidor } from '@/lib/supabase/server';
import { falha, falhaBanco, falhaValidacao, lerJson, ok } from '@/lib/http/respostas';
import { atualizarRascunhoSchema } from '@/modules/ocorrencias/schema';
import { atualizarRascunho, descartarRascunho, obterMemorando } from '@/modules/ocorrencias/repositorio';

type Ctx = { params: Promise<{ id: string }> };
const UUID = /^[0-9a-f-]{36}$/i;

/** GET /api/memorandos/:id — memorando + trilha de tramitação + anexos */
export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  if (!UUID.test(id)) return falha(400, 'id_invalido', 'Identificador inválido');
  const db = await supabaseServidor();
  const { data, error } = await obterMemorando(db, id);
  return error ? falhaBanco(error) : ok(data);
}

/** PATCH /api/memorandos/:id — edita rascunho/devolvido. Envie `base_updated_at` para detectar conflito. */
export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  if (!UUID.test(id)) return falha(400, 'id_invalido', 'Identificador inválido');
  const corpo = atualizarRascunhoSchema.safeParse(await lerJson(req));
  if (!corpo.success) return falhaValidacao(corpo.error);

  const db = await supabaseServidor();
  const r = await atualizarRascunho(db, id, corpo.data);
  return r.erro ? falhaBanco(r.erro) : ok(r.dados);
}

/** DELETE /api/memorandos/:id — descarta rascunho nunca despachado. */
export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const db = await supabaseServidor();
  const { data, error } = await descartarRascunho(db, id);
  if (error) return falhaBanco(error);
  return data.length ? new Response(null, { status: 204 }) : falha(404, 'nao_encontrado', 'Rascunho não encontrado');
}
