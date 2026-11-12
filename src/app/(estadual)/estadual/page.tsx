import { FilaMemorandos, ordenarFila, type ItemFila } from '@/components/ocorrencias/FilaMemorandos';
import { ResumoInicial } from '@/components/painel/ResumoInicial';
import { AtualizarAoMudar } from '@/components/realtime/AtualizarAoMudar';
import { Card, CardHeader } from '@/components/ui';
import { exigirPerfil } from '@/modules/auth/sessao';

export const dynamic = 'force-dynamic';

export default async function Painel() {
  const { db } = await exigirPerfil('estadual');
  const { data } = await db
    .from('memorandos_ocorrencia')
    .select('id, numero, status, prioridade, tipos_ameaca, enviado_em, created_at, escola:escolas(nome)')
    .eq('status', 'encaminhado_estadual')
    .returns<ItemFila[]>();

  return (
    <div className="space-y-5">
      <AtualizarAoMudar tabelas={['memorandos_ocorrencia']} />
      <ResumoInicial />
      <Card>
        <CardHeader titulo="Pedidos encaminhados pelas DREs" descricao="Mais urgente primeiro; na mesma prioridade, quem espera há mais tempo." />
        <FilaMemorandos itens={ordenarFila(data ?? [])} base="/estadual/ocorrencias" vazio="Nenhum pedido aguardando a Gestão Estadual." />
      </Card>
    </div>
  );
}
