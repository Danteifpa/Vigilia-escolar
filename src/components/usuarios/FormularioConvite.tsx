'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { Alert, ariaCampo, Button, Field, Input, Select } from '@/components/ui';
import type { Perfil } from '@/modules/auth/perfis';
import { convidarUsuario, type EstadoConvite } from '@/modules/usuarios/acoes';

interface Opcoes {
  escolas: { id: string; nome: string; codigo_inep: string; dre_id: string }[];
  dres: { id: string; nome: string }[];
}

export function FormularioConvite({ ator, escolas, dres }: Opcoes & { ator: Perfil }) {
  const [estado, acao, enviando] = useActionState<EstadoConvite, FormData>(convidarUsuario, {});
  const [perfil, setPerfil] = useState<Perfil>('escola');
  const [dreFiltro, setDreFiltro] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  const e = estado.erros ?? {};

  useEffect(() => { if (estado.ok) formRef.current?.reset(); }, [estado]);

  const escolasVisiveis = dreFiltro ? escolas.filter((x) => x.dre_id === dreFiltro) : escolas;

  return (
    <form ref={formRef} action={acao} className="grid gap-4 sm:grid-cols-2" noValidate>
      {estado.mensagem && (
        <Alert tom={estado.ok ? 'sucesso' : 'erro'} className="sm:col-span-2">{estado.mensagem}</Alert>
      )}

      <Field id="nome" rotulo="Nome completo" erro={e.nome} obrigatorio>
        <Input {...ariaCampo('nome', e.nome)} name="nome" autoComplete="off" />
      </Field>
      <Field id="email" rotulo="E-mail institucional" erro={e.email} obrigatorio>
        <Input {...ariaCampo('email', e.email)} name="email" type="email" autoComplete="off" />
      </Field>

      {ator === 'seduc' ? (
        <Field id="perfil" rotulo="Perfil" erro={e.perfil} obrigatorio>
          <Select {...ariaCampo('perfil', e.perfil)} name="perfil" value={perfil} onChange={(ev) => setPerfil(ev.target.value as Perfil)}>
            <option value="escola">Escola (direção / gestão)</option>
            <option value="dre">DRE</option>
            <option value="seduc">SEDUC / Comitê de Crise</option>
          </Select>
        </Field>
      ) : (
        <input type="hidden" name="perfil" value="escola" />
      )}

      <Field id="cargo" rotulo="Cargo" dica="Ex.: Diretor(a), Vice-diretor(a), Coordenador(a)">
        <Input {...ariaCampo('cargo')} name="cargo" />
      </Field>

      {perfil === 'escola' && (
        <>
          {ator === 'seduc' && (
            <Field id="filtro_dre" rotulo="DRE da escola" dica="Filtra a lista de escolas">
              <Select {...ariaCampo('filtro_dre')} value={dreFiltro} onChange={(ev) => setDreFiltro(ev.target.value)}>
                <option value="">Todas</option>
                {dres.map((d) => <option key={d.id} value={d.id}>{d.nome}</option>)}
              </Select>
            </Field>
          )}
          <Field id="escola_id" rotulo="Escola" erro={e.escola_id} obrigatorio>
            <Select {...ariaCampo('escola_id', e.escola_id)} name="escola_id" defaultValue="">
              <option value="" disabled>Selecione…</option>
              {escolasVisiveis.map((x) => <option key={x.id} value={x.id}>{x.nome} · INEP {x.codigo_inep}</option>)}
            </Select>
          </Field>
        </>
      )}

      {perfil === 'dre' && (
        <Field id="dre_id" rotulo="DRE" erro={e.dre_id} obrigatorio>
          <Select {...ariaCampo('dre_id', e.dre_id)} name="dre_id" defaultValue="">
            <option value="" disabled>Selecione…</option>
            {dres.map((d) => <option key={d.id} value={d.id}>{d.nome}</option>)}
          </Select>
        </Field>
      )}

      <div className="sm:col-span-2">
        <Button type="submit" carregando={enviando}>Enviar convite por e-mail</Button>
      </div>
    </form>
  );
}
