import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { cn } from './cn';

const BASE_CONTROLE =
  'block w-full rounded-lg border-0 bg-white px-3 py-2.5 text-base text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-slate-900 disabled:bg-slate-50 aria-[invalid=true]:ring-red-500 sm:text-sm';

/** Rótulo + controle + dica/erro, com ids ligados para leitores de tela. */
export function Field({ id, rotulo, dica, erro, obrigatorio, children }: {
  id: string; rotulo: ReactNode; dica?: ReactNode; erro?: string; obrigatorio?: boolean; children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-semibold text-slate-800">
        {rotulo}{obrigatorio && <span className="text-red-700" aria-hidden> *</span>}
      </label>
      {children}
      {erro ? (
        <p id={`${id}-erro`} className="mt-1 text-sm text-red-700">{erro}</p>
      ) : dica ? (
        <p id={`${id}-dica`} className="mt-1 text-sm text-slate-500">{dica}</p>
      ) : null}
    </div>
  );
}

/** Props de acessibilidade para ligar o controle à dica/erro do Field. */
export const ariaCampo = (id: string, erro?: string) => ({
  id,
  'aria-invalid': erro ? true : undefined,
  'aria-describedby': erro ? `${id}-erro` : `${id}-dica`,
});

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(BASE_CONTROLE, className)} />;
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(BASE_CONTROLE, 'pr-8', className)} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(BASE_CONTROLE, 'min-h-28', className)} />;
}
