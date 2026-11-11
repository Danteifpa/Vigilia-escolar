import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Renova a sessão (cookies) a cada navegação e devolve as claims verificadas do JWT,
 * incluindo app_perfil / app_escola_id / app_dre_id (hook da migration 003).
 */
export async function atualizarSessao(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (lista) => {
        lista.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        lista.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // getClaims valida a assinatura do token (não confiar em getSession no servidor)
  const { data } = await supabase.auth.getClaims();
  return { response, claims: data?.claims ?? null };
}

/** Redireciona preservando cookies de sessão renovados nesta requisição. */
export function redirecionarComCookies(request: NextRequest, origem: NextResponse, destino: string) {
  const resposta = NextResponse.redirect(new URL(destino, request.url));
  origem.cookies.getAll().forEach((c) => resposta.cookies.set(c));
  return resposta;
}
