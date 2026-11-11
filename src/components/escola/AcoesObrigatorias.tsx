import { CheckCircle2, Circle, ClipboardCheck } from 'lucide-react';
import { BANDEIRAS } from '@/modules/bandeiras/protocolo';
import type { AcaoProtocolo, CorBandeira } from '@/types/dominio';

interface Props {
  corAtual: CorBandeira;
  acoes: AcaoProtocolo[];
  feitas: Record<string, boolean>;
  checklistPreenchido: boolean;
  onAlternar: (codigo: string, feito: boolean) => void;
  hrefChecklist: string;
}

const PONTO: Record<CorBandeira, string> = {
  verde: 'bg-emerald-600',
  amarela: 'bg-amber-400',
  vermelha: 'bg-red-600',
};

export function AcoesObrigatorias({ corAtual, acoes, feitas, checklistPreenchido, onAlternar, hrefChecklist }: Props) {
  const diarias = acoes.filter((a) => a.obrigatoria && a.diaria);
  const concluidas = diarias.filter((a) => feitas[a.codigo]).length;
  const pct = diarias.length ? Math.round((concluidas / diarias.length) * 100) : 0;

  return (
    <section aria-labelledby="acoes-titulo" className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="acoes-titulo" className="text-lg font-bold">Ações obrigatórias</h2>
          <p className="text-sm text-slate-600">
            Protocolo da {BANDEIRAS[corAtual].nome.toLowerCase()} — inclui as ações dos níveis anteriores.
          </p>
        </div>
        <p className="text-sm font-semibold text-slate-700" aria-live="polite">
          {concluidas}/{diarias.length} diárias concluídas
        </p>
      </header>

      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-slate-900 transition-all" style={{ width: `${pct}%` }} />
      </div>

      {!checklistPreenchido && (
        <a href={hrefChecklist} className="mt-4 flex items-center gap-3 rounded-xl bg-sky-50 p-3 text-sm font-semibold text-sky-900 ring-1 ring-sky-200 hover:bg-sky-100">
          <ClipboardCheck className="h-5 w-5 shrink-0" aria-hidden />
          Preencha o checklist de hoje (água, fumaça, calor e acesso) para registrar as ações.
        </a>
      )}

      <ul className="mt-4 divide-y divide-slate-100">
        {acoes.map((a) => {
          const feito = !!feitas[a.codigo];
          const herdada = a.cor !== corAtual;
          const marcavel = a.diaria && checklistPreenchido;
          return (
            <li key={a.id} className="py-3">
              <label className={`flex gap-3 ${marcavel ? 'cursor-pointer' : 'cursor-default'}`}>
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={feito}
                  disabled={!marcavel}
                  onChange={(e) => onAlternar(a.codigo, e.target.checked)}
                />
                {feito
                  ? <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600 peer-focus-visible:ring-2" aria-hidden />
                  : <Circle className={`mt-0.5 h-6 w-6 shrink-0 ${marcavel ? 'text-slate-400' : 'text-slate-200'} peer-focus-visible:ring-2`} aria-hidden />}
                <span className="min-w-0">
                  <span className={`block font-semibold ${feito ? 'text-slate-500 line-through' : ''}`}>{a.titulo}</span>
                  {a.descricao && <span className="mt-0.5 block text-sm text-slate-600">{a.descricao}</span>}
                  <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className={`h-2 w-2 rounded-full ${PONTO[a.cor]}`} aria-hidden />
                    {herdada ? `Mantida da ${BANDEIRAS[a.cor].nome.toLowerCase()}` : BANDEIRAS[a.cor].nome}
                    <span aria-hidden>·</span>
                    {a.diaria ? 'Diária' : 'Executar uma vez / contínua'}
                  </span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
