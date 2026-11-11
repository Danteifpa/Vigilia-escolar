import 'server-only';
import { createClient } from '@supabase/supabase-js';

/**
 * Cliente com a service role: IGNORA a RLS. Use apenas em Server Actions/Route
 * Handlers, DEPOIS de verificar a permissão do usuário com o cliente comum.
 * Hoje: convite e ativação/desativação de usuários.
 */
export function supabaseAdmin() {
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!chave) throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurada');
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, chave, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
