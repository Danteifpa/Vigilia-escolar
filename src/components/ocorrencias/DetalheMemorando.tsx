import { CheckCircle2, Circle } from 'lucide-react';
import { formatarDataHora } from '@/components/escola/formatos';
import { Badge, Card, CardHeader } from '@/components/ui';
import { ROTULO_PERFIL, type Perfil } from '@/modules/auth/perfis';
import { BANDEIRAS } from '@/modules/bandeiras/protocolo';
import { ROTULO_STATUS } from '@/modules/ocorrencias/maquina-estados';
import { ROTULOS_AMEACA } from '@/modules/ocorrencias/schema';
import type { MemorandoOcorrencia } from '@/types/dominio';
import { PainelTramitacao } from './PainelTramitacao';

export type MemorandoDetalhado = MemorandoOcorrencia & {
  escola: { nome: string; codigo_inep: string; municipio: { nome: string } | null } | null;
  tramitacoes: { id: number; acao: string; para_status: MemorandoOcorrencia['status']; parecer: string | null; ator_perfil: Perfil; created_at: string; ator: { nome: string } | null }[];
};

const ROTULO_ACAO: Record<string, string> = {
  enviar: 'Enviado pela escola', reenviar: 'Reenviado pela escola', receber: 'Recebido pela DRE',
  devolver: 'Devolvido', encaminhar_estadual: 'Encaminhado à Gestão Estadual', atender: 'Atendido', arquivar: 'Arquivado',
};
const TOM_PRIORIDADE = { critica: 'perigo', alta: 'alerta', normal: 'neutro' } as const;

function Campo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{titulo}</dt>
      <dd className="mt-1 whitespace-pre-line text-slate-900">{children || <span className="text-slate-400">Não informado</span>}</dd>
    </div>
  );
}

/**
 * Memorando de Ocorrência (Anexo I) em leitura + trilha de tramitação.
 * `perfil` define se aparecem os botões de tramitação (DRE / Gestão Estadual).
 */
export function DetalheMemorando({ memo, perfil, voltar }: { memo: MemorandoDetalhado; perfil: Perfil; voltar: string }) {
  const st = ROTULO_STATUS[memo.status];
  const ultimoParecer = [...memo.tramitacoes].reverse().find((t) => t.parecer);

  return (
    <div className="space-y-5">
      <a href={voltar} className="text-sm font-semibold text-sky-700 hover:underline">← Voltar</a>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Memorando de Ocorrência · Anexo I</p>
          <h1 className="text-2xl font-black">{memo.numero ?? 'Rascunho'}</h1>
          <p className="text-sm text-slate-600">
            {memo.escola?.nome} · INEP {memo.escola?.codigo_inep} · {memo.escola?.municipio?.nome}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={`rounded-full px-3 py-1 text-sm font-semibold ring-1 ${st.classe}`}>{st.texto}</span>
          {memo.prioridade !== 'normal' && <Badge tom={TOM_PRIORIDADE[memo.prioridade]} className="px-3 py-1 text-sm">Prioridade {memo.prioridade}</Badge>}
        </div>
      </header>

      {ultimoParecer && (memo.status === 'devolvido' || memo.status === 'atendido' || memo.status === 'arquivado' || perfil !== 'escola') && (
        <Card className="bg-sky-50 ring-sky-200">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-800">Último parecer · {ROTULO_PERFIL[ultimoParecer.ator_perfil]}</p>
          <p className="mt-1 whitespace-pre-line text-sky-950">{ultimoParecer.parecer}</p>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <Card>
          <dl className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-3">
              <Campo titulo="Tipo de ameaça">
                {memo.tipos_ameaca.map((t) => ROTULOS_AMEACA[t]).join(', ')}
                {memo.ameaca_outros_descricao && ` — ${memo.ameaca_outros_descricao}`}
              </Campo>
              <Campo titulo="Data da ocorrência">{formatarDataHora(memo.data_hora_ocorrencia)}</Campo>
              <Campo titulo="Bandeira no registro">{BANDEIRAS[memo.bandeira_cor_no_registro].nome}</Campo>
            </div>
            <Campo titulo="Descrição da situação">{memo.descricao_situacao}</Campo>
            <div className="grid gap-5 sm:grid-cols-2">
              <Campo titulo="Impactos pedagógicos">{memo.impactos_pedagogicos}</Campo>
              <Campo titulo="Impactos operacionais">{memo.impactos_operacionais}</Campo>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <Campo titulo="Alunos afetados">{memo.alunos_afetados?.toLocaleString('pt-BR')}</Campo>
              <Campo titulo="Aulas suspensas">{memo.aulas_suspensas ? 'Sim' : 'Não'}</Campo>
            </div>
            <Campo titulo="Providências tomadas pela escola">{memo.providencias_tomadas}</Campo>
            <Campo titulo="Apoio necessário da DRE">{memo.apoio_necessario_dre}</Campo>
          </dl>
        </Card>

        <div className="space-y-5">
          {perfil !== 'escola' && (
            <Card>
              <CardHeader titulo="Tramitar" />
              <PainelTramitacao id={memo.id} status={memo.status} perfil={perfil} />
            </Card>
          )}
          <Card>
            <CardHeader titulo="Trilha" descricao="Registro permanente de cada etapa." />
            <ol className="space-y-4">
              {memo.tramitacoes.map((t, i) => {
                const ultima = i === memo.tramitacoes.length - 1;
                const Icone = ultima ? Circle : CheckCircle2;
                return (
                  <li key={t.id} className="flex gap-3">
                    <Icone className={`mt-0.5 h-5 w-5 shrink-0 ${ultima ? 'text-sky-600' : 'text-emerald-600'}`} aria-hidden />
                    <div className="min-w-0">
                      <p className="font-semibold">{ROTULO_ACAO[t.acao] ?? t.acao}</p>
                      <p className="text-xs text-slate-500">{formatarDataHora(t.created_at)} · {t.ator?.nome ?? ROTULO_PERFIL[t.ator_perfil]}</p>
                      {t.parecer && <p className="mt-1 whitespace-pre-line rounded-lg bg-slate-50 p-2 text-sm">{t.parecer}</p>}
                    </div>
                  </li>
                );
              })}
            </ol>
          </Card>
        </div>
      </div>
    </div>
  );
}
