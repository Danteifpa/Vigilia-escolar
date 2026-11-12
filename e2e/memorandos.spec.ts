import { expect, test, type Page } from '@playwright/test';
import { abrirComo, alerta, diagnosticar } from './ajuda';

/**
 * Fluxo completo do Memorando (Anexo I) com três navegadores ao mesmo tempo:
 * escola envia → DRE vê na fila sem recarregar, recebe e encaminha →
 * Gestão Estadual atende → escola vê o parecer.
 * O envio da escola usa a API (a tela de preenchimento depende do modelo oficial do Anexo I).
 */
test.describe.configure({ mode: 'serial' });

let escola: Page;
let dre: Page;
let estadual: Page;
let memoId: string;
let numero: string;

const PARECER_DRE = 'Defesa Civil acionada; pedido de purificadores encaminhado (teste e2e).';
const PARECER_ESTADUAL = 'Purificadores enviados ao bloco B em 12/11 (teste e2e).';
const status = (page: Page, texto: string) => page.locator('header').getByText(texto, { exact: true });

test.beforeAll(async ({ browser }) => {
  escola = await abrirComo(browser, 'escola@vigilia.dev', '/escola');
  dre = await abrirComo(browser, 'dre@vigilia.dev', '/dre');
  estadual = await abrirComo(browser, 'estadual@vigilia.dev', '/estadual');
});

test.afterAll(async () => {
  for (const p of [escola, dre, estadual]) await p?.context().close();
});

test.afterEach(async ({}, info) => {
  if (info.status !== info.expectedStatus) await diagnosticar(info.title, { escola, dre, estadual });
});

test('escola envia memorando e ele entra na fila da DRE sem recarregar', async () => {
  memoId = crypto.randomUUID();
  const criar = await escola.request.post('/api/memorandos', {
    data: {
      id: memoId,
      prioridade: 'alta',
      tipos_ameaca: ['fumaca_queimadas'],
      data_hora_ocorrencia: new Date().toISOString(),
      descricao_situacao: 'Fumaça densa vinda de queimada próxima; névoa nas salas do bloco B.',
      impactos_pedagogicos: 'Aulas do turno da manhã reduzidas; avaliação adiada.',
      impactos_operacionais: 'Merenda servida em sala; quadra interditada.',
      alunos_afetados: 312,
      aulas_suspensas: false,
      providencias_tomadas: 'Janelas fechadas e alunos nas salas climatizadas.',
      apoio_necessario_dre: 'Avaliação da Defesa Civil e purificadores de ar para o bloco B.',
    },
  });
  expect(criar.status()).toBe(201);

  const enviar = await escola.request.post(`/api/memorandos/${memoId}/enviar`);
  expect(enviar.ok()).toBeTruthy();
  numero = (await enviar.json()).numero;
  expect(numero).toMatch(/^MEMO-15000001-\d{4}-\d{4}$/);

  const item = dre.getByRole('link', { name: /EEEFM Exemplo Vigília/ });
  await expect(item).toBeVisible({ timeout: 15_000 });   // Realtime, sem recarregar
  await expect(item).toContainText('Prioridade alta');
  await expect(item).toContainText('Enviado à DRE');
});

test('DRE recebe, exige parecer e encaminha à Gestão Estadual', async () => {
  await dre.getByRole('link', { name: /EEEFM Exemplo Vigília/ }).click();
  await expect(dre).toHaveURL(`/dre/ocorrencias/${memoId}`);
  await expect(dre.getByRole('heading', { name: numero })).toBeVisible();
  await expect(dre.getByText('Avaliação da Defesa Civil e purificadores de ar para o bloco B.')).toBeVisible();

  await dre.getByRole('button', { name: 'Receber e iniciar análise' }).click();
  await expect(alerta(dre, 'Memorando recebido')).toBeVisible();
  await expect(status(dre, 'Em análise na DRE')).toBeVisible();

  await dre.getByRole('button', { name: 'Encaminhar à Gestão Estadual' }).click();
  await expect(dre.getByText('Escreva o parecer para "Encaminhar à Gestão Estadual".')).toBeVisible();

  await dre.getByLabel('Parecer').fill(PARECER_DRE);
  await dre.getByRole('button', { name: 'Encaminhar à Gestão Estadual' }).click();
  await expect(alerta(dre, 'Memorando encaminhado à Gestão Estadual.')).toBeVisible();
  await expect(status(dre, 'Na Gestão Estadual')).toBeVisible();
  await expect(dre.getByRole('button', { name: 'Marcar como atendido' })).toHaveCount(0);   // agora é com a Gestão Estadual
});

test('Gestão Estadual atende e a escola vê o parecer', async () => {
  const item = estadual.getByRole('link', { name: /EEEFM Exemplo Vigília/ });
  await expect(item).toBeVisible({ timeout: 15_000 });
  await item.click();
  await expect(estadual).toHaveURL(`/estadual/ocorrencias/${memoId}`);
  await expect(estadual.getByText(PARECER_DRE).first()).toBeVisible();

  await estadual.getByLabel('Parecer').fill(PARECER_ESTADUAL);
  await estadual.getByRole('button', { name: 'Marcar como atendido' }).click();
  await expect(alerta(estadual, 'Memorando marcado como atendido.')).toBeVisible();
  await expect(status(estadual, 'Atendido')).toBeVisible();
  for (const etapa of ['Enviado pela escola', 'Recebido pela DRE', 'Encaminhado à Gestão Estadual']) {
    await expect(estadual.getByText(etapa, { exact: true })).toBeVisible();
  }

  await escola.goto('/escola');
  const recente = escola.getByRole('link', { name: new RegExp(numero) });
  await expect(recente).toContainText('Atendido');
  await recente.click();
  await expect(escola).toHaveURL(`/escola/ocorrencias/${memoId}`);
  await expect(status(escola, 'Atendido')).toBeVisible();
  await expect(escola.getByText(PARECER_ESTADUAL).first()).toBeVisible();
  await expect(escola.getByRole('button', { name: 'Marcar como atendido' })).toHaveCount(0);   // escola só acompanha
});

test('painel da DRE aponta a escola sem checklist hoje', async () => {
  await dre.goto('/dre');
  const linha = dre.getByRole('row', { name: /EEEF Ribeirinha Exemplo/ });
  await expect(linha).toContainText('Sem checklist hoje');
  await expect(linha).toContainText('risco de isolamento');
  await expect(dre.getByText('Nenhum memorando aguardando a DRE.')).toBeVisible();
});
