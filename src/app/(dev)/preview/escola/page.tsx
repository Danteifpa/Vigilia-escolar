import { notFound } from 'next/navigation';
import { DashboardEscola } from '@/components/escola/DashboardEscola';
import type { CorBandeira, PainelEscola } from '@/types/dominio';

/** Pré-visualização do painel com dados fictícios: /preview/escola?cor=vermelha (só fora de produção). */
export default async function Preview({ searchParams }: { searchParams: Promise<{ cor?: CorBandeira }> }) {
  if (process.env.NODE_ENV === 'production' && !process.env.HABILITAR_PREVIEW) notFound();
  const cor = (await searchParams).cor ?? 'amarela';
  const acao = (c: CorBandeira, codigo: string, titulo: string, descricao: string, diaria = true, ordem = 10) =>
    ({ id: codigo, cor: c, codigo, titulo, descricao, obrigatoria: true, diaria, ordem });
  const catalogo = [
    acao('vermelha', 'VRM-PROTECAO', 'Prioridade total à proteção dos estudantes', 'Manter alunos em ambientes protegidos; janelas fechadas em caso de fumaça.'),
    acao('vermelha', 'VRM-ISOLAR-AREAS', 'Isolar áreas de risco', 'Sinalizar e interditar áreas expostas a fumaça, calor ou risco estrutural.', true, 20),
    acao('vermelha', 'VRM-ORGAOS', 'Articular órgãos de emergência via DRE', 'Defesa Civil, Bombeiros, SAMU — registrar em memorando.', false, 40),
    acao('amarela', 'AMA-ATIV-EXTERNAS', 'Restringir atividades externas e esforço físico', 'Suspender Ed. Física ao ar livre nos horários de maior calor ou com fumaça.'),
    acao('amarela', 'AMA-HIDRATACAO', 'Pausas programadas de hidratação em todas as turmas', 'Orientar professores a liberar pausas e manter água disponível.', true, 20),
    acao('amarela', 'AMA-CADERNOS', 'Preparar cadernos de contingência', 'Material impresso para alunos com risco de isolamento.', false, 30),
    acao('verde', 'VRD-AGUA', 'Verificar reservatório e abastecimento de água', 'Registrar nível do reservatório e situação do abastecimento.'),
    acao('verde', 'VRD-ACESSO', 'Monitorar acesso e transporte escolar', 'Registrar rotas interrompidas e alunos afetados.', true, 30),
  ];
  const nivel = { verde: 1, amarela: 2, vermelha: 3 } as const;
  const painel: PainelEscola = {
    escola: { id: 'e1', codigo_inep: '15000001', nome: 'EEEFM Exemplo Vigília (fictícia)', dre_id: 'd6', municipio_id: 1501402, zona: 'urbana', total_matriculas: 820, risco_isolamento: false },
    bandeira: {
      escola_id: 'e1', cor, regime_pedagogico: cor === 'vermelha' ? 'cemep' : 'presencial', origem: cor === 'verde' ? 'padrao' : 'municipio',
      historico_id: 'h1', vigente_desde: cor === 'verde' ? null : '2026-11-10T11:00:00-03:00',
      justificativa: cor === 'verde' ? null : 'Focos de calor acima da média e umidade relativa abaixo de 30%.',
      ato_referencia: cor === 'verde' ? null : 'Ata do Comitê de Crise nº 12/2026',
    },
    acoes: catalogo.filter((a) => nivel[a.cor] <= nivel[cor]),
    checklistHoje: {
      id: 'c1', escola_id: 'e1', data: '2026-11-11', bandeira_cor: cor, situacao_agua: 'reduzida', reservatorio_percentual: 42,
      temperatura_max_c: 36.5, nivel_fumaca: 'moderada', situacao_acesso: 'normal', alunos_presentes: 640, alunos_com_sintomas: 3,
      acoes: { 'VRD-AGUA': true, 'AMA-HIDRATACAO': true }, observacoes: null, updated_at: '2026-11-11T09:00:00-03:00',
    },
    memorandosRecentes: [
      { id: 'm1', numero: 'MEMO-15000001-2026-0004', status: 'em_analise_dre', prioridade: 'alta', tipos_ameaca: ['fumaca_queimadas'], created_at: '2026-11-11T08:10:00-03:00', enviado_em: '2026-11-11T08:20:00-03:00' },
      { id: 'm2', numero: 'MEMO-15000001-2026-0003', status: 'atendido', prioridade: 'normal', tipos_ameaca: ['estiagem_agua'], created_at: '2026-11-06T10:00:00-03:00', enviado_em: '2026-11-06T10:05:00-03:00' },
      { id: 'm3', numero: null, status: 'rascunho', prioridade: 'normal', tipos_ameaca: ['outros'], created_at: '2026-11-11T13:40:00-03:00', enviado_em: null },
    ],
  };
  return <DashboardEscola painel={painel} />;
}
