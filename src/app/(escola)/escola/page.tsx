import { redirect } from 'next/navigation';
import { DashboardEscola } from '@/components/escola/DashboardEscola';
import { supabaseServidor } from '@/lib/supabase/server';
import { carregarPainelEscola } from '@/modules/escola/painel';

export const dynamic = 'force-dynamic';

/** Painel da Escola — renderizado no servidor; hidratado como PWA no cliente. */
export default async function PaginaEscola() {
  const db = await supabaseServidor();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/entrar');

  const { data: perfil } = await db.from('users').select('perfil, escola_id').eq('id', user.id).single();
  if (perfil?.perfil === 'dre') redirect('/dre');
  if (perfil?.perfil === 'seduc') redirect('/seduc');
  if (!perfil?.escola_id) redirect('/entrar?erro=sem_vinculo');

  const painel = await carregarPainelEscola(db, perfil.escola_id);
  return <DashboardEscola painel={painel} />;
}
