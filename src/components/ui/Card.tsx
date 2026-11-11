import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

export function Card({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <section {...props} className={cn('rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200', className)} />;
}

export function CardHeader({ titulo, descricao, acao }: { titulo: ReactNode; descricao?: ReactNode; acao?: ReactNode }) {
  return (
    <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-lg font-bold">{titulo}</h2>
        {descricao && <p className="text-sm text-slate-600">{descricao}</p>}
      </div>
      {acao}
    </header>
  );
}
