import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import * as registry from '../registry/manifest.json';
import type {ElementId,OriginalSources} from './catalog';
import {formatSource} from './format-source.server';

export function registryItem(id:string){return registry.items.find(item=>item.id===id);}
// Paths come exclusively from the checked-in manifest. next.config traces that
// exact allowlist, so Turbopack must not expand this read to the whole project.
const sourcePath=(source:string)=>path.join(/*turbopackIgnore: true*/process.cwd(),source);
export async function componentBundle(id:string){
 const item=registryItem(id);if(!item)return null;
 const files=await Promise.all(item.files.map(async file=>{
  const bytes=await readFile(sourcePath(file.source)),encoding=/\.(webp|png|jpe?g|woff2?|mp3|wav)$/.test(file.source)?'base64':'utf8';
  return{...file,encoding,content:bytes.toString(encoding),sha256:createHash('sha256').update(bytes).digest('hex')};
 }));
 return{schemaVersion:registry.schemaVersion,version:registry.version,...item,files};
}
export async function originalSources(ids?:readonly string[]):Promise<OriginalSources>{
 return Object.fromEntries(await Promise.all(registry.items.filter(item=>!ids||ids.includes(item.id)).map(async item=>[item.id,
  await Promise.all(item.files.filter(f=>/\.(tsx?|svg)$/.test(f.source)).map(async file=>({name:path.basename(file.target),code:await formatSource(await readFile(sourcePath(file.source),'utf8'),file.target)})))
 ]))) as Record<ElementId,{name:string;code:string}[]>;
}
