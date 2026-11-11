import { Badge, Card, CardHeader } from '@/components/ui';
import { ROTULO_PERFIL, type Perfil } from '@/modules/auth/perfis';
import { exigirPerfil } from '@/modules/auth/sessao';
import { alterarAcesso } from '@/modules/usuarios/acoes';
import { FormularioConvite } from './FormularioConvite';

interface LinhaUsuario {
  id: string; nome: string; email: string; perfil: Perfil; cargo: string | null; ativo: boolean;
  escola: { nome: string; codigo_inep: string } | null;
  dre: { nome: string } | null;
}

/** Lista (recortada pela RLS) + convite. Compartilhado por /estadual/usuarios e /dre/usuarios. */
export async function GestaoUsuarios() {
  const { db, perfil: ator } = await exigirPerfil('estadual', 'dre');

  const [usuarios, escolas, dres] = await Promise.all([
    db.from('users')
      .select('id, nome, email, perfil, cargo, ativo, escola:escolas(nome, codigo_inep), dre:dres(nome)')
      .order('perfil').order('nome')
      .returns<LinhaUsuario[]>(),
    db.from('escolas').select('id, nome, codigo_inep, dre_id').eq('ativo', true).order('nome'),
    db.from('dres').select('id, nome').order('nome'),
  ]);

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          titulo="Convidar usuário"
          descricao={ator.perfil === 'dre'
            ? 'Cadastre a equipe gestora das escolas do seu polo. A pessoa recebe um e-mail para definir a senha.'
            : 'A pessoa recebe um e-mail para definir a senha. Não há autocadastro.'}
        />
        <FormularioConvite ator={ator.perfil} escolas={escolas.data ?? []} dres={dres.data ?? []} />
      </Card>

      <Card>
        <CardHeader titulo="Usuários" descricao={`${usuarios.data?.length ?? 0} conta(s) visíveis para o seu perfil`} />
        <div className="-mx-5 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-y border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-2 font-semibold">Nome</th>
                <th className="px-3 py-2 font-semibold">Perfil</th>
                <th className="px-3 py-2 font-semibold">Vínculo</th>
                <th className="px-3 py-2 font-semibold">Situação</th>
                <th className="px-5 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(usuarios.data ?? []).map((u) => {
                const podeAlterar = u.id !== ator.id && (ator.perfil === 'estadual' || u.perfil === 'escola');
                return (
                  <tr key={u.id}>
                    <td className="px-5 py-3">
                      <p className="font-semibold">{u.nome}</p>
                      <p className="text-xs text-slate-500">{u.email}{u.cargo && ` · ${u.cargo}`}</p>
                    </td>
                    <td className="px-3 py-3">{ROTULO_PERFIL[u.perfil]}</td>
                    <td className="px-3 py-3 text-slate-600">
                      {u.escola ? `${u.escola.nome} (${u.escola.codigo_inep})` : u.dre?.nome ?? '—'}
                    </td>
                    <td className="px-3 py-3">
                      <Badge tom={u.ativo ? 'sucesso' : 'neutro'}>{u.ativo ? 'Ativo' : 'Desativado'}</Badge>
                    </td>
                    <td className="px-5 py-3 text-right">
                      {podeAlterar && (
                        <form action={alterarAcesso}>
                          <input type="hidden" name="id" value={u.id} />
                          <input type="hidden" name="ativo" value={String(!u.ativo)} />
                          <button className={`text-sm font-semibold hover:underline ${u.ativo ? 'text-red-700' : 'text-emerald-700'}`}>
                            {u.ativo ? 'Desativar' : 'Reativar'}
                          </button>
                        </form>
                      )}
                    </td>
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
