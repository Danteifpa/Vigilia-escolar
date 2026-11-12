'use client';

import { useRouter } from 'next/navigation';
import { useMudancasTabela } from '@/lib/supabase/useMudancasTabela';

/** Recarrega a página (dados do servidor) quando uma das tabelas muda. Não renderiza nada. */
function Assinatura({ tabela, aoMudar }: { tabela: string; aoMudar: () => void }) {
  useMudancasTabela(tabela, aoMudar);
  return null;
}

export function AtualizarAoMudar({ tabelas }: { tabelas: string[] }) {
  const router = useRouter();
  return <>{tabelas.map((t) => <Assinatura key={t} tabela={t} aoMudar={() => router.refresh()} />)}</>;
}
