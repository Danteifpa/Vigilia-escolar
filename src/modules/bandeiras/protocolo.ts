import type { CorBandeira, RegimePedagogico } from '@/types/dominio';

/**
 * Metadados de apresentação das bandeiras. As AÇÕES vêm do banco
 * (`protocolo_acoes`) para que a SEDUC ajuste o protocolo sem novo deploy.
 * Classes Tailwind escritas por extenso para não serem removidas no build.
 */
export const BANDEIRAS: Record<
  CorBandeira,
  { nome: string; fase: string; resumo: string; nivel: number; ui: { banner: string; chip: string; icone: string; botao: string } }
> = {
  verde: {
    nome: 'Bandeira Verde',
    fase: 'Prevenção e Monitoramento',
    resumo: 'Aulas normais. Monitore água, calor, fumaça e acesso diariamente.',
    nivel: 1,
    ui: {
      banner: 'bg-emerald-700 text-white',
      chip: 'bg-emerald-900/30 text-emerald-50 ring-emerald-200/40',
      icone: 'text-emerald-200',
      botao: 'bg-white text-emerald-900 hover:bg-emerald-50',
    },
  },
  amarela: {
    nome: 'Bandeira Amarela',
    fase: 'Atenção e Preparação',
    resumo: 'Restrinja atividades externas, reforce hidratação e prepare cadernos de contingência.',
    nivel: 2,
    ui: {
      banner: 'bg-amber-400 text-amber-950',
      chip: 'bg-amber-950/10 text-amber-950 ring-amber-950/20',
      icone: 'text-amber-900',
      botao: 'bg-amber-950 text-amber-50 hover:bg-amber-900',
    },
  },
  vermelha: {
    nome: 'Bandeira Vermelha',
    fase: 'Resposta e Proteção',
    resumo: 'Prioridade total à proteção. Isole áreas de risco e acione a DRE para articulação emergencial.',
    nivel: 3,
    ui: {
      banner: 'bg-red-700 text-white',
      chip: 'bg-red-950/30 text-red-50 ring-red-200/40',
      icone: 'text-red-200',
      botao: 'bg-white text-red-800 hover:bg-red-50',
    },
  },
};

export const ROTULO_REGIME: Record<RegimePedagogico, string> = {
  presencial: 'Presencial',
  presencial_adaptado: 'Presencial adaptado',
  nao_presencial: 'Atividades não presenciais',
  cemep: 'Ensino mediado (CEMEP)',
};

const ORDEM: CorBandeira[] = ['verde', 'amarela', 'vermelha'];
/** Ações são cumulativas: a bandeira atual herda as das anteriores. */
export const coresAplicaveis = (cor: CorBandeira) => ORDEM.slice(0, ORDEM.indexOf(cor) + 1);
