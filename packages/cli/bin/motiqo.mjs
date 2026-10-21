#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {planInstall,applyInstall,safeTarget} from '../lib/installer.mjs';

const base=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const help=`Motiqo — complete React components

  motiqo list [--json]
  motiqo add <id...> [--cwd <project>] [--dir src/components/motiqo]
         [--dry-run] [--overwrite] [--install] [--json]
  motiqo skill [--cwd <project>] [--dry-run] [--overwrite]
  motiqo mcp

Files and assets are bundled; no registry connection is needed.
Existing different files are never replaced without --overwrite.
--install explicitly installs missing npm dependencies with scripts disabled.
For other package managers, install the listed dependencies yourself.
`;
try{
 const raw=process.argv.slice(2),first=raw.shift()??'help',command=['--help','-h'].includes(first)?'help':first,options={},ids=[];
 if(['--version','-v'].includes(command)){console.log(JSON.parse(fs.readFileSync(path.join(base,'package.json'),'utf8')).version);process.exit(0);}
 while(raw.length){const value=raw.shift();if(['--cwd','--dir'].includes(value)){const next=raw.shift();if(!next||next.startsWith('--'))throw Error(`Missing value for ${value}`);options[value.slice(2)]=next;}else if(['--dry-run','--overwrite','--install','--json','--help'].includes(value))options[value.slice(2)]=true;else if(value.startsWith('-'))throw Error(`Unknown option: ${value}`);else ids.push(value);}
 if(command==='help'||options.help){console.log(help);process.exit(0);}
 const registry=JSON.parse(fs.readFileSync(path.join(base,'registry.json'),'utf8'));
 if(registry.schemaVersion!==1)throw Error('Unsupported registry schema.');
 if(command==='mcp'){
  if(ids.length||Object.keys(options).length)throw Error('motiqo mcp takes no options; it serves the bundled catalog over stdio.');
  const {startCatalogServer}=await import('../lib/mcp.mjs');
  startCatalogServer(registry,JSON.parse(fs.readFileSync(path.join(base,'package.json'),'utf8')).version);
 }else{
 if(command==='list'){const items=registry.items.map(({id,title,category,packageDependencies})=>({id,title,category,dependencies:packageDependencies}));console.log(options.json?JSON.stringify(items,null,2):items.map(i=>`${i.id.padEnd(20)} ${i.title}`).join('\n'));process.exit(0);}
 const root=fs.realpathSync(path.resolve(options.cwd??process.cwd()));
 if(command==='skill'){
  const relative='.agents/skills/motiqo/SKILL.md',destination=safeTarget(root,relative),content=fs.readFileSync(path.join(base,'skill','SKILL.md'));
  if(fs.existsSync(destination)&&!fs.readFileSync(destination).equals(content)&&!options.overwrite)throw Error('Skill already exists. Review it or use --overwrite.');
  if(!options['dry-run']){fs.mkdirSync(path.dirname(destination),{recursive:true});fs.writeFileSync(destination,content);}
  console.log(`${options['dry-run']?'Would install':'Installed'} ${relative}`);process.exit(0);
 }
 if(command!=='add')throw Error(`Unknown command: ${command}`);
 const pkgFile=path.join(root,'package.json');if(!fs.existsSync(pkgFile))throw Error('Choose a React project containing package.json with --cwd.');
 const pkg=JSON.parse(fs.readFileSync(pkgFile,'utf8')),installed={...pkg.dependencies,...pkg.devDependencies,...pkg.peerDependencies};
 if(!installed.react)throw Error('This project does not declare React. Install React before adding components.');
 const plan=planInstall(registry,ids,root,{directory:options.dir,overwrite:!!options.overwrite});
 const dependencies=Object.entries(plan.dependencies).filter(([name])=>!installed[name]).map(([name,version])=>`${name}@${version}`),devDependencies=Object.entries(plan.devDependencies).filter(([name])=>!installed[name]).map(([name,version])=>`${name}@${version}`);
 let npmCli;
 if(options.install&&!options['dry-run']&&(dependencies.length||devDependencies.length)){
  if(pkg.packageManager&&!pkg.packageManager.startsWith('npm@')||['pnpm-lock.yaml','yarn.lock','bun.lock','bun.lockb'].some(f=>fs.existsSync(path.join(root,f))))throw Error('Use your existing package manager for the listed dependencies; omit --install.');
  const candidates=[process.env.npm_execpath,path.join(path.dirname(process.execPath),'node_modules/npm/bin/npm-cli.js')].filter(Boolean);
  npmCli=candidates.find(p=>p.endsWith('npm-cli.js')&&fs.existsSync(p));
  if(!npmCli&&process.platform==='win32'){const where=spawnSync('where.exe',['npm.cmd'],{encoding:'utf8'});for(const line of (where.stdout??'').trim().split(/\r?\n/)){const candidate=path.join(path.dirname(line),'node_modules/npm/bin/npm-cli.js');if(fs.existsSync(candidate)){npmCli=candidate;break;}}}
  if(!npmCli&&process.platform==='win32')throw Error('npm CLI could not be located. Omit --install and install dependencies with your package manager.');
 }
 const changed=options['dry-run']?[]:applyInstall(plan,root);
 const result={dryRun:!!options['dry-run'],components:plan.items.map(i=>i.id),files:plan.files.map(({relative,status})=>({path:relative,status})),dependencies,devDependencies,changed};
 if(options.json)console.log(JSON.stringify(result,null,2));else{
  console.log(plan.files.map(f=>`${options['dry-run']?'would ':''}${f.status.padEnd(9)} ${f.relative}`).join('\n'));
  if(dependencies.length)console.log(`Dependencies: ${dependencies.join(' ')}`);if(devDependencies.length)console.log(`Dev dependencies: ${devDependencies.join(' ')}`);
 }
 if(options.install&&!options['dry-run'])for(const [list,dev] of [[dependencies,false],[devDependencies,true]])if(list.length){
  const args=['install','--ignore-scripts',...(dev?['--save-dev']:[]),...list],run=spawnSync(npmCli?process.execPath:'npm',npmCli?[npmCli,...args]:args,{cwd:root,stdio:options.json?['inherit','pipe','inherit']:'inherit',shell:false});
  if(options.json&&run.stdout?.length)process.stderr.write(run.stdout);
  if(run.error||run.status!==0)throw Error('Component files were installed; dependency installation failed. Retry with your package manager.');
 }
 }
}catch(error){console.error(`Motiqo: ${error.message}`);process.exitCode=1;}
