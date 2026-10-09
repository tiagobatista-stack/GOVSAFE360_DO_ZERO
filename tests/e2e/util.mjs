import { test as base, expect } from '@playwright/test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readFileSync } from 'node:fs';

export { expect };
export const APP_URL = pathToFileURL(fileURLToPath(new URL('../../index.html', import.meta.url))).href;

// Fixture `app`: abre o site por file:// (sem servidor), aceita confirm() e, ao final de CADA teste,
// exige zero erros de JS/console e zero requisições externas (R08, CA09).
export const test = base.extend({
  app: async ({ page }, use) => {
    const erros = [];
    const externas = [];
    page.on('pageerror', e => erros.push(`pageerror: ${e.message}`));
    page.on('console', m => { if (m.type() === 'error') erros.push(`console: ${m.text()}`); });
    page.on('request', r => {
      const u = r.url();
      if (!/^(file|data|blob):/.test(u)) externas.push(u);
    });
    page.on('dialog', d => d.accept());
    await page.goto(APP_URL);
    await use(page);
    expect(erros, 'erros de JavaScript/console').toEqual([]);
    expect(externas, 'requisições externas').toEqual([]);
  }
});

export const linhas = page => page.locator('#linhas tr');
export const linha = (page, id) => page.locator('#linhas tr').filter({ has: page.locator('td:first-child', { hasText: new RegExp(`^${id}$`) }) });
export const totais = page => page.locator('.cartao .num').allTextContents();

export async function cadastrar(page, { titulo, dado, ambiente, autonomia, justificativa }) {
  await page.getByLabel('Finalidade', { exact: true }).fill(titulo);
  if (dado) await page.getByLabel('Tipo de dado', { exact: true }).selectOption(dado);
  if (ambiente) await page.getByLabel('Ambiente', { exact: true }).selectOption(ambiente);
  if (autonomia) await page.getByLabel('Autonomia', { exact: true }).selectOption(autonomia);
  await page.getByLabel('Justificativa', { exact: true }).fill(justificativa);
  await page.getByRole('button', { name: 'Cadastrar cenário' }).click();
}

// `forcar: true` reabilita a opção "Aprovar" depois de escolher o cenário, como faria quem mexe no DevTools.
export async function revisar(page, { id, resultado, justificativa, forcar = false }) {
  await page.getByLabel('Cenário', { exact: true }).selectOption(String(id));
  if (forcar) await page.evaluate(() => { document.querySelector('#rev-resultado option[value="aprovado"]').disabled = false; });
  if (resultado) await page.getByLabel('Resultado da revisão', { exact: true }).selectOption(resultado);
  await page.getByLabel('Justificativa da revisão', { exact: true }).fill(justificativa);
  await page.getByRole('button', { name: 'Registrar revisão simulada' }).click();
}

export const lerArquivo = async download => readFileSync(await download.path());
