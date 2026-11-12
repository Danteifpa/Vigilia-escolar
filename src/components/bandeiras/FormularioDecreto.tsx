'use client';

import { Search } from 'lucide-react';
import { useActionState, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, ariaCampo, Badge, Button, Field, Input, OpcoesRadio, Select, Textarea } from '@/components/ui';
import { decretarBandeiras, type EstadoAcao } from '@/modules/bandeiras/acoes';
import { BANDEIRAS, ROTULO_REGIME } from '@/modules/bandeiras/protocolo';
import type { CorBandeira, RegimePedagogico } from '@/types/dominio';

export interface AlvoMunicipio { id: number; nome: string; cor: CorBandeira | null; regime: RegimePedagogico | null }
export interface AlvoEscola { id: string; nome: string; codigo_inep: string; municipio: string; cor: CorBandeira; origem: string }

const TOM_COR = { verde: 'sucesso', amarela: 'alerta', vermelha: 'perigo' } as const;
const OPCOES_COR = [
  { valor: 'verde', rotulo: 'Verde', descricao: 'Prevenção e monitoramento', tom: 'ok' },
  { valor: 'amarela', rotulo: 'Amarela', descricao: 'Atenção e preparação', tom: 'atencao' },
  { valor: 'vermelha', rotulo: 'Vermelha', descricao: 'Resposta e proteção', tom: 'critico' },
] as const;
const REGIMES: RegimePedagogico[] = ['presencial', 'presencial_adaptado', 'nao_presencial', 'cemep'];
const PRESENCIAIS: RegimePedagogico[] = ['presencial', 'presencial_adaptado'];

const normalizar = (t: string) => t.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

export function FormularioDecreto({ municipios, escolas }: { municipios: AlvoMunicipio[]; escolas: AlvoEscola[] }) {
  const [estado, acao, enviando] = useActionState<EstadoAcao, FormData>(decretarBandeiras, {});
  const [escopo, setEscopo] = useState<'municipio' | 'escola'>('municipio');
  const [cor, setCor] = useState<CorBandeira | null>(null);
  const [regime, setRegime] = useState<RegimePedagogico>('presencial');
  const [busca, setBusca] = useState('');
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [revisando, setRevisando] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const e = estado.erros ?? {};

  // Após sucesso: limpa seleção e volta ao modo de edição
  useEffect(() => {
    if (estado.ok) { formRef.current?.reset(); setSelecionados(new Set()); setCor(null); setRegime('presencial'); }
    setRevisando(false);
  }, [estado]);

  const lista = useMemo(() => {
    const q = normalizar(busca);
    return escopo === 'municipio'
      ? municipios.filter((m) => normalizar(m.nome).includes(q)).map((m) => ({ id: String(m.id), titulo: m.nome, detalhe: m.regime ? ROTULO_REGIME[m.regime] : 'Sem decreto (verde)', cor: m.cor ?? 'verde' as CorBandeira }))
      : escolas.filter((x) => normalizar(`${x.nome} ${x.codigo_inep} ${x.municipio}`).includes(q))
          .map((x) => ({ id: x.id, titulo: x.nome, detalhe: `INEP ${x.codigo_inep} · ${x.municipio}${x.origem === 'escola' ? ' · decreto próprio' : ''}`, cor: x.cor }));
  }, [escopo, busca, municipios, escolas]);

  const alternar = (id: string) => setSelecionados((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const trocarEscopo = (novo: 'municipio' | 'escola') => { setEscopo(novo); setSelecionados(new Set()); setBusca(''); };
  const regimesPermitidos = cor === 'vermelha' ? REGIMES : PRESENCIAIS;
  const qtd = selecionados.size;
  const nomeAlvo = escopo === 'municipio' ? (qtd === 1 ? 'município' : 'municípios') : (qtd === 1 ? 'escola' : 'escolas');

  return (
    <form ref={formRef} action={acao} className="space-y-5" noValidate>
      {estado.mensagem && <Alert tom={estado.ok ? 'sucesso' : 'erro'}>{estado.mensagem}</Alert>}

      {/* 1. Onde */}
      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-slate-800">1. Onde vale o decreto</legend>
        <div className="mb-3 inline-flex rounded-lg bg-slate-100 p-1 text-sm font-semibold" role="radiogroup" aria-label="Escopo do decreto">
          {(['municipio', 'escola'] as const).map((op) => (
            <label key={op} className={`cursor-pointer rounded-md px-3 py-1.5 ${escopo === op ? 'bg-white shadow-sm' : 'text-slate-600'}`}>
              <input type="radio" name="escopo" value={op} checked={escopo === op} onChange={() => trocarEscopo(op)} className="sr-only" />
              {op === 'municipio' ? 'Municípios' : 'Escolas específicas'}
            </label>
          ))}
        </div>
        {escopo === 'escola' && (
          <p className="mb-2 text-xs text-slate-500">O decreto de uma escola prevalece sobre o do município até ser revogado.</p>
        )}

        <div className="relative mb-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <Input value={busca} onChange={(ev) => setBusca(ev.target.value)} placeholder={escopo === 'municipio' ? 'Buscar município' : 'Buscar escola, INEP ou município'} className="pl-9" aria-label="Buscar" />
        </div>
        <ul className="max-h-72 divide-y divide-slate-100 overflow-y-auto rounded-xl ring-1 ring-slate-200" aria-describedby={e.alvos ? 'alvos-erro' : undefined}>
          {lista.map((item) => (
            <li key={item.id} className="flex items-center gap-3 px-3 py-2.5 has-[:checked]:bg-sky-50">
              <input id={`alvo-${item.id}`} type="checkbox" name="alvos" value={item.id} checked={selecionados.has(item.id)} onChange={() => alternar(item.id)} className="h-5 w-5 shrink-0 accent-slate-900" aria-describedby={`alvo-${item.id}-det`} />
              <label htmlFor={`alvo-${item.id}`} className="min-w-0 flex-1 cursor-pointer font-semibold">{item.titulo}</label>
              <span id={`alvo-${item.id}-det`} className="hidden text-xs text-slate-500 sm:inline">{item.detalhe}</span>
              <Badge tom={TOM_COR[item.cor]}>{BANDEIRAS[item.cor].nome.replace('Bandeira ', '')}</Badge>
            </li>
          ))}
          {lista.length === 0 && <li className="px-3 py-4 text-sm text-slate-500">Nada encontrado.</li>}
        </ul>
        <p className="mt-1 text-sm text-slate-600">{qtd} {nomeAlvo} selecionado(s)</p>
        {e.alvos && <p id="alvos-erro" className="text-sm text-red-700">{e.alvos}</p>}
      </fieldset>

      {/* 2. Qual bandeira */}
      <OpcoesRadio
        legenda="2. Nova bandeira"
        registro={{ name: 'cor', onChange: async (ev) => { const c = ev.target.value as CorBandeira; setCor(c); if (c !== 'vermelha' && !PRESENCIAIS.includes(regime)) setRegime('presencial'); } }}
        opcoes={OPCOES_COR}
        colunas={3}
        erro={e.cor}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="regime" rotulo="3. Regime pedagógico" dica={cor === 'vermelha' ? 'Não presencial/CEMEP permitido na vermelha.' : 'Não presencial/CEMEP só com bandeira vermelha.'} erro={e.regime}>
          <Select {...ariaCampo('regime', e.regime)} name="regime" value={regime} onChange={(ev) => setRegime(ev.target.value as RegimePedagogico)}>
            {regimesPermitidos.map((r) => <option key={r} value={r}>{ROTULO_REGIME[r]}</option>)}
          </Select>
        </Field>
        <Field id="ato_referencia" rotulo="Ato de referência" dica="Ex.: nº da portaria ou da ata do comitê">
          <Input {...ariaCampo('ato_referencia')} name="ato_referencia" maxLength={120} />
        </Field>
      </div>

      <Field id="justificativa" rotulo="4. Justificativa" obrigatorio dica="Aparece no painel das escolas atingidas." erro={e.justificativa}>
        <Textarea {...ariaCampo('justificativa', e.justificativa)} name="justificativa" maxLength={1000} className="min-h-20" />
      </Field>

      {/* Revisão antes de confirmar: decisão de autoridade, com efeito imediato */}
      {!revisando ? (
        <Button type="button" disabled={!qtd || !cor} onClick={() => setRevisando(true)}>Revisar decreto</Button>
      ) : (
        <div className={`space-y-3 rounded-xl p-4 ring-2 ${cor === 'vermelha' ? 'bg-red-50 ring-red-300' : cor === 'amarela' ? 'bg-amber-50 ring-amber-300' : 'bg-emerald-50 ring-emerald-300'}`}>
          <p className="font-bold">
            {cor && BANDEIRAS[cor].nome} para {qtd} {nomeAlvo} · {ROTULO_REGIME[regime]}
          </p>
          <p className="text-sm">O painel de todas as escolas atingidas muda imediatamente. O decreto fica registrado com o seu nome.</p>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variante={cor === 'vermelha' ? 'perigo' : 'primario'} carregando={enviando}>Confirmar decreto</Button>
            <Button type="button" variante="secundario" onClick={() => setRevisando(false)} disabled={enviando}>Voltar e editar</Button>
          </div>
        </div>
      )}
    </form>
  );
}
