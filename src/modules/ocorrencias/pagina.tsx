import { notFound } from 'next/navigation';
import { DetalheMemorando, type MemorandoDetalhado } from '@/components/ocorrencias/DetalheMemorando';
import { AtualizarAoMudar } from '@/components/realtime/AtualizarAoMudar';
import type { Perfil } from '@/modules/auth/perfis';
import { exigirPerfil } from '@/modules/auth/sessao';
import { obterMemorando } from './repositorio';

/** Página de detalhe compartilhada pelas rotas /escola, /dre e /estadual. A RLS decide o que cada um vê. */
export async function PaginaMemorando({ id, perfil, voltar }: { id: string; perfil: Perfil; voltar: string }) {
  const { db } = await exigirPerfil(perfil);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { data } = await obterMemorando(db, id);
  if (!data) notFound();
  return (
    <>
      <AtualizarAoMudar tabelas={['memorandos_ocorrencia']} />
      <DetalheMemorando memo={data as MemorandoDetalhado} perfil={perfil} voltar={voltar} />
    </>
  );
}
