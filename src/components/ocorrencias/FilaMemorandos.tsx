import { ChevronRight, FileText } from 'lucide-react';
import { formatarDataHora, haQuantoTempo } from '@/components/escola/formatos';
import { Badge } from '@/components/ui';
import { ROTULO_STATUS } from '@/modules/ocorrencias/maquina-estados';
import { ROTULOS_AMEACA } from '@/modules/ocorrencias/schema';
import type { MemorandoOcorrencia } from '@/types/dominio';

export type ItemFila = Pick<MemorandoOcorrencia, 'id' | 'numero' | 'status' | 'prioridade' | 'tipos_ameaca' | 'enviado_em' | 'created_at'> & {
  escola: { nome: string } | null;
};

const PESO = { critica: 0, alta: 1, normal: 2 } as const;
const TOM_PRIORIDADE = { critica: 'perigo', alta: 'alerta', normal: 'neutro' } as const;

/** Mais urgente primeiro; dentro da mesma prioridade, o que espera há mais tempo. */
export const ordenarFila = <T extends ItemFila>(itens: T[]) =>
  [...itens].sort((a, b) => PESO[a.prioridade] - PESO[b.prioridade]
    || Date.parse(a.enviado_em ?? a.created_at) - Date.parse(b.enviado_em ?? b.created_at));

export function FilaMemorandos({ itens, base, vazio }: { itens: ItemFila[]; base: string; vazio: string }) {
  if (!itens.length) return <p className="py-2 text-sm text-slate-500">{vazio}</p>;
  return (
    <ul className="-mx-5 divide-y divide-slate-100">
      {itens.map((m) => {
        const st = ROTULO_STATUS[m.status];
        const desde = m.enviado_em ?? m.created_at;
        return (
          <li key={m.id}>
            <a href={`${base}/${m.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50">
              <FileText className="h-5 w-5 shrink-0 text-slate-400" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-semibold">{m.escola?.nome ?? '—'}</span>
                  {m.prioridade !== 'normal' && <Badge tom={TOM_PRIORIDADE[m.prioridade]}>Prioridade {m.prioridade}</Badge>}
                </span>
                <span className="block text-xs text-slate-500">
                  {m.tipos_ameaca.map((t) => ROTULOS_AMEACA[t]).join(' + ')} · {m.numero ?? 'sem número'} ·{' '}
                  <time dateTime={desde} title={formatarDataHora(desde)}>{haQuantoTempo(desde)}</time>
                </span>
              </span>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${st.classe}`}>{st.texto}</span>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" aria-hidden />
            </a>
          </li>
        );
      })}
    </ul>
  );
}
