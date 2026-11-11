import type { Metadata } from 'next';
import { FormularioEntrar } from '@/components/auth/FormularioEntrar';
import { Alert } from '@/components/ui';
import { ERROS_DE_ENTRADA } from '@/modules/auth/mensagens';
import { caminhoSeguro } from '@/modules/auth/perfis';

export const metadata: Metadata = { title: 'Entrar · Vigília Escolar PA' };

export default async function Entrar({ searchParams }: { searchParams: Promise<{ proximo?: string; erro?: string }> }) {
  const { proximo, erro } = await searchParams;
  return (
    <>
      <h1 className="text-xl font-bold">Entrar</h1>
      <p className="mb-5 text-sm text-slate-600">Use o e-mail cadastrado pela sua DRE ou pela SEDUC.</p>
      {erro && ERROS_DE_ENTRADA[erro] && <Alert tom="erro" className="mb-4">{ERROS_DE_ENTRADA[erro]}</Alert>}
      <FormularioEntrar proximo={caminhoSeguro(proximo)} />
    </>
  );
}
