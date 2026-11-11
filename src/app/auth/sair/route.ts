import { NextResponse, type NextRequest } from 'next/server';
import { supabaseServidor } from '@/lib/supabase/server';

/** POST /auth/sair — encerra a sessão (form com method="post"). */
export async function POST(request: NextRequest) {
  const db = await supabaseServidor();
  await db.auth.signOut();
  return NextResponse.redirect(new URL('/entrar', request.url), { status: 303 });
}
