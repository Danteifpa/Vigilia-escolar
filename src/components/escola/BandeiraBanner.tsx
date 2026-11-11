import { Flag, Siren } from 'lucide-react';
import { BANDEIRAS, ROTULO_REGIME } from '@/modules/bandeiras/protocolo';
import type { BandeiraVigente } from '@/types/dominio';
import { formatarDataHora } from './formatos';

const ORIGEM: Record<BandeiraVigente['origem'], string> = {
  municipio: 'Decreto estadual para o município',
  escola: 'Decreto estadual específico para esta escola',
  padrao: 'Situação padrão (sem decreto vigente)',
};

interface Props {
  bandeira: BandeiraVigente;
  onReportar: () => void;
}

export function BandeiraBanner({ bandeira, onReportar }: Props) {
  const b = BANDEIRAS[bandeira.cor];
  const naoPresencial = bandeira.regime_pedagogico === 'nao_presencial' || bandeira.regime_pedagogico === 'cemep';

  return (
    <section
      aria-labelledby="bandeira-titulo"
      className={`relative overflow-hidden rounded-2xl p-5 shadow-lg sm:p-7 ${b.ui.banner}`}
    >
      <div className="flex items-start gap-4">
        <Flag className={`mt-1 h-10 w-10 shrink-0 ${b.ui.icone}`} strokeWidth={2.5} aria-hidden />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <p className="text-xs font-semibold uppercase tracking-widest opacity-80">Situação atual da escola</p>
            {/* Nível 1-3 como reforço não-cromático (daltonismo / impressão P&B) */}
            <span className="flex gap-1" role="img" aria-label={`Nível ${b.nivel} de 3`}>
              {[1, 2, 3].map((n) => (
                <span key={n} className={`h-1.5 w-5 rounded-full bg-current ${n <= b.nivel ? '' : 'opacity-25'}`} />
              ))}
            </span>
          </div>
          <h1 id="bandeira-titulo" className="mt-1 text-2xl font-black leading-tight sm:text-3xl">
            {b.nome.toUpperCase()}
            <span className="block text-lg font-bold opacity-90 sm:inline sm:text-2xl"> — {b.fase}</span>
          </h1>
          <p className="mt-2 max-w-2xl text-base font-medium">{b.resumo}</p>
        </div>
      </div>

      <dl className="mt-5 flex flex-wrap gap-2 text-sm">
        <div className={`rounded-full px-3 py-1 ring-1 ${b.ui.chip}`}>
          <dt className="sr-only">Regime pedagógico</dt>
          <dd><strong>Regime:</strong> {ROTULO_REGIME[bandeira.regime_pedagogico]}</dd>
        </div>
        <div className={`rounded-full px-3 py-1 ring-1 ${b.ui.chip}`}>
          <dt className="sr-only">Origem</dt>
          <dd>{ORIGEM[bandeira.origem]}</dd>
        </div>
        {bandeira.vigente_desde && (
          <div className={`rounded-full px-3 py-1 ring-1 ${b.ui.chip}`}>
            <dt className="sr-only">Vigente desde</dt>
            <dd>Desde {formatarDataHora(bandeira.vigente_desde)}</dd>
          </div>
        )}
        {bandeira.ato_referencia && (
          <div className={`rounded-full px-3 py-1 ring-1 ${b.ui.chip}`}>
            <dt className="sr-only">Ato</dt>
            <dd>{bandeira.ato_referencia}</dd>
          </div>
        )}
      </dl>

      {bandeira.justificativa && (
        <p className="mt-3 text-sm opacity-90"><strong>Motivo:</strong> {bandeira.justificativa}</p>
      )}
      {naoPresencial && (
        <p className="mt-3 rounded-lg bg-black/15 px-3 py-2 text-sm font-semibold">
          Atividades não presenciais validadas pela Gestão Estadual. Siga as orientações da DRE para entrega de material.
        </p>
      )}

      <button
        type="button"
        onClick={onReportar}
        className={`mt-5 hidden items-center justify-center gap-2 rounded-xl px-5 py-4 text-lg font-extrabold shadow-md transition focus:outline-none focus-visible:ring-4 focus-visible:ring-white/60 sm:inline-flex ${b.ui.botao}`}
      >
        <Siren className="h-6 w-6" aria-hidden />
        Reportar ocorrência agora
      </button>
    </section>
  );
}
