'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Droplets, Route, Thermometer, Users, Wind } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type ReactNode, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Alert, ariaCampo, Button, Card, Field, Input, OpcoesRadio, Textarea } from '@/components/ui';
import { EVENTO_SINCRONIZADO, enviarOuEnfileirar } from '@/lib/offline/fila';
import { BANDEIRAS } from '@/modules/bandeiras/protocolo';
import {
  checklistSchema, OPCOES_ACESSO, OPCOES_AGUA, OPCOES_FUMACA, type ChecklistInput,
} from '@/modules/escola/checklist.schema';
import type { AcaoProtocolo, ChecklistDiario, CorBandeira } from '@/types/dominio';
import { formatarData, formatarDataHora } from './formatos';

interface Props {
  hoje: string;
  escolaNome: string;
  cor: CorBandeira;
  acoesDiarias: AcaoProtocolo[];
  existente: ChecklistDiario | null;
}

type Aviso = { tom: 'sucesso' | 'alerta' | 'erro'; texto: string } | null;

/** Campo numérico vazio vira null (e não NaN) */
const numero = (v: unknown) => (v === '' || v === null || v === undefined ? null : Number(String(v).replace(',', '.')));

function Secao({ icone, titulo, children }: { icone: ReactNode; titulo: string; children: ReactNode }) {
  return (
    <Card className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold">{icone}{titulo}</h2>
      {children}
    </Card>
  );
}

export function FormularioChecklist({ hoje, escolaNome, cor, acoesDiarias, existente }: Props) {
  const router = useRouter();
  const [aviso, setAviso] = useState<Aviso>(null);

  const form = useForm<ChecklistInput>({
    resolver: zodResolver(checklistSchema),
    defaultValues: {
      id: existente?.id ?? crypto.randomUUID(),
      data: existente?.data ?? hoje,
      situacao_agua: existente?.situacao_agua,
      reservatorio_percentual: existente?.reservatorio_percentual ?? null,
      temperatura_max_c: existente?.temperatura_max_c ?? null,
      nivel_fumaca: existente?.nivel_fumaca,
      situacao_acesso: existente?.situacao_acesso,
      alunos_presentes: existente?.alunos_presentes ?? null,
      alunos_com_sintomas: existente?.alunos_com_sintomas ?? 0,
      acoes: Object.fromEntries(acoesDiarias.map((a) => [a.codigo, !!existente?.acoes?.[a.codigo]])),
      observacoes: existente?.observacoes ?? null,
    },
  });
  const { errors, isSubmitting } = form.formState;

  // Se foi salvo offline, avisa quando a fila enviar
  useEffect(() => {
    const aoSincronizar = () => {
      setAviso((a) => (a?.tom === 'alerta' ? { tom: 'sucesso', texto: 'Internet de volta: checklist enviado.' } : a));
    };
    window.addEventListener(EVENTO_SINCRONIZADO, aoSincronizar);
    return () => window.removeEventListener(EVENTO_SINCRONIZADO, aoSincronizar);
  }, []);

  const salvar = form.handleSubmit(async (dados) => {
    setAviso(null);
    const r = await enviarOuEnfileirar({ chave: `checklist:${dados.data}`, metodo: 'PUT', url: '/api/escola/checklist', corpo: dados });
    if (r.estado === 'enviado') {
      router.push('/escola');
      router.refresh();
    } else if (r.estado === 'na_fila') {
      setAviso({ tom: 'alerta', texto: 'Sem internet: checklist salvo neste aparelho. Ele será enviado automaticamente quando a conexão voltar.' });
    } else {
      r.campos?.forEach((c) => form.setError(c as keyof ChecklistInput, { message: r.mensagem }));
      setAviso({ tom: 'erro', texto: r.mensagem });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  const b = BANDEIRAS[cor];

  return (
    <div className="min-h-dvh pb-28">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <a href="/escola" className="rounded-lg p-2 hover:bg-slate-100" aria-label="Voltar ao painel">
            <ArrowLeft className="h-5 w-5" />
          </a>
          <div className="min-w-0 flex-1">
            <h1 className="font-bold leading-tight">Checklist do dia</h1>
            <p className="truncate text-xs text-slate-500">{escolaNome} · {formatarData(`${hoje}T12:00:00-03:00`)}</p>
          </div>
          <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${b.ui.banner}`}>{b.nome}</span>
        </div>
      </header>

      <form onSubmit={salvar} noValidate className="mx-auto max-w-3xl space-y-4 px-4 pt-4">
        {aviso && <Alert tom={aviso.tom}>{aviso.texto}</Alert>}
        {existente && !aviso && (
          <Alert tom="info">Checklist de hoje já registrado (atualizado {formatarDataHora(existente.updated_at)}). Salvar de novo substitui os dados.</Alert>
        )}

        <Secao icone={<Droplets className="h-5 w-5 text-sky-700" aria-hidden />} titulo="Água">
          <OpcoesRadio legenda="Situação do abastecimento" registro={form.register('situacao_agua')} opcoes={OPCOES_AGUA} erro={errors.situacao_agua?.message} />
          <Field id="reservatorio_percentual" rotulo="Nível do reservatório (%)" dica="Estimativa visual vale. Deixe em branco se não houver reservatório." erro={errors.reservatorio_percentual?.message}>
            <Input {...ariaCampo('reservatorio_percentual', errors.reservatorio_percentual?.message)} {...form.register('reservatorio_percentual', { setValueAs: numero })}
              type="number" inputMode="numeric" min={0} max={100} className="max-w-40" />
          </Field>
        </Secao>

        <Secao icone={<Thermometer className="h-5 w-5 text-orange-700" aria-hidden />} titulo="Calor">
          <Field id="temperatura_max_c" rotulo="Temperatura máxima nas salas (°C)" dica="Termômetro da escola ou previsão local." erro={errors.temperatura_max_c?.message}>
            <Input {...ariaCampo('temperatura_max_c', errors.temperatura_max_c?.message)} {...form.register('temperatura_max_c', { setValueAs: numero })}
              type="number" inputMode="decimal" step="0.1" min={10} max={60} className="max-w-40" />
          </Field>
        </Secao>

        <Secao icone={<Wind className="h-5 w-5 text-slate-600" aria-hidden />} titulo="Fumaça e qualidade do ar">
          <OpcoesRadio legenda="Nível de fumaça" registro={form.register('nivel_fumaca')} opcoes={OPCOES_FUMACA} erro={errors.nivel_fumaca?.message} colunas={4} />
        </Secao>

        <Secao icone={<Route className="h-5 w-5 text-emerald-700" aria-hidden />} titulo="Acesso à escola">
          <OpcoesRadio legenda="Situação de acesso" registro={form.register('situacao_acesso')} opcoes={OPCOES_ACESSO} erro={errors.situacao_acesso?.message} colunas={3} />
        </Secao>

        <Secao icone={<Users className="h-5 w-5 text-violet-700" aria-hidden />} titulo="Alunos">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="alunos_presentes" rotulo="Alunos presentes" erro={errors.alunos_presentes?.message}>
              <Input {...ariaCampo('alunos_presentes', errors.alunos_presentes?.message)} {...form.register('alunos_presentes', { setValueAs: numero })}
                type="number" inputMode="numeric" min={0} />
            </Field>
            <Field id="alunos_com_sintomas" rotulo="Alunos com sintomas" dica="Falta de ar, tontura, desidratação, irritação nos olhos." erro={errors.alunos_com_sintomas?.message}>
              <Input {...ariaCampo('alunos_com_sintomas', errors.alunos_com_sintomas?.message)} {...form.register('alunos_com_sintomas', { setValueAs: (v) => numero(v) ?? 0 })}
                type="number" inputMode="numeric" min={0} />
            </Field>
          </div>
          <p className="text-xs text-slate-500">Registre só quantidades — nunca nomes de alunos.</p>
        </Secao>

        {acoesDiarias.length > 0 && (
          <Card className="space-y-3">
            <h2 className="text-lg font-bold">Ações do protocolo realizadas hoje</h2>
            <ul className="space-y-2">
              {acoesDiarias.map((a) => (
                <li key={a.codigo}>
                  <label className="flex cursor-pointer gap-3 rounded-xl p-3 ring-1 ring-slate-200 has-[:checked]:bg-emerald-50 has-[:checked]:ring-emerald-500">
                    <input type="checkbox" {...form.register(`acoes.${a.codigo}`)} className="mt-1 h-5 w-5 shrink-0 accent-emerald-700" />
                    <span>
                      <span className="block font-semibold">{a.titulo}</span>
                      {a.descricao && <span className="block text-sm text-slate-600">{a.descricao}</span>}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Card>
          <Field id="observacoes" rotulo="Observações" dica="Algo que a DRE precise saber. Situações graves: registre também um memorando de ocorrência." erro={errors.observacoes?.message}>
            <Textarea {...ariaCampo('observacoes', errors.observacoes?.message)} {...form.register('observacoes', { setValueAs: (v) => (v?.trim() ? v : null) })} />
          </Field>
        </Card>

        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 p-3 backdrop-blur">
          <div className="mx-auto max-w-3xl">
            <Button type="submit" tamanho="lg" larguraTotal carregando={isSubmitting}>Salvar checklist</Button>
          </div>
        </div>
      </form>
    </div>
  );
}
