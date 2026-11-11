import { Loader2 } from 'lucide-react';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from './cn';

const VARIANTES = {
  primario: 'bg-slate-900 text-white hover:bg-slate-800 focus-visible:ring-slate-400',
  secundario: 'bg-white text-slate-900 ring-1 ring-slate-300 hover:bg-slate-50 focus-visible:ring-slate-400',
  perigo: 'bg-red-700 text-white hover:bg-red-800 focus-visible:ring-red-300',
  fantasma: 'text-slate-700 hover:bg-slate-100 focus-visible:ring-slate-300',
} as const;

const TAMANHOS = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2.5 text-sm', lg: 'px-5 py-3.5 text-base' } as const;

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: keyof typeof VARIANTES;
  tamanho?: keyof typeof TAMANHOS;
  carregando?: boolean;
  larguraTotal?: boolean;
}

export function Button({ variante = 'primario', tamanho = 'md', carregando, larguraTotal, className, children, disabled, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || carregando}
      aria-busy={carregando || undefined}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition focus:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-60',
        VARIANTES[variante], TAMANHOS[tamanho], larguraTotal && 'w-full', className,
      )}
    >
      {carregando && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}
