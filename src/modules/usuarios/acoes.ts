'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { exigirPerfil } from '@/modules/auth/sessao';

/**
 * Provisionamento de contas (não há autocadastro).
 *  - Gestão Estadual convida qualquer perfil.
 *  - DRE convida apenas usuários de escolas do seu polo.
 * A permissão é checada com o cliente do próprio usuário (RLS); só depois o
 * cliente admin (service role) cria a conta no Auth e o perfil em `users`.
 */
const vazioParaUndefined = (v: unknown) => (v === '' || v === null ? undefined : v);

const conviteSchema = z
  .object({
    nome: z.string().trim().min(3, 'Informe o nome completo').max(120),
    email: z.string().trim().toLowerCase().email('E-mail inválido'),
    perfil: z.enum(['escola', 'dre', 'estadual'], { message: 'Escolha o perfil' }),
    escola_id: z.preprocess(vazioParaUndefined, z.string().uuid().optional()),
    dre_id: z.preprocess(vazioParaUndefined, z.string().uuid().optional()),
    cargo: z.preprocess(vazioParaUndefined, z.string().trim().max(80).optional()),
  })
  .superRefine((d, ctx) => {
    if (d.perfil === 'escola' && !d.escola_id) ctx.addIssue({ code: 'custom', path: ['escola_id'], message: 'Escolha a escola' });
    if (d.perfil === 'dre' && !d.dre_id) ctx.addIssue({ code: 'custom', path: ['dre_id'], message: 'Escolha a DRE' });
  });

export interface EstadoConvite {
  ok?: boolean;
  mensagem?: string;
  erros?: Partial<Record<keyof z.infer<typeof conviteSchema>, string>>;
}

export async function convidarUsuario(_anterior: EstadoConvite, formData: FormData): Promise<EstadoConvite> {
  const { db, perfil: ator } = await exigirPerfil('estadual', 'dre');

  const parse = conviteSchema.safeParse(Object.fromEntries(formData));
  if (!parse.success) {
    const erros: EstadoConvite['erros'] = {};
    for (const i of parse.error.issues) erros[i.path[0] as keyof typeof erros] ??= i.message;
    return { ok: false, mensagem: 'Revise os campos destacados.', erros };
  }
  const d = parse.data;

  if (ator.perfil === 'dre' && d.perfil !== 'escola') {
    return { ok: false, mensagem: 'A DRE pode convidar apenas usuários de escola.' };
  }
  if (d.perfil === 'escola') {
    // RLS: a DRE só enxerga as escolas do seu polo
    const { data: escola } = await db.from('escolas').select('id').eq('id', d.escola_id!).maybeSingle();
    if (!escola) return { ok: false, mensagem: 'Escola não encontrada ou fora da sua área.', erros: { escola_id: 'Escola inválida' } };
  }

  const admin = supabaseAdmin();
  const jaCadastrado = { ok: false, mensagem: 'Já existe uma conta com este e-mail.', erros: { email: 'E-mail já cadastrado' } } as const;

  // Conta com perfil já existe? (o convite do Supabase reaproveitaria um convite pendente)
  const { data: existente } = await admin.from('users').select('id').eq('email', d.email).maybeSingle();
  if (existente) return jaCadastrado;

  const { data: convite, error: erroConvite } = await admin.auth.admin.inviteUserByEmail(d.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?proximo=/definir-senha`,
    data: { nome: d.nome },
  });
  if (erroConvite || !convite.user) {
    const jaExiste = erroConvite?.code === 'email_exists' || /already/i.test(erroConvite?.message ?? '');
    return jaExiste ? jaCadastrado : { ok: false, mensagem: 'Não foi possível enviar o convite.' };
  }

  const { error: erroPerfil } = await admin.from('users').insert({
    id: convite.user.id,
    nome: d.nome,
    email: d.email,
    perfil: d.perfil,
    escola_id: d.perfil === 'escola' ? d.escola_id : null,
    dre_id: d.perfil === 'dre' ? d.dre_id : null,
    cargo: d.cargo ?? null,
    convidado_por: ator.id,
  });
  if (erroPerfil?.code === '23505') {
    // Envio repetido (duplo clique, reenvio da rede): o perfil já foi gravado. Nunca apagar a conta aqui.
    return jaCadastrado;
  }
  if (erroPerfil) {
    // Conta recém-criada sem perfil: remove para não deixar órfã no Auth
    if (!convite.user.last_sign_in_at) await admin.auth.admin.deleteUser(convite.user.id);
    console.error('[convite] falha ao gravar perfil', erroPerfil);
    return { ok: false, mensagem: 'Não foi possível concluir o cadastro. Nada foi criado.' };
  }

  revalidatePath(`/${ator.perfil}/usuarios`);
  return { ok: true, mensagem: `Convite enviado para ${d.email}. O link vale por 24 horas.` };
}

/** Ativa/desativa acesso: bloqueia o login no Auth e a RLS (users.ativo). */
export async function alterarAcesso(formData: FormData): Promise<void> {
  const { db, perfil: ator } = await exigirPerfil('estadual', 'dre');
  const id = z.string().uuid().parse(formData.get('id'));
  const ativo = formData.get('ativo') === 'true';
  if (id === ator.id) return;

  const { data: alvo } = await db.from('users').select('id, perfil').eq('id', id).maybeSingle();
  if (!alvo || (ator.perfil === 'dre' && alvo.perfil !== 'escola')) return;

  const admin = supabaseAdmin();
  await admin.from('users').update({ ativo }).eq('id', id);
  await admin.auth.admin.updateUserById(id, { ban_duration: ativo ? 'none' : '876000h' });
  revalidatePath(`/${ator.perfil}/usuarios`);
}
