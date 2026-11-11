import { CabecalhoArea } from '@/components/layout/CabecalhoArea';
import { exigirPerfil } from '@/modules/auth/sessao';

export const dynamic = 'force-dynamic';

export default async function LayoutEstadual({ children }: { children: React.ReactNode }) {
  const { perfil } = await exigirPerfil('estadual');
  return (
    <>
      <CabecalhoArea perfil="estadual" nome={perfil.nome}
        links={[{ href: '/estadual', rotulo: 'Painel' }, { href: '/estadual/usuarios', rotulo: 'Usuários' }]} />
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </>
  );
}
