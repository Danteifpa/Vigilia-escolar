import withSerwistInit from '@serwist/next';
import type { NextConfig } from 'next';

const withSerwist = withSerwistInit({
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV === 'development',
  // NÃO recarregar a página ao voltar a internet (padrão do Serwist): apagaria
  // formulários em preenchimento. A fila offline do app cuida da reconexão.
  reloadOnOnline: false,
});

const nextConfig: NextConfig = { reactStrictMode: true };

export default withSerwist(nextConfig);
