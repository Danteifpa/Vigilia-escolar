// Tipos de domínio espelhando os enums/tabelas do Postgres.
// Em produção, complemente com `npm run db:types` (tipos gerados pelo Supabase CLI).

export type PerfilUsuario = 'escola' | 'dre' | 'estadual';
export type CorBandeira = 'verde' | 'amarela' | 'vermelha';
export type RegimePedagogico = 'presencial' | 'presencial_adaptado' | 'nao_presencial' | 'cemep';
export type TipoAmeaca = 'fumaca_queimadas' | 'estiagem_agua' | 'outros';
export type PrioridadeMemo = 'normal' | 'alta' | 'critica';
export type StatusMemorando =
  | 'rascunho' | 'enviado' | 'em_analise_dre' | 'devolvido'
  | 'encaminhado_estadual' | 'atendido' | 'arquivado';
export type SituacaoAgua = 'normal' | 'reduzida' | 'critica' | 'sem_agua';
export type NivelFumaca = 'ausente' | 'leve' | 'moderada' | 'intensa';
export type SituacaoAcesso = 'normal' | 'restrito' | 'interrompido';

export interface Escola {
  id: string;
  codigo_inep: string;
  nome: string;
  dre_id: string;
  municipio_id: number;
  zona: 'urbana' | 'rural' | 'ribeirinha' | 'indigena' | 'quilombola';
  total_matriculas: number | null;
  risco_isolamento: boolean;
}

export interface BandeiraVigente {
  escola_id: string;
  cor: CorBandeira;
  regime_pedagogico: RegimePedagogico;
  origem: 'escola' | 'municipio' | 'padrao';
  historico_id: string | null;
  vigente_desde: string | null;
  justificativa: string | null;
  ato_referencia: string | null;
}

export interface AcaoProtocolo {
  id: string;
  cor: CorBandeira;
  codigo: string;
  titulo: string;
  descricao: string | null;
  obrigatoria: boolean;
  diaria: boolean;
  ordem: number;
}

export interface ChecklistDiario {
  id: string;
  escola_id: string;
  data: string;
  bandeira_cor: CorBandeira;
  situacao_agua: SituacaoAgua;
  reservatorio_percentual: number | null;
  temperatura_max_c: number | null;
  nivel_fumaca: NivelFumaca;
  situacao_acesso: SituacaoAcesso;
  alunos_presentes: number | null;
  alunos_com_sintomas: number;
  acoes: Record<string, boolean>;
  observacoes: string | null;
  updated_at: string;
}

export interface MemorandoOcorrencia {
  id: string;
  numero: string | null;
  escola_id: string;
  dre_id: string;
  bandeira_cor_no_registro: CorBandeira;
  prioridade: PrioridadeMemo;
  tipos_ameaca: TipoAmeaca[];
  ameaca_outros_descricao: string | null;
  data_hora_ocorrencia: string;
  descricao_situacao: string | null;
  impactos_pedagogicos: string | null;
  impactos_operacionais: string | null;
  alunos_afetados: number | null;
  aulas_suspensas: boolean;
  providencias_tomadas: string | null;
  apoio_necessario_dre: string | null;
  status: StatusMemorando;
  enviado_em: string | null;
  created_at: string;
  updated_at: string;
}

export interface PainelEscola {
  escola: Escola;
  bandeira: BandeiraVigente;
  acoes: AcaoProtocolo[];
  checklistHoje: ChecklistDiario | null;
  memorandosRecentes: Pick<
    MemorandoOcorrencia,
    'id' | 'numero' | 'status' | 'prioridade' | 'tipos_ameaca' | 'created_at' | 'enviado_em'
  >[];
}
