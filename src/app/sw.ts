import { defaultCache } from '@serwist/next/worker';
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import { NetworkFirst, Serwist } from 'serwist';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}
declare const self: ServiceWorkerGlobalScope;

/**
 * Estratégia offline:
 *  - App shell e assets: precache (abre sem rede).
 *  - Painel da escola e catálogo do protocolo: NetworkFirst com timeout curto,
 *    caindo para a última versão conhecida (bandeira + ações obrigatórias).
 *  - Escritas (POST/PATCH) NÃO passam pelo cache: vão pela fila IndexedDB do app.
 */
const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: ({ url, request }) => request.method === 'GET' && url.pathname.startsWith('/api/escola/painel'),
      handler: new NetworkFirst({ cacheName: 'painel-escola', networkTimeoutSeconds: 4 }),
    },
    {
      matcher: ({ url, request }) => request.method === 'GET' && url.pathname.startsWith('/api/memorandos'),
      handler: new NetworkFirst({ cacheName: 'memorandos', networkTimeoutSeconds: 4 }),
    },
    ...defaultCache,
  ],
  fallbacks: { entries: [{ url: '/offline', matcher: ({ request }) => request.destination === 'document' }] },
});

serwist.addEventListeners();
