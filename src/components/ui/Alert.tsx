import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from './cn';

const TONS = {
  info: { classe: 'bg-sky-50 text-sky-900 ring-sky-200', Icone: Info },
  sucesso: { classe: 'bg-emerald-50 text-emerald-900 ring-emerald-200', Icone: CheckCircle2 },
  alerta: { classe: 'bg-amber-50 text-amber-950 ring-amber-300', Icone: AlertTriangle },
  erro: { classe: 'bg-red-50 text-red-900 ring-red-200', Icone: XCircle },
} as const;

export function Alert({ tom = 'info', titulo, children, className }: { tom?: keyof typeof TONS; titulo?: string; children?: ReactNode; className?: string }) {
  const { classe, Icone } = TONS[tom];
  return (
    <div role={tom === 'erro' ? 'alert' : 'status'} className={cn('flex gap-3 rounded-xl p-3 text-sm ring-1', classe, className)}>
      <Icone className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div>
        {titulo && <p className="font-semibold">{titulo}</p>}
        {children}
      </div>
    </div>
  );
}
