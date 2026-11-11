import type { ReactNode } from 'react';
import { cn } from './cn';

const TONS = {
  neutro: 'bg-slate-100 text-slate-700 ring-slate-300',
  info: 'bg-sky-50 text-sky-800 ring-sky-300',
  sucesso: 'bg-emerald-50 text-emerald-800 ring-emerald-300',
  alerta: 'bg-amber-50 text-amber-900 ring-amber-300',
  perigo: 'bg-red-50 text-red-800 ring-red-300',
} as const;

export function Badge({ tom = 'neutro', children, className }: { tom?: keyof typeof TONS; children: ReactNode; className?: string }) {
  return <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1', TONS[tom], className)}>{children}</span>;
}
