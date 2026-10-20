import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
// assets/images is the source of truth. Public files are optimized copies,
// including the named artwork used outside the galleries.
const aliases={7:['starlit-cat.webp','uriat.webp'],11:['atmosphere.webp']};
await fs.mkdir(path.join(root,'public/media/gallery'),{recursive:true});
for(let index=1;index<=18;index++){
  const name=`image-${String(index).padStart(2,'0')}`;
  const source=path.join(root,'assets/images',`${name}.png`);
  const metadata=await sharp(source).metadata();
  if(metadata.width!==1600||metadata.height!==1200)throw Error(`${name} must be 1600 × 1200.`);
  const bytes=await sharp(source).webp({quality:88,effort:6}).toBuffer();
  await fs.writeFile(path.join(root,'public/media/gallery',`${name}.webp`),bytes);
  for(const alias of aliases[index]??[])await fs.writeFile(path.join(root,'public/media',alias),bytes);
}
console.log('Synced 18 images at 1600 × 1200 and 3 named artwork copies from assets/images.');
