'use client';

import Dexie, { type Table } from 'dexie';
import type { CriarRascunhoInput } from '@/modules/ocorrencias/schema';

/**
 * Persistência local (IndexedDB) para escolas com conectividade instável.
 *  - `rascunhos`: o formulário do Anexo I é salvo a cada alteração, mesmo offline.
 *  - `fila`: outbox de requisições. Processada em ordem (FIFO) quando a rede volta.
 * Idempotência: o `id` do memorando é gerado no aparelho, então reenviar é seguro.
 */
export interface ItemFila {
  seq?: number;
  chave: string;                       // agrupa por recurso (ex.: memorando id)
  metodo: 'POST' | 'PATCH' | 'PUT';
  url: string;
  corpo?: unknown;
  criadoEm: number;
  tentativas: number;
  proximaTentativa: number;
  estado: 'pendente' | 'requer_atencao';
  ultimoErro?: string;
}

export interface RascunhoLocal extends Partial<CriarRascunhoInput> {
  id: string;
  atualizadoEm: number;
  sincronizado: boolean;
}

class BancoLocal extends Dexie {
  fila!: Table<ItemFila, number>;
  rascunhos!: Table<RascunhoLocal, string>;
  constructor() {
    super('vigilia-escolar-pa');
    this.version(1).stores({
      fila: '++seq, chave, estado, proximaTentativa',
      rascunhos: 'id, atualizadoEm, sincronizado',
    });
  }
}
export const bancoLocal = new BancoLocal();

export async function enfileirar(item: Pick<ItemFila, 'chave' | 'metodo' | 'url' | 'corpo'>) {
  await bancoLocal.fila.add({ ...item, criadoEm: Date.now(), tentativas: 0, proximaTentativa: 0, estado: 'pendente' });
  void processarFila();
}

/**
 * Registro imediato de ocorrência: grava rascunho, cria no servidor e despacha.
 * Se offline, tudo fica na fila e é enviado automaticamente ao reconectar.
 */
export async function reportarOcorrencia(dados: CriarRascunhoInput) {
  await bancoLocal.rascunhos.put({ ...dados, atualizadoEm: Date.now(), sincronizado: false });
  await enfileirar({ chave: dados.id, metodo: 'POST', url: '/api/memorandos', corpo: dados });
  await enfileirar({ chave: dados.id, metodo: 'POST', url: `/api/memorandos/${dados.id}/enviar` });
}

let processando = false;
const BACKOFF_MS = [5_000, 15_000, 60_000, 300_000];

export async function processarFila(): Promise<{ enviados: number; pendentes: number }> {
  if (processando || typeof navigator === 'undefined' || !navigator.onLine) {
    return { enviados: 0, pendentes: await contarPendentes() };
  }
  processando = true;
  let enviados = 0;
  try {
    const itens = await bancoLocal.fila.where('estado').equals('pendente').sortBy('seq');
    const bloqueadas = new Set<string>();   // preserva ordem dentro do mesmo memorando

    for (const item of itens) {
      if (bloqueadas.has(item.chave) || item.proximaTentativa > Date.now()) { bloqueadas.add(item.chave); continue; }
      try {
        const resp = await fetch(item.url, {
          method: item.metodo,
          headers: { 'Content-Type': 'application/json', 'Idempotency-Key': `${item.chave}:${item.seq}` },
          body: item.corpo === undefined ? undefined : JSON.stringify(item.corpo),
          credentials: 'same-origin',
        });

        if (resp.ok) {
          await bancoLocal.fila.delete(item.seq!);
          enviados++;
          if (item.url.endsWith('/enviar')) await bancoLocal.rascunhos.update(item.chave, { sincronizado: true });
          continue;
        }

        const erro = await resp.json().catch(() => null);
        // Despacho repetido de algo já enviado (ex.: retry após timeout) = sucesso
        if (resp.status === 409 && item.url.endsWith('/enviar') && /já despachado/i.test(erro?.erro?.mensagem ?? '')) {
          await bancoLocal.fila.delete(item.seq!);
          continue;
        }
        if (resp.status >= 400 && resp.status < 500 && resp.status !== 401 && resp.status !== 408 && resp.status !== 429) {
          // Erro de negócio: não adianta repetir; usuário precisa revisar
          await bancoLocal.fila.update(item.seq!, { estado: 'requer_atencao', ultimoErro: erro?.erro?.mensagem ?? `HTTP ${resp.status}` });
          bloqueadas.add(item.chave);
          continue;
        }
        throw new Error(`HTTP ${resp.status}`);
      } catch (e) {
        const tentativas = item.tentativas + 1;
        await bancoLocal.fila.update(item.seq!, {
          tentativas,
          proximaTentativa: Date.now() + BACKOFF_MS[Math.min(tentativas - 1, BACKOFF_MS.length - 1)],
          ultimoErro: (e as Error).message,
        });
        bloqueadas.add(item.chave);
      }
    }
  } finally {
    processando = false;
  }
  return { enviados, pendentes: await contarPendentes() };
}

export const contarPendentes = () => bancoLocal.fila.count();

/** Liga o processamento automático ao voltar a conexão e periodicamente. */
export function iniciarSincronizacao(intervaloMs = 30_000) {
  const tick = () => void processarFila();
  window.addEventListener('online', tick);
  const t = window.setInterval(tick, intervaloMs);
  tick();
  return () => { window.removeEventListener('online', tick); window.clearInterval(t); };
}
