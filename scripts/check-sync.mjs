// Confere se a pasta publicável (public/) é EXATAMENTE a fonte: nada faltando, nada a mais, nada diferente,
// e com a versão do package.json visível no index.html. Sai com código 1 em qualquer divergência.
// Uso: node scripts/check-sync.mjs [--dir pasta]
import {existsSync,readFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {FONTE,argumento,hashDe,listarArquivos,projeto,versaoDoPacote} from './publicacao.mjs';

const dir=resolve(projeto,argumento('dir','public'));
if(!existsSync(dir)){console.error(`check:sync falhou: "${dir}" não existe. Rode "npm run build" antes.`);process.exit(1);}

const fonte=listarArquivos(projeto,FONTE);
const publicado=listarArquivos(dir);
const problemas=[];
for(const f of fonte){
 if(!publicado.includes(f))problemas.push(`faltando em public: ${f}`);
 else if(hashDe(join(projeto,f))!==hashDe(join(dir,f)))problemas.push(`diferente da fonte: ${f}`);
}
for(const f of publicado)if(!fonte.includes(f))problemas.push(`arquivo a mais (não faz parte da fonte publicável): ${f}`);

const versao=versaoDoPacote();
if(!versao)problemas.push('package.json sem "version".');
else if(!existsSync(join(dir,'index.html'))||!readFileSync(join(dir,'index.html'),'utf8').includes(`id="versao">${versao}<`))
 problemas.push(`index.html publicado não exibe a versão ${versao} (elemento id="versao").`);

if(problemas.length){
 console.error('check:sync falhou:');
 for(const p of problemas)console.error(`  - ${p}`);
 process.exit(1);
}
console.log(`check:sync ok: ${publicado.length} arquivo(s) idêntico(s) à fonte, versão ${versao}.`);
