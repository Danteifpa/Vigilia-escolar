import type { SupabaseClient } from '@supabase/supabase-js';
import type { MemorandoOcorrencia, StatusMemorando } from '@/types/dominio';
import type { AtualizarRascunhoInput, CriarRascunhoInput, TramitarInput } from './schema';

/**
 * Acesso a dados do Memorando. Toda regra de autorização e de estado é aplicada
 * no Postgres (RLS + funções SECURITY DEFINER); aqui só orquestramos chamadas.
 */
type Resultado<T> = { dados: T; erro: null } | { dados: null; erro: { code?: string; message: string; details?: string | null } };

const COLUNAS_LISTA =
  'id, numero, status, prioridade, tipos_ameaca, bandeira_cor_no_registro, escola_id, dre_id, created_at, enviado_em, updated_at';

export async function listarMemorandos(
  db: SupabaseClient,
  filtros: { status?: StatusMemorando[]; escolaId?: string; limite?: number; cursor?: string },
) {
  let q = db.from('memorandos_ocorrencia').select(COLUNAS_LISTA).order('created_at', { ascending: false });
  if (filtros.status?.length) q = q.in('status', filtros.status);
  if (filtros.escolaId) q = q.eq('escola_id', filtros.escolaId);
  if (filtros.cursor) q = q.lt('created_at', filtros.cursor);
  return q.limit(Math.min(filtros.limite ?? 30, 100));
}

export async function obterMemorando(db: SupabaseClient, id: string) {
  return db
    .from('memorandos_ocorrencia')
    .select('*, escola:escolas(nome, codigo_inep, municipio:municipios(nome)), tramitacoes:memorando_tramitacoes(id, acao, de_status, para_status, parecer, ator_perfil, created_at, ator:users(nome)), anexos:memorando_anexos(id, storage_path, mime_type, legenda)')
    .order('id', { referencedTable: 'memorando_tramitacoes', ascending: true })
    .eq('id', id)
    .single();
}

/** Idempotente: reenvio do mesmo `id` (fila offline) devolve o registro existente. */
export async function criarRascunho(db: SupabaseClient, input: CriarRascunhoInput): Promise<Resultado<MemorandoOcorrencia> & { criado?: boolean }> {
  const { data, error } = await db.from('memorandos_ocorrencia').insert(input).select().single();
  if (!error) return { dados: data as MemorandoOcorrencia, erro: null, criado: true };
  if (error.code === '23505') {
    const existente = await db.from('memorandos_ocorrencia').select().eq('id', input.id).single();
    if (existente.data) return { dados: existente.data as MemorandoOcorrencia, erro: null, criado: false };
  }
  return { dados: null, erro: error };
}

/**
 * Concorrência otimista: se o cliente informar `base_updated_at` e o registro
 * tiver mudado desde então (ex.: edição em outro aparelho), retorna conflito.
 */
export async function atualizarRascunho(db: SupabaseClient, id: string, input: AtualizarRascunhoInput): Promise<Resultado<MemorandoOcorrencia>> {
  const { base_updated_at, ...campos } = input;
  let q = db.from('memorandos_ocorrencia').update(campos).eq('id', id);
  if (base_updated_at) q = q.eq('updated_at', base_updated_at);
  const { data, error } = await q.select().maybeSingle();
  if (error) return { dados: null, erro: error };
  if (!data) {
    // Nada atualizado: inexistente, sem permissão, já despachado ou versão desatualizada.
    const atual = await db.from('memorandos_ocorrencia').select('status, updated_at').eq('id', id).maybeSingle();
    if (!atual.data) return { dados: null, erro: { code: 'P0002', message: 'Memorando não encontrado' } };
    const msg = ['rascunho', 'devolvido'].includes(atual.data.status)
      ? 'O memorando foi alterado em outro dispositivo. Recarregue antes de salvar.'
      : `Memorando já despachado (status: ${atual.data.status}) e não pode ser editado.`;
    return { dados: null, erro: { code: '55000', message: msg } };
  }
  return { dados: data as MemorandoOcorrencia, erro: null };
}

export async function enviarMemorando(db: SupabaseClient, id: string) {
  return db.rpc('enviar_memorando', { p_memorando_id: id }).single<MemorandoOcorrencia>();
}

export async function tramitarMemorando(db: SupabaseClient, id: string, input: TramitarInput) {
  return db
    .rpc('tramitar_memorando', { p_memorando_id: id, p_acao: input.acao, p_parecer: input.parecer ?? null })
    .single<MemorandoOcorrencia>();
}

export async function descartarRascunho(db: SupabaseClient, id: string) {
  return db.from('memorandos_ocorrencia').delete().eq('id', id).eq('status', 'rascunho').select('id');
}
