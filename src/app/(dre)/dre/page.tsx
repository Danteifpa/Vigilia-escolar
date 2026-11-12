import type { Metadata } from 'next';
import { AlertTriangle, ClipboardX, FileWarning, Flag } from 'lucide-react';
import { FilaMemorandos, ordenarFila, type ItemFila } from '@/components/ocorrencias/FilaMemorandos';
import { AtualizarAoMudar } from '@/components/realtime/AtualizarAoMudar';
import { Badge, Card, CardHeader } from '@/components/ui';
import { exigirPerfil } from '@/modules/auth/sessao';
import { BANDEIRAS } from '@/modules/bandeiras/protocolo';
import { OPCOES_ACESSO, OPCOES_AGUA, OPCOES_FUMACA, type Tom } from '@/modules/escola/checklist.schema';
import { hojeBelem } from '@/modules/escola/painel';
import type { ChecklistDiario, CorBandeira } from '@/types/dominio';

export const metadata: Metadata = { title: 'Painel da DRE · Vigília Escolar PA' };
export const dynamic = 'force-dynamic';

const TOM_COR = { verde: 'sucesso', amarela: 'alerta', vermelha: 'perigo' } as const;
const TOM_BADGE: Record<Tom, 'sucesso' | 'alerta' | 'perigo'> = { ok: 'sucesso', atencao: 'alerta', critico: 'perigo' };
const opcao = <T extends readonly { valor: string; rotulo: string; tom: Tom }[]>(lista: T, valor: string) =>
  lista.find((o) => o.valor === valor) ?? { rotulo: valor, tom: 'ok' as Tom };

type Checklist = Pick<ChecklistDiario, 'escola_id' | 'situacao_agua' | 'nivel_fumaca' | 'situacao_acesso' | 'alunos_com_sintomas' | 'temperatura_max_c'>;

export default async function PainelDre() {
  const { db, perfil } = await exigirPerfil('dre');
  const hoje = hojeBelem();

  // Tudo recortado pela RLS ao polo desta DRE
  const [escolas, bandeiras, checklists, memorandos] = await Promise.all([
    db.from('escolas').select('id, nome, codigo_inep, risco_isolamento, municipio:municipios(nome)').eq('ativo', true).order('nome')
      .returns<{ id: string; nome: string; codigo_inep: string; risco_isolamento: boolean; municipio: { nome: string } | null }[]>(),
    db.from('vw_bandeira_vigente').select('escola_id, cor'),
    db.from('checklists_diarios').select('escola_id, situacao_agua, nivel_fumaca, situacao_acesso, alunos_com_sintomas, temperatura_max_c').eq('data', hoje).returns<Checklist[]>(),
    db.from('memorandos_ocorrencia')
      .select('id, numero, status, prioridade, tipos_ameaca, enviado_em, created_at, escola:escolas(nome)')
      .in('status', ['enviado', 'em_analise_dre', 'devolvido', 'encaminhado_estadual'])
      .returns<ItemFila[]>(),
  ]);

  const corPorEscola = new Map((bandeiras.data ?? []).map((b) => [b.escola_id, b.cor as CorBandeira]));
  const checklistPorEscola = new Map((checklists.data ?? []).map((c) => [c.escola_id, c]));
  const ehCritico = (c?: Checklist) => !!c && (
    opcao(OPCOES_AGUA, c.situacao_agua).tom === 'critico' || opcao(OPCOES_FUMACA, c.nivel_fumaca).tom === 'critico'
    || opcao(OPCOES_ACESSO, c.situacao_acesso).tom === 'critico' || c.alunos_com_sintomas > 0);

  const linhas = (escolas.data ?? []).map((e) => ({ ...e, cor: corPorEscola.get(e.id) ?? 'verde', checklist: checklistPorEscola.get(e.id) }))
    // Primeiro o que exige atenção: situação crítica, depois quem não registrou o checklist
    .sort((a, b) => Number(ehCritico(b.checklist)) - Number(ehCritico(a.checklist)) || Number(!b.checklist) - Number(!a.checklist));

  const memos = memorandos.data ?? [];
  const triagem = ordenarFila(memos.filter((m) => m.status === 'enviado' || m.status === 'em_analise_dre'));
  const acompanhamento = ordenarFila(memos.filter((m) => m.status === 'devolvido' || m.status === 'encaminhado_estadual'));
  const semChecklist = linhas.filter((l) => !l.checklist).length;
  const criticas = linhas.filter((l) => ehCritico(l.checklist)).length;
  const vermelhas = linhas.filter((l) => l.cor === 'vermelha').length;

  const cards = [
    { rotulo: 'Memorandos aguardando a DRE', valor: triagem.length, Icone: FileWarning, alerta: triagem.length > 0 },
    { rotulo: 'Escolas sem checklist hoje', valor: semChecklist, Icone: ClipboardX, alerta: semChecklist > 0 },
    { rotulo: 'Escolas em situação crítica', valor: criticas, Icone: AlertTriangle, alerta: criticas > 0 },
    { rotulo: 'Escolas em bandeira vermelha', valor: vermelhas, Icone: Flag, alerta: vermelhas > 0 },
  ];

  return (
    <div className="space-y-5">
      <AtualizarAoMudar tabelas={['memorandos_ocorrencia', 'checklists_diarios', 'historico_bandeiras']} />
      <div>
        <h1 className="text-2xl font-black">Olá, {perfil.nome.split(' ')[0]}</h1>
        <p className="text-sm text-slate-600">{linhas.length} escola(s) no polo · atualiza sozinho quando algo muda.</p>
      </div>

      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map(({ rotulo, valor, Icone, alerta }) => (
          <li key={rotulo} className={`rounded-2xl p-4 shadow-sm ring-1 ${alerta ? 'bg-amber-50 ring-amber-300' : 'bg-white ring-slate-200'}`}>
            <Icone className={`h-5 w-5 ${alerta ? 'text-amber-700' : 'text-slate-400'}`} aria-hidden />
            <p className="mt-1 text-3xl font-black tabular-nums">{valor}</p>
            <p className="text-sm text-slate-600">{rotulo}</p>
          </li>
        ))}
      </ul>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader titulo="Fila de triagem" descricao="Mais urgente primeiro; na mesma prioridade, quem espera há mais tempo." />
          <FilaMemorandos itens={triagem} base="/dre/ocorrencias" vazio="Nenhum memorando aguardando a DRE." />
        </Card>
        <Card>
          <CardHeader titulo="Em acompanhamento" descricao="Devolvidos às escolas ou encaminhados à Gestão Estadual." />
          <FilaMemorandos itens={acompanhamento} base="/dre/ocorrencias" vazio="Nada em acompanhamento." />
        </Card>
      </div>

      <Card>
        <CardHeader titulo="Escolas do polo" descricao={`Condições registradas hoje (${hoje.split('-').reverse().join('/')}).`} />
        <div className="-mx-5 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-y border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-2 font-semibold">Escola</th>
                <th className="px-3 py-2 font-semibold">Bandeira</th>
                <th className="px-3 py-2 font-semibold">Água</th>
                <th className="px-3 py-2 font-semibold">Fumaça</th>
                <th className="px-3 py-2 font-semibold">Acesso</th>
                <th className="px-5 py-2 font-semibold">Sintomas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {linhas.map((l) => {
                const c = l.checklist;
                const celula = (lista: Parameters<typeof opcao>[0], valor?: string) => {
                  const o = valor ? opcao(lista, valor) : null;
                  return o ? <Badge tom={TOM_BADGE[o.tom]}>{o.rotulo}</Badge> : null;
                };
                return (
                  <tr key={l.id} className={ehCritico(c) ? 'bg-red-50/50' : undefined}>
                    <td className="px-5 py-3">
                      <p className="font-semibold">{l.nome}</p>
                      <p className="text-xs text-slate-500">INEP {l.codigo_inep} · {l.municipio?.nome}{l.risco_isolamento && ' · risco de isolamento'}</p>
                    </td>
                    <td className="px-3 py-3"><Badge tom={TOM_COR[l.cor]}>{BANDEIRAS[l.cor].nome.replace('Bandeira ', '')}</Badge></td>
                    {c ? (
                      <>
                        <td className="px-3 py-3">{celula(OPCOES_AGUA, c.situacao_agua)}</td>
                        <td className="px-3 py-3">{celula(OPCOES_FUMACA, c.nivel_fumaca)}</td>
                        <td className="px-3 py-3">{celula(OPCOES_ACESSO, c.situacao_acesso)}</td>
                        <td className={`px-5 py-3 tabular-nums ${c.alunos_com_sintomas > 0 ? 'font-bold text-red-700' : ''}`}>{c.alunos_com_sintomas}</td>
                      </>
                    ) : (
                      <td colSpan={4} className="px-3 py-3"><Badge tom="alerta">Sem checklist hoje</Badge></td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
