import { Badge, Card, CardHeader } from '@/components/ui';
import { exigirPerfil } from '@/modules/auth/sessao';

/**
 * Resumo provisório das áreas DRE/Gestão Estadual (os painéis completos são a Fase 4).
 * Os números já respeitam a RLS: DRE vê o seu polo; Gestão Estadual vê o estado.
 */
export async function ResumoInicial() {
  const { db, perfil } = await exigirPerfil('dre', 'estadual');
  const conta = (q: PromiseLike<{ count: number | null }>) => q.then((r) => r.count ?? 0);

  const [escolas, aguardando, naGestaoEstadual, amarelas, vermelhas] = await Promise.all([
    conta(db.from('escolas').select('id', { count: 'exact', head: true })),
    conta(db.from('memorandos_ocorrencia').select('id', { count: 'exact', head: true }).in('status', ['enviado', 'em_analise_dre'])),
    conta(db.from('memorandos_ocorrencia').select('id', { count: 'exact', head: true }).eq('status', 'encaminhado_estadual')),
    conta(db.from('vw_bandeira_vigente').select('escola_id', { count: 'exact', head: true }).eq('cor', 'amarela')),
    conta(db.from('vw_bandeira_vigente').select('escola_id', { count: 'exact', head: true }).eq('cor', 'vermelha')),
  ]);

  const cards = [
    { rotulo: 'Escolas', valor: escolas },
    { rotulo: 'Bandeira amarela', valor: amarelas, tom: 'alerta' as const },
    { rotulo: 'Bandeira vermelha', valor: vermelhas, tom: 'perigo' as const },
    { rotulo: perfil.perfil === 'dre' ? 'Memorandos aguardando a DRE' : 'Memorandos nas DREs', valor: aguardando },
    { rotulo: 'Memorandos na Gestão Estadual', valor: naGestaoEstadual },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black">Olá, {perfil.nome.split(' ')[0]}</h1>
        <p className="text-sm text-slate-600">Resumo da sua área de atuação.</p>
      </div>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((c) => (
          <li key={c.rotulo} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <p className="text-3xl font-black tabular-nums">{c.valor}</p>
            <p className="mt-1 text-sm text-slate-600">{c.rotulo}</p>
            {c.tom && c.valor > 0 && <Badge tom={c.tom} className="mt-2">Atenção</Badge>}
          </li>
        ))}
      </ul>
      <Card>
        <CardHeader titulo="Em construção" descricao="Fila de triagem, mapa de escolas por bandeira e decretação chegam na Fase 4 do roteiro." />
      </Card>
    </div>
  );
}
