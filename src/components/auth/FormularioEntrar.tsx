'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Alert, ariaCampo, Button, Field, Input } from '@/components/ui';
import { supabaseNavegador } from '@/lib/supabase/client';
import { traduzirErroAuth } from '@/modules/auth/mensagens';

// Senha é exigida só no modo "entrar" (verificada no envio)
const schema = z.object({
  email: z.string().trim().toLowerCase().email('Informe um e-mail válido'),
  senha: z.string(),
});
type Dados = z.infer<typeof schema>;

export function FormularioEntrar({ proximo }: { proximo: string | null }) {
  const router = useRouter();
  const [modo, setModo] = useState<'entrar' | 'recuperar'>('entrar');
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const form = useForm<Dados>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', senha: '' },
  });
  const { errors, isSubmitting } = form.formState;

  const enviar = form.handleSubmit(async ({ email, senha }) => {
    setErro(null);
    setAviso(null);
    const supabase = supabaseNavegador();

    if (modo === 'recuperar') {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?proximo=/definir-senha`,
      });
      // Mesma resposta exista ou não a conta (não revela e-mails cadastrados)
      if (error && error.code?.startsWith('over_')) setErro(traduzirErroAuth(error));
      else setAviso('Se o e-mail estiver cadastrado, você receberá um link para criar uma nova senha.');
      return;
    }

    if (!senha) {
      form.setError('senha', { message: 'Informe a senha' });
      return;
    }
    if (!navigator.onLine) {
      setErro('Sem internet. O primeiro acesso de cada aparelho precisa de conexão.');
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) {
      setErro(traduzirErroAuth(error));
      return;
    }
    router.replace(proximo ?? '/');
    router.refresh();
  });

  return (
    <form onSubmit={enviar} noValidate className="space-y-4">
      {erro && <Alert tom="erro">{erro}</Alert>}
      {aviso && <Alert tom="sucesso">{aviso}</Alert>}

      <Field id="email" rotulo="E-mail" erro={errors.email?.message} obrigatorio>
        <Input {...ariaCampo('email', errors.email?.message)} {...form.register('email')} type="email" autoComplete="username" inputMode="email" />
      </Field>

      {modo === 'entrar' && (
        <Field id="senha" rotulo="Senha" erro={errors.senha?.message} obrigatorio>
          <Input {...ariaCampo('senha', errors.senha?.message)} {...form.register('senha')} type="password" autoComplete="current-password" />
        </Field>
      )}

      <Button type="submit" larguraTotal tamanho="lg" carregando={isSubmitting}>
        {modo === 'entrar' ? 'Entrar' : 'Enviar link de nova senha'}
      </Button>

      <button
        type="button"
        onClick={() => { setModo(modo === 'entrar' ? 'recuperar' : 'entrar'); setErro(null); setAviso(null); form.clearErrors(); }}
        className="block w-full text-center text-sm font-semibold text-sky-700 hover:underline"
      >
        {modo === 'entrar' ? 'Esqueci minha senha' : 'Voltar para o login'}
      </button>
    </form>
  );
}
