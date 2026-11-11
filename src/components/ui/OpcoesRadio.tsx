import type { UseFormRegisterReturn } from 'react-hook-form';
import { cn } from './cn';

type Tom = 'ok' | 'atencao' | 'critico';
const MARCADO: Record<Tom, string> = {
  ok: 'peer-checked:bg-emerald-50 peer-checked:ring-2 peer-checked:ring-emerald-600 peer-checked:text-emerald-950',
  atencao: 'peer-checked:bg-amber-50 peer-checked:ring-2 peer-checked:ring-amber-500 peer-checked:text-amber-950',
  critico: 'peer-checked:bg-red-50 peer-checked:ring-2 peer-checked:ring-red-600 peer-checked:text-red-950',
};
const PONTO: Record<Tom, string> = { ok: 'bg-emerald-600', atencao: 'bg-amber-500', critico: 'bg-red-600' };

/**
 * Grupo de opções em cartões grandes (bom para toque em celular).
 * Acessível: fieldset/legend + radios nativos.
 */
export function OpcoesRadio({ legenda, registro, opcoes, erro, colunas = 2 }: {
  legenda: string;
  registro: UseFormRegisterReturn;
  opcoes: readonly { valor: string; rotulo: string; descricao?: string; tom: Tom }[];
  erro?: string;
  colunas?: 2 | 3 | 4;
}) {
  const id = `grupo-${registro.name}`;
  return (
    <fieldset aria-describedby={erro ? `${id}-erro` : undefined}>
      <legend className="mb-2 text-sm font-semibold text-slate-800">
        {legenda}<span className="text-red-700" aria-hidden> *</span>
      </legend>
      <div className={cn('grid gap-2', colunas === 2 && 'grid-cols-2', colunas === 3 && 'grid-cols-1 sm:grid-cols-3', colunas === 4 && 'grid-cols-2 sm:grid-cols-4')}>
        {opcoes.map((o) => (
          <label key={o.valor} className="relative cursor-pointer">
            <input type="radio" value={o.valor} {...registro} className="peer sr-only" />
            <span
              className={cn(
                'flex h-full flex-col rounded-xl bg-white p-3 ring-1 ring-slate-300 transition hover:bg-slate-50 peer-focus-visible:ring-4 peer-focus-visible:ring-sky-300',
                MARCADO[o.tom],
              )}
            >
              <span className="flex items-center gap-2 font-bold">
                <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', PONTO[o.tom])} aria-hidden />
                {o.rotulo}
              </span>
              {o.descricao && <span className="mt-0.5 text-xs text-slate-600">{o.descricao}</span>}
            </span>
          </label>
        ))}
      </div>
      {erro && <p id={`${id}-erro`} className="mt-1 text-sm text-red-700">{erro}</p>}
    </fieldset>
  );
}
