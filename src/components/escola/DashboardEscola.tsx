'use client';

import { type ReactNode, useEffect, useState } from 'react';
import { CloudOff, RefreshCw, School, Siren, Wifi } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { contarPendentes, enfileirar, EVENTO_SINCRONIZADO } from '@/lib/offline/fila';
import type { PainelEscola } from '@/types/dominio';
import { AcoesObrigatorias } from './AcoesObrigatorias';
import { BandeiraBanner } from './BandeiraBanner';
import { formatarData } from './formatos';
import { IndicadoresDia } from './IndicadoresDia';
import { OcorrenciasRecentes } from './OcorrenciasRecentes';
import { ReporteRapido } from './ReporteRapido';

function useConexao() {
  const [online, setOnline] = useState(true);
  const [pendentes, setPendentes] = useState(0);
  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    const t = window.setInterval(() => void contarPendentes().then(setPendentes), 3_000);
    void contarPendentes().then(setPendentes);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); window.clearInterval(t); };
  }, []);
  return { online, pendentes };
}

export function DashboardEscola({ painel, acoesCabecalho }: { painel: PainelEscola; acoesCabecalho?: ReactNode }) {
  const { escola, bandeira, acoes, checklistHoje, memorandosRecentes } = painel;
  const [reporteAberto, setReporteAberto] = useState(false);
  const [feitas, setFeitas] = useState<Record<string, boolean>>(checklistHoje?.acoes ?? {});
  // Dados novos do servidor (ex.: após sincronizar) substituem o estado local
  useEffect(() => setFeitas(checklistHoje?.acoes ?? {}), [checklistHoje?.updated_at]); // eslint-disable-line react-hooks/exhaustive-deps
  const { online, pendentes } = useConexao();
  const router = useRouter();

  // Quando a fila offline envia dados, recarrega o painel com a versão do servidor
  useEffect(() => {
    const recarregar = () => router.refresh();
    window.addEventListener(EVENTO_SINCRONIZADO, recarregar);
    return () => window.removeEventListener(EVENTO_SINCRONIZADO, recarregar);
  }, [router]);

  const alternarAcao = (codigo: string, feito: boolean) => {
    setFeitas((f) => ({ ...f, [codigo]: feito }));        // otimista; sincroniza pela fila
    void enfileirar({ chave: `checklist:${checklistHoje?.data}`, metodo: 'PATCH', url: '/api/escola/checklist', corpo: { acoes: { [codigo]: feito } } });
  };

  return (
    <div className="min-h-dvh pb-28 sm:pb-10">
      {/* Cabeçalho */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <School className="h-6 w-6 shrink-0 text-slate-700" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold leading-tight">{escola.nome}</p>
            <p className="text-xs text-slate-500">
              INEP {escola.codigo_inep} · {formatarData(new Date().toISOString())}
            </p>
          </div>
          <div
            role="status"
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
              online ? 'bg-emerald-50 text-emerald-800 ring-emerald-200' : 'bg-amber-50 text-amber-900 ring-amber-300'
            }`}
          >
            {online ? <Wifi className="h-3.5 w-3.5" aria-hidden /> : <CloudOff className="h-3.5 w-3.5" aria-hidden />}
            {online ? 'Online' : 'Offline'}
            {pendentes > 0 && (
              <span className="flex items-center gap-1 border-l border-current/30 pl-1.5">
                <RefreshCw className={`h-3 w-3 ${online ? 'animate-spin' : ''}`} aria-hidden />
                {pendentes} a enviar
              </span>
            )}
          </div>
          {acoesCabecalho}
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-5 px-4 pt-5">
        {!online && (
          <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-950 ring-1 ring-amber-300">
            Você está sem internet. A bandeira exibida é a última recebida. Ocorrências e checklists
            ficam salvos neste aparelho e serão enviados automaticamente.
          </p>
        )}

        <BandeiraBanner bandeira={bandeira} onReportar={() => setReporteAberto(true)} />

        <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
          <AcoesObrigatorias
            corAtual={bandeira.cor}
            acoes={acoes}
            feitas={feitas}
            checklistPreenchido={!!checklistHoje}
            onAlternar={alternarAcao}
            hrefChecklist="/escola/checklist"
          />

          <aside className="space-y-5">
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-bold">Condições de hoje</h2>
                <a href="/escola/checklist" className="text-sm font-semibold text-sky-700 hover:underline">
                  {checklistHoje ? 'Atualizar' : 'Preencher'}
                </a>
              </div>
              <IndicadoresDia checklist={checklistHoje} />
            </div>
            <OcorrenciasRecentes itens={memorandosRecentes} />
          </aside>
        </div>
      </main>

      {/* Atalho fixo no celular: alcance do polegar */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 p-3 backdrop-blur sm:hidden">
        <button
          type="button"
          onClick={() => setReporteAberto(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-700 py-4 text-lg font-extrabold text-white shadow-lg active:bg-red-800"
        >
          <Siren className="h-6 w-6" aria-hidden /> Reportar ocorrência
        </button>
      </div>

      <ReporteRapido aberto={reporteAberto} onFechar={() => setReporteAberto(false)} />
    </div>
  );
}
