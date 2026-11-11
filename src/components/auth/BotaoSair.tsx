import { LogOut } from 'lucide-react';

/** Formulário simples (funciona sem JavaScript). */
export function BotaoSair({ className = '' }: { className?: string }) {
  return (
    <form action="/auth/sair" method="post" className={className}>
      <button type="submit" className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">
        <LogOut className="h-4 w-4" aria-hidden /> Sair
      </button>
    </form>
  );
}
