import { expect, test, type Page } from '@playwright/test';

const SENHA = process.env.SENHA_DEV ?? 'SenhaDev2026';
const MAILPIT = process.env.MAILPIT_URL ?? 'http://127.0.0.1:54324';

async function entrar(page: Page, email: string, senha = SENHA) {
  await page.goto('/entrar');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(senha);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
}

async function sair(page: Page) {
  await page.getByRole('button', { name: 'Sair' }).click();
  await expect(page).toHaveURL(/\/entrar$/);
}

/** Busca no Mailpit o link do e-mail mais recente enviado para `email`. */
async function linkDoEmail(page: Page, email: string): Promise<string> {
  let id: string | undefined;
  await expect.poll(async () => {
    const r = await page.request.get(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`);
    id = (await r.json()).messages?.[0]?.ID;
    return id;
  }, { timeout: 20_000 }).toBeTruthy();
  const msg = await (await page.request.get(`${MAILPIT}/api/v1/message/${id}`)).json();
  const href = /href="([^"]*\/auth\/callback[^"]*)"/.exec(msg.HTML)?.[1];
  if (!href) throw new Error('Link do convite não encontrado no e-mail');
  return href.replaceAll('&amp;', '&');
}

// Em falha, registra no log onde a página parou (o CI não guarda capturas acessíveis)
test.afterEach(async ({ page }, info) => {
  if (info.status === info.expectedStatus) return;
  const alertas = await page.locator('[role=alert], [role=status]').allInnerTexts().catch(() => []);
  console.log(`[diagnóstico] ${info.title}\n  url: ${page.url()}\n  alertas: ${JSON.stringify(alertas.filter(Boolean))}`);
});

/** Alerta do app (o Next.js também injeta um role="alert" para anunciar rotas). */
const alerta = (page: Page, texto: string) => page.locator('[role=alert]').filter({ hasText: texto });

test('sem sessão, área restrita leva ao login guardando o destino', async ({ page }) => {
  await page.goto('/escola/checklist?d=1');
  await expect(page).toHaveURL('/entrar?proximo=%2Fescola%2Fchecklist%3Fd%3D1');
  await page.goto('/');
  await expect(page).toHaveURL('/entrar');
});

test('senha errada mostra mensagem em português', async ({ page }) => {
  await entrar(page, 'escola@vigilia.dev', 'SenhaErrada123');
  await expect(alerta(page, 'E-mail ou senha incorretos.')).toBeVisible();
});

test('escola entra no próprio painel e não acessa outras áreas', async ({ page }) => {
  await entrar(page, 'escola@vigilia.dev');
  await expect(page).toHaveURL('/escola');
  await expect(page.getByRole('heading', { name: /BANDEIRA VERDE/ })).toBeVisible();

  for (const outra of ['/seduc', '/dre/usuarios', '/entrar']) {
    await page.goto(outra);
    await expect(page).toHaveURL('/escola');
  }
  await sair(page);
  await page.goto('/escola');
  await expect(page).toHaveURL(/\/entrar\?proximo=/);
});

test('SEDUC entra no painel estadual', async ({ page }) => {
  await entrar(page, 'seduc@vigilia.dev');
  await expect(page).toHaveURL('/seduc');
  await expect(page.getByText('Escolas', { exact: true })).toBeVisible();
  await page.goto('/escola');
  await expect(page).toHaveURL('/seduc');
});

test('DRE convida diretor; convidado define senha e cai no painel da escola', async ({ page }) => {
  const email = `diretor.${Date.now()}@vigilia.dev`;

  await entrar(page, 'dre@vigilia.dev');
  await expect(page).toHaveURL('/dre');
  await page.getByRole('link', { name: 'Usuários' }).click();
  await expect(page).toHaveURL('/dre/usuarios');

  // DRE não escolhe perfil: só convida usuários de escola do polo
  await expect(page.getByLabel('Perfil')).toHaveCount(0);
  await page.getByLabel('Nome completo').fill('Diretora Convidada E2E');
  await page.getByLabel('E-mail institucional').fill(email);
  await page.getByLabel('Cargo').fill('Diretor(a)');
  await page.getByLabel('Escola', { exact: true }).selectOption({ label: 'EEEFM Exemplo Vigília (fictícia) · INEP 15000001' });
  await page.getByRole('button', { name: 'Enviar convite por e-mail' }).click();
  await expect(page.getByRole('status').filter({ hasText: `Convite enviado para ${email}` })).toBeVisible();
  await expect(page.getByRole('cell', { name: /Diretora Convidada E2E/ })).toBeVisible();

  // Convite duplicado é recusado
  await page.getByLabel('Nome completo').fill('Diretora Convidada E2E');
  await page.getByLabel('E-mail institucional').fill(email);
  await page.getByLabel('Escola', { exact: true }).selectOption({ label: 'EEEFM Exemplo Vigília (fictícia) · INEP 15000001' });
  await page.getByRole('button', { name: 'Enviar convite por e-mail' }).click();
  await expect(alerta(page, 'Já existe uma conta com este e-mail.')).toBeVisible();
  await sair(page);

  // Link do e-mail → definir senha → painel da escola
  await page.goto(await linkDoEmail(page, email));
  await expect(page).toHaveURL('/definir-senha');
  await page.getByLabel('Nova senha').fill('NovaSenha2026');
  await page.getByLabel('Confirme a senha').fill('NovaSenha2026');
  await page.getByRole('button', { name: 'Salvar senha e entrar' }).click();
  await expect(page).toHaveURL('/escola');
  await expect(page.getByText('EEEFM Exemplo Vigília (fictícia)')).toBeVisible();
  await sair(page);

  // Nova senha funciona no login normal
  await entrar(page, email, 'NovaSenha2026');
  await expect(page).toHaveURL('/escola');
});
