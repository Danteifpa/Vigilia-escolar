#!/usr/bin/env node
/**
 * Cria (ou atualiza) os usuários de desenvolvimento no Supabase LOCAL:
 *   escola@vigilia.dev · dre@vigilia.dev · estadual@vigilia.dev   (senha: SENHA_DEV ou SenhaDev2026)
 * Requer NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (veja `npx supabase status`).
 * Nunca rode contra produção.
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !chave) {
  console.error('Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}
if (!/127\.0\.0\.1|localhost/.test(url) && process.env.PERMITIR_REMOTO !== '1') {
  console.error(`Recusado: ${url} não é local. (PERMITIR_REMOTO=1 para homologação)`);
  process.exit(1);
}

const senha = process.env.SENHA_DEV ?? 'SenhaDev2026';
const admin = createClient(url, chave, { auth: { persistSession: false, autoRefreshToken: false } });

// IDs do seed.sql
const DRE_BELEM_06 = '00000000-0000-0000-0000-0000000000d6';
const ESCOLA_EXEMPLO = '00000000-0000-0000-0000-00000000e501';

const usuarios = [
  { email: 'estadual@vigilia.dev', nome: 'Comitê de Crise (dev)', perfil: 'estadual', cargo: 'Comitê de Crise' },
  { email: 'dre@vigilia.dev', nome: 'Coordenação DRE Belém 06 (dev)', perfil: 'dre', dre_id: DRE_BELEM_06, cargo: 'Coordenador(a)' },
  { email: 'escola@vigilia.dev', nome: 'Direção EEEFM Exemplo (dev)', perfil: 'escola', escola_id: ESCOLA_EXEMPLO, cargo: 'Diretor(a)' },
];

const { data: lista, error: erroLista } = await admin.auth.admin.listUsers({ perPage: 1000 });
if (erroLista) throw erroLista;

for (const u of usuarios) {
  let id = lista.users.find((x) => x.email === u.email)?.id;
  if (id) {
    const { error } = await admin.auth.admin.updateUserById(id, { password: senha, email_confirm: true });
    if (error) throw error;
  } else {
    const { data, error } = await admin.auth.admin.createUser({ email: u.email, password: senha, email_confirm: true, user_metadata: { nome: u.nome } });
    if (error) throw error;
    id = data.user.id;
  }
  const { error } = await admin.from('users').upsert({
    id, email: u.email, nome: u.nome, perfil: u.perfil, cargo: u.cargo,
    escola_id: u.escola_id ?? null, dre_id: u.dre_id ?? null, ativo: true,
  });
  if (error) throw error;
  console.log(`✔ ${u.perfil.padEnd(6)} ${u.email}`);
}
console.log(`Senha: ${senha}`);
