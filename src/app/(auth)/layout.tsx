import { ShieldCheck } from 'lucide-react';

export default function LayoutAuth({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="mb-6 flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-slate-900 text-white">
          <ShieldCheck className="h-6 w-6" aria-hidden />
        </span>
        <div>
          <p className="text-lg font-black leading-tight">Vigília Escolar PA</p>
          <p className="text-xs text-slate-500">Riscos climáticos nas escolas</p>
        </div>
      </div>
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">{children}</div>
      <p className="mt-6 max-w-sm text-center text-xs text-slate-500">
        Acesso restrito a servidores da rede estadual. Contas são criadas por convite da DRE ou da Gestão Estadual.
      </p>
    </main>
  );
}
