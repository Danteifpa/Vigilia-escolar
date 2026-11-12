import { expect, test, type Browser, type Page } from '@playwright/test';
import { alerta, entrar } from './ajuda';

/**
 * Dois navegadores: a Gestão Estadual decreta, a escola acompanha o próprio
 * painel aberto — a mudança tem de chegar sem recarregar (Supabase Realtime).
 * Ao final, Belém volta para verde (os testes do checklist contam com isso).
 */
test.describe.configure({ mode: 'serial' });

let escola: Page;
let estadual: Page;

async function abrir(browser: Browser, email: string, destino: string) {
  const page = await (await browser.newContext({ locale: 'pt-BR', timezoneId: 'America/Belem' })).newPage();
  await entrar(page, email);
  await page.goto(destino);
  return page;
}

async function decretar(opcoes: { escopo?: 'Municípios' | 'Escolas específicas'; alvo: RegExp; cor: string; regime?: string; justificativa: string }) {
  if (opcoes.escopo) await estadual.locator('label').filter({ hasText: opcoes.escopo }).click();
  await estadual.getByRole('checkbox', { name: opcoes.alvo }).check();
  await estadual.getByRole('group', { name: '2. Nova bandeira' }).locator('label').filter({ hasText: new RegExp(`^${opcoes.cor}`) }).click();
  if (opcoes.regime) await estadual.getByLabel('3. Regime pedagógico').selectOption({ label: opcoes.regime });
  await estadual.getByLabel(/^4\. Justificativa/).fill(opcoes.justificativa);
  await estadual.getByRole('button', { name: 'Revisar decreto' }).click();
  await estadual.getByRole('button', { name: 'Confirmar decreto' }).click();
  await expect(alerta(estadual, `Bandeira ${opcoes.cor} decretada`)).toBeVisible();
}

const bandeiraDaEscola = (cor: string) => escola.getByRole('heading', { name: new RegExp(`BANDEIRA ${cor.toUpperCase()}`) });

test.beforeAll(async ({ browser }) => {
  escola = await abrir(browser, 'escola@vigilia.dev', '/escola');
  escola.on('console', (m) => { if (/realtime|error/i.test(m.text())) console.log(`[escola console] ${m.type()}: ${m.text()}`); });
  escola.on('websocket', (ws) => {
    console.log(`[escola ws] aberto ${ws.url().replace(/apikey=[^&]+/, 'apikey=…')}`);
    ws.on('framereceived', (f) => { const t = String(f.payload); if (!/heartbeat|phx_reply.*"ok","response":\{\}/.test(t)) console.log(`[escola ws ←] ${t.slice(0, 300)}`); });
    ws.on('close', () => console.log('[escola ws] fechado'));
  });
  estadual = await abrir(browser, 'estadual@vigilia.dev', '/estadual');
  await estadual.getByRole('link', { name: 'Bandeiras' }).click();
  await expect(estadual).toHaveURL('/estadual/bandeiras');
});

test.afterAll(async () => {
  await escola?.context().close();
  await estadual?.context().close();
});

test.afterEach(async ({}, info) => {
  if (info.status === info.expectedStatus) return;
  for (const [nome, p] of [['escola', escola], ['estadual', estadual]] as const) {
    const alertas = await p.locator('[role=alert], [role=status]').allInnerTexts().catch(() => []);
    console.log(`[diagnóstico] ${info.title} · ${nome}\n  url: ${p.url()}\n  alertas: ${JSON.stringify(alertas.filter(Boolean))}`);
  }
});

test('decreto municipal chega ao painel da escola sem recarregar', async () => {
  await expect(bandeiraDaEscola('verde')).toBeVisible();
  await decretar({ alvo: /^Belém$/, cor: 'Amarela', justificativa: 'Focos de calor acima da média (teste e2e)' });

  await expect(bandeiraDaEscola('amarela')).toBeVisible({ timeout: 15_000 });   // sem reload
  await expect(escola.getByText('Focos de calor acima da média (teste e2e)')).toBeVisible();
  await expect(escola.getByText('Restringir atividades externas e esforço físico')).toBeVisible();   // ações da amarela
});

test('regime não presencial/CEMEP só aparece com bandeira vermelha', async () => {
  await estadual.getByRole('group', { name: '2. Nova bandeira' }).locator('label').filter({ hasText: /^Amarela/ }).click();
  await expect(estadual.locator('#regime option', { hasText: 'CEMEP' })).toHaveCount(0);
  await estadual.getByRole('group', { name: '2. Nova bandeira' }).locator('label').filter({ hasText: /^Vermelha/ }).click();
  await expect(estadual.locator('#regime option', { hasText: 'CEMEP' })).toHaveCount(1);
  await estadual.reload();   // descarta a seleção
});

test('decreto da escola prevalece sobre o município e pode ser revogado', async () => {
  await decretar({
    escopo: 'Escolas específicas', alvo: /^EEEFM Exemplo Vigília/, cor: 'Vermelha',
    regime: 'Ensino mediado (CEMEP)', justificativa: 'Fumaça intensa no entorno da escola (teste e2e)',
  });
  await expect(bandeiraDaEscola('vermelha')).toBeVisible({ timeout: 15_000 });
  await expect(escola.getByText('Ensino mediado (CEMEP)')).toBeVisible();

  // Motivo curto é recusado
  await estadual.getByLabel(/Motivo da revogação — EEEFM Exemplo/).fill('curto');
  await estadual.getByRole('button', { name: /Revogar decreto — EEEFM Exemplo/ }).click();
  await expect(alerta(estadual, 'mínimo de 10 caracteres')).toBeVisible();

  await estadual.getByLabel(/Motivo da revogação — EEEFM Exemplo/).fill('Situação normalizada no entorno (teste e2e)');
  await estadual.getByRole('button', { name: /Revogar decreto — EEEFM Exemplo/ }).click();
  await expect(alerta(estadual, 'Decreto da escola revogado')).toBeVisible();
  await expect(bandeiraDaEscola('amarela')).toBeVisible({ timeout: 15_000 });   // volta à do município
  await expect(estadual.getByText('Revogado: Situação normalizada no entorno (teste e2e)')).toBeVisible();
});

test('Belém volta para verde', async () => {
  await decretar({ alvo: /^Belém$/, cor: 'Verde', justificativa: 'Fim do episódio de calor (teste e2e)' });
  await expect(bandeiraDaEscola('verde')).toBeVisible({ timeout: 15_000 });
});
