import { expect, type Browser, type Page } from '@playwright/test';

export const SENHA = process.env.SENHA_DEV ?? 'SenhaDev2026';

/** Faz login e, por padrão, espera sair da tela de login (evita corrida com o próximo goto). */
export async function entrar(page: Page, email: string, senha = SENHA, { esperar = true } = {}) {
  await page.goto('/entrar');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(senha);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  if (esperar) await page.waitForURL((u) => !u.pathname.startsWith('/entrar'));
}

export async function sair(page: Page) {
  await page.getByRole('button', { name: 'Sair' }).click();
  await expect(page).toHaveURL(/\/entrar$/);
}

/** Alerta do app (o Next.js também injeta um role="alert" para anunciar rotas). */
export const alerta = (page: Page, texto: string | RegExp) => page.locator('[role=alert], [role=status]').filter({ hasText: texto });

/** Clica no cartão de uma opção (o radio nativo fica oculto atrás do cartão). */
export const escolher = (page: Page, grupo: string, opcao: string) =>
  page.getByRole('group', { name: grupo }).locator('label').filter({ hasText: new RegExp(`^${opcao}`) }).click();

/** Abre um navegador isolado (contexto próprio), já logado e na página indicada. */
export async function abrirComo(browser: Browser, email: string, destino: string) {
  const page = await (await browser.newContext({ locale: 'pt-BR', timezoneId: 'America/Belem' })).newPage();
  await entrar(page, email);
  await page.goto(destino);
  return page;
}

/** Registra no log onde cada página parou quando um teste falha (o CI não guarda capturas acessíveis). */
export async function diagnosticar(titulo: string, paginas: Record<string, Page | undefined>) {
  for (const [nome, p] of Object.entries(paginas)) {
    if (!p) continue;
    const alertas = await p.locator('[role=alert], [role=status]').allInnerTexts().catch(() => []);
    console.log(`[diagnóstico] ${titulo} · ${nome}\n  url: ${p.url()}\n  alertas: ${JSON.stringify(alertas.filter(Boolean))}`);
  }
}
