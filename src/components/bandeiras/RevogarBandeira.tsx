'use client';

import { useActionState } from 'react';
import { Alert, Button, Input } from '@/components/ui';
import { revogarBandeiraEscola, type EstadoAcao } from '@/modules/bandeiras/acoes';

export function RevogarBandeira({ escolaId, escolaNome }: { escolaId: string; escolaNome: string }) {
  const [estado, acao, enviando] = useActionState<EstadoAcao, FormData>(revogarBandeiraEscola, {});
  return (
    <form action={acao} className="flex flex-col gap-2 sm:flex-row sm:items-start">
      <input type="hidden" name="escola_id" value={escolaId} />
      <div className="flex-1">
        <Input name="motivo" placeholder="Motivo da revogação" aria-label={`Motivo da revogação — ${escolaNome}`} aria-invalid={estado.ok === false || undefined} />
        {estado.mensagem && <Alert tom={estado.ok ? 'sucesso' : 'erro'} className="mt-2">{estado.mensagem}</Alert>}
      </div>
      <Button type="submit" variante="secundario" carregando={enviando} aria-label={`Revogar decreto — ${escolaNome}`}>Revogar</Button>
    </form>
  );
}
