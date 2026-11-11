import { expect, test } from '@playwright/test';
import { alerta, entrar, escolher } from './ajuda';

// Os testes compartilham o checklist do dia da escola de exemplo: rodam em ordem
test.describe.configure({ mode: 'serial' });

test.afterEach(async ({ page }, info) => {
  if (info.status === info.expectedStatus) return;
  const alertas = await page.locator('[role=alert], [role=status]').allInnerTexts().catch(() => []);
  console.log(`[diagnóstico] ${info.title}\n  url: ${page.url()}\n  alertas: ${JSON.stringify(alertas.filter(Boolean))}`);
});

test('escola preenche o checklist e o painel mostra as condições do dia', async ({ page }) => {
  await entrar(page, 'escola@vigilia.dev');
  await expect(page).toHaveURL('/escola');
  // "Preencher" no banco limpo; "Atualizar" se uma tentativa anterior já salvou
  await page.getByRole('link', { name: /^(Preencher|Atualizar)$/ }).click();
  await expect(page).toHaveURL('/escola/checklist');

  await escolher(page, 'Situação do abastecimento', 'Reduzida');
  await page.getByLabel('Nível do reservatório (%)', { exact: true }).fill('40');
  await page.getByLabel('Temperatura máxima nas salas (°C)', { exact: true }).fill('36.5');
  await escolher(page, 'Nível de fumaça', 'Moderada');
  await escolher(page, 'Situação de acesso', 'Normal');
  await page.getByLabel('Alunos presentes', { exact: true }).fill('600');
  await page.getByLabel('Alunos com sintomas', { exact: true }).fill('2');
  await page.getByRole('checkbox', { name: /Verificar reservatório e abastecimento/ }).check();
  await page.getByRole('button', { name: 'Salvar checklist' }).click();

  await expect(page).toHaveURL('/escola');
  await expect(page.getByText('Reduzida · 40%')).toBeVisible();
  await expect(page.getByText('Moderada', { exact: true })).toBeVisible();
  await expect(page.getByText('36,5 °C')).toBeVisible();
  await expect(page.getByText('2 aluno(s) com sintomas registrados hoje.')).toBeVisible();
  await expect(page.getByText('1/3 diárias concluídas')).toBeVisible();
});

test('validação impede dados incoerentes', async ({ page }) => {
  await entrar(page, 'escola@vigilia.dev');
  await page.goto('/escola/checklist');
  await expect(alerta(page, 'Checklist de hoje já registrado')).toBeVisible();   // reabre preenchido
  await expect(page.getByLabel('Alunos presentes', { exact: true })).toHaveValue('600');

  await page.getByLabel('Alunos com sintomas', { exact: true }).fill('900');
  await page.getByLabel('Nível do reservatório (%)', { exact: true }).fill('140');
  await page.getByRole('button', { name: 'Salvar checklist' }).click();
  await expect(page.getByText('Não pode ser maior que o número de presentes')).toBeVisible();
  await expect(page.getByText('Máximo 100%')).toBeVisible();
  await expect(page).toHaveURL('/escola/checklist');
});

test('sem internet, o checklist fica no aparelho e é enviado ao reconectar', async ({ page, context }) => {
  await entrar(page, 'escola@vigilia.dev');
  await page.goto('/escola/checklist');
  await expect(page.getByLabel('Alunos presentes', { exact: true })).toHaveValue('600');

  await context.setOffline(true);
  await escolher(page, 'Situação do abastecimento', 'Crítica');
  await page.getByLabel('Nível do reservatório (%)', { exact: true }).fill('15');
  await page.getByRole('button', { name: 'Salvar checklist' }).click();
  await expect(alerta(page, 'Sem internet: checklist salvo neste aparelho')).toBeVisible();

  await context.setOffline(false);
  await expect(alerta(page, 'Internet de volta: checklist enviado.')).toBeVisible({ timeout: 15_000 });

  await page.goto('/escola');
  await expect(page.getByText('Crítica · 15%')).toBeVisible();
  await expect(page.getByText('a enviar')).toHaveCount(0);   // fila vazia
});
