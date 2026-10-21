import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';
import {writePreviewRevisions} from './preview-revisions.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),manifest=JSON.parse(fs.readFileSync(path.join(root,'registry/manifest.json'),'utf8'));
const output=path.join(root,'public/previews'),input=path.join(root,'screenshots/posters'),items={},generated=new Set(),revisions=writePreviewRevisions();fs.mkdirSync(output,{recursive:true});
for(const item of manifest.items){
  const stamp=JSON.parse(fs.readFileSync(path.join(input,`${item.id}.json`),'utf8'));
  if(stamp.sourceHash!==revisions[item.id])throw Error(`Recapture stale artwork: ${item.id}`);
  const entry={sourceHash:stamp.sourceHash};
  for(const theme of ['dark','light']){
    const source=path.join(input,`${item.id}-${theme}.png`);if(!fs.existsSync(source))throw Error(`Capture the real ${item.id}/${theme} preview before generating its poster.`);
    const metadata=await sharp(source).metadata();if(metadata.width!==400||metadata.height!==300)throw Error(`Capture the 400x300 card frame: ${source}`);
    const bytes=await sharp(source).webp({quality:88,effort:6}).toBuffer(),hash=crypto.createHash('sha256').update(bytes).digest('hex').slice(0,12),name=`${item.id}-${theme}-${hash}.webp`;
    fs.writeFileSync(path.join(output,name),bytes);generated.add(name);entry[theme]=`/previews/${name}`;
  }
  items[item.id]=entry;
}
fs.writeFileSync(path.join(root,'registry/previews.json'),JSON.stringify({schemaVersion:2,width:400,height:300,items},null,2)+'\n');
for(const name of fs.readdirSync(output))if(/^[a-z-]+-(dark|light)-[a-f0-9]{12}\.webp$/.test(name)&&!generated.has(name))fs.unlinkSync(path.join(output,name));
console.log(`Generated ${Object.keys(items).length*2} faithful, optimized preview posters.`);
