import { z } from 'zod';

/**
 * Checklist diário da escola. Um único schema valida o formulário (inclusive
 * offline) e a API. Rótulos e "tom" alimentam a tela e os indicadores do painel.
 */
export type Tom = 'ok' | 'atencao' | 'critico';
interface Opcao<V extends string> { valor: V; rotulo: string; descricao: string; tom: Tom }

export const OPCOES_AGUA = [
  { valor: 'normal', rotulo: 'Normal', descricao: 'Abastecimento regular', tom: 'ok' },
  { valor: 'reduzida', rotulo: 'Reduzida', descricao: 'Pressão baixa ou racionamento', tom: 'atencao' },
  { valor: 'critica', rotulo: 'Crítica', descricao: 'Só o reservatório, sem reposição', tom: 'critico' },
  { valor: 'sem_agua', rotulo: 'Sem água', descricao: 'Nenhuma água disponível', tom: 'critico' },
] as const satisfies readonly Opcao<string>[];

export const OPCOES_FUMACA = [
  { valor: 'ausente', rotulo: 'Ausente', descricao: 'Ar limpo', tom: 'ok' },
  { valor: 'leve', rotulo: 'Leve', descricao: 'Cheiro de fumaça, sem névoa', tom: 'atencao' },
  { valor: 'moderada', rotulo: 'Moderada', descricao: 'Névoa visível, incômodo', tom: 'atencao' },
  { valor: 'intensa', rotulo: 'Intensa', descricao: 'Névoa densa, ardência nos olhos', tom: 'critico' },
] as const satisfies readonly Opcao<string>[];

export const OPCOES_ACESSO = [
  { valor: 'normal', rotulo: 'Normal', descricao: 'Transporte e rotas funcionando', tom: 'ok' },
  { valor: 'restrito', rotulo: 'Restrito', descricao: 'Atrasos, rotas parciais', tom: 'atencao' },
  { valor: 'interrompido', rotulo: 'Interrompido', descricao: 'Alunos sem como chegar', tom: 'critico' },
] as const satisfies readonly Opcao<string>[];

const valores = <T extends readonly { valor: string }[]>(o: T) =>
  o.map((x) => x.valor) as unknown as [T[number]['valor'], ...T[number]['valor'][]];

const inteiroOpcional = z.number({ invalid_type_error: 'Informe um número' }).int('Use número inteiro').min(0, 'Não pode ser negativo').nullable();

export const checklistSchema = z
  .object({
    id: z.string().uuid(),
    data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
    situacao_agua: z.enum(valores(OPCOES_AGUA), { message: 'Informe a situação da água' }),
    reservatorio_percentual: inteiroOpcional.refine((v) => v === null || v <= 100, 'Máximo 100%'),
    temperatura_max_c: z.number({ invalid_type_error: 'Informe um número' })
      .min(10, 'Temperatura muito baixa — confira').max(60, 'Temperatura muito alta — confira').nullable(),
    nivel_fumaca: z.enum(valores(OPCOES_FUMACA), { message: 'Informe o nível de fumaça' }),
    situacao_acesso: z.enum(valores(OPCOES_ACESSO), { message: 'Informe a situação de acesso' }),
    alunos_presentes: inteiroOpcional,
    alunos_com_sintomas: z.number({ invalid_type_error: 'Informe um número' }).int().min(0, 'Não pode ser negativo'),
    acoes: z.record(z.boolean()),
    observacoes: z.string().trim().max(2000, 'Máximo de 2000 caracteres').nullable(),
  })
  .refine((d) => d.alunos_presentes === null || d.alunos_com_sintomas <= d.alunos_presentes, {
    message: 'Não pode ser maior que o número de presentes',
    path: ['alunos_com_sintomas'],
  });

export type ChecklistInput = z.infer<typeof checklistSchema>;

/** Datas aceitas: hoje e até 2 dias atrás (preenchimento offline sincronizado depois). */
export function dataPermitida(data: string, hoje: string): boolean {
  const dias = (Date.parse(hoje) - Date.parse(data)) / 86_400_000;
  return Number.isInteger(dias) && dias >= 0 && dias <= 2;
}
