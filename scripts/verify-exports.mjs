import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),fixture=fs.mkdtempSync(path.join(os.tmpdir(),'motiqo-react-export-'));
const require=createRequire(import.meta.url),ts=require('typescript'),manifest=JSON.parse(fs.readFileSync(path.join(root,'registry/manifest.json'),'utf8')),lock=JSON.parse(fs.readFileSync(path.join(root,'package-lock.json'),'utf8'));
// Evaluate the pure prop/example adapter without a Next.js runtime or alias.
const source=fs.readFileSync(path.join(root,'lib/element-controls.ts'),'utf8'),adapter={exports:{}};
new Function('require','module','exports',ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(name=>name==='../registry/manifest.json'?manifest:require(name),adapter,adapter.exports);
const npm=process.env.npm_execpath??path.join(path.dirname(process.execPath),'node_modules/npm/bin/npm-cli.js');
function command(bin,args){const result=spawnSync(bin,args,{cwd:fixture,stdio:'inherit',env:{...process.env,npm_config_cache:path.join(root,'screenshots/.npm-cache')}});if(result.error||result.status!==0)throw Error(`Export verification failed: ${args[0]}`);}
try{
  const dependencies=Object.fromEntries(['react','react-dom','three','motion'].map(name=>[name,lock.packages[`node_modules/${name}`].version]));
  const devDependencies=Object.fromEntries(['typescript','@types/react','@types/react-dom','@types/three','@types/node'].map(name=>[name,lock.packages[`node_modules/${name}`].version]));
  devDependencies['@motiqo/cli']=`file:${path.join(root,'public/downloads/motiqo-cli-0.1.0.tgz').replaceAll('\\','/')}`;
  fs.writeFileSync(path.join(fixture,'package.json'),JSON.stringify({name:'motiqo-independent-react-proof',private:true,type:'module',dependencies,devDependencies},null,2));
  command(process.execPath,[npm,'install','--ignore-scripts','--no-audit','--no-fund']);
  const cli=path.join(fixture,'node_modules/@motiqo/cli/bin/motiqo.mjs');
  command(process.execPath,[cli,'add',...manifest.items.map(item=>item.id),'--cwd',fixture]);
  command(process.execPath,[cli,'skill','--cwd',fixture]);
  fs.mkdirSync(path.join(fixture,'examples'));
  let count=0;
  for(const item of manifest.items){
    const variants=[{id:'default',settings:adapter.exports.defaultsFor(item.id)},...item.moods];
    for(const variant of variants){
      const code=adapter.exports.usageFor(item,variant.settings).replace(/from '\.\//g,"from '../components/motiqo/");
      fs.writeFileSync(path.join(fixture,'examples',`${item.id}-${variant.id}.tsx`),code);count++;
    }
    for(const file of item.files)if(!fs.readFileSync(path.join(fixture,file.target)).equals(fs.readFileSync(path.join(root,file.source))))throw Error(`Export bytes differ: ${file.target}`);
  }
  fs.writeFileSync(path.join(fixture,'tsconfig.json'),JSON.stringify({compilerOptions:{target:'ES2022',module:'ESNext',moduleResolution:'Bundler',jsx:'react-jsx',strict:true,esModuleInterop:true,skipLibCheck:true,noEmit:true,lib:['ES2022','DOM','DOM.Iterable'],types:['react','react-dom','node']},include:['components/**/*.ts','components/**/*.tsx','examples/**/*.tsx']}));
  command(process.execPath,[path.join(fixture,'node_modules/typescript/bin/tsc'),'--noEmit','-p',path.join(fixture,'tsconfig.json')]);
  console.log(`Verified packaged CLI, exact source/assets and ${count} examples in independent React project (no Next.js, site CSS or aliases).`);
}catch(error){console.error(`Fixture retained for diagnosis: ${fixture}`);process.exitCode=1;throw error;}
finally{
  if(!process.exitCode&&!process.argv.includes('--keep')){
    const resolved=fs.realpathSync(fixture),boundary=fs.realpathSync(os.tmpdir())+path.sep;
    if(!resolved.startsWith(boundary)||!path.basename(resolved).startsWith('motiqo-react-export-'))throw Error('Unsafe fixture cleanup');
    fs.rmSync(resolved,{recursive:true,force:true});
  }else console.log(`React fixture: ${fixture}`);
}
