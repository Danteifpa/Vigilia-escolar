'use server';

import { revalidatePath } from 'next/cache';
import { exigirPerfil } from '@/modules/auth/sessao';
import { tramitarSchema } from './schema';

export interface EstadoTramitacao {
  ok?: boolean;
  mensagem?: string;
}

const CONFIRMACAO: Record<string, string> = {
  receber: 'Memorando recebido. A escola vê que está em análise.',
  devolver: 'Memorando devolvido com o seu parecer.',
  encaminhar_estadual: 'Memorando encaminhado à Gestão Estadual.',
  atender: 'Memorando marcado como atendido.',
  arquivar: 'Memorando arquivado.',
};

/** Tramitação pela DRE ou Gestão Estadual. Regras de transição e parecer: função tramitar_memorando() no banco. */
export async function tramitar(_anterior: EstadoTramitacao, fd: FormData): Promise<EstadoTramitacao> {
  const { db, perfil } = await exigirPerfil('dre', 'estadual');
  const id = String(fd.get('id') ?? '');
  const parse = tramitarSchema.safeParse({ acao: fd.get('acao'), parecer: fd.get('parecer') || undefined });
  if (!parse.success || !/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, mensagem: 'Ação inválida.' };

  const { error } = await db.rpc('tramitar_memorando', {
    p_memorando_id: id, p_acao: parse.data.acao, p_parecer: parse.data.parecer ?? null,
  });
  if (error) {
    const mensagem = error.code === '23514' ? 'Escreva o parecer antes de concluir esta ação.'
      : error.code === '55000' ? 'O memorando mudou de situação enquanto você analisava. A página foi atualizada.'
      : error.code === 'P0002' ? 'Memorando não encontrado.'
      : 'Não foi possível registrar a ação.';
    revalidatePath(`/${perfil.perfil}/ocorrencias/${id}`);
    return { ok: false, mensagem };
  }
  revalidatePath(`/${perfil.perfil}/ocorrencias/${id}`);
  revalidatePath(`/${perfil.perfil}`);
  return { ok: true, mensagem: CONFIRMACAO[parse.data.acao] };
}
