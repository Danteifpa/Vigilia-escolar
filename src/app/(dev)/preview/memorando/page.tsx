import { notFound } from 'next/navigation';
import { DetalheMemorando, type MemorandoDetalhado } from '@/components/ocorrencias/DetalheMemorando';

/** Pré-visualização do memorando na visão da DRE, com dados fictícios (só fora de produção). */
export default function PreviewMemorando() {
  if (process.env.NODE_ENV === 'production' && !process.env.HABILITAR_PREVIEW) notFound();
  const memo: MemorandoDetalhado = {
    id: '00000000-0000-0000-0000-0000000000a1', numero: 'MEMO-15000001-2026-0004', escola_id: 'e1', dre_id: 'd6',
    bandeira_cor_no_registro: 'amarela', prioridade: 'alta', tipos_ameaca: ['fumaca_queimadas'], ameaca_outros_descricao: null,
    data_hora_ocorrencia: '2026-11-12T07:40:00-03:00',
    descricao_situacao: 'Fumaça densa vinda de queimada a cerca de 2 km. Névoa visível nas salas do bloco B desde as 7h.',
    impactos_pedagogicos: 'Turmas do 6º ao 9º ano do turno da manhã com aulas reduzidas; avaliação bimestral adiada.',
    impactos_operacionais: 'Merenda servida em sala; quadra e pátio interditados.',
    alunos_afetados: 312, aulas_suspensas: false,
    providencias_tomadas: 'Janelas fechadas, alunos concentrados nas salas climatizadas, famílias avisadas.',
    apoio_necessario_dre: 'Avaliação da Defesa Civil e envio de purificadores de ar para o bloco B.',
    status: 'em_analise_dre', enviado_em: '2026-11-12T08:05:00-03:00', created_at: '2026-11-12T07:50:00-03:00', updated_at: '2026-11-12T08:30:00-03:00',
    escola: { nome: 'EEEFM Exemplo Vigília (fictícia)', codigo_inep: '15000001', municipio: { nome: 'Belém' } },
    tramitacoes: [
      { id: 1, acao: 'enviar', para_status: 'enviado', parecer: null, ator_perfil: 'escola', created_at: '2026-11-12T08:05:00-03:00', ator: { nome: 'Direção EEEFM Exemplo' } },
      { id: 2, acao: 'receber', para_status: 'em_analise_dre', parecer: null, ator_perfil: 'dre', created_at: '2026-11-12T08:30:00-03:00', ator: { nome: 'Coordenação DRE Belém 06' } },
    ],
  };
  return <main className="mx-auto max-w-6xl p-4"><DetalheMemorando memo={memo} perfil="dre" voltar="/dre" /></main>;
}
