'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { Alert, Button, Field, Textarea } from '@/components/ui';
import type { Perfil } from '@/modules/auth/perfis';
import { tramitar, type EstadoTramitacao } from '@/modules/ocorrencias/acoes';
import { acoesDisponiveis, type AcaoMemorando } from '@/modules/ocorrencias/maquina-estados';
import type { StatusMemorando } from '@/types/dominio';

const ROTULO: Record<AcaoMemorando, (perfil: Perfil) => string> = {
  enviar: () => 'Enviar',
  receber: () => 'Receber e iniciar análise',
  devolver: (p) => (p === 'dre' ? 'Devolver à escola' : 'Devolver à DRE'),
  encaminhar_estadual: () => 'Encaminhar à Gestão Estadual',
  atender: () => 'Marcar como atendido',
  arquivar: () => 'Arquivar',
};
const VARIANTE: Partial<Record<AcaoMemorando, 'primario' | 'secundario' | 'perigo'>> = {
  receber: 'primario', atender: 'primario', encaminhar_estadual: 'primario', devolver: 'secundario', arquivar: 'secundario',
};

export function PainelTramitacao({ id, status, perfil }: { id: string; status: StatusMemorando; perfil: Perfil }) {
  const [estado, acao, enviando] = useActionState<EstadoTramitacao, FormData>(tramitar, {});
  const [parecer, setParecer] = useState('');
  const [erroParecer, setErroParecer] = useState<string | null>(null);
  // O Next.js não envia o botão clicado (submitter) nas Server Actions: a ação
  // escolhida vai num campo oculto, preenchido no clique, antes do envio.
  const acaoRef = useRef<HTMLInputElement>(null);
  const acoes = acoesDisponiveis(status, perfil);

  // Parecer só é limpo depois de uma ação registrada com sucesso
  useEffect(() => { if (estado.ok) setParecer(''); }, [estado]);
  const algumaExigeParecer = acoes.some((a) => a.exigeParecer);

  return (
    <div className="space-y-3">
      {estado.mensagem && <Alert tom={estado.ok ? 'sucesso' : 'erro'}>{estado.mensagem}</Alert>}
      {acoes.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhuma ação disponível para o seu perfil nesta etapa.</p>
      ) : (
        <form
          action={acao}
          className="space-y-3"
          onSubmit={(ev) => {
            const regra = acoes.find((a) => a.acao === acaoRef.current?.value);
            setErroParecer(null);
            if (regra?.exigeParecer && !parecer.trim()) {
              ev.preventDefault();
              setErroParecer(`Escreva o parecer para "${ROTULO[regra.acao](perfil)}".`);
            }
          }}
        >
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="acao" ref={acaoRef} defaultValue="" />
          {algumaExigeParecer && (
            <Field id="parecer" rotulo="Parecer" dica="Obrigatório para devolver, encaminhar e atender. A escola verá este texto." erro={erroParecer ?? undefined}>
              <Textarea id="parecer" name="parecer" value={parecer} onChange={(e) => setParecer(e.target.value)} maxLength={4000} className="min-h-24"
                aria-invalid={erroParecer ? true : undefined} aria-describedby={erroParecer ? 'parecer-erro' : 'parecer-dica'} />
            </Field>
          )}
          <div className="flex flex-wrap gap-2">
            {acoes.map((a) => (
              <Button key={a.acao} type="submit" variante={VARIANTE[a.acao] ?? 'secundario'} disabled={enviando}
                onClick={() => { if (acaoRef.current) acaoRef.current.value = a.acao; }}>
                {ROTULO[a.acao](perfil)}
              </Button>
            ))}
          </div>
        </form>
      )}
    </div>
  );
}
