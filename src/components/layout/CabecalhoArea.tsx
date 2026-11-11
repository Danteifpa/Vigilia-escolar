import { ShieldCheck } from 'lucide-react';
import { BotaoSair } from '@/components/auth/BotaoSair';
import { ROTULO_PERFIL, type Perfil } from '@/modules/auth/perfis';

export function CabecalhoArea({ perfil, nome, subtitulo, links }: {
  perfil: Perfil; nome: string; subtitulo?: string; links: { href: string; rotulo: string }[];
}) {
  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-slate-800" aria-hidden />
          <div>
            <p className="font-black leading-tight">Vigília Escolar PA</p>
            <p className="text-xs text-slate-500">{ROTULO_PERFIL[perfil]}{subtitulo && ` · ${subtitulo}`}</p>
          </div>
        </div>
        <nav className="flex flex-1 gap-1 text-sm font-semibold" aria-label="Seções">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="rounded-lg px-3 py-1.5 text-slate-700 hover:bg-slate-100">{l.rotulo}</a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <span className="hidden text-sm text-slate-600 sm:inline">{nome}</span>
          <BotaoSair />
        </div>
      </div>
    </header>
  );
}
