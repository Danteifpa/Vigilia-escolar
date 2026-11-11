import type { Metadata } from 'next';
import { FormularioChecklist } from '@/components/escola/FormularioChecklist';
import { exigirPerfil } from '@/modules/auth/sessao';
import { carregarPainelEscola, hojeBelem } from '@/modules/escola/painel';

export const metadata: Metadata = { title: 'Checklist do dia · Vigília Escolar PA' };
export const dynamic = 'force-dynamic';

export default async function PaginaChecklist() {
  const { db, perfil } = await exigirPerfil('escola');
  const painel = await carregarPainelEscola(db, perfil.escola_id!);
  return (
    <FormularioChecklist
      hoje={hojeBelem()}
      escolaNome={painel.escola.nome}
      cor={painel.bandeira.cor}
      acoesDiarias={painel.acoes.filter((a) => a.obrigatoria && a.diaria)}
      existente={painel.checklistHoje}
    />
  );
}
