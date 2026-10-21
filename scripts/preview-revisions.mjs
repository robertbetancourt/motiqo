import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
function sourceBytes(directory,file){
  const bytes=fs.readFileSync(path.join(directory,file));
  return /\.(tsx?|jsx?|css|svg|json|txt|md)$/.test(file)?bytes.toString('utf8').replace(/\r\n/g,'\n'):bytes;
}
/** A poster belongs to a particular implementation, default configuration and frame. */
export function previewRevisions(directory=root){
  const manifest=JSON.parse(fs.readFileSync(path.join(directory,'registry/manifest.json'),'utf8'));
  const shared=['components/demos.tsx','components/preview-capture.tsx','app/globals.css'].map(file=>sourceBytes(directory,file));
  return Object.fromEntries(manifest.items.map(item=>{
    const hash=crypto.createHash('sha256');
    for(const bytes of shared)hash.update(bytes);
    hash.update(JSON.stringify(item.controls));
    for(const file of item.files){hash.update(file.source);hash.update(sourceBytes(directory,file.source));}
    return [item.id,hash.digest('hex').slice(0,20)];
  }));
}
export function writePreviewRevisions(){
  const revisions=previewRevisions();
  fs.writeFileSync(path.join(root,'registry/preview-sources.json'),JSON.stringify(revisions,null,2)+'\n');
  return revisions;
}
