import { CabecalhoArea } from '@/components/layout/CabecalhoArea';
import { exigirPerfil } from '@/modules/auth/sessao';

export const dynamic = 'force-dynamic';

export default async function LayoutDre({ children }: { children: React.ReactNode }) {
  const { db, perfil } = await exigirPerfil('dre');
  const { data: dre } = await db.from('dres').select('nome').eq('id', perfil.dre_id!).single();
  return (
    <>
      <CabecalhoArea perfil="dre" nome={perfil.nome} subtitulo={dre?.nome}
        links={[{ href: '/dre', rotulo: 'Painel' }, { href: '/dre/usuarios', rotulo: 'Usuários' }]} />
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </>
  );
}
