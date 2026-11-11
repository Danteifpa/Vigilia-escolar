'use client';

import { useEffect, useRef } from 'react';
import { Droplets, Flame, TriangleAlert, X } from 'lucide-react';
import type { TipoAmeaca } from '@/types/dominio';

/**
 * Atalho de 1 toque: escolhe o tipo de ameaça e abre o formulário do Anexo I
 * já pré-preenchido. O formulário funciona offline (rascunho em IndexedDB).
 */
const OPCOES: { tipo: TipoAmeaca; titulo: string; exemplo: string; Icone: typeof Flame; classe: string }[] = [
  { tipo: 'fumaca_queimadas', titulo: 'Fumaça / Queimadas', exemplo: 'Fumaça no entorno, foco de incêndio próximo', Icone: Flame, classe: 'bg-orange-50 text-orange-900 ring-orange-200 hover:bg-orange-100' },
  { tipo: 'estiagem_agua', titulo: 'Estiagem / Falta de água', exemplo: 'Reservatório vazio, rio baixo impedindo acesso', Icone: Droplets, classe: 'bg-sky-50 text-sky-900 ring-sky-200 hover:bg-sky-100' },
  { tipo: 'outros', titulo: 'Outra ocorrência', exemplo: 'Calor extremo em sala, mal-estar coletivo, estrutura', Icone: TriangleAlert, classe: 'bg-slate-50 text-slate-900 ring-slate-200 hover:bg-slate-100' },
];

export function ReporteRapido({ aberto, onFechar }: { aberto: boolean; onFechar: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (aberto && !d.open) d.showModal();
    if (!aberto && d.open) d.close();
  }, [aberto]);

  return (
    <dialog
      ref={ref}
      onClose={onFechar}
      aria-labelledby="reporte-titulo"
      className="m-0 mt-auto w-full max-w-none rounded-t-2xl bg-white p-0 backdrop:bg-slate-900/60 sm:m-auto sm:max-w-lg sm:rounded-2xl"
    >
      <div className="p-5">
        <div className="flex items-center justify-between">
          <h2 id="reporte-titulo" className="text-lg font-bold">O que está acontecendo?</h2>
          <button type="button" onClick={onFechar} className="rounded-full p-2 hover:bg-slate-100" aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="text-sm text-slate-600">Escolha o tipo. Você completa o Memorando (Anexo I) na próxima tela.</p>

        <ul className="mt-4 space-y-3">
          {OPCOES.map(({ tipo, titulo, exemplo, Icone, classe }) => (
            <li key={tipo}>
              <a
                href={`/escola/ocorrencias/nova?tipo=${tipo}`}
                className={`flex items-center gap-4 rounded-xl p-4 ring-1 transition ${classe}`}
              >
                <Icone className="h-8 w-8 shrink-0" aria-hidden />
                <span>
                  <span className="block font-bold">{titulo}</span>
                  <span className="block text-sm opacity-80">{exemplo}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-slate-500">
          Em risco imediato à vida, acione primeiro Bombeiros (193), SAMU (192) ou Defesa Civil (199) e registre depois.
        </p>
      </div>
    </dialog>
  );
}
