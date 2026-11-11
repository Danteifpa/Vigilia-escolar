#!/usr/bin/env node
/**
 * Diagnóstico: entra com cada usuário de desenvolvimento e mostra as claims de
 * perfil do token (hook custom_access_token). Uso: npm run dev:verificar
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const senha = process.env.SENHA_DEV ?? 'SenhaDev2026';
let falhas = 0;

for (const email of ['escola@vigilia.dev', 'dre@vigilia.dev', 'estadual@vigilia.dev']) {
  const sb = createClient(url, anon, { auth: { persistSession: false } });
  const { data, error } = await sb.auth.signInWithPassword({ email, password: senha });
  if (error) {
    falhas++;
    console.log(`✘ ${email}: ${error.code ?? ''} ${error.message}`);
    continue;
  }
  const [, payload] = data.session.access_token.split('.');
  const claims = JSON.parse(Buffer.from(payload, 'base64url').toString());
  const { data: verificadas, error: erroClaims } = await sb.auth.getClaims();
  if (!claims.app_perfil) falhas++;
  console.log(`${claims.app_perfil ? '✔' : '✘'} ${email}: alg=${JSON.parse(Buffer.from(data.session.access_token.split('.')[0], 'base64url'))?.alg}`,
    `app_perfil=${claims.app_perfil} escola=${claims.app_escola_id} dre=${claims.app_dre_id}`,
    `getClaims=${verificadas?.claims ? 'ok' : `falhou ${erroClaims?.message}`}`);
}
process.exit(falhas ? 1 : 0);
