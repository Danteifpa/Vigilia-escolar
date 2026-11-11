import { Droplets, Route, Thermometer, Wind, type LucideIcon } from 'lucide-react';
import type { ChecklistDiario } from '@/types/dominio';

type Tom = 'ok' | 'atencao' | 'critico' | 'vazio';
const TOM: Record<Tom, string> = {
  ok: 'bg-emerald-50 text-emerald-900 ring-emerald-200',
  atencao: 'bg-amber-50 text-amber-900 ring-amber-300',
  critico: 'bg-red-50 text-red-900 ring-red-300',
  vazio: 'bg-slate-50 text-slate-500 ring-slate-200',
};
const ROTULO_TOM: Record<Tom, string> = { ok: 'Normal', atencao: 'Atenção', critico: 'Crítico', vazio: 'Sem registro' };

function indicadores(c: ChecklistDiario | null): { titulo: string; valor: string; tom: Tom; Icone: LucideIcon }[] {
  if (!c) {
    return [
      { titulo: 'Água', valor: '—', tom: 'vazio', Icone: Droplets },
      { titulo: 'Fumaça', valor: '—', tom: 'vazio', Icone: Wind },
      { titulo: 'Calor', valor: '—', tom: 'vazio', Icone: Thermometer },
      { titulo: 'Acesso', valor: '—', tom: 'vazio', Icone: Route },
    ];
  }
  const agua: Record<ChecklistDiario['situacao_agua'], [string, Tom]> = {
    normal: ['Normal', 'ok'], reduzida: ['Reduzida', 'atencao'], critica: ['Crítica', 'critico'], sem_agua: ['Sem água', 'critico'],
  };
  const fumaca: Record<ChecklistDiario['nivel_fumaca'], [string, Tom]> = {
    ausente: ['Ausente', 'ok'], leve: ['Leve', 'atencao'], moderada: ['Moderada', 'atencao'], intensa: ['Intensa', 'critico'],
  };
  const acesso: Record<ChecklistDiario['situacao_acesso'], [string, Tom]> = {
    normal: ['Normal', 'ok'], restrito: ['Restrito', 'atencao'], interrompido: ['Interrompido', 'critico'],
  };
  const t = c.temperatura_max_c;
  const tomCalor: Tom = t == null ? 'vazio' : t >= 38 ? 'critico' : t >= 34 ? 'atencao' : 'ok';
  const [aguaTxt, aguaTom] = agua[c.situacao_agua];

  return [
    { titulo: 'Água', valor: c.reservatorio_percentual != null ? `${aguaTxt} · ${c.reservatorio_percentual}%` : aguaTxt, tom: aguaTom, Icone: Droplets },
    { titulo: 'Fumaça', valor: fumaca[c.nivel_fumaca][0], tom: fumaca[c.nivel_fumaca][1], Icone: Wind },
    { titulo: 'Calor', valor: t != null ? `${t.toLocaleString('pt-BR')} °C` : 'Não medido', tom: tomCalor, Icone: Thermometer },
    { titulo: 'Acesso', valor: acesso[c.situacao_acesso][0], tom: acesso[c.situacao_acesso][1], Icone: Route },
  ];
}

export function IndicadoresDia({ checklist }: { checklist: ChecklistDiario | null }) {
  return (
    <section aria-labelledby="indicadores-titulo">
      <h2 id="indicadores-titulo" className="sr-only">Condições locais de hoje</h2>
      <ul className="grid grid-cols-2 gap-3">
        {indicadores(checklist).map(({ titulo, valor, tom, Icone }) => (
          <li key={titulo} className={`rounded-xl p-3 ring-1 ${TOM[tom]}`}>
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Icone className="h-4 w-4" aria-hidden /> {titulo}
            </div>
            <p className="mt-1 text-lg font-bold leading-tight">{valor}</p>
            <p className="text-xs opacity-75">{ROTULO_TOM[tom]}</p>
          </li>
        ))}
      </ul>
      {checklist && checklist.alunos_com_sintomas > 0 && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-900 ring-1 ring-red-200">
          {checklist.alunos_com_sintomas} aluno(s) com sintomas registrados hoje.
        </p>
      )}
    </section>
  );
}
