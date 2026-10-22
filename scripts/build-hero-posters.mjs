import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),registryPath=path.join(root,'registry/hero-prompts.json'),catalog=JSON.parse(fs.readFileSync(registryPath,'utf8'));
for(const hero of catalog.items){
 if(!/^[a-z0-9-]+$/.test(hero.id))throw Error('Invalid Hero ID.');
 const source=path.join(root,'screenshots',`${hero.id}-poster.png`),metadata=await sharp(source).metadata();
 if(metadata.width!==1280||metadata.height!==900)throw Error(`${hero.title}: capture the live Hero at 1280 × 900 before building its poster.`);
 const output=await sharp(source).resize(960,675).webp({quality:88}).toBuffer(),hash=crypto.createHash('sha256').update(output).digest('hex').slice(0,12),filename=`${hero.id}-poster-${hash}.webp`;
 fs.writeFileSync(path.join(root,'public/heroes',filename),output);hero.poster=`/heroes/${filename}`;
 fs.writeFileSync(path.join(root,'public/heroes',`${hero.id}-prompt.txt`),hero.prompt);
 for(const previous of fs.readdirSync(path.join(root,'public/heroes')))if(previous.startsWith(`${hero.id}-poster`)&&previous.endsWith('.webp')&&previous!==filename)fs.unlinkSync(path.join(root,'public/heroes',previous));
}
fs.writeFileSync(registryPath,JSON.stringify(catalog,null,2)+'\n');
console.log(`Built ${catalog.items.length} Hero posters with content-hashed filenames.`);
