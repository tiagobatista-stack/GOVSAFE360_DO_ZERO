// Gera a pasta publicável (public/) copiando APENAS index.html, css/ e js/. Sem dependências.
// Uso: node scripts/build.mjs [--out pasta]
import {cpSync,existsSync,mkdirSync,rmSync} from 'node:fs';
import {dirname,join,parse,resolve,sep} from 'node:path';
import {tmpdir} from 'node:os';
import {FONTE,argumento,listarArquivos,projeto,versaoDoPacote} from './publicacao.mjs';

const saida=resolve(projeto,argumento('out','public'));

// Trava: só apaga/recria a pasta de saída se ela estiver DENTRO do projeto ou do diretório temporário,
// e nunca se for o próprio projeto, um ancestral dele, a raiz do disco ou uma pasta de código-fonte.
const dentroDe=(pai,filho)=>filho!==pai&&filho.startsWith(pai.endsWith(sep)?pai:pai+sep);
const protegidas=[...FONTE.map(f=>join(projeto,f)),join(projeto,'.git'),join(projeto,'node_modules')];
const ancestraDoProjeto=projeto===saida||dentroDe(saida,projeto);
const permitida=(dentroDe(projeto,saida)||dentroDe(resolve(tmpdir()),saida))&&saida!==parse(saida).root;
if(ancestraDoProjeto||!permitida||protegidas.some(p=>saida===p||dentroDe(p,saida))){
 console.error(`build recusado: a pasta de saída "${saida}" não é segura.`);
 process.exit(1);
}

for(const item of FONTE){
 if(!existsSync(join(projeto,item))){console.error(`build falhou: "${item}" não existe.`);process.exit(1);}
}
rmSync(saida,{recursive:true,force:true});
mkdirSync(dirname(saida),{recursive:true});
mkdirSync(saida,{recursive:true});
for(const item of FONTE)cpSync(join(projeto,item),join(saida,item),{recursive:true});

const arquivos=listarArquivos(saida);
console.log(`build ok: ${arquivos.length} arquivo(s) em ${saida} (versão ${versaoDoPacote()})`);
for(const a of arquivos)console.log(`  ${a}`);
