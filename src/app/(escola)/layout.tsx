import { Sincronizador } from '@/components/offline/Sincronizador';

export default function LayoutEscola({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Sincronizador />
      {children}
    </>
  );
}
