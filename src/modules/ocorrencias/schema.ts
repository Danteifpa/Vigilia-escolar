import { z } from 'zod';

/**
 * Memorando de Ocorrência — Anexo I do Protocolo SEDUC/PA.
 * Um único schema serve ao formulário (cliente/offline) e à API (servidor).
 */
export const TIPOS_AMEACA = ['fumaca_queimadas', 'estiagem_agua', 'outros'] as const;
export const PRIORIDADES = ['normal', 'alta', 'critica'] as const;

export const ROTULOS_AMEACA: Record<(typeof TIPOS_AMEACA)[number], string> = {
  fumaca_queimadas: 'Fumaça / Queimadas',
  estiagem_agua: 'Estiagem / Falta de água',
  outros: 'Outros',
};

const textoLivre = z.string().trim().max(4000);

/** Campos editáveis pela escola (coincidem com os GRANTs de coluna no banco). */
const camposAnexoI = z.object({
  prioridade: z.enum(PRIORIDADES).default('normal'),
  tipos_ameaca: z.array(z.enum(TIPOS_AMEACA)).min(1, 'Selecione ao menos um tipo de ameaça'),
  ameaca_outros_descricao: textoLivre.max(500).nullish(),
  data_hora_ocorrencia: z.string().datetime({ offset: true }),
  descricao_situacao: textoLivre.nullish(),
  impactos_pedagogicos: textoLivre.nullish(),
  impactos_operacionais: textoLivre.nullish(),
  alunos_afetados: z.number().int().min(0).nullish(),
  aulas_suspensas: z.boolean().default(false),
  providencias_tomadas: textoLivre.nullish(),
  apoio_necessario_dre: textoLivre.nullish(),
  client_updated_at: z.string().datetime({ offset: true }).optional(),
});

const outrosDescrito = (d: { tipos_ameaca?: string[]; ameaca_outros_descricao?: string | null }) =>
  !d.tipos_ameaca?.includes('outros') || !!d.ameaca_outros_descricao?.trim();
const msgOutros = { message: 'Descreva a ameaça "Outros"', path: ['ameaca_outros_descricao'] };

/** POST /api/memorandos — cria rascunho. `id` é gerado no aparelho (idempotência offline). */
export const criarRascunhoSchema = camposAnexoI.extend({ id: z.string().uuid() }).refine(outrosDescrito, msgOutros);

/** PATCH /api/memorandos/:id — edição parcial com controle de concorrência otimista. */
export const atualizarRascunhoSchema = camposAnexoI
  .partial()
  .extend({ base_updated_at: z.string().datetime({ offset: true }).optional() })
  .refine(outrosDescrito, msgOutros);

/** Validação completa exigida no despacho (o banco revalida em enviar_memorando). */
const obrigatorio = (rotulo: string) => z.string().trim().min(10, `${rotulo}: descreva com ao menos 10 caracteres`);
export const memorandoCompletoSchema = camposAnexoI
  .extend({
    descricao_situacao: obrigatorio('Descrição da situação'),
    impactos_pedagogicos: obrigatorio('Impactos pedagógicos'),
    impactos_operacionais: obrigatorio('Impactos operacionais'),
    providencias_tomadas: obrigatorio('Providências tomadas'),
    apoio_necessario_dre: obrigatorio('Apoio necessário da DRE'),
  })
  .refine(outrosDescrito, msgOutros);

export const ACOES_TRAMITACAO = ['receber', 'devolver', 'encaminhar_seduc', 'atender', 'arquivar'] as const;
export const tramitarSchema = z.object({
  acao: z.enum(ACOES_TRAMITACAO),
  parecer: z.string().trim().max(4000).optional(),
});

export type CriarRascunhoInput = z.infer<typeof criarRascunhoSchema>;
export type AtualizarRascunhoInput = z.infer<typeof atualizarRascunhoSchema>;
export type TramitarInput = z.infer<typeof tramitarSchema>;
