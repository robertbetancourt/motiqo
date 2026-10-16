import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),manifest=JSON.parse(fs.readFileSync(path.join(root,'registry/manifest.json'),'utf8'));
const output=path.join(root,'public/previews'),input=path.join(root,'screenshots/posters'),items={},generated=new Set();fs.mkdirSync(output,{recursive:true});
for(const item of manifest.items){
  const entry={};
  for(const theme of ['dark','light']){
    const source=path.join(input,`${item.id}-${theme}.png`);if(!fs.existsSync(source))throw Error(`Capture the real ${item.id}/${theme} preview before generating its poster.`);
    const metadata=await sharp(source).metadata();if(metadata.width!==320||metadata.height!==320)throw Error(`Invalid capture size: ${source}`);
    const bytes=await sharp(source).webp({quality:88,effort:6}).toBuffer(),hash=crypto.createHash('sha256').update(bytes).digest('hex').slice(0,12),name=`${item.id}-${theme}-${hash}.webp`;
    fs.writeFileSync(path.join(output,name),bytes);generated.add(name);entry[theme]=`/previews/${name}`;
  }
  items[item.id]=entry;
}
fs.writeFileSync(path.join(root,'registry/previews.json'),JSON.stringify({schemaVersion:1,width:320,height:320,items},null,2)+'\n');
for(const name of fs.readdirSync(output))if(/^[a-z-]+-(dark|light)-[a-f0-9]{12}\.webp$/.test(name)&&!generated.has(name))fs.unlinkSync(path.join(output,name));
console.log(`Generated ${Object.keys(items).length*2} faithful, optimized preview posters.`);
