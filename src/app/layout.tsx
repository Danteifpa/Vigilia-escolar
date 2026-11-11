import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Vigília Escolar PA',
  description: 'Gestão e resposta a riscos climáticos nas escolas',
  applicationName: 'Vigília Escolar PA',
};
export const viewport: Viewport = { themeColor: '#0f172a', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
