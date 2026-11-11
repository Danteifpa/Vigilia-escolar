import type { SupabaseClient } from '@supabase/supabase-js';
import { coresAplicaveis } from '@/modules/bandeiras/protocolo';
import type { AcaoProtocolo, BandeiraVigente, ChecklistDiario, Escola, PainelEscola } from '@/types/dominio';

/** Data de hoje no fuso do Pará (America/Belem, UTC-3, sem horário de verão). */
export const hojeBelem = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Belem' }).format(new Date());

/** Monta tudo o que o Dashboard da Escola precisa, em consultas paralelas. */
export async function carregarPainelEscola(db: SupabaseClient, escolaId: string): Promise<PainelEscola> {
  const [escola, bandeira, checklist, memorandos] = await Promise.all([
    db.from('escolas').select('id, codigo_inep, nome, dre_id, municipio_id, zona, total_matriculas, risco_isolamento').eq('id', escolaId).single(),
    db.from('vw_bandeira_vigente').select('*').eq('escola_id', escolaId).single(),
    db.from('checklists_diarios').select('*').eq('escola_id', escolaId).eq('data', hojeBelem()).maybeSingle(),
    db.from('memorandos_ocorrencia')
      .select('id, numero, status, prioridade, tipos_ameaca, created_at, enviado_em')
      .eq('escola_id', escolaId).order('created_at', { ascending: false }).limit(5),
  ]);
  if (escola.error) throw escola.error;
  if (bandeira.error) throw bandeira.error;

  const cor = (bandeira.data as BandeiraVigente).cor;
  const acoes = await db
    .from('protocolo_acoes')
    .select('id, cor, codigo, titulo, descricao, obrigatoria, diaria, ordem')
    .eq('ativo', true)
    .in('cor', coresAplicaveis(cor))
    .order('ordem');
  if (acoes.error) throw acoes.error;

  // Ações da bandeira atual primeiro, depois as herdadas dos níveis anteriores
  const nivel = (c: string) => coresAplicaveis(cor).indexOf(c as never);
  const ordenadas = (acoes.data as AcaoProtocolo[]).sort((a, b) => nivel(b.cor) - nivel(a.cor) || a.ordem - b.ordem);

  return {
    escola: escola.data as Escola,
    bandeira: bandeira.data as BandeiraVigente,
    acoes: ordenadas,
    checklistHoje: (checklist.data as ChecklistDiario | null) ?? null,
    memorandosRecentes: memorandos.data ?? [],
  };
}
