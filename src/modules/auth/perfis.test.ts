import { test } from 'node:test';
import assert from 'node:assert/strict';
import { caminhoSeguro, decidirRota } from './perfis.ts';

const rota = (pathname: string, autenticado: boolean, perfil?: string, search = '') =>
  decidirRota({ pathname, search, autenticado, perfil });

test('raiz direciona pela sessão e perfil', () => {
  assert.deepEqual(rota('/', false), { tipo: 'redirecionar', para: '/entrar' });
  assert.deepEqual(rota('/', true, 'dre'), { tipo: 'redirecionar', para: '/dre' });
  assert.deepEqual(rota('/', true), { tipo: 'redirecionar', para: '/entrar?erro=sem_perfil' });
});

test('área restrita sem sessão vai ao login preservando destino', () => {
  assert.deepEqual(rota('/escola/checklist', false, undefined, '?d=1'), {
    tipo: 'redirecionar',
    para: '/entrar?proximo=%2Fescola%2Fchecklist%3Fd%3D1',
  });
});

test('perfil errado volta para a própria área', () => {
  assert.deepEqual(rota('/seduc/bandeiras', true, 'escola'), { tipo: 'redirecionar', para: '/escola' });
  assert.deepEqual(rota('/dre', true, 'seduc'), { tipo: 'redirecionar', para: '/seduc' });
  assert.deepEqual(rota('/escola', true, 'escola'), { tipo: 'seguir' });
});

test('prefixo exige segmento completo', () => {
  assert.deepEqual(rota('/dreams', false), { tipo: 'seguir' });
  assert.deepEqual(rota('/escolar', true, 'dre'), { tipo: 'seguir' });
});

test('perfil inválido nas claims é tratado como ausente', () => {
  assert.deepEqual(rota('/seduc', true, 'admin'), { tipo: 'redirecionar', para: '/entrar?erro=sem_perfil' });
});

test('login com sessão válida pula para a área', () => {
  assert.deepEqual(rota('/entrar', true, 'escola'), { tipo: 'redirecionar', para: '/escola' });
  assert.deepEqual(rota('/entrar', true), { tipo: 'seguir' });
  assert.deepEqual(rota('/definir-senha', false), { tipo: 'redirecionar', para: '/entrar' });
});

test('caminhoSeguro bloqueia redirecionamento externo', () => {
  assert.equal(caminhoSeguro('/escola'), '/escola');
  assert.equal(caminhoSeguro('//evil.com'), null);
  assert.equal(caminhoSeguro('/\\evil.com'), null);
  assert.equal(caminhoSeguro('https://evil.com'), null);
  assert.equal(caminhoSeguro(null), null);
});
