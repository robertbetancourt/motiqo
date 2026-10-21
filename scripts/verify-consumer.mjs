// Explicit, network-using integration check. Creates a new project and never removes it.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const [framework,destination,manager='npm']=process.argv.slice(2);
if(!['vite','next'].includes(framework)||!destination||!['npm','pnpm','yarn'].includes(manager))throw Error('Usage: npm run verify:consumer -- <vite|next> <new-directory> [npm|pnpm|yarn]');
const cwd=path.resolve(destination);
if(fs.existsSync(cwd))throw Error('Choose a new directory; existing projects are never overwritten.');
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const npm=process.env.npm_execpath;
if(!npm)throw Error('Run through npm run verify:consumer.');
const run=(args,where=cwd)=>{const r=spawnSync(process.execPath,args,{cwd:where,stdio:'inherit',shell:false});if(r.status!==0)throw Error(`Failed: ${args.join(' ')}`);};
const pm=args=>manager==='npm'?run([npm,...args]):run([npm,'exec','--yes',`--package=${manager==='pnpm'?'pnpm@10':'yarn@1.22.22'}`,'--',manager,...args]);
const write=(file,content)=>{const p=path.join(cwd,file);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,content);};
fs.mkdirSync(cwd,{recursive:true});
const archive=path.join(root,'public/downloads/motiqo-cli-0.1.0.tgz');
if(!fs.existsSync(archive))throw Error('Run npm run distribution:pack first.');
write('package.json',JSON.stringify({name:`motiqo-consumer-${framework}`,version:'0.0.0',private:true,type:'module',scripts:{build:framework==='vite'?'tsc --noEmit && vite build':'next build'},dependencies:{react:pkg.dependencies.react,'react-dom':pkg.dependencies['react-dom'],...(framework==='next'?{next:pkg.dependencies.next}:{})},devDependencies:{'@motiqo/cli':`file:${archive.replaceAll('\\','/')}`,typescript:framework==='next'?'5.9.3':pkg.devDependencies.typescript,'@types/react':pkg.devDependencies['@types/react'],'@types/react-dom':pkg.devDependencies['@types/react-dom'],'@types/node':pkg.devDependencies['@types/node'],...(framework==='vite'?{vite:'8.3.4'}:{})}},null,2));
pm(['install','--ignore-scripts',...(manager==='npm'?['--no-fund']:manager==='yarn'?['--non-interactive']:[])]);
const cli=path.join(cwd,'node_modules/@motiqo/cli/bin/motiqo.mjs');
run([cli,'list','--json']);
const ids=['radial-spectrum','thermal-smoke','caustic-button','elastic-showcase','elevation-matrix'];
run([cli,'add',...ids,'--dir','components/motiqo','--dry-run','--json']);
run([cli,'add',...ids,'--dir','components/motiqo',...(manager==='npm'?['--install']:[])]);
if(manager!=='npm'){
 const probe=spawnSync(process.execPath,[cli,'add',...ids,'--dir','components/motiqo','--dry-run','--json'],{cwd,encoding:'utf8'});
 if(probe.status!==0)throw Error(probe.stderr);
 const dependencies=JSON.parse(probe.stdout);
 if(dependencies.dependencies.length)pm(['add','--ignore-scripts',...dependencies.dependencies]);
 if(dependencies.devDependencies.length)pm(['add','-D','--ignore-scripts',...dependencies.devDependencies]);
}
run([cli,'skill']);
const {Client}=await import('@modelcontextprotocol/client');
const {StdioClientTransport}=await import('@modelcontextprotocol/client/stdio');
const client=new Client({name:'motiqo-consumer-check',version:'1.0.0'});
try{
 await client.connect(new StdioClientTransport({command:process.execPath,args:[cli,'mcp'],stderr:'pipe'}));
 const {tools}=await client.listTools();if(tools.length!==3)throw Error('Unexpected packaged MCP tools.');
 const result=await client.callTool({name:'get_component',arguments:{id:'radial-spectrum'}});
 if(JSON.parse(result.content[0].text).id!=='radial-spectrum')throw Error('Packaged MCP catalog mismatch.');
}finally{await client.close();}
run([cli,'add',...ids,'--dir','components/motiqo','--json']);
write('tsconfig.json',JSON.stringify({compilerOptions:{target:'ES2022',lib:['dom','dom.iterable',framework==='next'?'esnext':'es2022'],module:'ESNext',moduleResolution:'bundler',jsx:'react-jsx',strict:true,noEmit:true,esModuleInterop:true,resolveJsonModule:true,skipLibCheck:framework==='next'},include:['**/*.ts','**/*.tsx'],exclude:['node_modules']},null,2));
const app=`'use client';
import Spectrum from './components/motiqo/radial-spectrum';
import Thermal from './components/motiqo/thermal-smoke';
import Caustic from './components/motiqo/caustic-button';
import Elastic from './components/motiqo/elastic-showcase';
import Elevation from './components/motiqo/elevation-matrix';
export default function App(){return <main style={{background:'#08080a',color:'#fff',padding:24}}><h1>Motiqo consumer integration</h1><p>Five real exported components, no site styles or aliases.</p>{[Spectrum,Thermal,Caustic,Elastic,Elevation].map((Component,i)=><section key={i} style={{height:560,marginBottom:24}}><Component paused /></section>)}</main>}
`;
write('App.tsx',app);
if(framework==='vite'){
 write('index.html','<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Motiqo consumer test</title></head><body><div id="root"></div><script type="module" src="/main.tsx"></script></body></html>');
 write('main.tsx',"import React from 'react';import{createRoot}from'react-dom/client';import App from './App';createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);");
}else{
 write('app/page.tsx',"export {default} from '../App';");
 write('app/layout.tsx',"import type{ReactNode}from'react';export default function Layout({children}:{children:ReactNode}){return <html lang='en'><body style={{margin:0}}>{children}</body></html>}");
}
pm(['run','build']);
write('verification.json',JSON.stringify({framework,manager,node:process.version,components:ids,checked:['installed downloadable tarball','CLI discovery','dry run',`${manager} dependency installation`,'skill installation','packaged MCP via official client','idempotent installation','production build'],limitations:[...(framework==='next'?['Next default skipLibCheck is enabled; strict dependency-type compatibility is not certified']:[]),'not a screen-reader or physical-device test','Suno demo recording redistribution remains unresolved']},null,2));
console.log(`Verified ${framework} consumer: ${cwd}`);
