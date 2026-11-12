'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { exigirPerfil } from '@/modules/auth/sessao';
import { BANDEIRAS } from './protocolo';

/**
 * Decretação e revogação de bandeiras (exclusivo da Gestão Estadual).
 * As regras finais ficam no banco: decretar_bandeiras() e revogar_bandeira_escola().
 */
export interface EstadoAcao {
  ok?: boolean;
  mensagem?: string;
  erros?: Record<string, string>;
}

const REGIMES_PRESENCIAIS = ['presencial', 'presencial_adaptado'];

const decretoSchema = z
  .object({
    escopo: z.enum(['municipio', 'escola']),
    alvos: z.array(z.string().min(1)).min(1, 'Selecione ao menos um município ou escola'),
    cor: z.enum(['verde', 'amarela', 'vermelha'], { message: 'Escolha a cor da bandeira' }),
    regime: z.enum(['presencial', 'presencial_adaptado', 'nao_presencial', 'cemep']),
    justificativa: z.string().trim().min(10, 'Explique o motivo (mínimo de 10 caracteres)').max(1000),
    ato_referencia: z.string().trim().max(120).optional(),
  })
  .refine((d) => d.cor === 'vermelha' || REGIMES_PRESENCIAIS.includes(d.regime), {
    path: ['regime'],
    message: 'Atividades não presenciais ou CEMEP só com bandeira vermelha',
  });

const errosDe = (e: z.ZodError) => {
  const erros: Record<string, string> = {};
  for (const i of e.issues) erros[String(i.path[0])] ??= i.message;
  return erros;
};

export async function decretarBandeiras(_anterior: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  const { db } = await exigirPerfil('estadual');
  const parse = decretoSchema.safeParse({
    escopo: fd.get('escopo'),
    alvos: fd.getAll('alvos'),
    cor: fd.get('cor') ?? undefined,
    regime: fd.get('regime'),
    justificativa: fd.get('justificativa'),
    ato_referencia: fd.get('ato_referencia') || undefined,
  });
  if (!parse.success) return { ok: false, mensagem: 'Revise os campos destacados.', erros: errosDe(parse.error) };
  const d = parse.data;

  const { error } = await db.rpc('decretar_bandeiras', {
    p_escopo: d.escopo,
    p_alvos: d.alvos,
    p_cor: d.cor,
    p_regime: d.regime,
    p_justificativa: d.justificativa,
    p_ato: d.ato_referencia ?? null,
  });
  if (error) {
    console.error('[bandeiras] decreto', error.code, error.message);
    return { ok: false, mensagem: error.code === '42501' ? error.message : 'Não foi possível registrar o decreto. Nada foi alterado.' };
  }

  revalidatePath('/estadual/bandeiras');
  const alvo = d.escopo === 'municipio' ? 'município(s)' : 'escola(s)';
  return { ok: true, mensagem: `${BANDEIRAS[d.cor].nome} decretada para ${d.alvos.length} ${alvo}. Os painéis das escolas já foram atualizados.` };
}

export async function revogarBandeiraEscola(_anterior: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  const { db } = await exigirPerfil('estadual');
  const parse = z
    .object({
      escola_id: z.string().uuid(),
      motivo: z.string().trim().min(10, 'Informe o motivo (mínimo de 10 caracteres)').max(500),
    })
    .safeParse({ escola_id: fd.get('escola_id'), motivo: fd.get('motivo') });
  if (!parse.success) return { ok: false, mensagem: parse.error.issues[0].message, erros: errosDe(parse.error) };

  const { error } = await db.rpc('revogar_bandeira_escola', { p_escola_id: parse.data.escola_id, p_motivo: parse.data.motivo });
  if (error) return { ok: false, mensagem: error.code === 'P0002' ? error.message : 'Não foi possível revogar.' };

  revalidatePath('/estadual/bandeiras');
  return { ok: true, mensagem: 'Decreto da escola revogado. Ela volta a seguir a bandeira do município.' };
}
