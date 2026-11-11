import { notFound } from 'next/navigation';
import { FormularioChecklist } from '@/components/escola/FormularioChecklist';

/** Pré-visualização do checklist com dados fictícios (só fora de produção). */
export default function PreviewChecklist() {
  if (process.env.NODE_ENV === 'production' && !process.env.HABILITAR_PREVIEW) notFound();
  const acao = (codigo: string, titulo: string, descricao: string) =>
    ({ id: codigo, cor: 'amarela' as const, codigo, titulo, descricao, obrigatoria: true, diaria: true, ordem: 10 });
  return (
    <FormularioChecklist
      hoje="2026-11-11"
      escolaNome="EEEFM Exemplo Vigília (fictícia)"
      cor="amarela"
      existente={null}
      acoesDiarias={[
        acao('AMA-HIDRATACAO', 'Pausas programadas de hidratação em todas as turmas', 'Orientar professores a liberar pausas e manter água disponível.'),
        acao('VRD-AGUA', 'Verificar reservatório e abastecimento de água', 'Registrar nível do reservatório e situação do abastecimento.'),
      ]}
    />
  );
}
