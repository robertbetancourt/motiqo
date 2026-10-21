import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export function safeTarget(root,relative){
 if(typeof relative!=='string'||!relative||path.isAbsolute(relative)||/[\\:\x00-\x1f]/.test(relative)||relative.split('/').some(p=>!p||p==='.'||p==='..'||/[. ]$/.test(p)||['.git','node_modules'].includes(p.toLowerCase())))throw Error(`Unsafe target: ${relative}`);
 const destination=path.resolve(root,relative),boundary=path.resolve(root)+path.sep;
 if(!destination.startsWith(boundary))throw Error(`Target leaves the project: ${relative}`);
 let current=root;
 for(const segment of relative.split('/')){
  current=path.join(current,segment);let stat;
  // existsSync follows links and returns false for dangling links. Inspect the link itself.
  try{stat=fs.lstatSync(current);}catch(error){if(error.code!=='ENOENT')throw error;}
  if(stat?.isSymbolicLink())throw Error(`Refusing symbolic link: ${relative}`);
 }
 return destination;
}
export function planInstall(registry,ids,root,{directory='components/motiqo',overwrite=false}={}){
 if(!ids.length)throw Error('Choose at least one component.');
 safeTarget(root,`${directory}/check.tsx`);
 const files=new Map(),dependencies={},devDependencies={},items=[];
 for(const id of new Set(ids)){
  const item=registry.items.find(item=>item.id===id);if(!item)throw Error(`Unknown component: ${id}. Run motiqo list.`);items.push(item);
  Object.assign(dependencies,item.packageDependencies);Object.assign(devDependencies,item.devDependencies);
  for(const file of item.files){
   const relative=file.target.startsWith('components/motiqo/')?`${directory}/${path.posix.basename(file.target)}`:file.target;
   const bytes=Buffer.from(file.content,file.encoding);
   if(crypto.createHash('sha256').update(bytes).digest('hex')!==file.sha256)throw Error(`Integrity check failed: ${file.target}`);
   const destination=safeTarget(root,relative),previous=files.get(relative);
   if(previous&&!previous.bytes.equals(bytes))throw Error(`Conflicting shared file: ${relative}`);
   let status='create';
   if(fs.existsSync(destination)){if(!fs.statSync(destination).isFile())throw Error(`Not a file: ${relative}`);if(fs.readFileSync(destination).equals(bytes))status='unchanged';else if(overwrite)status='replace';else throw Error(`File already exists: ${relative}. Review it or use --overwrite.`);}
   files.set(relative,{relative,destination,bytes,status});
  }
 }
 return{items,files:[...files.values()],dependencies,devDependencies};
}
export function applyInstall(plan,root){
 const journal=[],directories=[],temporary=[];
 try{
  for(const file of plan.files){
   if(file.status==='unchanged')continue;
   safeTarget(root,file.relative);
   let directory=path.dirname(file.destination),missing=[];
   while(!fs.existsSync(directory)){missing.push(directory);directory=path.dirname(directory);}
   for(const folder of missing.reverse()){fs.mkdirSync(folder);directories.push(folder);}
   const backup=file.status==='replace'?fs.readFileSync(file.destination):null;
   const staging=path.join(path.dirname(file.destination),`.motiqo-${crypto.randomUUID()}.tmp`);temporary.push(staging);
   fs.writeFileSync(staging,file.bytes,{flag:'wx'});safeTarget(root,file.relative);
   if(backup!==null)fs.renameSync(staging,file.destination);
   else{fs.copyFileSync(staging,file.destination,fs.constants.COPYFILE_EXCL);fs.unlinkSync(staging);}
   journal.push({destination:file.destination,backup});
  }
 }catch(error){
  for(const item of journal.reverse()){if(item.backup!==null)fs.writeFileSync(item.destination,item.backup);else fs.unlinkSync(item.destination);}
  for(const file of temporary)if(fs.existsSync(file))fs.unlinkSync(file);
  for(const directory of directories.reverse())try{fs.rmdirSync(directory);}catch{}
  throw error;
 }finally{for(const file of temporary)if(fs.existsSync(file))fs.unlinkSync(file);}
 return plan.files.filter(f=>f.status!=='unchanged').map(f=>f.relative);
}
