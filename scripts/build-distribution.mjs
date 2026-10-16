import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),manifest=JSON.parse(fs.readFileSync(path.join(root,'registry/manifest.json'),'utf8'));
const ids=new Set();
const items=manifest.items.map(item=>{
 if(!/^[a-z][a-z0-9-]*$/.test(item.id)||ids.has(item.id))throw Error(`Invalid or duplicate id: ${item.id}`);ids.add(item.id);
 const controls=new Map(item.controls.map(c=>[c.key,c]));if(controls.size!==item.controls.length)throw Error(`Duplicate controls: ${item.id}`);
 for(const mood of item.moods)for(const[key,value]of Object.entries(mood.settings)){
  const c=controls.get(key);if(!c||c.kind==='range'&&(!Number.isFinite(value)||value<c.min||value>c.max)||c.kind==='select'&&!c.choices.some(v=>v.value===value)||c.kind==='color'&&!/^#[\da-f]{6}$/i.test(value))throw Error(`Invalid mood ${item.id}/${mood.id}/${key}`);
 }
 const files=item.files.map(file=>{
  if(file.source.includes('..')||file.target.includes('..')||!file.source.startsWith('components/')&&!file.source.startsWith('public/'))throw Error(`Unsafe source: ${file.source}`);
  const bytes=fs.readFileSync(path.join(root,file.source)),encoding=/\.(webp|png|jpe?g|woff2?)$/.test(file.source)?'base64':'utf8';
  if(encoding==='utf8'&&!Buffer.from(bytes.toString('utf8')).equals(bytes))throw Error(`Invalid UTF-8 source: ${file.source}`);
  return{...file,encoding,content:bytes.toString(encoding),sha256:crypto.createHash('sha256').update(bytes).digest('hex')};
 });
 const entry=files.find(f=>path.posix.basename(f.source)===item.entry);if(!entry)throw Error(`Missing entry: ${item.id}`);
 for(const file of files.filter(f=>/\.tsx?$/.test(f.source)))for(const match of file.content.matchAll(/(?:from\s*|import\s*\()(['"])(\.[^'"]+)\1/g)){
  const name=path.posix.basename(match[2]);if(!files.some(f=>[name,`${name}.ts`,`${name}.tsx`].includes(path.posix.basename(f.source))))throw Error(`Missing local dependency ${match[2]} in ${file.source}`);
 }
 for(const file of files.filter(f=>/\.tsx?$/.test(f.source)))for(const match of file.content.matchAll(/['"]\/(media|branding)\/([^'"\s]+)['"]/g)){
  if(!files.some(f=>f.source===`public/${match[1]}/${match[2]}`))throw Error(`Missing public artwork ${match[0]} in ${item.id}`);
 }
 return{...item,files};
});
const cli=path.join(root,'packages/cli');fs.mkdirSync(path.join(cli,'skill'),{recursive:true});
fs.writeFileSync(path.join(cli,'registry.json'),JSON.stringify({...manifest,items}));
fs.copyFileSync(path.join(root,'skills/motiqo/SKILL.md'),path.join(cli,'skill/SKILL.md'));
fs.writeFileSync(path.join(root,'registry/element-ids.ts'),'// Generated from manifest.json; run npm run distribution:build.\nexport const elementIds = '+JSON.stringify(items.map(i=>i.id))+' as const;\nexport type ElementId = typeof elementIds[number];\n');
fs.writeFileSync(path.join(cli,'NOTICE.md'),'Motiqo components. Distribution terms are not yet published. Preserve source credits.\nLiquid Relic and Event Horizon use the credited Sculpture Hero particle engine by Guglielmo Giannattasio, supplied through 21st.dev.\n');
if(process.argv.includes('--pack')){
 const destination=path.join(root,'public/downloads');fs.mkdirSync(destination,{recursive:true});
 const npm=process.env.npm_execpath??path.join(path.dirname(process.execPath),'node_modules/npm/bin/npm-cli.js');
 const result=spawnSync(process.execPath,[npm,'pack','--ignore-scripts','--pack-destination',destination],{cwd:cli,stdio:'inherit',env:{...process.env,npm_config_cache:path.join(root,'screenshots/.npm-cache')}});if(result.status!==0)throw Error('CLI packaging failed. Run this script through npm run distribution:pack.');
}
console.log(`Validated and bundled ${items.length} Motiqo components.`);
