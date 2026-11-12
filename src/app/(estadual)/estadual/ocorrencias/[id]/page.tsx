import type { Metadata } from 'next';
import { PaginaMemorando } from '@/modules/ocorrencias/pagina';

export const metadata: Metadata = { title: 'Memorando · Vigília Escolar PA' };
export const dynamic = 'force-dynamic';

export default async function Pagina({ params }: { params: Promise<{ id: string }> }) {
  return <PaginaMemorando id={(await params).id} perfil="estadual" voltar="/estadual" />;
}
