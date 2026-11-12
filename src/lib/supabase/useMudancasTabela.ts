'use client';

import type { RealtimeChannel } from '@supabase/supabase-js';
import { useEffect, useRef } from 'react';
import { supabaseNavegador } from './client';

/**
 * Assina mudanças de uma tabela via Supabase Realtime (respeitando a RLS).
 * O canal precisa entrar COM o token do usuário: sem isso o Realtime o trata
 * como anônimo e a RLS filtra todos os eventos — sem erro nenhum. Por isso a
 * sessão é lida e entregue ao Realtime antes de assinar.
 */
export function useMudancasTabela(tabela: string, aoMudar: () => void) {
  const callback = useRef(aoMudar);
  callback.current = aoMudar;

  useEffect(() => {
    const sb = supabaseNavegador();
    let canal: RealtimeChannel | undefined;
    let ativo = true;

    void (async () => {
      const { data: { session } } = await sb.auth.getSession();
      if (!ativo || !session) return;
      await sb.realtime.setAuth(session.access_token);
      if (!ativo) return;
      canal = sb
        .channel(`mudancas:${tabela}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: tabela }, () => callback.current())
        .subscribe((status, erro) => {
          // Sem tempo real o app segue funcionando (atualiza ao navegar); só registra
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') console.warn(`[realtime] ${tabela}:`, status, erro?.message ?? '');
        });
    })();

    return () => {
      ativo = false;
      if (canal) void sb.removeChannel(canal);
    };
  }, [tabela]);
}
