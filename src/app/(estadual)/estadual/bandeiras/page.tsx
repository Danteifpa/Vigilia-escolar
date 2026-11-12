import type { Metadata } from 'next';
import { FormularioDecreto, type AlvoEscola, type AlvoMunicipio } from '@/components/bandeiras/FormularioDecreto';
import { RevogarBandeira } from '@/components/bandeiras/RevogarBandeira';
import { formatarDataHora } from '@/components/escola/formatos';
import { Badge, Card, CardHeader } from '@/components/ui';
import { exigirPerfil } from '@/modules/auth/sessao';
import { BANDEIRAS, ROTULO_REGIME } from '@/modules/bandeiras/protocolo';
import type { CorBandeira, RegimePedagogico } from '@/types/dominio';

export const metadata: Metadata = { title: 'Bandeiras · Vigília Escolar PA' };
export const dynamic = 'force-dynamic';

const TOM = { verde: 'sucesso', amarela: 'alerta', vermelha: 'perigo' } as const;
const corCurta = (c: CorBandeira) => BANDEIRAS[c].nome.replace('Bandeira ', '');

interface Decreto {
  id: string; escopo: 'municipio' | 'escola'; cor: CorBandeira; regime_pedagogico: RegimePedagogico;
  justificativa: string; ato_referencia: string | null; vigente_desde: string; vigente_ate: string | null;
  motivo_revogacao: string | null;
  municipio: { nome: string } | null; escola: { id: string; nome: string; codigo_inep: string } | null;
  autor: { nome: string } | null;
}

export default async function PaginaBandeiras() {
  const { db } = await exigirPerfil('estadual');

  const [municipios, escolas, vigentes, efetivas, historico] = await Promise.all([
    db.from('municipios').select('id, nome').order('nome'),
    db.from('escolas').select('id, nome, codigo_inep, municipio:municipios(nome)').eq('ativo', true).order('nome')
      .returns<{ id: string; nome: string; codigo_inep: string; municipio: { nome: string } | null }[]>(),
    db.from('historico_bandeiras').select('escopo, municipio_id, escola_id, cor, regime_pedagogico').is('vigente_ate', null),
    db.from('vw_bandeira_vigente').select('escola_id, cor, origem'),
    db.from('historico_bandeiras')
      .select('id, escopo, cor, regime_pedagogico, justificativa, ato_referencia, vigente_desde, vigente_ate, motivo_revogacao, municipio:municipios(nome), escola:escolas(id, nome, codigo_inep), autor:users!historico_bandeiras_decretada_por_fkey(nome)')
      .order('vigente_desde', { ascending: false }).limit(30).returns<Decreto[]>(),
  ]);

  const porMunicipio = new Map((vigentes.data ?? []).filter((v) => v.escopo === 'municipio').map((v) => [v.municipio_id, v]));
  const efetivaPorEscola = new Map((efetivas.data ?? []).map((v) => [v.escola_id, v]));

  const alvosMunicipio: AlvoMunicipio[] = (municipios.data ?? []).map((m) => ({
    id: m.id, nome: m.nome,
    cor: porMunicipio.get(m.id)?.cor ?? null,
    regime: porMunicipio.get(m.id)?.regime_pedagogico ?? null,
  }));
  const alvosEscola: AlvoEscola[] = (escolas.data ?? []).map((x) => ({
    id: x.id, nome: x.nome, codigo_inep: x.codigo_inep, municipio: x.municipio?.nome ?? '—',
    cor: efetivaPorEscola.get(x.id)?.cor ?? 'verde', origem: efetivaPorEscola.get(x.id)?.origem ?? 'padrao',
  }));

  const contagem = { verde: 0, amarela: 0, vermelha: 0 } as Record<CorBandeira, number>;
  for (const v of efetivas.data ?? []) contagem[v.cor as CorBandeira]++;
  const comDecretoProprio = (historico.data ?? []).filter((h) => h.escopo === 'escola' && !h.vigente_ate && h.escola);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black">Bandeiras</h1>
        <p className="text-sm text-slate-600">Decrete a bandeira por município ou para escolas específicas. A mudança chega aos painéis na hora.</p>
      </div>

      <ul className="grid grid-cols-3 gap-3">
        {(['verde', 'amarela', 'vermelha'] as const).map((c) => (
          <li key={c} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <p className="text-3xl font-black tabular-nums">{contagem[c]}</p>
            <p className="text-sm text-slate-600">escola(s) em <Badge tom={TOM[c]}>{corCurta(c)}</Badge></p>
          </li>
        ))}
      </ul>

      <Card>
        <CardHeader titulo="Novo decreto" />
        <FormularioDecreto municipios={alvosMunicipio} escolas={alvosEscola} />
      </Card>

      {comDecretoProprio.length > 0 && (
        <Card>
          <CardHeader titulo="Escolas com bandeira própria" descricao="Prevalecem sobre a bandeira do município. Revogue para que voltem a segui-la." />
          <ul className="divide-y divide-slate-100">
            {comDecretoProprio.map((h) => (
              <li key={h.id} className="space-y-2 py-3">
                <p className="flex flex-wrap items-center gap-2 font-semibold">
                  {h.escola!.nome} <Badge tom={TOM[h.cor]}>{corCurta(h.cor)}</Badge>
                  <span className="text-xs font-normal text-slate-500">{ROTULO_REGIME[h.regime_pedagogico]} · desde {formatarDataHora(h.vigente_desde)}</span>
                </p>
                <RevogarBandeira escolaId={h.escola!.id} escolaNome={h.escola!.nome} />
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <CardHeader titulo="Histórico de decretos" descricao="Últimos 30 registros. O histórico não pode ser editado nem apagado." />
        <div className="-mx-5 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-y border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-2 font-semibold">Quando</th>
                <th className="px-3 py-2 font-semibold">Onde</th>
                <th className="px-3 py-2 font-semibold">Bandeira</th>
                <th className="px-3 py-2 font-semibold">Justificativa</th>
                <th className="px-3 py-2 font-semibold">Por</th>
                <th className="px-5 py-2 font-semibold">Situação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(historico.data ?? []).map((h) => (
                <tr key={h.id} className="align-top">
                  <td className="whitespace-nowrap px-5 py-3">{formatarDataHora(h.vigente_desde)}</td>
                  <td className="px-3 py-3">{h.escopo === 'municipio' ? h.municipio?.nome : `${h.escola?.nome} (escola)`}</td>
                  <td className="px-3 py-3"><Badge tom={TOM[h.cor]}>{corCurta(h.cor)}</Badge><span className="block text-xs text-slate-500">{ROTULO_REGIME[h.regime_pedagogico]}</span></td>
                  <td className="px-3 py-3 text-slate-700">{h.justificativa}{h.ato_referencia && <span className="block text-xs text-slate-500">{h.ato_referencia}</span>}</td>
                  <td className="px-3 py-3">{h.autor?.nome ?? '—'}</td>
                  <td className="px-5 py-3">
                    {!h.vigente_ate ? <Badge tom="info">Vigente</Badge>
                      : h.motivo_revogacao ? <span className="text-xs text-slate-600">Revogado: {h.motivo_revogacao}</span>
                      : <span className="text-xs text-slate-500">Substituído em {formatarDataHora(h.vigente_ate)}</span>}
                  </td>
                </tr>
              ))}
              {!historico.data?.length && <tr><td colSpan={6} className="px-5 py-4 text-slate-500">Nenhum decreto ainda. Sem decreto, todas as escolas estão em verde.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
