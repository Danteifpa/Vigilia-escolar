import { ChevronRight, FileText } from 'lucide-react';
import { ROTULO_STATUS } from '@/modules/ocorrencias/maquina-estados';
import { ROTULOS_AMEACA } from '@/modules/ocorrencias/schema';
import type { PainelEscola } from '@/types/dominio';
import { formatarDataHora } from './formatos';

export function OcorrenciasRecentes({ itens }: { itens: PainelEscola['memorandosRecentes'] }) {
  return (
    <section aria-labelledby="recentes-titulo" className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <header className="flex items-center justify-between">
        <h2 id="recentes-titulo" className="text-lg font-bold">Memorandos recentes</h2>
        <a href="/escola/ocorrencias" className="text-sm font-semibold text-sky-700 hover:underline">Ver todos</a>
      </header>

      {itens.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">Nenhuma ocorrência registrada.</p>
      ) : (
        <ul className="mt-3 divide-y divide-slate-100">
          {itens.map((m) => {
            const st = ROTULO_STATUS[m.status];
            return (
              <li key={m.id}>
                <a href={`/escola/ocorrencias/${m.id}`} className="flex items-center gap-3 py-3 hover:bg-slate-50">
                  <FileText className="h-5 w-5 shrink-0 text-slate-400" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">
                      {m.tipos_ameaca.map((t) => ROTULOS_AMEACA[t]).join(' + ')}
                    </span>
                    <span className="block text-xs text-slate-500">
                      {m.numero ?? 'Sem número (rascunho)'} · {formatarDataHora(m.enviado_em ?? m.created_at)}
                      {m.prioridade !== 'normal' && <strong className="ml-1 uppercase text-red-700">· {m.prioridade}</strong>}
                    </span>
                  </span>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${st.classe}`}>{st.texto}</span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" aria-hidden />
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
