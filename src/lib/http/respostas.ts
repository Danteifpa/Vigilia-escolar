import { NextResponse } from 'next/server';
import type { ZodError } from 'zod';

export interface ErroApi {
  erro: { codigo: string; mensagem: string; campos?: string[] };
}

export const ok = <T>(dados: T, status = 200) => NextResponse.json(dados, { status });

export const falha = (status: number, codigo: string, mensagem: string, campos?: string[]) =>
  NextResponse.json<ErroApi>({ erro: { codigo, mensagem, campos } }, { status });

export const falhaValidacao = (e: ZodError) =>
  falha(422, 'validacao', e.issues.map((i) => i.message).join('; '), [
    ...new Set(e.issues.map((i) => i.path.join('.'))),
  ]);

/**
 * Traduz SQLSTATE do Postgres (lançados pelas funções/constraints/RLS) em HTTP.
 * Mantém o contrato da API independente do banco.
 */
export function falhaBanco(e: { code?: string; message: string; details?: string | null }) {
  switch (e.code) {
    case '42501': return falha(403, 'sem_permissao', e.message);
    case 'P0002':
    case 'PGRST116': return falha(404, 'nao_encontrado', 'Memorando não encontrado');
    case '55000': return falha(409, 'transicao_invalida', e.message);
    case '23505': return falha(409, 'duplicado', e.message);
    case '23514': return falha(422, 'validacao', e.message, e.details?.split(',').filter(Boolean));
    default:
      console.error('[api] erro de banco', e);
      return falha(500, 'erro_interno', 'Erro inesperado. Tente novamente.');
  }
}

export async function lerJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return undefined;
  }
}
