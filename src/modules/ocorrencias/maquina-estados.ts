import type { PerfilUsuario, StatusMemorando } from '@/types/dominio';

/**
 * Espelho da tabela `memorando_transicoes` (fonte de verdade no banco).
 * Usado no cliente — inclusive offline — para decidir quais botões exibir.
 * O banco rejeita qualquer transição fora desta lista (erro 55000).
 */
export type AcaoMemorando = 'enviar' | 'receber' | 'devolver' | 'encaminhar_seduc' | 'atender' | 'arquivar';

interface Transicao {
  perfil: PerfilUsuario;
  acao: AcaoMemorando;
  de: StatusMemorando;
  para: StatusMemorando;
  exigeParecer: boolean;
}

export const TRANSICOES: readonly Transicao[] = [
  { perfil: 'escola', acao: 'enviar',           de: 'rascunho',          para: 'enviado',           exigeParecer: false },
  { perfil: 'escola', acao: 'enviar',           de: 'devolvido',         para: 'enviado',           exigeParecer: false },
  { perfil: 'dre',    acao: 'receber',          de: 'enviado',           para: 'em_analise_dre',    exigeParecer: false },
  { perfil: 'dre',    acao: 'devolver',         de: 'enviado',           para: 'devolvido',         exigeParecer: true },
  { perfil: 'dre',    acao: 'devolver',         de: 'em_analise_dre',    para: 'devolvido',         exigeParecer: true },
  { perfil: 'dre',    acao: 'encaminhar_seduc', de: 'em_analise_dre',    para: 'encaminhado_seduc', exigeParecer: true },
  { perfil: 'dre',    acao: 'atender',          de: 'em_analise_dre',    para: 'atendido',          exigeParecer: true },
  { perfil: 'dre',    acao: 'arquivar',         de: 'atendido',          para: 'arquivado',         exigeParecer: false },
  { perfil: 'seduc',  acao: 'devolver',         de: 'encaminhado_seduc', para: 'em_analise_dre',    exigeParecer: true },
  { perfil: 'seduc',  acao: 'atender',          de: 'encaminhado_seduc', para: 'atendido',          exigeParecer: true },
  { perfil: 'seduc',  acao: 'arquivar',         de: 'atendido',          para: 'arquivado',         exigeParecer: false },
];

export function acoesDisponiveis(status: StatusMemorando, perfil: PerfilUsuario) {
  return TRANSICOES.filter((t) => t.perfil === perfil && t.de === status);
}

export const editavelPelaEscola = (s: StatusMemorando) => s === 'rascunho' || s === 'devolvido';

export const ROTULO_STATUS: Record<StatusMemorando, { texto: string; classe: string }> = {
  rascunho:          { texto: 'Rascunho',            classe: 'bg-slate-100 text-slate-700 ring-slate-300' },
  enviado:           { texto: 'Enviado à DRE',       classe: 'bg-sky-50 text-sky-800 ring-sky-300' },
  em_analise_dre:    { texto: 'Em análise na DRE',   classe: 'bg-indigo-50 text-indigo-800 ring-indigo-300' },
  devolvido:         { texto: 'Devolvido p/ ajuste', classe: 'bg-orange-50 text-orange-800 ring-orange-300' },
  encaminhado_seduc: { texto: 'Na SEDUC',            classe: 'bg-violet-50 text-violet-800 ring-violet-300' },
  atendido:          { texto: 'Atendido',            classe: 'bg-emerald-50 text-emerald-800 ring-emerald-300' },
  arquivado:         { texto: 'Arquivado',           classe: 'bg-slate-50 text-slate-500 ring-slate-200' },
};
