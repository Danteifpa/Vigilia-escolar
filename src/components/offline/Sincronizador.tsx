'use client';

import { useEffect } from 'react';
import { iniciarSincronizacao } from '@/lib/offline/fila';

/** Envia a fila offline ao reconectar e a cada 30 s. Montado uma vez no layout da escola. */
export function Sincronizador() {
  useEffect(() => iniciarSincronizacao(), []);
  return null;
}
