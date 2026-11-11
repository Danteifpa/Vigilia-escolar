import type { NextRequest } from 'next/server';
import { atualizarSessao, redirecionarComCookies } from '@/lib/supabase/middleware';
import { decidirRota } from '@/modules/auth/perfis';

export async function middleware(request: NextRequest) {
  const { response, claims } = await atualizarSessao(request);
  const decisao = decidirRota({
    pathname: request.nextUrl.pathname,
    search: request.nextUrl.search,
    autenticado: !!claims?.sub,
    perfil: claims?.app_perfil,
  });
  return decisao.tipo === 'seguir' ? response : redirecionarComCookies(request, response, decisao.para);
}

export const config = {
  // Fora: assets, PWA e API (as rotas de API respondem 401/403 por conta própria)
  matcher: ['/((?!_next/static|_next/image|favicon.ico|sw.js|swe-worker|manifest.webmanifest|icons/|api/).*)'],
};
