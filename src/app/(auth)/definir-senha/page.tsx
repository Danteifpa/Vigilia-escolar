import type { Metadata } from 'next';
import { FormularioSenha } from '@/components/auth/FormularioSenha';

export const metadata: Metadata = { title: 'Definir senha · Vigília Escolar PA' };

/** Destino do link de convite e de recuperação de senha (exige sessão; ver middleware). */
export default function DefinirSenha() {
  return (
    <>
      <h1 className="text-xl font-bold">Defina sua senha</h1>
      <p className="mb-5 text-sm text-slate-600">Ela será usada para entrar no sistema neste e em outros aparelhos.</p>
      <FormularioSenha />
    </>
  );
}
