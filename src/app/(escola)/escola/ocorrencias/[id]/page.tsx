import type { Metadata } from 'next';
import { BotaoSair } from '@/components/auth/BotaoSair';
import { PaginaMemorando } from '@/modules/ocorrencias/pagina';

export const metadata: Metadata = { title: 'Memorando · Vigília Escolar PA' };
export const dynamic = 'force-dynamic';

export default async function Pagina({ params }: { params: Promise<{ id: string }> }) {
  return (
    <>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <p className="font-black">Vigília Escolar PA</p>
          <BotaoSair />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <PaginaMemorando id={(await params).id} perfil="escola" voltar="/escola" />
      </main>
    </>
  );
}
