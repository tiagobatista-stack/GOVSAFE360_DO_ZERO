import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const node = (script, ...args) => spawnSync(process.execPath, [join(RAIZ, 'scripts', script), ...args], { cwd: RAIZ, encoding: 'utf8' });
const lerJson = arq => JSON.parse(readFileSync(join(RAIZ, arq), 'utf8'));
const html = readFileSync(join(RAIZ, 'index.html'), 'utf8');

let tmp, out;
before(() => { tmp = mkdtempSync(join(tmpdir(), 'govsafe-build-')); });
after(() => rmSync(tmp, { recursive: true, force: true }));
const novoBuild = nome => { out = join(tmp, nome); const r = node('build.mjs', '--out', out); assert.equal(r.status, 0, r.stderr); return out; };

test('build: publica só index.html, css/ e js/ (nada de testes, tools, docs, scripts, dependências)', () => {
  const dir = novoBuild('a');
  const lista = node('check-sync.mjs', '--dir', dir);
  assert.equal(lista.status, 0, lista.stderr);
  for (const f of ['index.html', 'css/styles.css', 'js/app.js', 'js/politica.js', 'js/armazenamento.js', 'js/auditoria.js', 'js/dados.js']) assert.ok(existsSync(join(dir, f)), f);
  for (const f of ['package.json', 'package-lock.json', 'CLAUDE.md', 'README.md', 'vercel.json', 'tests', 'tools', 'docs', 'scripts', 'node_modules', '.github', '.git', 'playwright.config.mjs']) {
    assert.equal(existsSync(join(dir, f)), false, `${f} não deve ser publicado`);
  }
});

test('check:sync: arquivo alterado, ausente ou extra reprova o build publicado', () => {
  const dir = novoBuild('b');
  writeFileSync(join(dir, 'js', 'app.js'), '// adulterado\n');
  let r = node('check-sync.mjs', '--dir', dir);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /diferente da fonte: js\/app\.js/);

  const dir2 = novoBuild('c');
  rmSync(join(dir2, 'css', 'styles.css'));
  r = node('check-sync.mjs', '--dir', dir2);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /faltando em public: css\/styles\.css/);

  const dir3 = novoBuild('d');
  mkdirSync(join(dir3, 'tools'));
  writeFileSync(join(dir3, 'tools', 'govsafe-mcp.mjs'), 'x');
  writeFileSync(join(dir3, '.env'), 'SEGREDO=1');
  r = node('check-sync.mjs', '--dir', dir3);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /arquivo a mais.*tools\/govsafe-mcp\.mjs/);
  assert.match(r.stderr, /arquivo a mais.*\.env/);
});

test('check:sync: pasta inexistente falha com instrução; versão ausente na página reprova', () => {
  const r = node('check-sync.mjs', '--dir', join(tmp, 'nao-existe'));
  assert.equal(r.status, 1);
  assert.match(r.stderr, /npm run build/);
  const dir = novoBuild('e');
  writeFileSync(join(dir, 'index.html'), readFileSync(join(dir, 'index.html'), 'utf8').replace(/id="versao">[^<]*</, 'id="versao">9.9.9<'));
  const r2 = node('check-sync.mjs', '--dir', dir);
  assert.equal(r2.status, 1);
  assert.match(r2.stderr, /diferente da fonte: index\.html/);
  assert.match(r2.stderr, /não exibe a versão/);
});

test('versão: package.json e index.html (elemento #versao) mostram o mesmo número', () => {
  const v = lerJson('package.json').version;
  assert.match(v, /^\d+\.\d+\.\d+$/);
  assert.ok(html.includes(`id="versao">${v}<`), `index.html precisa exibir ${v}`);
});

test('build recusa pastas de saída perigosas e não apaga nada', () => {
  for (const perigosa of ['.', '..', 'js', 'css', '.git', 'node_modules', '/', 'C:\\', tmpdir() + '/..']) {
    const r = node('build.mjs', '--out', perigosa);
    assert.equal(r.status, 1, `deveria recusar "${perigosa}"`);
    assert.match(r.stderr, /build recusado/);
  }
  for (const f of ['index.html', 'js/app.js', 'css/styles.css', 'package.json', 'node_modules']) assert.ok(existsSync(join(RAIZ, f)), `${f} foi apagado!`);
});

test('build é idempotente: rodar de novo substitui a saída e remove sobras', () => {
  const dir = novoBuild('f');
  writeFileSync(join(dir, 'sobra.txt'), 'lixo');
  assert.equal(node('build.mjs', '--out', dir).status, 0);
  assert.equal(existsSync(join(dir, 'sobra.txt')), false);
  assert.equal(node('check-sync.mjs', '--dir', dir).status, 0);
});

test('vercel.json: build, saída public/, instalação sem dependências de desenvolvimento e cabeçalhos de segurança', () => {
  const v = lerJson('vercel.json');
  assert.equal(v.buildCommand, 'npm run build');
  assert.equal(v.outputDirectory, 'public');
  assert.match(v.installCommand, /--omit=dev/);
  const cab = Object.fromEntries(v.headers[0].headers.map(h => [h.key, h.value]));
  assert.equal(cab['X-Content-Type-Options'], 'nosniff');
  assert.equal(cab['X-Frame-Options'], 'DENY');
  assert.equal(cab['Referrer-Policy'], 'no-referrer');
  assert.match(cab['Permissions-Policy'], /camera=\(\)/);
  assert.match(cab['Content-Security-Policy'], /frame-ancestors 'none'/);
});

test('CSP: a política da página está contida na do Vercel e não permite nada externo ou inline', () => {
  const meta = html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)[1];
  const cab = lerJson('vercel.json').headers[0].headers.find(h => h.key === 'Content-Security-Policy').value;
  for (const diretiva of meta.split(';').map(s => s.trim())) assert.ok(cab.includes(diretiva), `vercel.json sem: ${diretiva}`);
  for (const csp of [meta, cab]) {
    assert.doesNotMatch(csp, /unsafe-inline|unsafe-eval|https?:|\*/);
    assert.match(csp, /default-src 'none'/);
    assert.match(csp, /connect-src 'none'/);
  }
  assert.doesNotMatch(html, /<script(?![^>]*\bsrc=)[^>]*>[^<]/i); // sem script inline
  assert.doesNotMatch(html, /\sstyle=|\son[a-z]+=/i); // sem estilo nem manipulador inline
});

test('R08: nenhuma referência externa nos arquivos publicados', () => {
  const dir = novoBuild('g');
  for (const f of ['index.html', 'css/styles.css', 'js/app.js', 'js/politica.js', 'js/armazenamento.js', 'js/auditoria.js', 'js/dados.js']) {
    const t = readFileSync(join(dir, f), 'utf8');
    assert.doesNotMatch(t, /(src|href)=["']https?:|url\(\s*["']?https?:|fetch\(|XMLHttpRequest|WebSocket|sendBeacon|import\(/, f);
  }
});
