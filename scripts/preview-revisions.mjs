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
  const previewsPath=path.join(root,'registry/previews.json');
  if(fs.existsSync(previewsPath)){
    try{
      const previews=JSON.parse(fs.readFileSync(previewsPath,'utf8'));
      if(previews&&previews.items){
        for(const [id,hash] of Object.entries(revisions)){
          if(previews.items[id]){
            previews.items[id].sourceHash=hash;
          }
          const stampPath=path.join(root,'screenshots/posters',`${id}.json`);
          if(fs.existsSync(stampPath)){
            fs.writeFileSync(stampPath,JSON.stringify({sourceHash:hash})+'\n');
          }
        }
        fs.writeFileSync(previewsPath,JSON.stringify(previews,null,2)+'\n');
      }
    }catch{}
  }
  return revisions;
}
