/**
 * Regras de navegação por perfil. Funções puras: rodam no middleware (Edge),
 * no servidor e nos testes, sem depender do Supabase.
 * A AUTORIZAÇÃO de dados é feita pela RLS; aqui é só para onde cada um vai.
 */
export type Perfil = 'escola' | 'dre' | 'estadual';

export const PERFIS: readonly Perfil[] = ['escola', 'dre', 'estadual'];

export const HOME_DO_PERFIL: Record<Perfil, string> = {
  escola: '/escola',
  dre: '/dre',
  estadual: '/estadual',
};

export const ROTULO_PERFIL: Record<Perfil, string> = {
  escola: 'Escola',
  dre: 'DRE',
  estadual: 'Gestão Estadual',
};

/** Áreas restritas e quem pode acessá-las. */
const AREAS: { prefixo: string; perfis: readonly Perfil[] }[] = [
  { prefixo: '/escola', perfis: ['escola'] },
  { prefixo: '/dre', perfis: ['dre'] },
  { prefixo: '/estadual', perfis: ['estadual'] },
];

/** Exigem sessão, mas não um perfil específico. */
const SO_AUTENTICADO = ['/definir-senha'];

export const ehPerfil = (v: unknown): v is Perfil => typeof v === 'string' && (PERFIS as string[]).includes(v);

const casa = (pathname: string, prefixo: string) => pathname === prefixo || pathname.startsWith(`${prefixo}/`);

/** Aceita só caminhos internos (evita open redirect em ?proximo=). */
export function caminhoSeguro(valor: string | null | undefined): string | null {
  if (!valor || !valor.startsWith('/') || valor.startsWith('//') || valor.startsWith('/\\')) return null;
  return valor;
}

export type Decisao = { tipo: 'seguir' } | { tipo: 'redirecionar'; para: string };

export function decidirRota(entrada: { pathname: string; search?: string; autenticado: boolean; perfil?: unknown }): Decisao {
  const { pathname, search = '', autenticado } = entrada;
  const perfil = ehPerfil(entrada.perfil) ? entrada.perfil : null;
  const casa_ = (p: string) => casa(pathname, p);
  const ir = (para: string): Decisao => ({ tipo: 'redirecionar', para });

  if (pathname === '/') {
    if (!autenticado) return ir('/entrar');
    return ir(perfil ? HOME_DO_PERFIL[perfil] : '/entrar?erro=sem_perfil');
  }

  if (casa_('/entrar')) {
    return autenticado && perfil ? ir(HOME_DO_PERFIL[perfil]) : { tipo: 'seguir' };
  }

  if (SO_AUTENTICADO.some(casa_)) {
    return autenticado ? { tipo: 'seguir' } : ir('/entrar');
  }

  const area = AREAS.find((a) => casa_(a.prefixo));
  if (!area) return { tipo: 'seguir' };

  if (!autenticado) return ir(`/entrar?proximo=${encodeURIComponent(pathname + search)}`);
  if (!perfil) return ir('/entrar?erro=sem_perfil');
  if (!area.perfis.includes(perfil)) return ir(HOME_DO_PERFIL[perfil]);
  return { tipo: 'seguir' };
}
