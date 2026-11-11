import { CabecalhoArea } from '@/components/layout/CabecalhoArea';
import { exigirPerfil } from '@/modules/auth/sessao';

export const dynamic = 'force-dynamic';

export default async function LayoutSeduc({ children }: { children: React.ReactNode }) {
  const { perfil } = await exigirPerfil('seduc');
  return (
    <>
      <CabecalhoArea perfil="seduc" nome={perfil.nome}
        links={[{ href: '/seduc', rotulo: 'Painel' }, { href: '/seduc/usuarios', rotulo: 'Usuários' }]} />
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </>
  );
}
