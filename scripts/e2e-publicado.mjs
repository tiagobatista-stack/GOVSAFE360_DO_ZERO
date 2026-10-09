// Roda os testes do navegador contra public/ (o que será publicado), não contra a fonte.
// Uso: npm run test:e2e:public  (precisa de "npm run build" antes; argumentos extras vão para o Playwright)
import {spawnSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import {join} from 'node:path';
import {createRequire} from 'node:module';
import {projeto} from './publicacao.mjs';

if(!existsSync(join(projeto,'public','index.html'))){
 console.error('public/ não existe. Rode "npm run build" antes.');
 process.exit(1);
}
const cli=createRequire(import.meta.url).resolve('@playwright/test/cli');
const r=spawnSync(process.execPath,[cli,'test',...process.argv.slice(2)],{stdio:'inherit',env:{...process.env,APP_DIR:'public'},cwd:projeto});
process.exit(r.status??1);
