// Utilitários compartilhados por build.mjs e check-sync.mjs (sem dependências).
import {readdirSync,readFileSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join,relative,resolve,sep} from 'node:path';
import {fileURLToPath} from 'node:url';

export const projeto=resolve(fileURLToPath(new URL('..',import.meta.url)));
// Única lista do que é PUBLICADO. Testes, tools/, docs/, scripts/ e dependências ficam de fora (R08).
export const FONTE=['index.html','css','js'];

export const versaoDoPacote=()=>JSON.parse(readFileSync(join(projeto,'package.json'),'utf8')).version;

// Argumento `--nome valor` ou `--nome=valor`; devolve `padrao` se ausente.
export function argumento(nome,padrao){
 const a=process.argv.slice(2);
 const i=a.findIndex(x=>x===`--${nome}`||x.startsWith(`--${nome}=`));
 if(i<0)return padrao;
 return a[i].includes('=')?a[i].split('=').slice(1).join('='):a[i+1];
}

// Caminhos relativos (com "/") de todos os arquivos sob `base`, restritos a `entradas` quando informadas.
export function listarArquivos(base,entradas=['.']){
 const saida=[];
 const andar=dir=>{
  for(const nome of readdirSync(dir)){
   const p=join(dir,nome);
   if(statSync(p).isDirectory())andar(p);else saida.push(relative(base,p).split(sep).join('/'));
  }
 };
 for(const e of entradas){
  const p=join(base,e);
  let st;try{st=statSync(p);}catch{continue;}
  if(st.isDirectory())andar(p);else saida.push(relative(base,p).split(sep).join('/'));
 }
 return saida.sort();
}

export const hashDe=caminho=>createHash('sha256').update(readFileSync(caminho)).digest('hex');
