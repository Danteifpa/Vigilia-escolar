import { BotaoSair } from '@/components/auth/BotaoSair';
import { DashboardEscola } from '@/components/escola/DashboardEscola';
import { exigirPerfil } from '@/modules/auth/sessao';
import { carregarPainelEscola } from '@/modules/escola/painel';

export const dynamic = 'force-dynamic';

/** Painel da Escola — renderizado no servidor; hidratado como PWA no cliente. */
export default async function PaginaEscola() {
  const { db, perfil } = await exigirPerfil('escola');
  const painel = await carregarPainelEscola(db, perfil.escola_id!);
  return <DashboardEscola painel={painel} acoesCabecalho={<BotaoSair />} />;
}
