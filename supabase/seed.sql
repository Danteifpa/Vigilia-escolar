-- =============================================================================
-- Seed: catálogo de ações do protocolo por bandeira + dados de exemplo
-- As ações são CUMULATIVAS: na AMARELA valem as da VERDE; na VERMELHA, todas.
-- Revisar a redação contra o texto oficial do protocolo 2026-2027.
-- =============================================================================

insert into protocolo_acoes (cor, codigo, titulo, descricao, obrigatoria, diaria, ordem) values
-- VERDE — Prevenção e Monitoramento
('verde', 'VRD-AGUA',         'Verificar reservatório e abastecimento de água',
 'Registrar nível do reservatório (%) e situação do abastecimento no checklist do dia.', true, true, 10),
('verde', 'VRD-BEBEDOUROS',   'Conferir bebedouros e pontos de água potável',
 'Garantir ao menos um ponto de água potável por bloco em funcionamento.', true, true, 20),
('verde', 'VRD-ACESSO',       'Monitorar acesso e transporte escolar',
 'Registrar rotas interrompidas (estradas, rios em estiagem) e alunos afetados.', true, true, 30),
('verde', 'VRD-VULNERAVEIS',  'Manter mapeamento de alunos vulneráveis atualizado',
 'Doenças respiratórias, cardiopatias e alunos com risco de isolamento.', true, false, 40),

-- AMARELA — Atenção e Preparação
('amarela', 'AMA-ATIV-EXTERNAS', 'Restringir atividades externas e esforço físico',
 'Suspender aulas de Ed. Física ao ar livre e recreio em área descoberta nos horários de maior calor ou com fumaça.', true, true, 10),
('amarela', 'AMA-HIDRATACAO',    'Pausas programadas de hidratação em todas as turmas',
 'Orientar professores a liberar pausas e manter garrafas/copos disponíveis.', true, true, 20),
('amarela', 'AMA-CADERNOS',      'Preparar cadernos de contingência',
 'Material impresso para alunos com risco de isolamento caso a bandeira evolua.', true, false, 30),
('amarela', 'AMA-FAMILIAS',      'Comunicar famílias sobre a bandeira amarela',
 'Aviso pelos canais da escola com as orientações de hidratação e sinais de alerta.', true, false, 40),

-- VERMELHA — Resposta e Proteção
('vermelha', 'VRM-PROTECAO',     'Prioridade total à proteção dos estudantes',
 'Manter alunos em ambientes protegidos, ventilados ou climatizados; janelas fechadas em caso de fumaça.', true, true, 10),
('vermelha', 'VRM-ISOLAR-AREAS', 'Isolar áreas de risco',
 'Sinalizar e interditar áreas expostas a fumaça, calor ou risco estrutural.', true, true, 20),
('vermelha', 'VRM-SAUDE',        'Registrar e encaminhar alunos com sintomas',
 'Contabilizar no checklist e acionar a rede de saúde via DRE quando necessário.', true, true, 30),
('vermelha', 'VRM-ORGAOS',       'Articular órgãos de emergência via DRE',
 'Defesa Civil, Corpo de Bombeiros, SAMU — registrar o acionamento em memorando.', true, false, 40),
('vermelha', 'VRM-REGIME',       'Aplicar o regime pedagógico definido pela Gestão Estadual',
 'Atividades não presenciais/CEMEP somente após validação formal da Gestão Estadual.', true, false, 50);

-- Dados de exemplo (fictícios) para desenvolvimento local
insert into dres (id, codigo, nome) values
  ('00000000-0000-0000-0000-0000000000d6', 'BELEM-06', 'DRE Belém 06');

insert into municipios (id, nome) values
  (1501402, 'Belém'),
  (1500107, 'Abaetetuba');

insert into escolas (id, codigo_inep, nome, dre_id, municipio_id, zona, total_matriculas, fonte_agua,
                     capacidade_reservatorio_litros, risco_isolamento) values
  ('00000000-0000-0000-0000-00000000e501', '15000001', 'EEEFM Exemplo Vigília (fictícia)',
   '00000000-0000-0000-0000-0000000000d6', 1501402, 'urbana', 820, 'rede pública', 10000, false),
  ('00000000-0000-0000-0000-00000000e502', '15000002', 'EEEF Ribeirinha Exemplo (fictícia)',
   '00000000-0000-0000-0000-0000000000d6', 1501402, 'ribeirinha', 140, 'poço', 3000, true);
