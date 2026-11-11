'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Alert, ariaCampo, Button, Field, Input } from '@/components/ui';
import { supabaseNavegador } from '@/lib/supabase/client';
import { traduzirErroAuth } from '@/modules/auth/mensagens';

const schema = z
  .object({
    senha: z.string().min(10, 'Use ao menos 10 caracteres').regex(/[A-Za-z]/, 'Inclua letras').regex(/\d/, 'Inclua números'),
    confirmacao: z.string(),
  })
  .refine((d) => d.senha === d.confirmacao, { message: 'As senhas não conferem', path: ['confirmacao'] });

export function FormularioSenha() {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { senha: '', confirmacao: '' } });
  const { errors, isSubmitting } = form.formState;

  const enviar = form.handleSubmit(async ({ senha }) => {
    setErro(null);
    const { error } = await supabaseNavegador().auth.updateUser({ password: senha });
    if (error) return setErro(traduzirErroAuth(error));
    router.replace('/');
    router.refresh();
  });

  return (
    <form onSubmit={enviar} noValidate className="space-y-4">
      {erro && <Alert tom="erro">{erro}</Alert>}
      <Field id="senha" rotulo="Nova senha" dica="Mínimo de 10 caracteres, com letras e números." erro={errors.senha?.message} obrigatorio>
        <Input {...ariaCampo('senha', errors.senha?.message)} {...form.register('senha')} type="password" autoComplete="new-password" />
      </Field>
      <Field id="confirmacao" rotulo="Confirme a senha" erro={errors.confirmacao?.message} obrigatorio>
        <Input {...ariaCampo('confirmacao', errors.confirmacao?.message)} {...form.register('confirmacao')} type="password" autoComplete="new-password" />
      </Field>
      <Button type="submit" larguraTotal tamanho="lg" carregando={isSubmitting}>Salvar senha e entrar</Button>
    </form>
  );
}
