import { notFound } from 'next/navigation';
import { FormularioDecreto } from '@/components/bandeiras/FormularioDecreto';

/** Pré-visualização do formulário de decreto com dados fictícios (só fora de produção). */
export default function PreviewBandeiras() {
  if (process.env.NODE_ENV === 'production' && !process.env.HABILITAR_PREVIEW) notFound();
  return (
    <main className="mx-auto max-w-3xl p-4">
      <FormularioDecreto
        municipios={[
          { id: 1500107, nome: 'Abaetetuba', cor: null, regime: null },
          { id: 1500800, nome: 'Ananindeua', cor: 'amarela', regime: 'presencial' },
          { id: 1501402, nome: 'Belém', cor: 'amarela', regime: 'presencial_adaptado' },
          { id: 1505536, nome: 'Parauapebas', cor: 'vermelha', regime: 'cemep' },
          { id: 1506807, nome: 'Santarém', cor: null, regime: null },
        ]}
        escolas={[{ id: '00000000-0000-0000-0000-00000000e501', nome: 'EEEFM Exemplo Vigília (fictícia)', codigo_inep: '15000001', municipio: 'Belém', cor: 'amarela', origem: 'municipio' }]}
      />
    </main>
  );
}
