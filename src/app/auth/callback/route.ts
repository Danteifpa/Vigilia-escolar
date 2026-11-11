import type { EmailOtpType } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { supabaseServidor } from '@/lib/supabase/server';
import { caminhoSeguro } from '@/modules/auth/perfis';

/**
 * Destino dos links enviados por e-mail (convite e recuperação de senha).
 * Aceita os dois formatos do Supabase:
 *  - ?token_hash=...&type=invite|recovery   (templates em supabase/templates)
 *  - ?code=...                               (fluxo PKCE)
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get('token_hash');
  const tipo = url.searchParams.get('type') as EmailOtpType | null;
  const code = url.searchParams.get('code');
  const padrao = tipo === 'invite' || tipo === 'recovery' ? '/definir-senha' : '/';
  const proximo = caminhoSeguro(url.searchParams.get('proximo')) ?? padrao;

  const db = await supabaseServidor();
  const { error } = tokenHash && tipo
    ? await db.auth.verifyOtp({ token_hash: tokenHash, type: tipo })
    : code
      ? await db.auth.exchangeCodeForSession(code)
      : { error: new Error('link sem token') };

  return NextResponse.redirect(new URL(error ? '/entrar?erro=link_invalido' : proximo, url.origin));
}
